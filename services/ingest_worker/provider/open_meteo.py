from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Any

import httpx

from .base import ForecastProvider, NormalizedHourlyRow

logger = logging.getLogger(__name__)

# Retry config: 3 retries with exponential backoff + jitter
MAX_RETRIES = 3
BASE_DELAY_S = 1.0
JITTER_MAX_MS = 500


class OpenMeteoProviderV1(ForecastProvider):
    """Open-Meteo free tier provider — weather, marine, and air quality endpoints."""

    def __init__(self, base_url: str = "https://api.open-meteo.com") -> None:
        self.base_url = base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _build_urls(
        self, lat: float, lon: float, horizon_days: int
    ) -> dict[str, str]:
        base_params = (
            f"latitude={lat}&longitude={lon}"
            f"&forecast_days={horizon_days}&timezone=auto"
        )
        return {
            "weather": (
                f"{self.base_url}/v1/forecast?{base_params}"
                "&hourly=temperature_2m,apparent_temperature,"
                "wind_speed_10m,wind_gusts_10m,"
                "precipitation_probability,precipitation,uv_index"
            ),
            "marine": (
                f"https://marine-api.open-meteo.com/v1/marine?{base_params}"
                "&hourly=wave_height,wave_period,wave_direction"
            ),
            "air_quality": (
                f"https://air-quality-api.open-meteo.com/v1/air-quality?{base_params}"
                "&hourly=european_aqi,pm10,pm2_5"
            ),
        }

    async def _fetch_endpoint_with_retry(
        self, endpoint: str, url: str
    ) -> dict[str, Any] | None:
        """Fetch a single endpoint with exponential backoff + jitter. Returns None on failure."""
        client = await self._get_client()

        for attempt in range(MAX_RETRIES + 1):
            try:
                response = await client.get(url)
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                logger.info(
                    "provider_fetch_success",
                    extra={"endpoint": endpoint, "attempt": attempt + 1},
                )
                return data
            except (httpx.HTTPError, httpx.InvalidURL, ValueError) as exc:
                if attempt < MAX_RETRIES:
                    delay = BASE_DELAY_S * (2**attempt) + random.uniform(
                        0, JITTER_MAX_MS / 1000
                    )
                    logger.warning(
                        "provider_fetch_retry",
                        extra={
                            "endpoint": endpoint,
                            "attempt": attempt + 1,
                            "error_type": type(exc).__name__,
                            "delay_s": round(delay, 2),
                        },
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "provider_fetch_failed",
                        extra={
                            "endpoint": endpoint,
                            "attempts": MAX_RETRIES + 1,
                            "error_message": str(exc),
                        },
                    )
                    return None
        return None  # unreachable, but satisfies type checker

    async def fetch_raw(
        self, area_id: str, lat: float, lon: float, horizon_days: int
    ) -> dict[str, dict]:
        """Fetch all 3 Open-Meteo endpoints concurrently with per-endpoint retry."""
        urls = self._build_urls(lat, lon, horizon_days)

        results = await asyncio.gather(
            self._fetch_endpoint_with_retry("weather", urls["weather"]),
            self._fetch_endpoint_with_retry("marine", urls["marine"]),
            self._fetch_endpoint_with_retry("air_quality", urls["air_quality"]),
        )

        raw: dict[str, dict] = {}
        endpoint_names = ["weather", "marine", "air_quality"]
        for name, result in zip(endpoint_names, results):
            if result is not None:
                raw[name] = result

        return raw

    def normalize(
        self, raw: dict[str, dict], area_id: str, fetched_at_utc: datetime
    ) -> list[NormalizedHourlyRow]:
        """Merge 3 endpoint responses into normalized hourly rows.

        Wind speed and gust are converted from km/h to m/s (÷ 3.6).
        Missing endpoints result in null fields for those variables.
        """
        # Collect all hours from weather (primary time axis)
        hours_set: set[str] = set()
        for endpoint_data in raw.values():
            hourly = endpoint_data.get("hourly", {})
            times = hourly.get("time", [])
            hours_set.update(times)

        if not hours_set:
            return []

        sorted_hours = sorted(hours_set)

        # Build lookup dicts: time_str -> index, per endpoint
        def _build_index(endpoint_data: dict) -> dict[str, int]:
            hourly = endpoint_data.get("hourly", {})
            times = hourly.get("time", [])
            return {t: i for i, t in enumerate(times)}

        weather_idx = _build_index(raw["weather"]) if "weather" in raw else {}
        marine_idx = _build_index(raw["marine"]) if "marine" in raw else {}
        aq_idx = _build_index(raw["air_quality"]) if "air_quality" in raw else {}

        weather_hourly = raw.get("weather", {}).get("hourly", {})
        marine_hourly = raw.get("marine", {}).get("hourly", {})
        aq_hourly = raw.get("air_quality", {}).get("hourly", {})

        def _get(hourly: dict, field: str, idx_map: dict[str, int], time_str: str) -> Any:
            i = idx_map.get(time_str)
            if i is None:
                return None
            values = hourly.get(field, [])
            if i >= len(values):
                return None
            return values[i]

        rows: list[NormalizedHourlyRow] = []
        for time_str in sorted_hours:
            hour_utc = datetime.fromisoformat(time_str).replace(tzinfo=timezone.utc)

            # Weather fields
            temp = _get(weather_hourly, "temperature_2m", weather_idx, time_str)
            feels = _get(weather_hourly, "apparent_temperature", weather_idx, time_str)
            wind_kmh = _get(weather_hourly, "wind_speed_10m", weather_idx, time_str)
            gust_kmh = _get(weather_hourly, "wind_gusts_10m", weather_idx, time_str)
            precip_prob = _get(
                weather_hourly, "precipitation_probability", weather_idx, time_str
            )
            precip_mm = _get(weather_hourly, "precipitation", weather_idx, time_str)
            uv = _get(weather_hourly, "uv_index", weather_idx, time_str)

            # Marine fields
            wave_h = _get(marine_hourly, "wave_height", marine_idx, time_str)
            wave_p = _get(marine_hourly, "wave_period", marine_idx, time_str)

            # Air quality fields
            aqi = _get(aq_hourly, "european_aqi", aq_idx, time_str)
            pm10_val = _get(aq_hourly, "pm10", aq_idx, time_str)
            pm25_val = _get(aq_hourly, "pm2_5", aq_idx, time_str)

            # Convert wind from km/h to m/s
            wind_ms = round(wind_kmh / 3.6, 2) if wind_kmh is not None else None
            gust_ms = round(gust_kmh / 3.6, 2) if gust_kmh is not None else None

            rows.append(
                NormalizedHourlyRow(
                    area_id=area_id,
                    hour_utc=hour_utc,
                    wave_height_m=wave_h,
                    wave_period_s=wave_p,
                    air_temp_c=temp,
                    feelslike_c=feels,
                    wind_ms=wind_ms,
                    gust_ms=gust_ms,
                    precip_prob_pct=int(precip_prob) if precip_prob is not None else None,
                    precip_mm=precip_mm,
                    uv_index=uv,
                    eu_aqi=int(aqi) if aqi is not None else None,
                    pm10=pm10_val,
                    pm2_5=pm25_val,
                )
            )

        logger.info(
            "normalize_complete",
            extra={"row_count": len(rows), "area_id": area_id},
        )
        return rows
