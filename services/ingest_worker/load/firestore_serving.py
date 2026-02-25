"""Update Firestore serving doc for fast app reads."""

from __future__ import annotations

import logging
from datetime import datetime

from google.cloud import firestore

from provider.base import DailySunRow, NormalizedHourlyRow

logger = logging.getLogger(__name__)


def update_serving_doc(
    area_id: str,
    rows: list[NormalizedHourlyRow],
    fetched_at_utc: datetime,
    ingest_status: str,
    provider: str = "open_meteo",
    horizon_days: int = 7,
    daily_sun: list[DailySunRow] | None = None,
) -> None:
    """Overwrite the forecasts/{area_id} doc in Firestore with latest data."""
    if not rows:
        logger.warning(
            "storage_skip_empty",
            extra={"layer": "firestore", "doc": f"forecasts/{area_id}", "reason": "no rows"},
        )
        return

    client = firestore.Client()

    hours = [
        {
            "hour_utc": row.hour_utc.isoformat(),
            "wave_height_m": row.wave_height_m,
            "wave_period_s": row.wave_period_s,
            "air_temp_c": row.air_temp_c,
            "feelslike_c": row.feelslike_c,
            "wind_ms": row.wind_ms,
            "gust_ms": row.gust_ms,
            "precip_prob_pct": row.precip_prob_pct,
            "precip_mm": row.precip_mm,
            "uv_index": row.uv_index,
            "eu_aqi": row.eu_aqi,
            "pm10": row.pm10,
            "pm2_5": row.pm2_5,
        }
        for row in rows
    ]

    daily = [
        {
            "date": row.date,
            "sunrise_utc": row.sunrise_utc.isoformat(),
            "sunset_utc": row.sunset_utc.isoformat(),
        }
        for row in (daily_sun or [])
    ]

    doc_ref = client.collection("forecasts").document(area_id)
    doc_ref.set(
        {
            "area_id": area_id,
            "updated_at_utc": fetched_at_utc.isoformat(),
            "provider": provider,
            "horizon_days": horizon_days,
            "ingest_status": ingest_status,
            "hours": hours,
            "daily": daily,
        }
    )

    logger.info(
        "storage_write_success",
        extra={"layer": "firestore", "doc": f"forecasts/{area_id}", "hour_count": len(hours)},
    )
