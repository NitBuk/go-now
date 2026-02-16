"""Tests for scoring engine v2 — continuous linear ramp penalties.

All tests use Balanced preset thresholds.
"""

from datetime import datetime, timezone

import pytest

from scoring_engine.engine import HourData, score_hour, _linear_penalty
from scoring_engine.thresholds import BALANCED_THRESHOLDS


def _hour(**kwargs) -> HourData:
    """Helper to create HourData with defaults."""
    defaults = {"hour_utc": datetime(2025, 6, 1, 8, 0, tzinfo=timezone.utc)}
    defaults.update(kwargs)
    return HourData(**defaults)


def _perfect_hour(**overrides) -> HourData:
    """Helper for a perfect-conditions hour with optional overrides."""
    defaults = dict(
        wave_height_m=0.2,
        feelslike_c=24.0,
        uv_index=3.0,
        eu_aqi=30,
        gust_ms=5.0,
        precip_prob_pct=0,
        precip_mm=0.0,
    )
    defaults.update(overrides)
    return _hour(**defaults)


class TestLinearPenalty:
    """Unit tests for the _linear_penalty ramp function."""

    def test_below_ok_returns_zero(self) -> None:
        assert _linear_penalty(25.0, 26.0, 38.0, 60.0) == 0.0

    def test_at_ok_returns_zero(self) -> None:
        assert _linear_penalty(26.0, 26.0, 38.0, 60.0) == 0.0

    def test_at_bad_returns_max(self) -> None:
        assert _linear_penalty(38.0, 26.0, 38.0, 60.0) == 60.0

    def test_above_bad_returns_max(self) -> None:
        assert _linear_penalty(45.0, 26.0, 38.0, 60.0) == 60.0

    def test_midpoint_returns_half(self) -> None:
        # Midpoint of 26-38 is 32, should give 50% of 60 = 30
        assert _linear_penalty(32.0, 26.0, 38.0, 60.0) == 30.0

    def test_quarter_point(self) -> None:
        # 29 is 25% through 26-38 range → 25% of 60 = 15
        assert _linear_penalty(29.0, 26.0, 38.0, 60.0) == 15.0

    def test_reversed_cold_below_bad_returns_max(self) -> None:
        # Cold: ok=18, bad=10. At 8°C (below bad), should return max
        assert _linear_penalty(8.0, 18.0, 10.0, 15.0) == 15.0

    def test_reversed_cold_at_ok_returns_zero(self) -> None:
        assert _linear_penalty(18.0, 18.0, 10.0, 15.0) == 0.0

    def test_reversed_cold_midpoint(self) -> None:
        # Midpoint of 18-10 is 14, should give 50% of 15 = 7.5
        assert _linear_penalty(14.0, 18.0, 10.0, 15.0) == 7.5


class TestGoldenCases:
    """Core scoring tests adapted for continuous linear ramp."""

    def test_01_all_perfect(self) -> None:
        """All perfect conditions → 100 for all modes."""
        result = score_hour(_perfect_hour())
        assert result.swim_solo.score == 100
        assert result.swim_solo.label == "Perfect"
        assert result.run_dog.score == 100
        assert result.run_dog.label == "Perfect"
        assert not result.swim_solo.hard_gated

    def test_02_all_null(self) -> None:
        """Every field null → no penalty, score 100, info chips present."""
        result = score_hour(_hour())
        assert result.swim_solo.score == 100
        assert result.run_dog.score == 100
        swim_info = [r for r in result.swim_solo.reasons if r.emoji == "info"]
        assert len(swim_info) > 0

    def test_03_rain_hard_gate(self) -> None:
        """Heavy rain (precip_mm >= 3.0) gates all modes to 0."""
        result = score_hour(_hour(precip_mm=5.0))
        assert result.swim_solo.score == 0
        assert result.swim_solo.hard_gated
        assert result.swim_dog.score == 0
        assert result.run_solo.score == 0
        assert result.run_dog.score == 0

    def test_04_precip_prob_gate(self) -> None:
        """Probability >= 80 alone triggers rain gate."""
        result = score_hour(_hour(precip_prob_pct=85, precip_mm=0.5))
        assert result.swim_solo.score == 0
        assert result.swim_solo.hard_gated

    def test_05_wind_hard_gate_run_only(self) -> None:
        """Wind >= wind_gate_ms gates run modes but NOT swim modes."""
        result = score_hour(_perfect_hour(gust_ms=15.0))
        assert result.swim_solo.score > 0
        assert not result.swim_solo.hard_gated
        assert result.run_solo.score == 0
        assert result.run_solo.hard_gated
        assert result.run_dog.score == 0
        assert result.run_dog.hard_gated

    def test_06_dog_heat_gate(self) -> None:
        """feelslike >= dog_heat_gate (29) gates only run_dog."""
        result = score_hour(_perfect_hour(feelslike_c=30.0))
        assert result.run_dog.score == 0
        assert result.run_dog.hard_gated
        assert result.run_dog.reasons[0].text == "Too hot for dog"
        # swim_dog: penalized but not gated
        assert result.swim_dog.score > 0
        assert not result.swim_dog.hard_gated
        # run_solo: penalized but not gated
        assert result.run_solo.score > 0

    def test_07_compound_dog_heat_gate(self) -> None:
        """UV >= compound_uv AND feelslike >= compound_warn triggers run_dog gate."""
        result = score_hour(_perfect_hour(feelslike_c=27.0, uv_index=9.0))
        assert result.run_dog.score == 0
        assert result.run_dog.hard_gated
        assert result.run_solo.score > 0

    def test_09_max_penalties_clamp_to_zero(self) -> None:
        """Extreme values across all factors → clamps to 0."""
        hour = _perfect_hour(
            wave_height_m=2.0,
            eu_aqi=150,
            gust_ms=13.0,
            feelslike_c=42.0,
            uv_index=12.0,
        )
        result = score_hour(hour)
        assert result.swim_solo.score == 0
        assert result.swim_solo.label == "Nope"


