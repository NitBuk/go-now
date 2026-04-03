"""AQICN / WAQI ground sensor client.

Fetches real-time US AQI and daily forecast from a specific monitoring station.
Station format: "@5783" for Tel Aviv (AQICN station ID).
API docs: https://aqicn.org/api/
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.waqi.info/feed"
TIMEOUT_S = 15.0


class AqicnClient:
    """Async HTTP client for the AQICN / WAQI feed API."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=TIMEOUT_S)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def fetch(self, station_id: str, token: str) -> dict[str, Any] | None:
        """Fetch real-time AQI + daily forecast from an AQICN station.

        Args:
            station_id: Station identifier, e.g. "@5783" for Tel Aviv.
            token: AQICN API token.

        Returns:
            Raw response dict from the AQICN API, or None on failure.
        """
        url = f"{BASE_URL}/{station_id}/?token={token}"
        client = await self._get_client()
        try:
            response = await client.get(url)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            if data.get("status") != "ok":
                logger.error(
                    "aqicn_fetch_bad_status",
                    extra={"status": data.get("status"), "station_id": station_id},
                )
                return None
            logger.info("aqicn_fetch_success", extra={"station_id": station_id})
            return data
        except (httpx.HTTPError, httpx.InvalidURL, ValueError) as exc:
            logger.error(
                "aqicn_fetch_failed",
                extra={"station_id": station_id, "error_message": str(exc)},
            )
            return None
