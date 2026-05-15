"""Mandi rate analysis service.

Produces a one-paragraph reading of agmarknet wholesale-prices monthly trends
fused with the farm's current crop-health signals from satellite imagery.
The model is allowed to state factual implications between the two data
sources but cannot prescribe buy/sell/hold actions.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from .nvidia_client import NvidiaClientError, invoke_text_completion

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are an agricultural analyst. The JSON below contains (a) an agmarknet "
    "6-month wholesale-price monthly trend for the farmer's district (with the "
    "state-wide average for comparison) and (b) the farm's current crop-health "
    "signals from satellite imagery. Produce ONE short paragraph (max ~110 "
    "words) the farmer can read at a glance.\n\n"
    "Communicate, in roughly this order:\n"
    "1. The latest monthly modal price for the farmer's district and the "
    "direction of the 6-month trend (up / down / flat).\n"
    "2. How the district compares to the state average right now (above/below "
    "by ₹X per quintal).\n"
    "3. Month-over-month and year-over-year change percentages.\n"
    "4. One sentence on field condition using vegetation_coverage_percent, the "
    "healthy/stressed split, and where this year's NDVI sits versus the prior "
    "years' mean if shown.\n"
    "5. A short factual implication linking the price trend to the crop signal "
    "— e.g. 'softening prices coincide with above-average canopy'. State the "
    "linkage; do NOT prescribe buying, selling, or holding.\n\n"
    "Hard rules:\n"
    "- Use only numbers, dates, and names that appear in the JSON. Never invent.\n"
    "- No markdown. No bullet points. No headers. Plain prose only.\n"
    "- Keep the tone neutral and factual.\n"
    "- If agmarknet trend is absent, say so plainly and skip parts 1-3.\n"
    "- If crop_health is absent, skip part 4 and the linkage in part 5."
)


MONTH_NAMES = (
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
)


def _safe_float(value, default=None):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_price_key(key: str) -> Tuple[int, int]:
    """`prices_may_2026` → (2026, 5). Returns (0, 0) on parse failure."""
    parts = key.replace("prices_", "").split("_")
    if len(parts) < 2:
        return (0, 0)
    try:
        year = int(parts[-1])
    except ValueError:
        year = 0
    try:
        month_idx = MONTH_NAMES.index(parts[0].lower()) + 1
    except ValueError:
        month_idx = 0
    return (year, month_idx)


def _extract_series(row: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Pull `prices_<month>_<year>` columns out of a row, chronologically sorted."""
    series: List[Dict[str, Any]] = []
    for k, v in row.items():
        if not isinstance(k, str) or not k.startswith("prices_"):
            continue
        price = _safe_float(v)
        if price is None:
            continue
        year, month = _parse_price_key(k)
        if year == 0:
            continue
        series.append(
            {
                "year": year,
                "month": month,
                "label": f"{MONTH_NAMES[month - 1].capitalize()} {year}",
                "price": round(price, 2),
            }
        )
    series.sort(key=lambda p: (p["year"], p["month"]))
    return series


def _find_district_row(
    agmarknet_rates: Dict[str, Any], district: Optional[str]
) -> Optional[Dict[str, Any]]:
    rows = agmarknet_rates.get("rows")
    if not isinstance(rows, list) or not rows:
        return None
    if district:
        target = district.strip().lower()
        for r in rows:
            if isinstance(r, dict):
                name = r.get("district")
                if isinstance(name, str) and name.strip().lower() == target:
                    return r
    return None


