"""Load normalized rows and ingest run records to BigQuery."""

from __future__ import annotations

import logging
from datetime import datetime

from google.cloud import bigquery

from provider.base import NormalizedHourlyRow

logger = logging.getLogger(__name__)


def load_hourly_to_bq(
    dataset: str,
    rows: list[NormalizedHourlyRow],
    fetched_at_utc: datetime,
    ingest_run_id: str,
    provider: str = "open_meteo",
) -> None:
    """Insert normalized hourly rows into hourly_forecast_v1."""
    client = bigquery.Client()
    table_id = f"{client.project}.{dataset}.hourly_forecast_v1"

    bq_rows = [
        {
            "area_id": row.area_id,
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
            "fetched_at_utc": fetched_at_utc.isoformat(),
            "provider": provider,
            "ingest_run_id": ingest_run_id,
            "schema_version": "curated_v1",
        }
        for row in rows
    ]

    errors = client.insert_rows_json(table_id, bq_rows)
    if errors:
        logger.error(
            "storage_write_failed",
            extra={"layer": "bq", "table": "hourly_forecast_v1", "errors": errors},
        )
        raise RuntimeError(f"BigQuery insert errors: {errors}")

    logger.info(
        "storage_write_success",
        extra={"layer": "bq", "table": "hourly_forecast_v1", "row_count": len(bq_rows)},
    )


def write_ingest_run(
    dataset: str,
    run_id: str,
    area_id: str,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    hours_ingested: int,
    dq_flags: list[str] | None = None,
    error_message: str | None = None,
    provider: str = "open_meteo",
) -> None:
    """Write a row to ingest_runs_v1."""
    client = bigquery.Client()
    table_id = f"{client.project}.{dataset}.ingest_runs_v1"

    row = {
        "run_id": run_id,
        "area_id": area_id,
        "started_at_utc": started_at.isoformat(),
        "finished_at_utc": finished_at.isoformat(),
        "status": status,
        "provider": provider,
        "hours_ingested": hours_ingested,
        "dq_flags": dq_flags or [],
        "error_message": error_message,
        "schema_version": "ingest_run_v1",
    }

    errors = client.insert_rows_json(table_id, [row])
    if errors:
        logger.error(
            "storage_write_failed",
            extra={"layer": "bq", "table": "ingest_runs_v1", "errors": errors},
        )
        raise RuntimeError(f"BigQuery ingest_runs insert errors: {errors}")

    logger.info(
        "storage_write_success",
        extra={"layer": "bq", "table": "ingest_runs_v1", "run_id": run_id},
    )


def check_idempotency(dataset: str, area_id: str, hour_bucket_utc: str) -> bool:
    """Check if this (area_id, hour_bucket) was already ingested successfully.

    Returns True if a successful run exists (should skip).
    """
    client = bigquery.Client()
    query = f"""
        SELECT COUNT(*) as cnt
        FROM `{client.project}.{dataset}.ingest_runs_v1`
        WHERE area_id = @area_id
          AND FORMAT_TIMESTAMP('%Y-%m-%dT%H', started_at_utc) = @hour_bucket
          AND status = 'success'
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("area_id", "STRING", area_id),
            bigquery.ScalarQueryParameter("hour_bucket", "STRING", hour_bucket_utc),
        ]
    )
    result = client.query(query, job_config=job_config).result()
    row = next(iter(result))
    return row.cnt > 0
