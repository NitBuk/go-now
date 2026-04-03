"""Tests for Open-Meteo normalization logic."""

from datetime import UTC, datetime

import pytest

from provider.open_meteo import OpenMeteoProviderV1, _pm25_to_us_aqi


class TestPm25ToUsAqi:
    """Unit tests for the PM2.5 → US AQI conversion."""

    def test_good_range(self) -> None:
        assert _pm25_to_us_aqi(0.0) == 0
        assert _pm25_to_us_aqi(6.0) == 25
        assert _pm25_to_us_aqi(12.0) == 50

    def test_moderate_range(self) -> None:
        assert _pm25_to_us_aqi(12.1) == 51
        assert _pm25_to_us_aqi(35.4) == 100

    def test_unhealthy_sensitive_range(self) -> None:
        assert _pm25_to_us_aqi(35.5) == 101
        assert _pm25_to_us_aqi(55.4) == 150

    def test_unhealthy_range(self) -> None:
        assert _pm25_to_us_aqi(55.5) == 151
        assert _pm25_to_us_aqi(150.4) == 200

    def test_very_unhealthy_range(self) -> None:
        assert _pm25_to_us_aqi(150.5) == 201
        assert _pm25_to_us_aqi(250.4) == 300

    def test_hazardous_range(self) -> None:
        assert _pm25_to_us_aqi(250.5) == 301

    def test_above_max_caps_at_500(self) -> None:
        assert _pm25_to_us_aqi(999.0) == 500


class TestNormalize:
    def setup_method(self) -> None:
        self.provider = OpenMeteoProviderV1()
        self.fetched_at = datetime(2025, 6, 1, 12, 0, 0, tzinfo=UTC)

    def test_normalize_merges_four_endpoints(
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
        assert rows[0].wind_ms == pytest.approx(12.6 / 3.6, abs=0.01)
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
        # AQICN real-time for today (2025-06-01): aqi=42, pm10=18.5, pm2_5=8.2
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
        self, sample_weather_response: dict, sample_air_quality_response: dict,
        sample_aqicn_response: dict,
    ) -> None:
        """If marine endpoint fails, wave fields should be None."""
        raw = {
            "weather": sample_weather_response,
            "air_quality": sample_air_quality_response,
            "aqicn": sample_aqicn_response,
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        assert len(rows) == 3
        for row in rows:
            assert row.wave_height_m is None
            assert row.wave_period_s is None
            assert row.air_temp_c is not None

    def test_normalize_missing_air_quality_endpoints(
        self, sample_weather_response: dict, sample_marine_response: dict
    ) -> None:
        """If both AQ endpoints are absent, AQI fields should be None."""
        raw = {
            "weather": sample_weather_response,
            "marine": sample_marine_response,
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        for row in rows:
            assert row.eu_aqi is None
            assert row.pm10 is None
            assert row.pm2_5 is None

    def test_normalize_aqi_from_aqicn_for_today(
        self, sample_weather_response: dict, sample_air_quality_response: dict,
        sample_aqicn_response: dict,
    ) -> None:
        """Today's hours use AQICN real-time AQI (42), not PM2.5-derived value."""
        raw = {
            "weather": sample_weather_response,
            "air_quality": sample_air_quality_response,
            "aqicn": sample_aqicn_response,
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        # All 3 hours are on 2025-06-01 which matches AQICN measurement date
        for row in rows:
            assert row.eu_aqi == 42  # AQICN real-time, not _pm25_to_us_aqi(8.2)=34

    def test_normalize_aqi_from_pm25_for_future_hours(
        self, sample_weather_response: dict, sample_air_quality_response: dict,
    ) -> None:
        """Without AQICN, future hours compute AQI from Open-Meteo PM2.5."""
        raw = {
            "weather": sample_weather_response,
            "air_quality": sample_air_quality_response,
            # no aqicn key
        }
        rows, _ = self.provider.normalize(raw, "tel_aviv_coast", self.fetched_at)
        # pm2_5=8.2 → _pm25_to_us_aqi(8.2) = 34 (Good range)
        assert rows[0].eu_aqi == _pm25_to_us_aqi(8.2)
        assert rows[1].eu_aqi == _pm25_to_us_aqi(9.0)
        assert rows[2].eu_aqi == _pm25_to_us_aqi(7.5)

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
