import logging
import time
from datetime import date
from threading import Lock
from typing import Optional, List, Dict, Any, Tuple

import requests
from requests.adapters import HTTPAdapter

logger = logging.getLogger(__name__)

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

# How many months of trend to assemble per request (current month + N-1 back).
DEFAULT_TREND_MONTHS = 6
# Sleep between sequential agmarknet calls to be polite to the upstream.
INTER_CALL_DELAY_SEC = 0.2


# --- Shared HTTP session ------------------------------------------------------
def _build_session() -> requests.Session:
    s = requests.Session()
    adapter = HTTPAdapter(pool_connections=8, pool_maxsize=16)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


_SESSION = _build_session()


# --- TTL cache ----------------------------------------------------------------
_AGMARKNET_TTL_OK = 6 * 60 * 60   # monthly data; 6h cache is plenty fresh
_AGMARKNET_TTL_EMPTY = 15 * 60    # short TTL on empty so we retry soon

# Key: (state_lower, crop_lower, months_back, year_of_today, month_of_today)
_agmarknet_cache: Dict[Tuple[str, str, int, int, int], Tuple[float, float, Optional[Dict[str, Any]]]] = {}
_cache_lock = Lock()


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


_AGMARKNET_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.agmarknet.gov.in/",
    "Origin": "https://www.agmarknet.gov.in",
}


def _months_back(year: int, month: int, n: int) -> List[Tuple[int, int]]:
    """Yield n (year, month) tuples newest-first, starting at (year, month)."""
    out: List[Tuple[int, int]] = []
    y, m = year, month
    for _ in range(n):
        out.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return out


def _fetch_agmarknet_month(
    state_id: int, commodity_id: int, year: int, month: int, timeout: float
) -> Optional[Dict[str, Any]]:
    """One agmarknet call for a specific year/month. Returns parsed JSON or None."""
    params = {
        "report_mode": "Districtwise",
        "commodity": commodity_id,
        "year": year,
        "month": month,
        "state": state_id,
        "district": 0,
    }
    try:
        prep = requests.Request("GET", AGMARKNET_URL, params=params).prepare()
        logger.info(f"[rates] agmarknet GET {prep.url}")
        resp = _SESSION.get(AGMARKNET_URL, params=params, headers=_AGMARKNET_HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"[rates] agmarknet fetch failed for {year}-{month:02d}: {e}")
        return None


def _merge_trend_responses(
    responses: List[Tuple[Tuple[int, int], Optional[Dict[str, Any]]]],
    state_title: str,
    crop_title: str,
) -> Optional[Dict[str, Any]]:
    """Merge per-month agmarknet responses into one trend payload.

    Each per-month call returns three price columns (current/prev/year-ago);
    we deliberately keep ONLY the column matching the call's exact (year, month)
    so the merged trend is N consecutive months with no gaps. Output mirrors
    the single-month response shape, so the existing frontend
    (which reads `Object.keys(row).startsWith('prices_')`) renders it unchanged.
    """
    merged_rows: Dict[str, Dict[str, Any]] = {}
    merged_average: Dict[str, Any] = {"district": "Average"}
    months_included: List[str] = []
    any_success = False

    # `responses` is newest-first. The first successful body carries the
    # change_over_previous_month / change_over_previous_year fields that
    # describe the LATEST month — preserve those once into each row.
    latest_changes_captured = False

    for (year, month), body in responses:
        if not isinstance(body, dict) or not body.get("rows"):
            continue
        any_success = True
        target_key = f"prices_{_MONTH_NAMES[month - 1]}_{year}"
        for row in body["rows"]:
            district = row.get("district")
            if not district:
                continue
            if target_key in row:
                slot = merged_rows.setdefault(district, {"district": district})
                slot[target_key] = row[target_key]
                if not latest_changes_captured:
                    for change_key in (
                        "change_over_previous_month",
                        "change_over_previous_year",
                    ):
                        if change_key in row:
                            slot[change_key] = row[change_key]
        latest_changes_captured = True
        # Per-call `average` row carries the state-wide mean for that month.
        avg = body.get("average") if isinstance(body.get("average"), dict) else None
        if avg and target_key in avg:
            merged_average[target_key] = avg[target_key]
        months_included.append(target_key)

    if not any_success or not merged_rows:
        return None

    sorted_rows = sorted(merged_rows.values(), key=lambda r: r.get("district", ""))
    price_columns = [
        {"key": key, "title": _price_key_to_title(key)}
        for key in sorted(set(months_included), key=_price_key_sort_value)
    ]

    title = (
        f"District-wise Wholesale Prices ({len(price_columns)}-month trend) "
        f"for {crop_title} in {state_title}"
    )
    return {
        "success": True,
        "message": "Data fetched successfully.",
        "title": title,
        "average": merged_average if len(merged_average) > 1 else None,
        "data": [
            {"key": "region_info", "columns": [{"key": "district", "title": "District"}]},
            {"key": "prices", "columns": price_columns},
        ],
        "rows": sorted_rows,
    }


_MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def _price_key_sort_value(key: str) -> Tuple[int, int]:
    """Sort `prices_may_2026` style keys chronologically."""
    parts = key.replace("prices_", "").split("_")
    if len(parts) < 2:
        return (0, 0)
    month_name = parts[0].lower()
    try:
        month_idx = _MONTH_NAMES.index(month_name) + 1
    except ValueError:
        month_idx = 0
    try:
        year = int(parts[-1])
    except ValueError:
        year = 0
    return (year, month_idx)


def _price_key_to_title(key: str) -> str:
    parts = key.replace("prices_", "").split("_")
    if len(parts) < 2:
        return key
    month_label = parts[0].capitalize()
    year = parts[-1]
    return f"Prices {month_label}, {year} (Rs./Quintal)"