class TestContinuousScoring:
    """Tests specific to linear ramp behavior — no more cliff edges."""

    def test_heat_scales_linearly_for_run(self) -> None:
        """Run heat penalty grows linearly from 26°C to 38°C."""
        t = BALANCED_THRESHOLDS
        # 26°C: ok threshold → 0 penalty → score 100
        r26 = score_hour(_perfect_hour(feelslike_c=26.0)).run_solo.score
        assert r26 == 100

        # 32°C: midpoint of 26-38 range → 50% of 60 max = 30 penalty → score 70
        r32 = score_hour(_perfect_hour(feelslike_c=32.0)).run_solo.score
        assert r32 == 70

        # 38°C: bad threshold → full 60 penalty → score 40
        r38 = score_hour(_perfect_hour(feelslike_c=38.0)).run_solo.score
        assert r38 == 40

        # Scores decrease monotonically
        assert r26 > r32 > r38

    def test_heat_29_is_between_26_and_32(self) -> None:
        """29°C should give a partial penalty, not 0 or full."""
        result = score_hour(_perfect_hour(feelslike_c=29.0))
        # 29 is 25% through 26-38 range → penalty = 15 → score = 85
        assert result.run_solo.score == 85

    def test_waves_scale_linearly_for_swim(self) -> None:
        """Swim wave penalty grows linearly from 0.3m to 1.5m."""
        r03 = score_hour(_perfect_hour(wave_height_m=0.3)).swim_solo.score
        r06 = score_hour(_perfect_hour(wave_height_m=0.6)).swim_solo.score
        r10 = score_hour(_perfect_hour(wave_height_m=1.0)).swim_solo.score
        r15 = score_hour(_perfect_hour(wave_height_m=1.5)).swim_solo.score

        assert r03 == 100  # at ok threshold
        assert r03 > r06 > r10 > r15  # monotonically decreasing
        assert r15 == 30  # 100 - 70 max penalty

    def test_uv_scales_linearly_for_run(self) -> None:
        """Run UV penalty grows linearly from 4 to 10."""
        r4 = score_hour(_perfect_hour(uv_index=4.0)).run_solo.score
        r7 = score_hour(_perfect_hour(uv_index=7.0)).run_solo.score
        r10 = score_hour(_perfect_hour(uv_index=10.0)).run_solo.score

        assert r4 == 100  # at ok
        assert r4 > r7 > r10
        assert r10 == 75  # 100 - 25 max penalty

    def test_aqi_scales_linearly_for_run(self) -> None:
        """Run AQI penalty grows linearly from 40 to 120."""
        r40 = score_hour(_perfect_hour(eu_aqi=40)).run_solo.score
        r80 = score_hour(_perfect_hour(eu_aqi=80)).run_solo.score
        r120 = score_hour(_perfect_hour(eu_aqi=120)).run_solo.score

        assert r40 == 100  # at ok
        assert r40 > r80 > r120
        assert r120 == 60  # 100 - 40 max penalty

    def test_cold_scales_for_swim(self) -> None:
        """Swim cold penalty grows as temp drops below 18°C."""
        r20 = score_hour(_perfect_hour(feelslike_c=20.0)).swim_solo.score
        r14 = score_hour(_perfect_hour(feelslike_c=14.0)).swim_solo.score
        r10 = score_hour(_perfect_hour(feelslike_c=10.0)).swim_solo.score

        assert r20 == 100  # above ok
        assert r20 > r14 > r10
        assert r10 == 85  # 100 - 15 max cold penalty

    def test_dog_multiplier_continuous(self) -> None:
        """Dog multiplier applies to the continuous penalty value.

        Using 28°C: below dog heat gate (29°C) but in run heat ramp (26-38).
        """
        r_solo = score_hour(_perfect_hour(feelslike_c=28.0)).run_solo.score
        r_dog = score_hour(_perfect_hour(feelslike_c=28.0)).run_dog.score

        # Solo: 28°C → (28-26)/(38-26) = 16.7% of 60 = 10 penalty → score 90
        assert r_solo == 90
        # Dog: 10 * 1.2 = 12 penalty → score 88
        assert r_dog == 88
        assert r_dog < r_solo

    def test_swim_dog_waves_stricter(self) -> None:
        """Swim dog has stricter wave ramp than swim solo."""
        r_solo = score_hour(_perfect_hour(wave_height_m=0.85)).swim_solo.score
        r_dog = score_hour(_perfect_hour(wave_height_m=0.85)).swim_dog.score

        # Solo: 0.85 in 0.3-1.5 range = 45.8% of 70 = 32 → score 68
        assert r_solo == 68
        # Dog: 0.85 in 0.3-1.0 range = 78.6% of 80 = 63 → score 37
        assert r_dog == 37
        assert r_dog < r_solo

    def test_no_penalty_below_ok_threshold(self) -> None:
        """Values below ok thresholds produce exactly 0 penalty."""
        hour = _perfect_hour(
            wave_height_m=0.29,  # just below swim ok=0.3
            feelslike_c=25.9,    # just below run heat ok=26
            uv_index=3.9,        # just below uv ok=4
            eu_aqi=39,           # just below aqi ok=40
            gust_ms=6.9,         # just below wind ok=7
        )
        result = score_hour(hour)
        assert result.swim_solo.score == 100
        assert result.run_solo.score == 100
        assert result.run_dog.score == 100

    def test_rain_probability_ramps_for_run(self) -> None:
        """Rain probability penalty ramps from 30% to 79%."""
        r20 = score_hour(_perfect_hour(precip_prob_pct=20)).run_solo.score
        r50 = score_hour(_perfect_hour(precip_prob_pct=50)).run_solo.score
        r75 = score_hour(_perfect_hour(precip_prob_pct=75)).run_solo.score

        assert r20 == 100  # below ok=30
        assert r20 > r50 > r75


