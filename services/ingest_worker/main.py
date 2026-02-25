"""Ingest Worker entry point.

Runs as a Cloud Run service triggered by Pub/Sub push subscription.
Also supports local invocation via --local-trigger for testing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import string
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

from config import Config
from dq.checks_v1 import run_dq_checks
from load.bigquery import (
    check_idempotency,
    load_hourly_to_bq,
    write_ingest_run,
)
from load.firestore_serving import update_serving_doc
from load.gcs_raw import write_raw_to_gcs
from provider.open_meteo import OpenMeteoProviderV1

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format="%(message)s",
)
logger = logging.getLogger(__name__)


def _generate_run_id() -> str:
    now = datetime.now(timezone.utc)
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"run_{now:%Y%m%d}_{now:%H%M%S}_{suffix}"


async def run_ingest(area_id: str, horizon_days: int) -> dict:
    """Execute the full ingestion pipeline.

    Returns a dict with run_id, status, and hours_ingested.
    """
    started_at = datetime.now(timezone.utc)
    run_id = _generate_run_id()
    config = Config()

    logger.info(
        "ingest_started",
        extra={"area_id": area_id, "ingest_run_id": run_id},
    )

    # Step 1: Idempotency check
    hour_bucket = f"{started_at:%Y-%m-%dT%H}"
    try:
        if check_idempotency(config.BQ_DATASET, area_id, hour_bucket):
            logger.info(
                "ingest_skipped",
                extra={"reason": "idempotency", "area_id": area_id, "hour_bucket": hour_bucket},
            )
            return {"run_id": run_id, "status": "skipped", "hours_ingested": 0}
    except Exception:
        # If idempotency check fails (e.g., BQ unavailable), proceed with ingest
        logger.warning("idempotency_check_failed", extra={"area_id": area_id})

    # Step 2: Fetch raw data from provider
    provider = OpenMeteoProviderV1(base_url=config.OPEN_METEO_BASE_URL)
    try:
        raw = await provider.fetch_raw(area_id, config.LAT, config.LON, horizon_days)
    finally:
        await provider.close()

    if not raw:
        # All endpoints failed
        finished_at = datetime.now(timezone.utc)
        try:
            write_ingest_run(
                config.BQ_DATASET, run_id, area_id, started_at, finished_at,
                status="failed", hours_ingested=0,
                error_message="All provider endpoints failed after retries",
            )
        except Exception as exc:
            logger.error("failed_to_write_ingest_run", extra={"error": str(exc)})
        return {"run_id": run_id, "status": "failed", "hours_ingested": 0}

    fetched_at = datetime.now(timezone.utc)

    # Step 3: Write raw JSON to Cloud Storage
    try:
        write_raw_to_gcs(config.GCS_RAW_BUCKET, raw, area_id, fetched_at, run_id)
    except Exception as exc:
        logger.error("gcs_raw_write_failed", extra={"error": str(exc)})
        # Raw write failure = full failure (as per spec)
        finished_at = datetime.now(timezone.utc)
        try:
            write_ingest_run(
                config.BQ_DATASET, run_id, area_id, started_at, finished_at,
                status="failed", hours_ingested=0,
                error_message=f"GCS raw write failed: {exc}",
            )
        except Exception:
            pass
        return {"run_id": run_id, "status": "failed", "hours_ingested": 0}

    # Step 4: Normalize
    rows, daily_sun = provider.normalize(raw, area_id, fetched_at)

    # Step 5: Data quality checks
    dq_result = run_dq_checks(rows)

    status = "success"
    if dq_result.is_degraded:
        status = "degraded"
    # If any endpoint was missing, also mark degraded
    if len(raw) < 3:
        status = "degraded"
        missing = {"weather", "marine", "air_quality"} - set(raw.keys())
        dq_result.flags.append(f"missing_endpoints:{','.join(missing)}")

    # Step 6: Load to BigQuery
    bq_ok = True
    try:
        load_hourly_to_bq(config.BQ_DATASET, rows, fetched_at, run_id)
    except Exception as exc:
        logger.error("bq_load_failed", extra={"error": str(exc)})
        bq_ok = False
        if status == "success":
            status = "degraded"
        dq_result.flags.append(f"bq_write_failed:{exc}")

    # Step 7: Update Firestore serving doc
    fs_ok = True
    try:
        update_serving_doc(area_id, rows, fetched_at, status, daily_sun=daily_sun)
    except Exception as exc:
        logger.error("firestore_write_failed", extra={"error": str(exc)})
        fs_ok = False
        if status == "success":
            status = "degraded"
        dq_result.flags.append(f"firestore_write_failed:{exc}")

    # Both storage layers failed = full failure
    if not bq_ok and not fs_ok:
        status = "failed"

    # Step 8: Write ingest run record
    finished_at = datetime.now(timezone.utc)
    try:
        write_ingest_run(
            config.BQ_DATASET, run_id, area_id, started_at, finished_at,
            status=status,
            hours_ingested=len(rows),
            dq_flags=dq_result.flags if dq_result.flags else None,
        )
    except Exception as exc:
        logger.error("failed_to_write_ingest_run", extra={"error": str(exc)})

    logger.info(
        "ingest_completed",
        extra={
            "ingest_run_id": run_id,
            "status": status,
            "hours_ingested": len(rows),
            "dq_flags": dq_result.flags,
            "duration_ms": int((finished_at - started_at).total_seconds() * 1000),
        },
    )

    return {"run_id": run_id, "status": status, "hours_ingested": len(rows)}


class PubSubHandler(BaseHTTPRequestHandler):
    """HTTP handler for Pub/Sub push subscription messages."""

    def do_POST(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            envelope = json.loads(body)
            # Pub/Sub push wraps the message
            if "message" in envelope:
                import base64

                data = base64.b64decode(envelope["message"].get("data", "")).decode()
                message = json.loads(data)
            else:
                message = envelope
        except (json.JSONDecodeError, KeyError) as exc:
            logger.error("invalid_pubsub_message", extra={"error": str(exc)})
            self.send_response(400)
            self.end_headers()
            return

        area_id = message.get("area_id", Config.AREA_ID)
        horizon_days = message.get("horizon_days", Config.HORIZON_DAYS)

        result = asyncio.run(run_ingest(area_id, horizon_days))

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def log_message(self, format: str, *args: object) -> None:
        # Suppress default HTTP server logging
        pass


def main() -> None:
    # Support --local-trigger for manual/testing invocation
    if len(sys.argv) > 1 and sys.argv[1] == "--local-trigger":
        payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
        area_id = payload.get("area_id", Config.AREA_ID)
        horizon_days = payload.get("horizon_days", Config.HORIZON_DAYS)
        result = asyncio.run(run_ingest(area_id, horizon_days))
        print(json.dumps(result, indent=2))
        return

    # Run as HTTP server for Pub/Sub push
    port = Config.PORT
    server = HTTPServer(("0.0.0.0", port), PubSubHandler)
    logger.info(f"Ingest worker listening on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
