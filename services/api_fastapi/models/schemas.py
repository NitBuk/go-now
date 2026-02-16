"""Pydantic models for API request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel


class ForecastHourlyResponse(BaseModel):
    hour_utc: str
    wave_height_m: float | None = None
    wave_period_s: float | None = None
    air_temp_c: float | None = None
    feelslike_c: float | None = None
    wind_ms: float | None = None
    gust_ms: float | None = None
    precip_prob_pct: int | None = None
    precip_mm: float | None = None
    uv_index: float | None = None
    eu_aqi: int | None = None
    pm10: float | None = None
    pm2_5: float | None = None


class ForecastResponse(BaseModel):
    area_id: str
    updated_at_utc: str
    provider: str
    freshness: str  # "fresh" | "stale"
    forecast_age_minutes: int
    horizon_days: int
    hours: list[ForecastHourlyResponse]


class ForecastHealthDetail(BaseModel):
    area_id: str
    updated_at_utc: str
    age_minutes: int
    freshness: str  # "fresh" | "stale"
    ingest_status: str
    hours_count: int


class HealthResponse(BaseModel):
    status: str  # "healthy" | "degraded" | "unhealthy"
    version: str
    scoring_version: str
    forecast: ForecastHealthDetail
    timestamp_utc: str


class ReasonChipResponse(BaseModel):
    factor: str
    text: str
    emoji: str
    penalty: int


class ModeScoreResponse(BaseModel):
    score: int
    label: str
    reasons: list[ReasonChipResponse]
    hard_gated: bool


class ScoredHourResponse(BaseModel):
    hour_utc: str
    wave_height_m: float | None = None
    wave_period_s: float | None = None
    air_temp_c: float | None = None
    feelslike_c: float | None = None
    wind_ms: float | None = None
    gust_ms: float | None = None
    precip_prob_pct: int | None = None
    precip_mm: float | None = None
    uv_index: float | None = None
    eu_aqi: int | None = None
    pm10: float | None = None
    pm2_5: float | None = None
    scores: dict[str, ModeScoreResponse]


class ScoredForecastResponse(BaseModel):
    area_id: str
    updated_at_utc: str
    provider: str
    freshness: str
    forecast_age_minutes: int
    horizon_days: int
    scoring_version: str
    hours: list[ScoredHourResponse]


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: str
