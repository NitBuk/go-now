from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ForecastHourly:
    hour_utc: datetime
    wave_height_m: Optional[float] = None
    wave_period_s: Optional[float] = None
    air_temp_c: Optional[float] = None
    feelslike_c: Optional[float] = None
    wind_ms: Optional[float] = None
    gust_ms: Optional[float] = None
    precip_prob_pct: Optional[int] = None
    precip_mm: Optional[float] = None
    uv_index: Optional[float] = None
    eu_aqi: Optional[int] = None
    pm10: Optional[float] = None
    pm2_5: Optional[float] = None


@dataclass
class ForecastDocument:
    area_id: str
    updated_at_utc: datetime
    provider: str
    horizon_days: int
    ingest_status: str  # "success" | "degraded" | "failed"
    hours: list[ForecastHourly]
