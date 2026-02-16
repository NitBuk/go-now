from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class NormalizedHourlyRow:
    area_id: str
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
    ) -> list[NormalizedHourlyRow]:
        """Convert raw provider response to normalized hourly rows."""
        ...
