# app.py

from dotenv import load_dotenv
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
import numpy as np
import io
import base64
import logging
import merged_processor
import utils.crop_health_gee
from utils.crop_health_analyzer import analyze_crop_health
from utils.ai_services import generate_news_summary, generate_mandi_summary

app = FastAPI(
    title="Crop Yield Prediction API",
    description="AI-powered crop yield prediction with satellite imagery and soil sensor data",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],  # Allows all headers
)

# --- Configure logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gee_status = None
gee_error = None

# --- Startup event to initialize GEE ---
@app.on_event("startup")
async def startup_event():
    """Initialize Google Earth Engine when server starts"""
    global gee_status, gee_error
    try:
        logger.info("🚀 Server startup - Initializing Google Earth Engine (this may take a moment)...")
        start_time = datetime.now()
        
        gee_status = merged_processor.initialize_earth_engine()
        
        elapsed = (datetime.now() - start_time).total_seconds()
        if gee_status:
            logger.info(f"✅ Google Earth Engine ready in {elapsed:.2f}s")
        else:
            gee_error = "GEE initialization returned False - check credentials"
            logger.error(f"❌ GEE initialization failed: {gee_error}")
    except Exception as e:
        gee_error = str(e)
        logger.error(f"❌ Error initializing GEE at startup: {e}")
        logger.warning("⚠️  API will still start but GEE-dependent endpoints will fail")
        logger.warning("💡 Check system clock sync: Right-click Windows clock → 'Adjust date/time' → 'Sync now'")

# Pydantic models

def get_corresponding_date():
    """Legacy fallback: use the most recent expected Sentinel-2 revisit date.

    Returns a date a few days behind today so the GEE search window has a
    chance of finding a cloud-free tile. Only used when the request did not
    supply a cultivation/harvest range.
    """
    current = date.today()
    # 7 days behind current date - within Sentinel-2's 5-day revisit and the
    # GEE fetcher's window-expansion retries.
    fallback = current - timedelta(days=7)
    return fallback.strftime("%Y-%m-%d")


def resolve_lite_reference_date(cultivation_date, harvest_date):
    """Pick the satellite imagery date for a /generate_heatmap_lite request.

    - If the crop is currently growing (cultivation <= today <= harvest):
      use today's date (or shortly behind for revisit availability).
    - If already harvested: use the harvest date.
    - If the crop hasn't started yet OR no dates were provided: fall back
      to the legacy near-today behaviour.

    Returns YYYY-MM-DD string ready for the GEE fetcher.
    """
    today = date.today()
    if cultivation_date and harvest_date:
        if cultivation_date <= today <= harvest_date:
            # Step back a week so Sentinel-2 has had a recent revisit.
            ref = today - timedelta(days=7)
            # Don't go before cultivation.
            if ref < cultivation_date:
                ref = cultivation_date
            return ref.strftime("%Y-%m-%d")
        if harvest_date < today:
            return harvest_date.strftime("%Y-%m-%d")
        # Cultivation is in the future - fall through to fallback.
    return get_corresponding_date()

