from datetime import date
import logging
import numpy as np
from concurrent.futures import ThreadPoolExecutor

from .date_resolver import resolve_reference_date, get_historical_dates
from .crop_health_gee import fetch_all_ndvi, fetch_ndvi_for_date, ServiceError
from .crop_health_classifier import compute_anomaly, classify_pixels, generate_tile_urls
from .crop_health_stats import compute_summary_stats

logger = logging.getLogger(__name__)

YEARLY_TREND_LOOKBACK_YEARS = 5


def _shift_year(reference_date: date, years_back: int) -> date:
    """Return reference_date moved back by N years; handle Feb-29 safely."""
    target_year = reference_date.year - years_back
    try:
        return reference_date.replace(year=target_year)
    except ValueError:
        # Feb 29 -> Feb 28 in non-leap target year.
        return reference_date.replace(year=target_year, day=28)


def _build_yearly_trend_dates(reference_date: date) -> list[date]:
    """Build a same-calendar-date sampling schedule for the last N years.

    Returns N points (default 5): the reference date plus the same month/day
    in each of the previous N-1 years. This lets the UI show year-over-year
    NDVI for the same growing window instead of mixing different gaps.
    """
    return [
        _shift_year(reference_date, years_back)
        for years_back in range(YEARLY_TREND_LOOKBACK_YEARS)
    ]


def _compute_mean_ndvi(raster: np.ndarray) -> float | None:
    """Return mean NDVI over finite pixels, or None if no valid pixels."""
    valid_pixels = np.isfinite(raster)
    if not np.any(valid_pixels):
        return None
    return float(np.mean(raster[valid_pixels]))

