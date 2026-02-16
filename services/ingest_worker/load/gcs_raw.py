"""Write raw provider JSON responses to Cloud Storage."""

from __future__ import annotations

import json
import logging
from datetime import datetime

from google.cloud import storage

logger = logging.getLogger(__name__)


def write_raw_to_gcs(
    bucket_name: str,
    raw_responses: dict[str, dict],
    area_id: str,
    fetched_at_utc: datetime,
    ingest_run_id: str,
) -> None:
    """Write raw JSON for each endpoint to Cloud Storage.

    Path pattern: raw/openmeteo/{endpoint}/area_id={area_id}/{YYYY}/{MM}/{DD}/{HH}/{run_id}.json
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    for endpoint, response_data in raw_responses.items():
        blob_path = (
            f"raw/openmeteo/{endpoint}/"
            f"area_id={area_id}/"
            f"{fetched_at_utc:%Y/%m/%d/%H}/"
            f"{ingest_run_id}.json"
        )

        payload = {
            "_meta": {
                "fetched_at_utc": fetched_at_utc.isoformat(),
                "provider_name": "open_meteo",
                "endpoint": endpoint,
                "schema_version": "raw_v1",
                "ingest_run_id": ingest_run_id,
            },
            "response": response_data,
        }

        blob = bucket.blob(blob_path)
        blob.upload_from_string(
            json.dumps(payload, default=str),
            content_type="application/json",
        )
        logger.info(
            "storage_write_success",
            extra={"layer": "gcs", "path": blob_path},
        )
