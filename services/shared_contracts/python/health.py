from dataclasses import dataclass
from datetime import datetime


@dataclass
class HealthResponse:
    status: str  # "ok" | "degraded" | "error"
    forecast_age_minutes: int
    last_ingest_at_utc: datetime
    last_ingest_status: str  # "success" | "degraded" | "failed"
    provider: str
    hours_available: int
