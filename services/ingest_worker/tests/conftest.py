"""Shared test fixtures for ingest worker tests."""

from datetime import datetime, timedelta, timezone

import pytest

from provider.base import NormalizedHourlyRow


def make_hourly_row(
    hour: int = 0,
    area_id: str = "tel_aviv_coast",
    wave_height_m: float | None = 0.5,
    wave_period_s: float | None = 5.0,
    air_temp_c: float | None = 25.0,
    feelslike_c: float | None = 26.0,
    wind_ms: float | None = 3.0,
    gust_ms: float | None = 5.0,
    precip_prob_pct: int | None = 0,
    precip_mm: float | None = 0.0,
    uv_index: float | None = 3.0,
    eu_aqi: int | None = 40,
    pm10: float | None = 15.0,
    pm2_5: float | None = 8.0,
) -> NormalizedHourlyRow:
    """Create a NormalizedHourlyRow with sensible defaults."""
    return NormalizedHourlyRow(
        area_id=area_id,
        hour_utc=datetime(2025, 6, 1, 0, 0, 0, tzinfo=timezone.utc) + timedelta(hours=hour),
        wave_height_m=wave_height_m,
        wave_period_s=wave_period_s,
        air_temp_c=air_temp_c,
        feelslike_c=feelslike_c,
        wind_ms=wind_ms,
        gust_ms=gust_ms,
        precip_prob_pct=precip_prob_pct,
        precip_mm=precip_mm,
        uv_index=uv_index,
        eu_aqi=eu_aqi,
        pm10=pm10,
        pm2_5=pm2_5,
    )


@pytest.fixture
def sample_weather_response() -> dict:
    """Minimal Open-Meteo weather response with 3 hours."""
    return {
        "latitude": 32.08,
        "longitude": 34.78,
        "hourly_units": {
            "time": "iso8601",
            "temperature_2m": "°C",
            "wind_speed_10m": "km/h",
        },
        "hourly": {
            "time": [
                "2025-06-01T00:00",
                "2025-06-01T01:00",
                "2025-06-01T02:00",
            ],
            "temperature_2m": [24.1, 23.8, 23.5],
            "apparent_temperature": [25.3, 24.9, 24.5],
            "wind_speed_10m": [12.6, 10.8, 9.0],  # km/h
            "wind_gusts_10m": [18.0, 16.2, 14.4],  # km/h
            "precipitation_probability": [0, 10, 5],
            "precipitation": [0.0, 0.1, 0.0],
            "uv_index": [0.0, 0.0, 0.0],
        },
    }


@pytest.fixture
def sample_marine_response() -> dict:
    """Minimal Open-Meteo marine response with 3 hours."""
    return {
        "latitude": 32.08,
        "longitude": 34.78,
        "hourly": {
            "time": [
                "2025-06-01T00:00",
                "2025-06-01T01:00",
                "2025-06-01T02:00",
            ],
            "wave_height": [0.4, 0.5, 0.3],
            "wave_period": [5.2, 5.0, 4.8],
            "wave_direction": [270, 265, 260],
        },
    }


@pytest.fixture
def sample_air_quality_response() -> dict:
    """Minimal Open-Meteo air quality response with 3 hours."""
    return {
        "latitude": 32.08,
        "longitude": 34.78,
        "hourly": {
            "time": [
                "2025-06-01T00:00",
                "2025-06-01T01:00",
                "2025-06-01T02:00",
            ],
            "european_aqi": [42, 45, 38],
            "pm10": [18.5, 20.0, 16.0],
            "pm2_5": [8.2, 9.0, 7.5],
        },
    }


@pytest.fixture
def sample_raw_responses(
    sample_weather_response: dict,
    sample_marine_response: dict,
    sample_air_quality_response: dict,
) -> dict[str, dict]:
    """All 3 endpoint responses combined."""
    return {
        "weather": sample_weather_response,
        "marine": sample_marine_response,
        "air_quality": sample_air_quality_response,
    }