def _add_months(year: int, month: int, delta: int) -> Tuple[int, int]:
    """Shift a (year, month) by `delta` months (delta may be negative)."""
    idx = (year * 12 + (month - 1)) + delta
    return idx // 12, (idx % 12) + 1


# Some crops trade under a different commodity name depending on the state —
# e.g. Punjab mandis trade "Paddy" (raw harvested grain), not milled "Rice".
# When the primary commodity yields no rows, retry with the alternates.
COMMODITY_FALLBACK: Dict[str, List[int]] = {
    "rice": [3, 2],            # Rice → Paddy(Common)
    "paddy": [2, 3],           # Paddy → Rice
    "soybean": [13],
    "soyabeans": [13],
}


def _resolve_commodity_chain(crop_lower: str) -> List[int]:
    """Return the ordered list of agmarknet commodity IDs to try for a crop."""
    if crop_lower in COMMODITY_FALLBACK:
        return COMMODITY_FALLBACK[crop_lower]
    primary = COMMODITY_ID_MAP.get(crop_lower)
    return [primary] if primary is not None else [COMMODITY_ID_DEFAULT]


def _fetch_trend_for_commodity(
    state_id: int,
    commodity_id: int,
    anchor_year: int,
    anchor_month: int,
    months: int,
    timeout: float,
) -> List[Tuple[Tuple[int, int], Optional[Dict[str, Any]]]]:
    """Run `months` sequential calls ending at the anchor month (newest-first)."""
    targets = _months_back(anchor_year, anchor_month, months)
    responses: List[Tuple[Tuple[int, int], Optional[Dict[str, Any]]]] = []
    for idx, (year, month) in enumerate(targets):
        if idx > 0 and INTER_CALL_DELAY_SEC > 0:
            time.sleep(INTER_CALL_DELAY_SEC)
        body = _fetch_agmarknet_month(state_id, commodity_id, year, month, timeout)
        responses.append(((year, month), body))
    return responses


def fetch_agmarknet(
    state: Optional[str],
    crop: Optional[str],
    timeout: float = 8.0,
    months: int = DEFAULT_TREND_MONTHS,
    harvest_date: Optional[date] = None,
) -> Optional[Dict[str, Any]]:
    """Fetch a multi-month wholesale-prices trend (district-wise) for state+crop.

    The trend window ends at an anchor month:
      - If `harvest_date` is in the past, anchor 2 months after harvest so the
        window covers the crop's actual selling season (mandi prices only
        exist when the crop is being traded — paddy data is empty off-season).
      - Otherwise anchor on the current month.

    Tries the crop's commodity-ID chain (e.g. Rice → Paddy) so state-specific
    naming doesn't return an empty chart. Merges per-district price columns
    into one response shaped like the single-month payload.
    """
    if not state or not crop:
        logger.info("[rates] agmarknet requires state + crop; skipping")
        return None

    state_lower = state.strip().lower()
    crop_lower = crop.strip().lower()

    state_id = STATE_ID_MAP.get(state_lower)
    if state_id is None:
        logger.warning(f"[rates] agmarknet: unmapped state='{state}'")
        return None

    today = date.today()
    # Anchor the window on the selling season when the crop is already harvested.
    if harvest_date and harvest_date < today:
        anchor_year, anchor_month = _add_months(
            harvest_date.year, harvest_date.month, 2
        )
        # Don't anchor in the future.
        if (anchor_year, anchor_month) > (today.year, today.month):
            anchor_year, anchor_month = today.year, today.month
    else:
        anchor_year, anchor_month = today.year, today.month

    commodity_chain = _resolve_commodity_chain(crop_lower)

    cache_key = (state_lower, crop_lower, months, anchor_year, anchor_month)
    now = time.time()
    cached, age, fresh = _cache_get(_agmarknet_cache, cache_key, now)
    if fresh:
        logger.info(f"[rates] agmarknet cache hit ({int(age)}s old, {months}-month trend)")
        return cached

    merged: Optional[Dict[str, Any]] = None
    hard_failed = True
    for commodity_id in commodity_chain:
        responses = _fetch_trend_for_commodity(
            state_id, commodity_id, anchor_year, anchor_month, months, timeout
        )
        if any(isinstance(b, dict) for _, b in responses):
            hard_failed = False
        candidate = _merge_trend_responses(responses, state.title(), crop.title())
        if candidate is not None:
            merged = candidate
            if commodity_id != commodity_chain[0]:
                logger.info(
                    f"[rates] agmarknet: '{crop}' empty under primary commodity; "
                    f"used fallback commodity_id={commodity_id}"
                )
            break

    if merged is None:
        if cached is not None:
            logger.info(f"[rates] agmarknet trend empty/failed; serving stale cache ({int(age)}s old)")
            return cached
        reason = "all calls failed" if hard_failed else "no rows in any month"
        logger.warning(
            f"[rates] agmarknet trend unavailable for {crop} in {state} ({reason})"
        )
        _cache_put(_agmarknet_cache, cache_key, None, _AGMARKNET_TTL_EMPTY, now)
        return None

    months_in_merged = len(merged.get("data", [{}, {}])[1].get("columns", []))
    logger.info(
        f"[rates] agmarknet trend merged: {len(merged['rows'])} districts × "
        f"{months_in_merged} months for {crop.title()} in {state.title()} "
        f"(window ending {anchor_year}-{anchor_month:02d})"
    )
    _cache_put(_agmarknet_cache, cache_key, merged, _AGMARKNET_TTL_OK, now)
    return merged