def analyze_crop_health(
    geometry: list,
    cultivation_date: date,
    harvest_date: date
) -> dict:
    """
    Analyze crop health using satellite imagery.
    
    Args:
        geometry: [[lon, lat], [lon, lat], ...] polygon vertices (GeoJSON format, passed directly to ee.Geometry.Polygon)
        cultivation_date: date object
        harvest_date: date object
    
    Returns:
        {
            "reference_date": "YYYY-MM-DD",
            "years_used": ["YYYY-MM-DD", "YYYY-MM-DD", "YYYY-MM-DD"],
            "tile_urls": {
                "current_ndvi": "https://...",
                "anomaly_classified": "https://..."
            },
            "summary": {
                "healthy_percent": float,
                "stressed_percent": float,
                "unclassified_percent": float
            },
            "cache_hits": [bool, bool, bool]
        }
    """
    logger.info("=" * 60)
    logger.info("Starting crop health analysis...")
    logger.info(f"Cultivation: {cultivation_date}, Harvest: {harvest_date}")
    
    # Step 1: Resolve reference date
    reference_date = resolve_reference_date(cultivation_date, harvest_date)
    logger.info(f"✅ Reference date: {reference_date}")
    
    # Step 2: Get historical dates
    dates_to_fetch = get_historical_dates(reference_date)
    dates_str = [d.strftime("%Y-%m-%d") for d in dates_to_fetch]
    logger.info(f"✅ Dates to fetch: {dates_str}")
    
    # Step 3: Fetch NDVI data
    logger.info("Fetching NDVI rasters...")
    ndvi_rasters = fetch_all_ndvi(geometry, dates_str)
    logger.info(f"✅ NDVI fetched (cache hits: {ndvi_rasters['cache_hits']})")
    
    # Step 4: Compute anomaly
    logger.info("Computing anomaly...")
    anomaly = compute_anomaly(ndvi_rasters)
    logger.info("✅ Anomaly computed")
    
    # Step 5: Classify pixels
    logger.info("Classifying pixels...")
    # Get current NDVI - fallback to year_1 if current is unavailable
    if ndvi_rasters['current'] is not None:
        current_ndvi = ndvi_rasters['current']['raster']
    elif ndvi_rasters['year_1'] is not None:
        logger.warning("⚠️ Using year_1 data for classification (current unavailable)")
        current_ndvi = ndvi_rasters['year_1']['raster']
    else:
        logger.warning("⚠️ Using year_2 data for classification (current and year_1 unavailable)")
        current_ndvi = ndvi_rasters['year_2']['raster']
    
    classified_image = classify_pixels(current_ndvi, anomaly)
    logger.info("✅ Pixels classified")
    
    # Step 6: Generate tile URLs
    logger.info("Generating tile URLs...")
    tile_urls = generate_tile_urls(current_ndvi, anomaly, geometry)
    logger.info("✅ Tile URLs generated")
    
    # Step 7: Compute summary stats
    logger.info("Computing statistics...")
    summary = compute_summary_stats(classified_image)
    logger.info("✅ Statistics computed")
    
    # Step 8: Calculate yearly NDVI trend used historically in response
    logger.info("Calculating NDVI trend...")
    ndvi_trend_yearly = []
    year_keys = ['current', 'year_1', 'year_2']
    for i, year_key in enumerate(year_keys):
        if year_key in ndvi_rasters and ndvi_rasters[year_key] is not None:
            raster = ndvi_rasters[year_key].get('raster')
            date_used = ndvi_rasters[year_key].get('date_used', dates_str[i])
            if raster is not None:
                mean_ndvi = _compute_mean_ndvi(raster)
                if mean_ndvi is not None:
                    ndvi_trend_yearly.append({
                        "date": date_used,
                        "mean_ndvi": round(mean_ndvi, 4)
                    })
                    logger.info(f"  {date_used}: mean_ndvi = {mean_ndvi:.4f}")
    logger.info("✅ Yearly NDVI trend calculated")

    # Step 8b: Calculate same-month NDVI for the last 5 years.
    # One point per year at the same calendar date as the reference date so
    # the UI can show year-over-year change instead of mixing time gaps.
    logger.info(
        f"Calculating yearly NDVI trend for last {YEARLY_TREND_LOOKBACK_YEARS} years..."
    )
    yearly_trend_dates_str = [
        d.strftime("%Y-%m-%d") for d in _build_yearly_trend_dates(reference_date)
    ]

    def _fetch_trend_point(date_str: str):
        try:
            # Slightly broader cloud tolerance for historical sampling stability.
            point = fetch_ndvi_for_date(
                geometry,
                date_str,
                window_days=30,
                cloud_threshold=40,
            )
            if not point:
                return None
            raster = point.get('raster')
            if raster is None:
                return None
            mean_ndvi = _compute_mean_ndvi(raster)
            if mean_ndvi is None:
                return None
            return {
                "date": point.get('date_used', date_str),
                "mean_ndvi": round(mean_ndvi, 4),
            }
        except Exception as exc:
            logger.warning(f"Trend sampling failed for {date_str}: {exc}")
            return None

    with ThreadPoolExecutor(max_workers=YEARLY_TREND_LOOKBACK_YEARS) as executor:
        sampled = list(executor.map(_fetch_trend_point, yearly_trend_dates_str))
    ndvi_trend = [p for p in sampled if p is not None]
    ndvi_trend.sort(key=lambda x: x['date'])

    if len(ndvi_trend) < 2:
        logger.warning("Insufficient sampled NDVI points; using yearly trend fallback")
        ndvi_trend = ndvi_trend_yearly

    logger.info(f"✅ Final NDVI trend points for UI: {len(ndvi_trend)}")
    
    # Step 9: Build response
    result = {
        "reference_date": reference_date.strftime("%Y-%m-%d"),
        "years_used": dates_str,
        "tile_urls": tile_urls,
        "summary": summary,
        "ndvi_trend": ndvi_trend,
        "ndvi_trend_yearly": ndvi_trend_yearly,
        "cache_hits": ndvi_rasters['cache_hits']
    }
    
    logger.info("=" * 60)
    logger.info("✅ Analysis complete!")
    return result
