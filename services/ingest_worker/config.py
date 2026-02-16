from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    GCP_PROJECT_ID: str = os.environ.get("GOOGLE_CLOUD_PROJECT", "gonow-dev")
    GCS_RAW_BUCKET: str = os.environ.get("GCS_RAW_BUCKET", "gonow-dev-raw")
    BQ_DATASET: str = os.environ.get("BQ_DATASET", "gonow_v1")
    OPEN_METEO_BASE_URL: str = os.environ.get(
        "OPEN_METEO_BASE_URL", "https://api.open-meteo.com"
    )
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    ENV: str = os.environ.get("ENV", "dev")
    PORT: int = int(os.environ.get("PORT", "8080"))

    # Tel Aviv Coast — single location in V1
    AREA_ID: str = "tel_aviv_coast"
    LAT: float = 32.08
    LON: float = 34.77
    HORIZON_DAYS: int = 7
