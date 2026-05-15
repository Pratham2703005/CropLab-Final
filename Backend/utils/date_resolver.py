from datetime import date
import logging

logger = logging.getLogger(__name__)

def resolve_reference_date(cultivation_date: date, harvest_date: date) -> date:
    """Resolve the reference date for satellite-imagery sampling.

    - Crop is currently growing → today.
    - Crop is already harvested → the harvest date.
    - Crop hasn't been planted yet → today as well, so the year-over-year
      baseline for the same calendar window can still be built. The current
      year's raster will show pre-cultivation conditions (bare soil etc.)
      which is fine for context; the prior years' NDVI for the same window
      is what's actually informative in this case.
    """
    now = date.today()

    if cultivation_date <= now <= harvest_date:
        logger.info(
            f"Crop is growing (between {cultivation_date} and {harvest_date}), "
            f"using today as reference: {now}"
        )
        return now
    if harvest_date < now:
        logger.info(
            f"Crop harvested (harvest was {harvest_date}), using harvest date as reference"
        )
        return harvest_date
    # Cultivation is in the future. Don't fail - fall back to today so the
    # 5-year prior-window NDVI baseline still renders in the trend chart.
    logger.info(
        f"Cultivation has not started yet (starts {cultivation_date}); "
        f"using today as reference for prior-year baseline: {now}"
    )
    return now

def get_historical_dates(reference_date: date) -> list:
    """Get reference date and previous 2 years"""
    return [
        reference_date,
        reference_date.replace(year=reference_date.year - 1),
        reference_date.replace(year=reference_date.year - 2)
    ]
