"""Tests for data quality checks."""

from dq.checks_v1 import run_dq_checks
from tests.conftest import make_hourly_row


class TestDQChecks:
    def test_all_clean_168_hours(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(168)]
        result = run_dq_checks(rows)
        assert result.flags == []
        assert result.is_degraded is False

    def test_low_hour_count_warning(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(130)]
        result = run_dq_checks(rows)
        assert any("low_hour_count" in f for f in result.flags)
        assert result.is_degraded is False

    def test_very_low_hour_count_degraded(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(80)]
        result = run_dq_checks(rows)
        assert any("very_low_hour_count" in f for f in result.flags)
        assert result.is_degraded is True

    def test_empty_rows(self) -> None:
        result = run_dq_checks([])
        assert any("very_low_hour_count" in f for f in result.flags)
        assert result.is_degraded is True

    def test_out_of_range_wave_height(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(168)]
        rows[0] = make_hourly_row(hour=0, wave_height_m=15.0)  # > 10m
        result = run_dq_checks(rows)
        assert any("out_of_range:wave_height_m" in f for f in result.flags)

    def test_out_of_range_wind(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(168)]
        rows[0] = make_hourly_row(hour=0, wind_ms=60.0)  # > 50 m/s
        result = run_dq_checks(rows)
        assert any("out_of_range:wind_ms" in f for f in result.flags)

    def test_high_null_rate_triggers_degraded(self) -> None:
        """If > 10% of a key metric is null, mark degraded."""
        rows = [make_hourly_row(hour=h) for h in range(168)]
        # Set 20 rows (>10%) with null wave_height
        for i in range(20):
            rows[i] = make_hourly_row(hour=i, wave_height_m=None)
        result = run_dq_checks(rows)
        assert any("null_rate_high:wave_height_m" in f for f in result.flags)
        assert result.is_degraded is True

    def test_null_rate_under_threshold_ok(self) -> None:
        """< 10% null is fine."""
        rows = [make_hourly_row(hour=h) for h in range(168)]
        # 10 nulls out of 168 = ~6% — under threshold
        for i in range(10):
            rows[i] = make_hourly_row(hour=i, wave_height_m=None)
        result = run_dq_checks(rows)
        assert not any("null_rate_high:wave_height_m" in f for f in result.flags)

    def test_timestamp_gap_detection(self) -> None:
        """Detect gaps > 1 hour between consecutive hours."""
        rows = [make_hourly_row(hour=0), make_hourly_row(hour=3)]  # 3h gap
        result = run_dq_checks(rows)
        assert any("timestamp_gap" in f for f in result.flags)

    def test_no_timestamp_gap_for_consecutive(self) -> None:
        rows = [make_hourly_row(hour=h) for h in range(5)]
        result = run_dq_checks(rows)
        assert not any("timestamp_gap" in f for f in result.flags)
