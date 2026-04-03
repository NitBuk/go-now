"""Tests for AqicnClient."""

import httpx
import pytest
import respx

from provider.aqicn import AqicnClient

STATION_ID = "@5783"
TOKEN = "testtoken"
AQICN_URL = f"https://api.waqi.info/feed/{STATION_ID}/"


@pytest.mark.asyncio
class TestAqicnClient:
    async def test_fetch_success(self, sample_aqicn_response: dict) -> None:
        """Successful fetch returns the raw response dict."""
        client = AqicnClient()

        with respx.mock:
            respx.get(AQICN_URL).mock(
                return_value=httpx.Response(200, json=sample_aqicn_response)
            )
            result = await client.fetch(STATION_ID, TOKEN)
            await client.close()

        assert result is not None
        assert result["status"] == "ok"
        assert result["data"]["aqi"] == 42

    async def test_fetch_http_error_returns_none(self) -> None:
        """HTTP error returns None without raising."""
        client = AqicnClient()

        with respx.mock:
            respx.get(AQICN_URL).mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )
            result = await client.fetch(STATION_ID, TOKEN)
            await client.close()

        assert result is None

    async def test_fetch_bad_status_returns_none(self) -> None:
        """AQICN status != 'ok' returns None."""
        client = AqicnClient()
        bad_response = {"status": "error", "data": "Unknown station"}

        with respx.mock:
            respx.get(AQICN_URL).mock(
                return_value=httpx.Response(200, json=bad_response)
            )
            result = await client.fetch(STATION_ID, TOKEN)
            await client.close()

        assert result is None