class TestReasonChips:
    """Tests for reason chip generation rules."""

    def test_positive_chip_when_score_good(self) -> None:
        result = score_hour(_perfect_hour())
        positive = [r for r in result.swim_solo.reasons if r.emoji == "check"]
        assert len(positive) >= 1

    def test_no_positive_chip_when_score_low(self) -> None:
        # Waves at 1.0m: penalty ~41 → score ~59
        result = score_hour(_perfect_hour(wave_height_m=1.0))
        assert result.swim_solo.score < 70
        positive = [r for r in result.swim_solo.reasons if r.emoji == "check"]
        assert len(positive) == 0

    def test_chip_count_in_range(self) -> None:
        result = score_hour(_perfect_hour())
        for mode in [result.swim_solo, result.swim_dog, result.run_solo, result.run_dog]:
            assert 2 <= len(mode.reasons) <= 5, f"Got {len(mode.reasons)} chips"

    def test_hard_gated_has_gate_reason(self) -> None:
        result = score_hour(_hour(precip_mm=5.0))
        assert result.swim_solo.reasons[0].factor == "rain"
        assert result.swim_solo.reasons[0].emoji == "danger"


class TestScoringVersion:
    def test_scoring_version(self) -> None:
        result = score_hour(_hour())
        assert result.scoring_version == "score_v2"
