"""Tests for OpenMeteoProviderV1 fetch behavior using respx mocks."""

import httpx
import pytest
import respx

from provider.open_meteo import OpenMeteoProviderV1


@pytest.mark.asyncio
class TestOpenMeteoFetch:
    async def test_fetch_raw_returns_three_endpoints(
        self,
        sample_weather_response: dict,
        sample_marine_response: dict,
        sample_air_quality_response: dict,
    ) -> None:
        provider = OpenMeteoProviderV1(base_url="https://api.open-meteo.com")

        with respx.mock:
            respx.get("https://api.open-meteo.com/v1/forecast").mock(
                return_value=httpx.Response(200, json=sample_weather_response)
            )
            respx.get("https://marine-api.open-meteo.com/v1/marine").mock(
                return_value=httpx.Response(200, json=sample_marine_response)
            )
            respx.get("https://air-quality-api.open-meteo.com/v1/air-quality").mock(
                return_value=httpx.Response(200, json=sample_air_quality_response)
            )

            raw = await provider.fetch_raw("tel_aviv_coast", 32.08, 34.77, 7)
            await provider.close()

        assert "weather" in raw
        assert "marine" in raw
        assert "air_quality" in raw

    async def test_fetch_raw_handles_single_endpoint_failure(
        self,
        sample_weather_response: dict,
        sample_air_quality_response: dict,
    ) -> None:
        """If one endpoint fails after retries, others still succeed."""
        provider = OpenMeteoProviderV1(base_url="https://api.open-meteo.com")

        with respx.mock:
            respx.get("https://api.open-meteo.com/v1/forecast").mock(
                return_value=httpx.Response(200, json=sample_weather_response)
            )
            respx.get("https://marine-api.open-meteo.com/v1/marine").mock(
                return_value=httpx.Response(500, text="Server Error")
            )
            respx.get("https://air-quality-api.open-meteo.com/v1/air-quality").mock(
                return_value=httpx.Response(200, json=sample_air_quality_response)
            )

            raw = await provider.fetch_raw("tel_aviv_coast", 32.08, 34.77, 7)
            await provider.close()

        assert "weather" in raw
        assert "marine" not in raw
        assert "air_quality" in raw

    async def test_fetch_raw_all_endpoints_fail(self) -> None:
        """If all endpoints fail, return empty dict."""
        provider = OpenMeteoProviderV1(base_url="https://api.open-meteo.com")

        with respx.mock:
            respx.get("https://api.open-meteo.com/v1/forecast").mock(
                return_value=httpx.Response(500, text="Error")
            )
            respx.get("https://marine-api.open-meteo.com/v1/marine").mock(
                return_value=httpx.Response(500, text="Error")
            )
            respx.get("https://air-quality-api.open-meteo.com/v1/air-quality").mock(
                return_value=httpx.Response(500, text="Error")
            )

            raw = await provider.fetch_raw("tel_aviv_coast", 32.08, 34.77, 7)
            await provider.close()

        assert raw == {}
