"""Mandi rate analysis service.

Produces a one-paragraph reading of recent mandi (Indian wholesale market)
prices fused with the farm's current crop-health signals from satellite
imagery. The model is allowed to state factual implications between the two
data sources but cannot prescribe buy/sell/hold actions.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from .nvidia_client import NvidiaClientError, invoke_text_completion

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are an agricultural analyst. The JSON below contains (a) recent mandi "
    "(Indian wholesale market) price stats and (b) the farm's current "
    "crop-health signals from satellite imagery. Produce ONE short paragraph "
    "(max ~110 words) the farmer can read at a glance.\n\n"
    "Communicate, in roughly this order:\n"
    "1. Direction and magnitude of the week's price trend (% up / down / flat).\n"
    "2. The realistic price band right now — min and max modal_price across the window.\n"
    "3. Market coverage: how many mandis are in the data, and the dominant district.\n"
    "4. One sentence on field condition combining vegetation_coverage_percent, "
    "the healthy/stressed split, and where this year's NDVI sits versus the "
    "prior years' mean if shown.\n"
    "5. A short factual implication that links the price trend to the crop "
    "signal — e.g. 'softening prices coincide with above-average canopy', "
    "'firmer prices align with thinner crop signal'. State the linkage; do "
    "NOT prescribe buying, selling, or holding.\n\n"
    "Hard rules:\n"
    "- Use only numbers, dates, and names that appear in the JSON. Never invent.\n"
    "- No markdown. No bullet points. No headers. Plain prose only.\n"
    "- Keep the tone neutral and factual.\n"
    "- If mandi records are absent, say so plainly and skip parts 1-3.\n"
    "- If crop_health is absent, skip part 4 and the linkage in part 5."
)


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _build_payload(
    govdata_rates: List[Dict[str, Any]],
    agmarknet_rates: Optional[Dict[str, Any]],
    crop: Optional[str],
    district: Optional[str],
    state: Optional[str],
    crop_health: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    rates = govdata_rates if isinstance(govdata_rates, list) else []
    all_records: List[Dict[str, Any]] = []
    day_avgs: List[Dict[str, Any]] = []
    markets: set = set()
    district_counts: Dict[str, int] = {}
    all_modal_prices: List[float] = []

    for day in rates:
        if not isinstance(day, dict):
            continue
        records = day.get("records")
        if not isinstance(records, list):
            continue

        prices: List[float] = []
        for record in records:
            if not isinstance(record, dict):
                continue
            all_records.append(record)
            market = record.get("market")
            if isinstance(market, str) and market.strip():
                markets.add(market.strip())
            d_name = record.get("district")
            if isinstance(d_name, str) and d_name.strip():
                key = d_name.strip()
                district_counts[key] = district_counts.get(key, 0) + 1
            modal_price = _safe_float(record.get("modal_price"), 0.0)
            if modal_price > 0:
                prices.append(modal_price)
                all_modal_prices.append(modal_price)

        if prices:
            day_avgs.append(
                {
                    "date": day.get("date"),
                    "avg_modal_price": round(sum(prices) / len(prices), 2),
                    "min_modal_price": round(min(prices), 2),
                    "max_modal_price": round(max(prices), 2),
                    "record_count": len(prices),
                }
            )

    trend_pct: Optional[float] = None
    if len(day_avgs) >= 2:
        first = _safe_float(day_avgs[0].get("avg_modal_price"), 0.0)
        last = _safe_float(day_avgs[-1].get("avg_modal_price"), 0.0)
        if first > 0 and last > 0:
            trend_pct = round(((last - first) / first) * 100.0, 2)

    price_band: Optional[Dict[str, float]] = None
    if all_modal_prices:
        price_band = {
            "min_modal_price": round(min(all_modal_prices), 2),
            "max_modal_price": round(max(all_modal_prices), 2),
            "avg_modal_price": round(sum(all_modal_prices) / len(all_modal_prices), 2),
        }

    dominant_district: Optional[str] = None
    if district_counts:
        dominant_district = max(district_counts.items(), key=lambda kv: kv[1])[0]

    agmarknet_summary: Optional[Dict[str, Any]] = None
    if isinstance(agmarknet_rates, dict):
        rows = agmarknet_rates.get("rows")
        title = agmarknet_rates.get("title")
        agmarknet_summary = {
            "title": title if isinstance(title, str) else None,
            "row_count": len(rows) if isinstance(rows, list) else 0,
        }

    payload: Dict[str, Any] = {
        "context": {
            "crop": crop,
            "district": district,
            "state": state,
        },
        "stats": {
            "total_records": len(all_records),
            "market_count": len(markets),
            "markets_sample": sorted(markets)[:8],
            "dominant_district": dominant_district,
            "daily_averages": day_avgs,
            "price_band_window": price_band,
            "trend_pct_first_to_last": trend_pct,
        },
        "agmarknet": agmarknet_summary,
    }
    if crop_health:
        payload["crop_health"] = crop_health
    return payload


def _fallback_summary(payload: Dict[str, Any]) -> str:
    stats = payload.get("stats", {})
    total = stats.get("total_records", 0)
    if total == 0:
        return "No mandi price records were available for this query."

    market_count = stats.get("market_count", 0)
    daily = stats.get("daily_averages") or []
    latest_avg = daily[-1].get("avg_modal_price") if daily else None
    trend = stats.get("trend_pct_first_to_last")
    band = stats.get("price_band_window") or {}
    band_text = (
        f"Modal prices ranged ₹{band.get('min_modal_price')} to ₹{band.get('max_modal_price')}."
        if band.get("min_modal_price") is not None and band.get("max_modal_price") is not None
        else ""
    )
    trend_text = (
        f"The week-on-week change is {trend:+.2f}%."
        if isinstance(trend, (int, float))
        else "Week-on-week trend could not be computed."
    )
    latest_text = (
        f"Latest daily average modal price is ₹{latest_avg}."
        if latest_avg is not None
        else "Latest daily average is unavailable."
    )

    crop_health = payload.get("crop_health") or {}
    field = crop_health.get("field_classification") or {}
    health_text = ""
    if field:
        veg = field.get("vegetation_coverage_percent")
        healthy = field.get("healthy_percent")
        stressed = field.get("stressed_percent")
        if isinstance(veg, (int, float)) and isinstance(healthy, (int, float)) and isinstance(stressed, (int, float)):
            health_text = (
                f" Field signal shows {veg:.1f}% vegetation cover with "
                f"{healthy:.1f}% healthy and {stressed:.1f}% stressed."
            )

    return (
        f"The dataset contains {total} mandi record(s) across {market_count} market(s). "
        f"{latest_text} {band_text} {trend_text}{health_text}"
    ).strip()


def generate_mandi_summary(
    govdata_rates: Optional[List[Dict[str, Any]]],
    agmarknet_rates: Optional[Dict[str, Any]] = None,
    crop: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    crop_health_summary: Optional[Dict[str, Any]] = None,
) -> str:
    payload = _build_payload(
        govdata_rates if isinstance(govdata_rates, list) else [],
        agmarknet_rates,
        crop,
        district,
        state,
        crop_health_summary,
    )

    if payload["stats"]["total_records"] == 0:
        return _fallback_summary(payload)

    user_message = (
        "Read this mandi + crop-health JSON and produce the paragraph. "
        "Stick strictly to the figures shown. Do not advise on selling or holding.\n\n"
        f"{json.dumps(payload, ensure_ascii=True)}"
    )

    try:
        return invoke_text_completion(SYSTEM_PROMPT, user_message, max_tokens=320)
    except NvidiaClientError as exc:
        logger.warning(f"[mandi_service] LLM unavailable, using fallback: {exc}")
        return _fallback_summary(payload)
