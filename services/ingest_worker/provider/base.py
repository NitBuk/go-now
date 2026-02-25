from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NormalizedHourlyRow:
    area_id: str
    hour_utc: datetime
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


@dataclass
class DailySunRow:
    date: str          # "2026-02-25"
    sunrise_utc: datetime
    sunset_utc: datetime


class ForecastProvider(ABC):
    @abstractmethod
    async def fetch_raw(
        self, area_id: str, lat: float, lon: float, horizon_days: int
    ) -> dict[str, dict]:
        """Fetch raw JSON from provider. Returns dict keyed by endpoint name."""
        ...

    @abstractmethod
    def normalize(
        self, raw: dict[str, dict], area_id: str, fetched_at_utc: datetime
    ) -> tuple[list[NormalizedHourlyRow], list[DailySunRow]]:
        """Convert raw provider response to normalized hourly rows and daily sun times."""
        ...
