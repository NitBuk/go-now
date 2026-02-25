"""Tests for Open-Meteo normalization logic."""

from datetime import UTC, datetime

import pytest

from provider.open_meteo import OpenMeteoProviderV1


class TestNormalize:
    def setup_method(self) -> None:
        self.provider = OpenMeteoProviderV1()
        self.fetched_at = datetime(2025, 6, 1, 12, 0, 0, tzinfo=UTC)

    def test_normalize_merges_three_endpoints(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        assert len(rows) == 3

    def test_normalize_sets_area_id(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        for row in rows:
            assert row.area_id == "tel_aviv_coast"

    def test_normalize_converts_wind_kmh_to_ms(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        # First hour: wind_speed_10m = 12.6 km/h → 3.5 m/s
        assert rows[0].wind_ms == pytest.approx(12.6 / 3.6, abs=0.01)
        # First hour: wind_gusts_10m = 18.0 km/h → 5.0 m/s
        assert rows[0].gust_ms == pytest.approx(18.0 / 3.6, abs=0.01)

    def test_normalize_passthrough_fields(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        row0 = rows[0]
        assert row0.air_temp_c == 24.1
        assert row0.feelslike_c == 25.3
        assert row0.wave_height_m == 0.4
        assert row0.wave_period_s == 5.2
        assert row0.precip_prob_pct == 0
        assert row0.precip_mm == 0.0
        assert row0.uv_index == 0.0
        assert row0.eu_aqi == 42
        assert row0.pm10 == 18.5
        assert row0.pm2_5 == 8.2

    def test_normalize_hour_utc_is_utc(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        assert rows[0].hour_utc == datetime(2025, 6, 1, 0, 0, tzinfo=UTC)
        assert rows[1].hour_utc == datetime(2025, 6, 1, 1, 0, tzinfo=UTC)

    def test_normalize_missing_marine_endpoint(
        self, sample_weather_response: dict, sample_air_quality_response: dict
    ) -> None:
        """If marine endpoint fails, wave fields should be None."""
        raw = {
            "weather": sample_weather_response,
            "air_quality": sample_air_quality_response,
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        assert len(rows) == 3
        for row in rows:
            assert row.wave_height_m is None
            assert row.wave_period_s is None
            # Weather fields still present
            assert row.air_temp_c is not None

    def test_normalize_missing_air_quality_endpoint(
        self, sample_weather_response: dict, sample_marine_response: dict
    ) -> None:
        """If air quality endpoint fails, AQI fields should be None."""
        raw = {
            "weather": sample_weather_response,
            "marine": sample_marine_response,
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        for row in rows:
            assert row.eu_aqi is None
            assert row.pm10 is None
            assert row.pm2_5 is None

    def test_normalize_empty_raw(self) -> None:
        rows, daily_sun = self.provider.normalize({}, "tel_aviv_coast", self.fetched_at)
        assert rows == []
        assert daily_sun == []

    def test_normalize_sorted_by_hour(
        self, sample_raw_responses: dict[str, dict]
    ) -> None:
        rows, _ = self.provider.normalize(
            sample_raw_responses, "tel_aviv_coast", self.fetched_at
        )
        hours = [r.hour_utc for r in rows]
        assert hours == sorted(hours)
