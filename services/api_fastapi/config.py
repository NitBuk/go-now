from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    GCP_PROJECT_ID: str = os.environ.get("GOOGLE_CLOUD_PROJECT", "gonow-dev")
    FIREBASE_PROJECT_ID: str = os.environ.get("FIREBASE_PROJECT_ID", "gonow-dev")
    CORS_ALLOWED_ORIGINS: list[str] = os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    ENV: str = os.environ.get("ENV", "dev")
    PORT: int = int(os.environ.get("PORT", "8080"))

    AREA_ID: str = "tel_aviv_coast"
    FRESHNESS_THRESHOLD_MINUTES: int = 90
    UNHEALTHY_THRESHOLD_MINUTES: int = 180
