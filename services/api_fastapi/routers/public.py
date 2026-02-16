"""Public API routes — no authentication required."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from config import Config
from models.schemas import (
    ErrorDetail,
    ErrorResponse,
    ForecastHealthDetail,
    ForecastHourlyResponse,
    ForecastResponse,
    HealthResponse,
    ModeScoreResponse,
    ReasonChipResponse,
    ScoredForecastResponse,
    ScoredHourResponse,
)
from scoring_engine import BALANCED_THRESHOLDS, score_hour
from scoring_engine.engine import HourData
from storage.firestore import get_forecast_doc

router = APIRouter(prefix="/v1/public", tags=["public"])

API_VERSION = "1.0.0"
SCORING_VERSION = "score_v2"


def _compute_freshness(updated_at_utc: str) -> tuple[int, str]:
    """Compute forecast age in minutes and freshness label."""
    updated = datetime.fromisoformat(updated_at_utc.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    age_minutes = int((now - updated).total_seconds() / 60)
    freshness = "fresh" if age_minutes < Config.FRESHNESS_THRESHOLD_MINUTES else "stale"
    return age_minutes, freshness


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(code=code, message=message),
        request_id=str(uuid.uuid4()),
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


@router.get("/forecast", response_model=None)
async def get_forecast(
    area_id: str = Query(default=None, description="Area identifier"),
    days: int = Query(default=7, ge=1, le=7, description="Forecast horizon (1-7 days)"),
) -> ForecastResponse | JSONResponse:
    if not area_id:
        return _error_response(400, "VALIDATION_ERROR", "area_id is required")

    if area_id != Config.AREA_ID:
        return _error_response(404, "NOT_FOUND", f"Unknown area_id: {area_id}")

    doc = get_forecast_doc(area_id)
    if doc is None:
        return _error_response(404, "NOT_FOUND", f"No forecast data for area_id: {area_id}")

    updated_at = doc.get("updated_at_utc", "")
    age_minutes, freshness = _compute_freshness(updated_at)

    # Filter hours to requested day range
    hours_data = doc.get("hours", [])
    now = datetime.now(timezone.utc)
    max_hours = days * 24
    filtered_hours = []
    for h in hours_data:
        hour_str = h.get("hour_utc", "")
        try:
            hour_dt = datetime.fromisoformat(hour_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        if hour_dt >= now and len(filtered_hours) < max_hours:
            filtered_hours.append(h)

    hours = [ForecastHourlyResponse(**h) for h in filtered_hours]

    return ForecastResponse(
        area_id=area_id,
        updated_at_utc=updated_at,
        provider=doc.get("provider", "open_meteo"),
        freshness=freshness,
        forecast_age_minutes=age_minutes,
        horizon_days=doc.get("horizon_days", 7),
        hours=hours,
    )


@router.get("/health", response_model=None)
async def get_health() -> HealthResponse:
    doc = get_forecast_doc(Config.AREA_ID)

    if doc is None:
        return HealthResponse(
            status="unhealthy",
            version=API_VERSION,
            scoring_version=SCORING_VERSION,
            forecast=ForecastHealthDetail(
                area_id=Config.AREA_ID,
                updated_at_utc="",
                age_minutes=-1,
                freshness="stale",
                ingest_status="failed",
                hours_count=0,
            ),
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
        )

    updated_at = doc.get("updated_at_utc", "")
    age_minutes, freshness = _compute_freshness(updated_at)
    ingest_status = doc.get("ingest_status", "unknown")
    hours_count = len(doc.get("hours", []))

    if age_minutes < Config.FRESHNESS_THRESHOLD_MINUTES and ingest_status == "success":
        status = "healthy"
    elif age_minutes >= Config.UNHEALTHY_THRESHOLD_MINUTES:
        status = "unhealthy"
    else:
        status = "degraded"

    return HealthResponse(
        status=status,
        version=API_VERSION,
        scoring_version=SCORING_VERSION,
        forecast=ForecastHealthDetail(
            area_id=Config.AREA_ID,
            updated_at_utc=updated_at,
            age_minutes=age_minutes,
            freshness=freshness,
            ingest_status=ingest_status,
            hours_count=hours_count,
        ),
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )


def _score_hour_data(h: dict) -> dict[str, ModeScoreResponse]:
    """Score a single hour's forecast data and return mode scores."""
    hour_str = h.get("hour_utc", "")
    try:
        hour_dt = datetime.fromisoformat(hour_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        hour_dt = datetime.now(timezone.utc)

    hour_data = HourData(
        hour_utc=hour_dt,
        wave_height_m=h.get("wave_height_m"),
        feelslike_c=h.get("feelslike_c"),
        gust_ms=h.get("gust_ms"),
        precip_prob_pct=h.get("precip_prob_pct"),
        precip_mm=h.get("precip_mm"),
        uv_index=h.get("uv_index"),
        eu_aqi=h.get("eu_aqi"),
    )
    result = score_hour(hour_data, BALANCED_THRESHOLDS)

    def _mode_to_response(ms) -> ModeScoreResponse:
        return ModeScoreResponse(
            score=ms.score,
            label=ms.label,
            reasons=[
                ReasonChipResponse(
                    factor=r.factor, text=r.text, emoji=r.emoji, penalty=r.penalty
                )
                for r in ms.reasons
            ],
            hard_gated=ms.hard_gated,
        )

    return {
        "swim_solo": _mode_to_response(result.swim_solo),
        "swim_dog": _mode_to_response(result.swim_dog),
        "run_solo": _mode_to_response(result.run_solo),
        "run_dog": _mode_to_response(result.run_dog),
    }


@router.get("/scores", response_model=None)
async def get_scores(
    area_id: str = Query(default=None, description="Area identifier"),
    days: int = Query(default=7, ge=1, le=7, description="Forecast horizon (1-7 days)"),
) -> ScoredForecastResponse | JSONResponse:
    if not area_id:
        return _error_response(400, "VALIDATION_ERROR", "area_id is required")

    if area_id != Config.AREA_ID:
        return _error_response(404, "NOT_FOUND", f"Unknown area_id: {area_id}")

    doc = get_forecast_doc(area_id)
    if doc is None:
        return _error_response(404, "NOT_FOUND", f"No forecast data for area_id: {area_id}")

    updated_at = doc.get("updated_at_utc", "")
    age_minutes, freshness = _compute_freshness(updated_at)

    hours_data = doc.get("hours", [])
    now = datetime.now(timezone.utc)
    max_hours = days * 24
    scored_hours: list[ScoredHourResponse] = []

    for h in hours_data:
        hour_str = h.get("hour_utc", "")
        try:
            hour_dt = datetime.fromisoformat(hour_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        if hour_dt >= now and len(scored_hours) < max_hours:
            scores = _score_hour_data(h)
            scored_hours.append(
                ScoredHourResponse(
                    hour_utc=h.get("hour_utc", ""),
                    wave_height_m=h.get("wave_height_m"),
                    wave_period_s=h.get("wave_period_s"),
                    air_temp_c=h.get("air_temp_c"),
                    feelslike_c=h.get("feelslike_c"),
                    wind_ms=h.get("wind_ms"),
                    gust_ms=h.get("gust_ms"),
                    precip_prob_pct=h.get("precip_prob_pct"),
                    precip_mm=h.get("precip_mm"),
                    uv_index=h.get("uv_index"),
                    eu_aqi=h.get("eu_aqi"),
                    pm10=h.get("pm10"),
                    pm2_5=h.get("pm2_5"),
                    scores=scores,
                )
            )

    return ScoredForecastResponse(
        area_id=area_id,
        updated_at_utc=updated_at,
        provider=doc.get("provider", "open_meteo"),
        freshness=freshness,
        forecast_age_minutes=age_minutes,
        horizon_days=doc.get("horizon_days", 7),
        scoring_version=SCORING_VERSION,
        hours=scored_hours,
    )
