from __future__ import annotations

import asyncio
import logging
import random
from datetime import UTC, datetime
from typing import Any

import httpx

from .aqicn import AqicnClient
from .base import DailySunRow, ForecastProvider, NormalizedHourlyRow

logger = logging.getLogger(__name__)

# Retry config: 3 retries with exponential backoff + jitter
MAX_RETRIES = 3
BASE_DELAY_S = 1.0
JITTER_MAX_MS = 500


def _pm25_to_us_aqi(pm25: float) -> int:
    """Convert PM2.5 concentration (µg/m³) to US EPA AQI.

    Uses the standard EPA linear interpolation formula between breakpoints.
    Reference: https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf
    """
    breakpoints = [
        (0.0,   12.0,   0,   50),
        (12.1,  35.4,  51,  100),
        (35.5,  55.4, 101,  150),
        (55.5, 150.4, 151,  200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]
    for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
        if bp_lo <= pm25 <= bp_hi:
            return round((aqi_hi - aqi_lo) / (bp_hi - bp_lo) * (pm25 - bp_lo) + aqi_lo)
    return 500  # above 500.4 µg/m³


class OpenMeteoProviderV1(ForecastProvider):
    """Hybrid air quality provider.

    Weather + marine + PM2.5/PM10 forecast from Open-Meteo (free tier).
    Real-time AQI from AQICN ground sensor station (more accurate than CAMS model).

    AQI strategy per forecast hour:
    - Today (matching AQICN measurement date): use AQICN real-time US AQI directly.
    - Future days: compute US AQI from Open-Meteo PM2.5 forecast via EPA formula.
    - Fallback (no PM2.5 data): forward-fill real-time AQICN reading.
    """

    def __init__(
        self,
        base_url: str = "https://api.open-meteo.com",
        aqicn_station_id: str = "",
        aqicn_token: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.aqicn_station_id = aqicn_station_id
        self.aqicn_token = aqicn_token
        self._client: httpx.AsyncClient | None = None
        self._aqicn = AqicnClient()

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
        await self._aqicn.close()

    def _build_urls(
        self, lat: float, lon: float, horizon_days: int
    ) -> dict[str, str]:
        base_params = (
            f"latitude={lat}&longitude={lon}"
            f"&forecast_days={horizon_days}&timezone=UTC"
        )
        return {
            "weather": (
                f"{self.base_url}/v1/forecast?{base_params}"
                "&hourly=temperature_2m,apparent_temperature,"
                "wind_speed_10m,wind_gusts_10m,"
                "precipitation_probability,precipitation,uv_index"
                "&daily=sunrise,sunset"
            ),
            "marine": (
                f"https://marine-api.open-meteo.com/v1/marine?{base_params}"
                "&hourly=wave_height,wave_period,wave_direction"
            ),
            "air_quality": (
                f"https://air-quality-api.open-meteo.com/v1/air-quality?{base_params}"
                "&hourly=pm2_5,pm10"
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
        """Fetch weather + marine + AQ forecast from Open-Meteo, and real-time AQI from AQICN."""
        urls = self._build_urls(lat, lon, horizon_days)

        weather_result, marine_result, aq_result = await asyncio.gather(
            self._fetch_endpoint_with_retry("weather", urls["weather"]),
            self._fetch_endpoint_with_retry("marine", urls["marine"]),
            self._fetch_endpoint_with_retry("air_quality", urls["air_quality"]),
        )

        raw: dict[str, dict] = {}
        if weather_result is not None:
            raw["weather"] = weather_result
        if marine_result is not None:
            raw["marine"] = marine_result
        if aq_result is not None:
            raw["air_quality"] = aq_result

        # Fetch real-time AQI from AQICN ground sensor
        # eu_aqi field stores US AQI (field rename to aqi deferred to issue #40)
        if self.aqicn_token and self.aqicn_station_id:
            aqicn_result = await self._aqicn.fetch(self.aqicn_station_id, self.aqicn_token)
            if aqicn_result is not None:
                raw["aqicn"] = aqicn_result
        else:
            logger.warning("aqicn_token_missing", extra={"area_id": area_id})

        return raw

    def normalize(
        self, raw: dict[str, dict], area_id: str, fetched_at_utc: datetime
    ) -> tuple[list[NormalizedHourlyRow], list[DailySunRow]]:
        """Merge endpoint responses into normalized hourly rows and daily sun times.

        Wind speed and gust are converted from km/h to m/s (÷ 3.6).

        AQI hybrid strategy:
        - Today (AQICN measurement date): AQICN real-time US AQI
        - Future hours: US AQI computed from Open-Meteo PM2.5 via EPA formula
        - Fallback: forward-fill real-time AQICN reading if PM2.5 unavailable
        """
        # Parse daily sun times from weather endpoint
        daily_sun: list[DailySunRow] = []
        weather_daily = raw.get("weather", {}).get("daily", {})
        if weather_daily:
            daily_times = weather_daily.get("time", [])
            sunrises = weather_daily.get("sunrise", [])
            sunsets = weather_daily.get("sunset", [])
            for i in range(len(daily_times)):
                try:
                    daily_sun.append(DailySunRow(
                        date=daily_times[i],
                        sunrise_utc=datetime.fromisoformat(sunrises[i]).replace(tzinfo=UTC),
                        sunset_utc=datetime.fromisoformat(sunsets[i]).replace(tzinfo=UTC),
                    ))
                except (IndexError, ValueError):
                    pass

        # Collect all hours from Open-Meteo endpoints (primary time axis)
        # Exclude aqicn which has no hourly array
        hours_set: set[str] = set()
        for key in ("weather", "marine", "air_quality"):
            endpoint_data = raw.get(key, {})
            times = endpoint_data.get("hourly", {}).get("time", [])
            hours_set.update(times)

        if not hours_set:
            return [], daily_sun

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

        # --- AQICN real-time signal ---
        # Used for today's date; also kept as fallback for hours with no PM2.5 data
        rt_aqi_fallback: int | None = None
        rt_date: str | None = None          # date string matching AQICN measurement
        rt_pm10: float | None = None        # real-time PM10 from AQICN iaqi
        rt_pm25: float | None = None        # real-time PM2.5 from AQICN iaqi

        aqicn_data = raw.get("aqicn", {}).get("data", {})
        if aqicn_data:
            rt_aqi_val = aqicn_data.get("aqi")
            if rt_aqi_val is not None:
                rt_aqi_fallback = int(rt_aqi_val)
                rt_time_s = aqicn_data.get("time", {}).get("s", "")
                if rt_time_s:
                    try:
                        rt_date = datetime.fromisoformat(rt_time_s).date().isoformat()
                    except (ValueError, AttributeError):
                        pass
            rt_pm10 = (aqicn_data.get("iaqi", {}).get("pm10") or {}).get("v")
            rt_pm25 = (aqicn_data.get("iaqi", {}).get("pm25") or {}).get("v")

        rows: list[NormalizedHourlyRow] = []
        for time_str in sorted_hours:
            hour_utc = datetime.fromisoformat(time_str).replace(tzinfo=UTC)
            date_key = hour_utc.date().isoformat()

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

            # AQI (eu_aqi field, stores US AQI — see issue #40 for rename):
            # Priority: AQICN real-time (today) → PM2.5→AQI formula → forward-fill fallback
            if date_key == rt_date and rt_aqi_fallback is not None:
                aqi: int | None = rt_aqi_fallback
            else:
                om_pm25 = _get(aq_hourly, "pm2_5", aq_idx, time_str)
                if om_pm25 is not None:
                    aqi = _pm25_to_us_aqi(float(om_pm25))
                else:
                    aqi = rt_aqi_fallback  # last resort: forward-fill

            # PM10: AQICN real-time for today, Open-Meteo forecast for future hours
            if date_key == rt_date and rt_pm10 is not None:
                pm10_val: float | None = rt_pm10
            else:
                pm10_val = _get(aq_hourly, "pm10", aq_idx, time_str)

            # PM2.5: AQICN real-time for today, Open-Meteo forecast for future hours
            if date_key == rt_date and rt_pm25 is not None:
                pm25_val: float | None = rt_pm25
            else:
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
                    eu_aqi=aqi,
                    pm10=pm10_val,
                    pm2_5=pm25_val,
                )
            )

        logger.info(
            "normalize_complete",
            extra={"row_count": len(rows), "area_id": area_id},
        )
        return rows, daily_sun
