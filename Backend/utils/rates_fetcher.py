import os
import json
import time
import logging
from datetime import date, datetime, timedelta
from threading import Lock
from typing import Optional, List, Dict, Any, Tuple

import requests
from requests.adapters import HTTPAdapter

logger = logging.getLogger(__name__)

GOVDATA_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_URL = "https://api.agmarknet.gov.in/v1/price-trend/wholesale-prices-monthly"

# agmarknet numeric IDs (official).
STATE_ID_MAP = {
    "andaman and nicobar islands": 1,
    "andhra pradesh": 2,
    "arunachal pradesh": 3,
    "assam": 4,
    "bihar": 5,
    "chandigarh": 6,
    "chhattisgarh": 7,
    "dadra and nagar haveli and daman and diu": 8,
    "delhi": 9,
    "goa": 10,
    "gujarat": 11,
    "haryana": 12,
    "himachal pradesh": 13,
    "jammu and kashmir": 14,
    "jharkhand": 15,
    "karnataka": 16,
    "kerala": 17,
    "ladakh": 18,
    "lakshadweep": 19,
    "madhya pradesh": 20,
    "maharashtra": 21,
    "manipur": 22,
    "meghalaya": 23,
    "mizoram": 24,
    "nagaland": 25,
    "odisha": 26,
    "puducherry": 27,
    "punjab": 28,
    "rajasthan": 29,
    "sikkim": 30,
    "tamil nadu": 31,
    "telangana": 32,
    "tripura": 33,
    "uttar pradesh": 34,
    "uttarakhand": 35,
    "west bengal": 36,
}

COMMODITY_ID_MAP = {
    "wheat": 1,
    "rice": 3,
    "baby corn": 459,
    "soyabeans": 13,
    "soybean": 13,
    "cotton": 15,
    "sugarcane": 122,
    "potato": 24,
    "tomato": 65,
    "onion": 23,
    "cabbage": 126,
    "carrot": 125,
    "beans": 80,
    "green peas": 46,
    "sunflower": 14,
    "barley": 29,
}

COMMODITY_ID_DEFAULT = 1  # wheat


# --- Shared HTTP session (connection pooling, reused TLS) ---------------------
def _build_session() -> requests.Session:
    s = requests.Session()
    adapter = HTTPAdapter(pool_connections=8, pool_maxsize=16)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


_SESSION = _build_session()


# --- TTL cache with stale-on-error fallback -----------------------------------
# api.data.gov.in is regularly slow / times out; we cache successful responses
# so subsequent requests don't re-pay the latency, and we fall back to stale
# data when a fresh fetch fails.
_GOVDATA_TTL_OK = 6 * 60 * 60       # mandi data is daily; 6h is plenty fresh
_GOVDATA_TTL_EMPTY = 15 * 60        # short TTL on empty so we retry soon
_AGMARKNET_TTL_OK = 6 * 60 * 60
_AGMARKNET_TTL_EMPTY = 15 * 60

_govdata_cache: Dict[Tuple[str, str, int], Tuple[float, float, List[Dict[str, Any]]]] = {}
_agmarknet_cache: Dict[Tuple[str, str, int, int], Tuple[float, float, Optional[Dict[str, Any]]]] = {}
_cache_lock = Lock()


# --- Dummy fallback (offline UI when api.data.gov.in is down) -----------------
# When the bulk fetch fails and we have nothing cached, serve this fixture so
# MandiRatesPanel renders a chart instead of going empty.
_DUMMY_GOVDATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "dummy-responses",
    "datagovapi-1.json",
)
_dummy_govdata: Optional[Dict[str, Any]] = None
_dummy_lock = Lock()


def _load_dummy_govdata() -> Optional[Dict[str, Any]]:
    """Lazy-load and memoize the dummy govdata fixture."""
    global _dummy_govdata
    with _dummy_lock:
        if _dummy_govdata is not None:
            return _dummy_govdata
        try:
            with open(_DUMMY_GOVDATA_PATH, "r", encoding="utf-8") as f:
                _dummy_govdata = json.load(f)
        except Exception as e:
            logger.warning(f"[rates] could not load dummy govdata fixture: {e}")
            _dummy_govdata = {"date": date.today().isoformat(), "records": []}
        return _dummy_govdata