def _build_payload(
    agmarknet_rates: Optional[Dict[str, Any]],
    crop: Optional[str],
    district: Optional[str],
    state: Optional[str],
    crop_health: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    agmarknet_block: Optional[Dict[str, Any]] = None
    has_trend = False

    if isinstance(agmarknet_rates, dict) and agmarknet_rates.get("success"):
        rows = agmarknet_rates.get("rows") or []
        district_row = _find_district_row(agmarknet_rates, district)
        district_series = _extract_series(district_row) if district_row else []
        average_row = agmarknet_rates.get("average")
        state_series = (
            _extract_series(average_row) if isinstance(average_row, dict) else []
        )

        latest_district = district_series[-1]["price"] if district_series else None
        first_district = district_series[0]["price"] if district_series else None
        district_pct_change: Optional[float] = None
        if (
            latest_district is not None
            and first_district is not None
            and first_district > 0
        ):
            district_pct_change = round(
                ((latest_district - first_district) / first_district) * 100.0, 2
            )

        latest_state = state_series[-1]["price"] if state_series else None
        latest_vs_state_avg: Optional[float] = None
        if latest_district is not None and latest_state is not None:
            latest_vs_state_avg = round(latest_district - latest_state, 2)

        change_mom = None
        change_yoy = None
        if district_row:
            change_mom = _safe_float(district_row.get("change_over_previous_month"))
            change_yoy = _safe_float(district_row.get("change_over_previous_year"))

        agmarknet_block = {
            "title": agmarknet_rates.get("title"),
            "district_resolved": district_row.get("district") if district_row else None,
            "district_series": district_series,
            "state_average_series": state_series,
            "latest_month_label": (
                district_series[-1]["label"] if district_series else None
            ),
            "latest_district_modal_price": latest_district,
            "latest_state_average_modal_price": latest_state,
            "latest_vs_state_average_diff": latest_vs_state_avg,
            "district_trend_pct_first_to_last": district_pct_change,
            "change_over_previous_month_pct": change_mom,
            "change_over_previous_year_pct": change_yoy,
            "district_count": len([r for r in rows if isinstance(r, dict)]),
            "price_unit": "INR per quintal",
        }
        has_trend = bool(district_series)

    payload: Dict[str, Any] = {
        "context": {
            "crop": crop,
            "district": district,
            "state": state,
        },
        "agmarknet": agmarknet_block,
        "has_trend": has_trend,
    }
    if crop_health:
        payload["crop_health"] = crop_health
    return payload


def _fallback_summary(payload: Dict[str, Any]) -> str:
    block = payload.get("agmarknet")
    if not block or not payload.get("has_trend"):
        return "No mandi price trend was available for this query."

    latest_label = block.get("latest_month_label")
    latest = block.get("latest_district_modal_price")
    latest_state = block.get("latest_state_average_modal_price")
    diff = block.get("latest_vs_state_average_diff")
    pct = block.get("district_trend_pct_first_to_last")
    mom = block.get("change_over_previous_month_pct")
    yoy = block.get("change_over_previous_year_pct")
    district = block.get("district_resolved") or payload.get("context", {}).get("district")
    crop = payload.get("context", {}).get("crop")

    parts: List[str] = []
    if crop and district and latest is not None and latest_label:
        parts.append(
            f"Latest {crop} modal price in {district} for {latest_label} is "
            f"₹{latest}/quintal."
        )
    if latest_state is not None and diff is not None:
        direction = "above" if diff >= 0 else "below"
        parts.append(
            f"That is ₹{abs(diff)} {direction} the state-wide average "
            f"(₹{latest_state}/quintal)."
        )
    if pct is not None:
        parts.append(
            f"Over the last 6 months the district trend is "
            f"{'+' if pct >= 0 else ''}{pct}%."
        )
    if mom is not None or yoy is not None:
        mom_s = f"{mom}%" if mom is not None else "N/A"
        yoy_s = f"{yoy}%" if yoy is not None else "N/A"
        parts.append(f"Month-over-month change is {mom_s}; year-over-year is {yoy_s}.")

    crop_health = payload.get("crop_health") or {}
    field = crop_health.get("field_classification") or {}
    if field:
        veg = field.get("vegetation_coverage_percent")
        healthy = field.get("healthy_percent")
        stressed = field.get("stressed_percent")
        if isinstance(veg, (int, float)) and isinstance(healthy, (int, float)) and isinstance(stressed, (int, float)):
            parts.append(
                f"Field signal shows {veg:.1f}% vegetation cover with "
                f"{healthy:.1f}% healthy and {stressed:.1f}% stressed."
            )

    return " ".join(parts).strip() or "Mandi trend summary unavailable."


def generate_mandi_summary(
    govdata_rates: Optional[List[Dict[str, Any]]] = None,  # legacy, ignored
    agmarknet_rates: Optional[Dict[str, Any]] = None,
    crop: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    crop_health_summary: Optional[Dict[str, Any]] = None,
) -> str:
    _ = govdata_rates  # accepted for backwards compatibility; not used
    payload = _build_payload(
        agmarknet_rates,
        crop,
        district,
        state,
        crop_health_summary,
    )

    if not payload.get("has_trend"):
        return _fallback_summary(payload)

    user_message = (
        "Read this agmarknet trend + crop-health JSON and produce the paragraph. "
        "Stick strictly to the figures shown. Do not advise on selling or holding.\n\n"
        f"{json.dumps(payload, ensure_ascii=True)}"
    )

    try:
        return invoke_text_completion(SYSTEM_PROMPT, user_message, max_tokens=320)
    except NvidiaClientError as exc:
        logger.warning(f"[mandi_service] LLM unavailable, using fallback: {exc}")
        return _fallback_summary(payload)