def sanitize_json_response(obj):
    """Recursively sanitize response to remove inf/-inf/-nan values that break JSON serialization"""
    if isinstance(obj, dict):
        return {k: sanitize_json_response(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json_response(item) for item in obj]
    elif isinstance(obj, float):
        if np.isinf(obj) or np.isnan(obj):
            return None  # Replace inf/-inf/nan with null
        return obj
    elif isinstance(obj, np.ndarray):
        return sanitize_json_response(obj.tolist())
    else:
        return obj


class HeatmapRequest(BaseModel):
    coordinates: List[List[float]]  # List of [longitude, latitude] points
    t1: float = 3.0  # Threshold for low yield
    t2: float = 4.5  # Threshold for high yield
    cultivation_date: Optional[date] = None  # Optional: crop cultivation start date
    harvest_date: Optional[date] = None  # Optional: crop harvest date
    state: Optional[str] = None  # Optional: state name for news query
    crop: Optional[str] = None  # Optional: crop name for news query

class CropHealthRequest(BaseModel):
    geometry: List[List[float]]  # [[lon, lat], [lon, lat], ...] (GeoJSON format)
    cultivation_date: date
    harvest_date: date

# Health check endpoints
@app.get("/")
@app.get("/health")
async def health_check():
    """Health check and root endpoint for monitoring"""
    return {
        "status": "healthy" if gee_status else "unhealthy",
        "message": "🌾 Crop Yield Prediction API is running",
        "components": {
            "google_earth_engine": "connected" if gee_status else f"error: {gee_error}"
        },
        "version": "1.0.0",
        "endpoints": {
            "/generate_heatmap_lite": "Generate color-coded heatmap (CSV-based yield, no ML)",
            "/export_arrays": "Export NDVI and sensor arrays as .npz file",
            "/crop_health/analyze": "Analyze crop health using multi-year satellite imagery"
        }
    }

@app.get("/debug/env")
async def debug_env():
    """Report whether required env vars are loaded (no values exposed)."""
    import os
    keys = ["NEWSAPI_KEY", "GOVDATA_API_KEY"]
    return {
        k: {
            "set": bool(os.getenv(k)),
            "length": len(os.getenv(k) or ""),
        }
        for k in keys
    }


def _build_crop_health_for_ai(
    anomaly_data: Optional[dict],
    ndvi_pixel_counts: Optional[dict],
    ndwi_pixel_counts: Optional[dict],
    ndre_pixel_counts: Optional[dict],
) -> Optional[dict]:
    """Compact summary of the farm's satellite-derived health for the mandi LLM."""
    out: dict = {}

    if isinstance(anomaly_data, dict):
        summary = anomaly_data.get("summary") or {}
        if isinstance(summary, dict) and summary:
            out["field_classification"] = {
                k: summary.get(k)
                for k in (
                    "vegetation_coverage_percent",
                    "healthy_percent",
                    "stressed_percent",
                    "sparse_percent",
                )
                if summary.get(k) is not None
            }
        trend = anomaly_data.get("ndvi_trend") or anomaly_data.get("ndvi_trend_yearly")
        if isinstance(trend, list) and trend:
            # Keep at most last 5 points.
            out["ndvi_trend_yearly"] = trend[-5:]

    def _pct_dist(counts: Optional[dict]) -> Optional[dict]:
        if not isinstance(counts, dict):
            return None
        numeric = {k: v for k, v in counts.items() if isinstance(v, (int, float)) and k != "valid"}
        total = sum(numeric.values())
        if total <= 0:
            return None
        return {k: round((v / total) * 100, 1) for k, v in numeric.items()}

    ndvi_dist = _pct_dist(ndvi_pixel_counts)
    if ndvi_dist:
        out["ndvi_distribution_pct"] = ndvi_dist
    ndwi_dist = _pct_dist(ndwi_pixel_counts)
    if ndwi_dist:
        out["ndwi_distribution_pct"] = ndwi_dist
    ndre_dist = _pct_dist(ndre_pixel_counts)
    if ndre_dist:
        out["ndre_distribution_pct"] = ndre_dist

    return out or None


@app.post("/generate_heatmap_lite")
async def generate_heatmap_lite(request: HeatmapRequest):
    """
    Lightweight heatmap generation without ML model inference or sensor data.
    Runs NDVI/NDWI/NDRE, multi-year anomaly, news, mandi rates, and the
    NVIDIA-LLM summaries all in parallel server-side, then returns one merged
    JSON response. The mandi AI summary is fused with the farm's crop-health
    signals so the farmer reads price + field condition in one paragraph.
    """
    if not gee_status:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google Earth Engine: {gee_error}")

    try:
        date_str = resolve_lite_reference_date(request.cultivation_date, request.harvest_date)
        logger.info(f"[lite] Using date: {date_str}")
        logger.info(
            f"[lite] Request fields received: state={request.state!r}, crop={request.crop!r}, "
            f"cultivation_date={request.cultivation_date}, harvest_date={request.harvest_date}"
        )

        geojson_dict = {
            "type": "Feature",
            "properties": {},
            "geometry": {"type": "Polygon", "coordinates": [request.coordinates]},
        }

        ndvi_data, _, sat_image = merged_processor.generate_ndvi_and_sensor_npy(
            geojson_dict, date_str, skip_sensor=True
        )
        if ndvi_data is None:
            raise HTTPException(status_code=400, detail="Failed to generate NDVI data from coordinates")

        # --- Resolve location from polygon centroid ---
        centroid_lat, centroid_lon = merged_processor.get_centroid_coordinates(geojson_dict)
        location_info = {
            "district": "unknown",
            "state": None,
            "coordinates": {"latitude": None, "longitude": None},
            "complete_address": "Location not available",
        }
        resolved_state = request.state
        if centroid_lat is not None and centroid_lon is not None:
            district, detected_state, complete_location = merged_processor.get_district_and_location_sync(
                centroid_lat, centroid_lon
            )
            if not resolved_state and detected_state:
                logger.info(f"[lite] state not in request; using detected state={detected_state!r}")
                resolved_state = detected_state
            location_info = {
                "district": district,
                "state": detected_state,
                "coordinates": {"latitude": centroid_lat, "longitude": centroid_lon},
                "complete_address": complete_location,
            }
            logger.info(f"[lite] District: {district}")
        else:
            logger.warning("[lite] Could not get district information from polygon centroid")

        # --- NDVI masks (the primary map data) ---
        red_mask, yellow_mask, green_mask, pixel_counts = merged_processor.create_separate_yield_masks(
            ndvi_data, 1.0, request.t1, request.t2
        )
        if red_mask is None or yellow_mask is None or green_mask is None:
            raise HTTPException(status_code=500, detail="Failed to generate heatmap masks")

        import PIL.Image

        def mask_to_base64(mask_array):
            img = PIL.Image.fromarray(mask_array, "RGBA")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("ascii")

        red_base64 = mask_to_base64(red_mask)
        yellow_base64 = mask_to_base64(yellow_mask)
        green_base64 = mask_to_base64(green_mask)

        ndvi_range_base64 = None
        ndvi_range_meta = None
        try:
            ndvi_range_array, ndvi_range_meta = merged_processor.create_index_range_mask(
                ndvi_data, merged_processor.NDVI_RANGE_CONFIG
            )
            if ndvi_range_array is not None:
                ndvi_range_base64 = mask_to_base64(ndvi_range_array)
        except Exception as exc:
            logger.warning(f"[lite] ⚠️  NDVI range mask generation failed (non-blocking): {exc}")

        # --- Run all slow jobs in parallel ---
        from concurrent.futures import ThreadPoolExecutor
        from utils.news_fetcher import fetch_agri_news
        from utils.rates_fetcher import fetch_govdata_last_n_days, fetch_agmarknet

        def _ndwi_job():
            logger.info("[lite] Calculating NDWI...")
            return utils.crop_health_gee.fetch_ndwi_for_date(request.coordinates, date_str, sat_image)

        def _ndre_job():
            logger.info("[lite] Calculating NDRE...")
            return utils.crop_health_gee.fetch_ndre_for_date(request.coordinates, date_str, sat_image)

        def _anomaly_job():
            if not (request.cultivation_date and request.harvest_date):
                return None
            try:
                logger.info("[lite] Running crop health analysis...")
                data = analyze_crop_health(
                    geometry=request.coordinates,
                    cultivation_date=request.cultivation_date,
                    harvest_date=request.harvest_date,
                )
                logger.info("[lite] ✅ Crop health analysis complete")
                return data
            except Exception as e:
                logger.warning(f"[lite] ⚠️  Crop health analysis failed (non-blocking): {e}")
                return None

        def _news_job():
            try:
                articles = fetch_agri_news(state=resolved_state, crop=request.crop)
                return articles or []
            except Exception as e:
                logger.warning(f"[lite] ⚠️  News fetch failed (non-blocking): {e}")
                return []

        def _rate_job():
            try:
                govdata = fetch_govdata_last_n_days(state=resolved_state, crop=request.crop, days=7) if resolved_state else []
            except Exception as e:
                logger.warning(f"[lite] ⚠️  govdata fetch failed (non-blocking): {e}")
                govdata = []
            try:
                agmarknet = fetch_agmarknet(state=resolved_state, crop=request.crop)
            except Exception as e:
                logger.warning(f"[lite] ⚠️  agmarknet fetch failed (non-blocking): {e}")
                agmarknet = None
            return govdata or [], agmarknet

        with ThreadPoolExecutor(max_workers=6) as pool:
            f_ndwi = pool.submit(_ndwi_job)
            f_ndre = pool.submit(_ndre_job)
            f_anom = pool.submit(_anomaly_job)
            f_news = pool.submit(_news_job)
            f_rate = pool.submit(_rate_job)
            ndwi_result = f_ndwi.result()
            ndre_result = f_ndre.result()
            anomaly_data = f_anom.result()
            news_articles = f_news.result()
            govdata_rates, agmarknet_rates = f_rate.result()

        # --- Build NDWI / NDRE mask payloads ---
        ndwi_masks_response: dict = {}
        ndwi_pixel_counts: dict = {}
        if ndwi_result is not None:
            ndwi_values = ndwi_result["raster"].astype(np.float32)
            ndwi_brown_mask, ndwi_yellow_mask, ndwi_light_blue_mask, ndwi_pixel_counts = merged_processor.create_separate_ndwi_masks(
                ndwi_values
            )
            if ndwi_brown_mask is not None:
                ndwi_masks_response = {
                    "brown_mask_base64": mask_to_base64(ndwi_brown_mask),
                    "yellow_mask_base64": mask_to_base64(ndwi_yellow_mask),
                    "light_blue_mask_base64": mask_to_base64(ndwi_light_blue_mask),
                }
                try:
                    ndwi_range_array, ndwi_range_meta = merged_processor.create_index_range_mask(
                        ndwi_values, merged_processor.NDWI_RANGE_CONFIG
                    )
                    if ndwi_range_array is not None:
                        ndwi_masks_response["range_mask_base64"] = mask_to_base64(ndwi_range_array)
                        ndwi_masks_response["range_meta"] = ndwi_range_meta
                except Exception as exc:
                    logger.warning(f"[lite] ⚠️  NDWI range mask generation failed (non-blocking): {exc}")

        ndre_masks_response: dict = {}
        ndre_pixel_counts: dict = {}
        if ndre_result is not None:
            ndre_values = ndre_result["raster"].astype(np.float32)
            ndre_purple_mask, ndre_pink_mask, ndre_light_green_mask, ndre_dark_green_mask, ndre_pixel_counts = merged_processor.create_separate_ndre_masks(
                ndre_values
            )
            if ndre_purple_mask is not None:
                ndre_masks_response = {
                    "purple_mask_base64": mask_to_base64(ndre_purple_mask),
                    "pink_mask_base64": mask_to_base64(ndre_pink_mask),
                    "light_green_mask_base64": mask_to_base64(ndre_light_green_mask),
                    "dark_green_mask_base64": mask_to_base64(ndre_dark_green_mask),
                }
                try:
                    ndre_range_array, ndre_range_meta = merged_processor.create_index_range_mask(
                        ndre_values, merged_processor.NDRE_RANGE_CONFIG
                    )
                    if ndre_range_array is not None:
                        ndre_masks_response["range_mask_base64"] = mask_to_base64(ndre_range_array)
                        ndre_masks_response["range_meta"] = ndre_range_meta
                except Exception as exc:
                    logger.warning(f"[lite] ⚠️  NDRE range mask generation failed (non-blocking): {exc}")

        trimmed_pixel_counts = {
            k: v for k, v in pixel_counts.items()
            if k not in ("transparent", "total_field")
        }

        ndvi_masks_response = {
            "red_mask_base64": red_base64,
            "yellow_mask_base64": yellow_base64,
            "green_mask_base64": green_base64,
        }
        if ndvi_range_base64 is not None:
            ndvi_masks_response["range_mask_base64"] = ndvi_range_base64
            ndvi_masks_response["range_meta"] = ndvi_range_meta

        # --- LLM summaries in parallel; mandi gets the crop-health context ---
        crop_health_summary = _build_crop_health_for_ai(
            anomaly_data,
            trimmed_pixel_counts,
            ndwi_pixel_counts,
            ndre_pixel_counts,
        )

        district_arg = (
            location_info.get("district")
            if isinstance(location_info, dict)
            else None
        )
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_news_ai = pool.submit(
                generate_news_summary,
                news_articles or [],
                crop=request.crop,
                state=resolved_state,
            )
            f_mandi_ai = pool.submit(
                generate_mandi_summary,
                govdata_rates or [],
                agmarknet_rates,
                crop=request.crop,
                district=district_arg,
                state=resolved_state,
                crop_health_summary=crop_health_summary,
            )
            news_ai_analysis = f_news_ai.result()
            mandi_ai_analysis = f_mandi_ai.result()

        response = {
            "location": location_info,
            "date_used": date_str,
            "masks": ndvi_masks_response,
            "ndwi-masks": ndwi_masks_response,
            "ndre-masks": ndre_masks_response,
            "pixel_counts": trimmed_pixel_counts,
            "ndwi_pixel_counts": ndwi_pixel_counts,
            "ndre_pixel_counts": ndre_pixel_counts,
            "news": news_articles or [],
            "news_ai_analysis": news_ai_analysis,
            "rate": {
                "govdata": govdata_rates or [],
                "agmarknet": agmarknet_rates,
            },
            "mandi_ai_analysis": mandi_ai_analysis,
        }

        if anomaly_data:
            response["anomaly"] = anomaly_data

        response = sanitize_json_response(response)
        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"[lite] Heatmap generation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {str(e)}")