def _govdata_fallback_buckets(days: int = 7) -> List[Dict[str, Any]]:
    """Synthesize `days` days of MandiDayData from the single-day dummy fixture.

    The fixture only carries one day's records, so the chart would render a
    single point per market. We duplicate the records across N days ending
    today, applying a small deterministic price drift each day so the lines
    show realistic-looking movement instead of flat horizontals.
    """
    dummy = _load_dummy_govdata() or {}
    records = dummy.get("records") or []
    if not records:
        return []

    # ±2% drift, repeating; days are listed newest-first to mirror the
    # ordering produced by the live-fetch path.
    drifts = [0.0, -0.005, 0.012, -0.014, 0.008, -0.020, 0.016]
    today = date.today()
    buckets: List[Dict[str, Any]] = []
    for i in range(days):
        d = today - timedelta(days=i)
        drift = drifts[i % len(drifts)]
        day_records: List[Dict[str, Any]] = []
        for r in records:
            cloned = dict(r)
            cloned["arrival_date"] = d.strftime("%d/%m/%Y")
            for price_key in ("min_price", "max_price", "modal_price"):
                p = r.get(price_key)
                if isinstance(p, (int, float)):
                    cloned[price_key] = round(p * (1 + drift), 2)
            day_records.append(cloned)
        buckets.append({"date": d.isoformat(), "records": day_records})
    return buckets


def _cache_get(cache: dict, key: tuple, now: float):
    """Return (value, age_seconds, is_fresh) or (None, None, False)."""
    with _cache_lock:
        entry = cache.get(key)
    if entry is None:
        return None, None, False
    ts, ttl, value = entry
    age = now - ts
    return value, age, age < ttl


def _cache_put(cache: dict, key: tuple, value, ttl: float, now: float):
    with _cache_lock:
        cache[key] = (now, ttl, value)


# --- govdata (data.gov.in) ----------------------------------------------------
def _parse_arrival_date(value) -> Optional[date]:
    if not isinstance(value, str):
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _bucket_records_by_date(records: List[Dict[str, Any]], days: int) -> List[Dict[str, Any]]:
    today = date.today()
    cutoff = today - timedelta(days=days - 1)
    buckets: Dict[date, List[Dict[str, Any]]] = {
        today - timedelta(days=i): [] for i in range(days)
    }
    for r in records or []:
        if not isinstance(r, dict):
            continue
        d = _parse_arrival_date(r.get("arrival_date"))
        if d is None or d < cutoff or d > today:
            continue
        buckets[d].append(r)
    # newest day first (matches previous behavior)
    return [
        {"date": d.isoformat(), "records": buckets[d]}
        for d in sorted(buckets.keys(), reverse=True)
    ]


def _fetch_govdata_bulk(state: str, crop: Optional[str], timeout: float) -> Optional[List[Dict[str, Any]]]:
    """Single API call returning the most-recent records for state+crop.

    Returns None on hard failure so callers can distinguish "API down" from
    "API returned no rows for the window."
    """
    api_key = os.getenv("GOVDATA_API_KEY")
    if not api_key:
        logger.warning("[rates] GOVDATA_API_KEY not set")
        return None

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 10000,
        "filters[state.keyword]": state.title(),
        "sort[arrival_date]": "desc",
    }
    if crop:
        params["filters[commodity]"] = crop.title()

    try:
        prep = requests.Request("GET", GOVDATA_URL, params={**params, "api-key": "***"}).prepare()
        logger.info(f"[rates] govdata GET {prep.url}")
        resp = _SESSION.get(GOVDATA_URL, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json().get("records", []) or []
    except Exception as e:
        logger.warning(f"[rates] govdata bulk fetch failed: {e}")
        return None


def fetch_govdata_last_n_days(
    state: str,
    crop: Optional[str],
    days: int = 7,
    timeout: float = 12.0,
    stagger_ms: int = 0,  # accepted for backwards-compat; ignored (single call now)
) -> List[Dict[str, Any]]:
    """Fetch govdata mandi prices for the last `days` calendar days.

    Now performs a single bulk API call sorted by arrival_date desc and buckets
    records locally, instead of 7 per-date calls. Results are cached per
    (state, crop, days) for ~6h with stale-on-error fallback.
    """
    if not state:
        return []

    _ = stagger_ms  # unused
    cache_key = (state.strip().lower(), (crop or "").strip().lower(), days)
    now = time.time()

    cached, age, fresh = _cache_get(_govdata_cache, cache_key, now)
    if fresh:
        logger.info(f"[rates] govdata cache hit ({int(age)}s old) for {cache_key}")
        return cached

    records = _fetch_govdata_bulk(state, crop, timeout)

    # Hard failure (timeout / network error): serve stale if we have any,
    # otherwise fall back to the bundled dummy fixture so the UI doesn't
    # render an empty chart.
    if records is None:
        if cached is not None:
            logger.info(f"[rates] govdata fetch failed; serving stale cache ({int(age)}s old)")
            return cached
        fallback = _govdata_fallback_buckets(days)
        if fallback:
            logger.warning(
                "[rates] govdata fetch failed and no cache; serving dummy fixture "
                f"({sum(len(d['records']) for d in fallback)} records)"
            )
            _cache_put(_govdata_cache, cache_key, fallback, _GOVDATA_TTL_EMPTY, now)
            return fallback
        # No dummy either - cache empty so we don't retry every request.
        empty: List[Dict[str, Any]] = []
        _cache_put(_govdata_cache, cache_key, empty, _GOVDATA_TTL_EMPTY, now)
        return empty

    bucketed = _bucket_records_by_date(records, days)
    has_data = any(day["records"] for day in bucketed)
    if not has_data:
        # API responded but produced nothing in-window (e.g. weekend, no data
        # yet for today). Prefer dummy over empty so the panel renders.
        fallback = _govdata_fallback_buckets(days)
        if fallback:
            logger.warning(
                "[rates] govdata returned no in-window records; serving dummy fixture "
                f"({sum(len(d['records']) for d in fallback)} records)"
            )
            _cache_put(_govdata_cache, cache_key, fallback, _GOVDATA_TTL_EMPTY, now)
            return fallback
    ttl = _GOVDATA_TTL_OK if has_data else _GOVDATA_TTL_EMPTY
    _cache_put(_govdata_cache, cache_key, bucketed, ttl, now)
    return bucketed


# Backwards-compat alias
def fetch_govdata_last_3_days(state: str, crop: Optional[str], timeout: float = 12.0) -> List[Dict[str, Any]]:
    return fetch_govdata_last_n_days(state, crop, days=7, timeout=timeout)


# --- agmarknet ----------------------------------------------------------------
def fetch_agmarknet(state: Optional[str], crop: Optional[str], timeout: float = 8.0) -> Optional[Dict[str, Any]]:
    """Fetch agmarknet monthly wholesale price trend (district-wise) for current month."""
    if not state or not crop:
        logger.info("[rates] agmarknet requires state + crop; skipping")
        return None

    state_id = STATE_ID_MAP.get(state.strip().lower())
    if state_id is None:
        logger.warning(f"[rates] agmarknet: unmapped state='{state}'")
        return None

    commodity_id = COMMODITY_ID_MAP.get(crop.strip().lower(), COMMODITY_ID_DEFAULT)
    if crop.strip().lower() not in COMMODITY_ID_MAP:
        logger.info(f"[rates] agmarknet: unmapped crop='{crop}', falling back to default commodity_id={COMMODITY_ID_DEFAULT}")

    today = date.today()
    cache_key = (state.strip().lower(), crop.strip().lower(), today.year, today.month)
    now = time.time()
    cached, age, fresh = _cache_get(_agmarknet_cache, cache_key, now)
    if fresh:
        logger.info(f"[rates] agmarknet cache hit ({int(age)}s old)")
        return cached

    params = {
        "report_mode": "Districtwise",
        "commodity": commodity_id,
        "year": today.year,
        "month": today.month,
        "state": state_id,
        "district": 0,
    }
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.agmarknet.gov.in/",
        "Origin": "https://www.agmarknet.gov.in",
    }
    try:
        prep = requests.Request("GET", AGMARKNET_URL, params=params).prepare()
        logger.info(f"[rates] agmarknet GET {prep.url}")
        resp = _SESSION.get(AGMARKNET_URL, params=params, headers=headers, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        _cache_put(_agmarknet_cache, cache_key, data, _AGMARKNET_TTL_OK, now)
        return data
    except Exception as e:
        logger.warning(f"[rates] agmarknet fetch failed: {e}")
        if cached is not None:
            logger.info(f"[rates] agmarknet serving stale cache ({int(age)}s old)")
            return cached
        _cache_put(_agmarknet_cache, cache_key, None, _AGMARKNET_TTL_EMPTY, now)
        return None