@app.post("/export_arrays")
async def export_arrays(request: HeatmapRequest):
    """
    Utility endpoint: generate NDVI and sensor arrays for the provided coordinates
    and return them as a .npz file in-memory (no disk writes).
    """
    # --- Check GEE initialized ---
    if not gee_status:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Google Earth Engine: {gee_error}")

    try:

        date_str = get_corresponding_date()

        geojson_dict = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [request.coordinates]
            }
        }

        ndvi_data, sensor_data, _ = merged_processor.generate_ndvi_and_sensor_npy(geojson_dict, date_str)

        if ndvi_data is None or sensor_data is None:
            raise HTTPException(status_code=400, detail="Failed to generate arrays from coordinates")

        # Pack to in-memory .npz
        buf = io.BytesIO()
        np.savez(buf, ndvi=ndvi_data, sensor=sensor_data)
        buf.seek(0)

        return StreamingResponse(buf, media_type="application/octet-stream",
                                 headers={"Content-Disposition": "attachment; filename=arrays.npz"})

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Export arrays error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Export arrays failed: {str(e)}")


@app.post("/crop_health/analyze")
async def analyze_crop_health_api(request: CropHealthRequest):
    """
    Analyze crop health for given geometry and dates.
    
    Uses satellite imagery (NDVI) to assess crop health with:
    - Reference date determination based on cultivation and harvest dates
    - Multi-year comparison (current year vs. previous 2 years)
    - Anomaly detection and pixel classification (healthy/stressed)
    - Summary statistics and caching for performance
    
    Args:
        geometry: List of [longitude, latitude] pairs forming a polygon (GeoJSON format)
        cultivation_date: Crop cultivation start date (YYYY-MM-DD)
        harvest_date: Crop harvest date (YYYY-MM-DD)
    
    Returns:
        JSON with reference date, analyzed dates, tile URLs, summary stats, and cache info
    """
    try:
        if not gee_status:
            raise HTTPException(
                status_code=500,
                detail=f"Google Earth Engine not initialized: {gee_error}"
            )
        
        logger.info(f"Analyzing crop health for geometry with {len(request.geometry)} vertices")
        
        result = analyze_crop_health(
            geometry=request.geometry,
            cultivation_date=request.cultivation_date,
            harvest_date=request.harvest_date
        )
        
        return JSONResponse(content=result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Crop health analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Crop health analysis failed: {str(e)}")