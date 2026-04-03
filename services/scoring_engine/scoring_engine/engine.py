"""Core scoring engine - computes 4 mode scores per hourly forecast.

Uses continuous linear ramp penalties: each factor has an ok threshold
(0 penalty), a bad threshold (max penalty), and linear interpolation
between them.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from scoring_engine.thresholds import BALANCED_THRESHOLDS, Thresholds

# Factor priority for tie-breaking (higher index = lower priority)
FACTOR_PRIORITY = ["rain", "heat", "waves", "uv", "aqi", "dust", "wind", "cold"]


@dataclass
class ReasonChip:
    factor: str
    text: str
    emoji: str  # "check" | "warning" | "danger" | "info"
    penalty: int


@dataclass
class ModeScore:
    score: int
    label: str
    reasons: list[ReasonChip]
    hard_gated: bool


@dataclass
class ScoringOutput:
    hour_utc: datetime
    scoring_version: str
    swim_solo: ModeScore
    swim_dog: ModeScore
    run_solo: ModeScore
    run_dog: ModeScore


@dataclass
class HourData:
    """Forecast data for a single hour. Mirrors NormalizedHourlyRow fields."""

    hour_utc: datetime
    wave_height_m: Optional[float] = None
    feelslike_c: Optional[float] = None
    gust_ms: Optional[float] = None
    precip_prob_pct: Optional[int] = None
    precip_mm: Optional[float] = None
    uv_index: Optional[float] = None
    eu_aqi: Optional[int] = None
    pm10: Optional[float] = None
    sunset_utc: Optional[datetime] = None
    sunrise_utc: Optional[datetime] = None


def _sun_multiplier(
    hour_utc: datetime,
    sunrise_utc: Optional[datetime],
    sunset_utc: Optional[datetime],
) -> float:
    """0.0 before sunrise-30min or after sunset+30min, ramps at edges, 1.0 in daylight."""
    naive = hour_utc.replace(tzinfo=None)

    # Before-sunrise gate
    if sunrise_utc is not None:
        sr = sunrise_utc.replace(tzinfo=None)
        delta_sr = (naive - sr).total_seconds()  # negative before sunrise
        if delta_sr <= -1800:
            return 0.0
        if delta_sr < 0:
            return 1.0 - abs(delta_sr) / 1800  # ramp 0→1 in the 30 min before sunrise

    # After-sunset gate
    if sunset_utc is not None:
        ss = sunset_utc.replace(tzinfo=None)
        delta_ss = (naive - ss).total_seconds()  # positive after sunset
        if delta_ss >= 1800:
            return 0.0
        if delta_ss > 0:
            return 1.0 - delta_ss / 1800  # ramp 1→0 in the 30 min after sunset

    return 1.0


def score_to_label(score: int) -> str:
    if score >= 85:
        return "Perfect"
    if score >= 70:
        return "Good"
    if score >= 45:
        return "Meh"
    if score >= 20:
        return "Bad"
    return "Nope"


def _linear_penalty(value: float, ok: float, bad: float, max_penalty: float) -> float:
    """Compute a linear ramp penalty.

    Returns 0 when value <= ok, max_penalty when value >= bad,
    and linearly interpolates between them.
    For reversed ramps (cold: ok > bad), the direction is handled automatically.
    """
    if ok < bad:
        # Normal direction: higher value = worse (heat, waves, UV, etc.)
        if value <= ok:
            return 0.0
        if value >= bad:
            return max_penalty
        return max_penalty * (value - ok) / (bad - ok)
    else:
        # Reversed direction: lower value = worse (cold)
        if value >= ok:
            return 0.0
        if value <= bad:
            return max_penalty
        return max_penalty * (ok - value) / (ok - bad)


# ---------------------------------------------------------------------------
# Hard gates (binary - not ramped)
# ---------------------------------------------------------------------------

def _is_rain_gated(hour: HourData, t: Thresholds) -> bool:
    if hour.precip_mm is not None and hour.precip_mm >= t.rain_gate_mm:
        return True
    if hour.precip_prob_pct is not None and hour.precip_prob_pct >= t.rain_gate_prob_pct:
        return True
    return False


def _is_wind_gated(hour: HourData, t: Thresholds) -> bool:
    if hour.gust_ms is not None and hour.gust_ms >= t.wind_gate_ms:
        return True
    return False


def _is_dog_heat_gated(hour: HourData, t: Thresholds) -> bool:
    if hour.feelslike_c is None:
        return False
    basic_heat_bad = hour.feelslike_c >= t.dog_heat_gate_c
    compound_heat_bad = (
        hour.uv_index is not None
        and hour.uv_index >= t.dog_heat_compound_uv
        and hour.feelslike_c >= t.dog_heat_compound_warn_c
    )
    return basic_heat_bad or compound_heat_bad


def _rain_gate_chip(hour: HourData, t: Thresholds) -> ReasonChip:
    if hour.precip_mm is not None and hour.precip_mm >= t.rain_gate_mm:
        return ReasonChip(factor="rain", text="Heavy rain", emoji="danger", penalty=0)
    return ReasonChip(factor="rain", text="Rain very likely", emoji="danger", penalty=0)


# ---------------------------------------------------------------------------
# Reason chip helpers
# ---------------------------------------------------------------------------

def _penalty_text_waves(value: float, penalty: int) -> str:
    if penalty >= 50:
        return f"Waves {value}m - rough"
    return f"Waves {value}m"


def _penalty_text_waves_dog(value: float, penalty: int) -> str:
    if penalty >= 50:
        return f"Waves too rough for dog"
    return f"Waves {value}m - watch your dog"


def _dust_penalty_text(pm10: float, penalty: float, max_penalty: float) -> str:
    if penalty >= max_penalty * 0.7:
        return f"Dusty air (PM10 {pm10:.0f})"
    return "Some dust in air"


def _build_reason_chips(
    penalties: list[tuple[str, int, str]], score: int, mode: str
) -> list[ReasonChip]:
    """Build 2-5 reason chips from penalty tuples."""
    negative = [(f, p, t) for f, p, t in penalties if p < 0]
    info_chips = [(f, p, t) for f, p, t in penalties if p == 0 and "unavailable" in t]
    zero_factors = [(f, p, t) for f, p, t in penalties if p == 0 and "unavailable" not in t]

    # Sort negatives by abs(penalty) desc, then by factor priority for ties
    negative.sort(key=lambda x: (-abs(x[1]), FACTOR_PRIORITY.index(x[0]) if x[0] in FACTOR_PRIORITY else 99))

    top_negative = negative[:4]

    chips: list[ReasonChip] = []

    for factor, penalty, text in top_negative:
        emoji = "danger" if abs(penalty) >= 30 else "warning"
        chips.append(ReasonChip(factor=factor, text=text, emoji=emoji, penalty=penalty))

    # Add positive chip if score >= 70
    if score >= 70:
        positive_chip = _select_positive_chip(penalties, mode)
        if positive_chip:
            chips.append(positive_chip)

    # Add info chips for missing data
    for factor, _, text in info_chips:
        if len(chips) < 5:
            chips.append(ReasonChip(factor=factor, text=text, emoji="info", penalty=0))

    # Ensure at least 2 chips
    if len(chips) < 2:
        for factor, _, text in zero_factors:
            if len(chips) >= 2:
                break
            if not any(c.factor == factor for c in chips):
                chips.append(ReasonChip(factor=factor, text=text, emoji="check", penalty=0))

    if len(chips) < 2 and score >= 70:
        generic_positives = [
            ("wind", "Calm wind"),
            ("aqi", "Air quality good"),
        ]
        for factor, text in generic_positives:
            if len(chips) >= 2:
                break
            if not any(c.factor == factor for c in chips):
                chips.append(ReasonChip(factor=factor, text=text, emoji="check", penalty=0))

    return chips[:5]


def _select_positive_chip(
    penalties: list[tuple[str, int, str]], mode: str
) -> ReasonChip | None:
    """Select 1 positive chip for the highest-value OK factor."""
    penalty_factors = {f for f, p, _ in penalties if p < 0}
    info_factors = {f for f, p, t in penalties if p == 0 and "unavailable" in t}

    is_swim = mode.startswith("swim")

    candidates = []
    if is_swim:
        candidates.append(("waves", "Waves calm"))
    candidates.extend([
        ("heat", "Nice temperature"),
        ("uv", "UV low"),
        ("aqi", "Air quality good"),
        ("dust", "Air is clear"),
        ("wind", "Calm wind"),
    ])

    for factor, text in candidates:
        if factor not in penalty_factors and factor not in info_factors:
            return ReasonChip(factor=factor, text=text, emoji="check", penalty=0)

    return None


# ---------------------------------------------------------------------------
# Mode scoring functions
# ---------------------------------------------------------------------------

def _score_swim_solo(hour: HourData, t: Thresholds) -> ModeScore:
    if _is_rain_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[_rain_gate_chip(hour, t)], hard_gated=True,
        )

    penalties: list[tuple[str, int, str]] = []

    # Waves
    if hour.wave_height_m is not None:
        p = _linear_penalty(hour.wave_height_m, t.swim_wave_ok_m, t.swim_wave_bad_m, t.swim_wave_max_penalty)
        if p > 0:
            penalties.append(("waves", -round(p), _penalty_text_waves(hour.wave_height_m, round(p))))
    else:
        penalties.append(("waves", 0, "Wave data unavailable"))

    # Wind
    if hour.gust_ms is not None:
        p = _linear_penalty(hour.gust_ms, t.wind_ok_ms, t.wind_bad_ms, t.wind_swim_max_penalty)
        if p > 0:
            penalties.append(("wind", -round(p), f"Gusty {hour.gust_ms:.0f}m/s"))
    else:
        penalties.append(("wind", 0, "Wind data unavailable"))

    # AQI
    if hour.eu_aqi is not None:
        p = _linear_penalty(float(hour.eu_aqi), float(t.aqi_ok), float(t.aqi_bad), t.aqi_swim_max_penalty)
        if p > 0:
            text = "Air quality poor" if p >= t.aqi_swim_max_penalty * 0.7 else "AQI moderate"
            penalties.append(("aqi", -round(p), text))
    else:
        penalties.append(("aqi", 0, "AQI data unavailable"))

    # PM10 / Dust
    if hour.pm10 is not None:
        p = _linear_penalty(hour.pm10, t.pm10_ok, t.pm10_bad, t.pm10_swim_max_penalty)
        if p > 0:
            penalties.append(("dust", -round(p), _dust_penalty_text(hour.pm10, p, t.pm10_swim_max_penalty)))

    # Heat
    if hour.feelslike_c is not None:
        p_heat = _linear_penalty(hour.feelslike_c, t.swim_heat_ok_c, t.swim_heat_bad_c, t.swim_heat_max_penalty)
        p_cold = _linear_penalty(hour.feelslike_c, t.swim_cold_ok_c, t.swim_cold_bad_c, t.swim_cold_max_penalty)
        if p_cold > 0:
            penalties.append(("cold", -round(p_cold), f"Chilly {hour.feelslike_c:.0f}°C"))
        elif p_heat > 0:
            penalties.append(("heat", -round(p_heat), f"Hot {hour.feelslike_c:.0f}°C"))
    else:
        penalties.append(("heat", 0, "Temp data unavailable"))

    # UV - not penalized for swim_solo
    if hour.uv_index is None:
        penalties.append(("uv", 0, "UV data unavailable"))

    total = sum(p[1] for p in penalties)
    score = max(0, min(100, 100 + total))

    sun_mult = _sun_multiplier(hour.hour_utc, hour.sunrise_utc, hour.sunset_utc)
    if sun_mult == 0.0:
        return ModeScore(
            score=0, label="Nope",
            reasons=[ReasonChip(factor="dark", text="After dark - no night swimming", emoji="danger", penalty=100)],
            hard_gated=True,
        )
    elif sun_mult < 1.0:
        score = max(0, int(score * sun_mult))

    label = score_to_label(score)
    reasons = _build_reason_chips(penalties, score, "swim_solo")

    return ModeScore(score=score, label=label, reasons=reasons, hard_gated=False)


def _score_swim_dog(hour: HourData, t: Thresholds) -> ModeScore:
    if _is_rain_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[_rain_gate_chip(hour, t)], hard_gated=True,
        )

    penalties: list[tuple[str, int, str]] = []

    # Waves (stricter dog thresholds)
    if hour.wave_height_m is not None:
        p = _linear_penalty(hour.wave_height_m, t.swim_dog_wave_ok_m, t.swim_dog_wave_bad_m, t.swim_dog_wave_max_penalty)
        if p > 0:
            penalties.append(("waves", -round(p), _penalty_text_waves_dog(hour.wave_height_m, round(p))))
    else:
        penalties.append(("waves", 0, "Wave data unavailable"))

    # Wind (same as swim_solo)
    if hour.gust_ms is not None:
        p = _linear_penalty(hour.gust_ms, t.wind_ok_ms, t.wind_bad_ms, t.wind_swim_max_penalty)
        if p > 0:
            penalties.append(("wind", -round(p), f"Gusty {hour.gust_ms:.0f}m/s"))
    else:
        penalties.append(("wind", 0, "Wind data unavailable"))

    # AQI (same as swim_solo)
    if hour.eu_aqi is not None:
        p = _linear_penalty(float(hour.eu_aqi), float(t.aqi_ok), float(t.aqi_bad), t.aqi_swim_max_penalty)
        if p > 0:
            text = "Air quality poor" if p >= t.aqi_swim_max_penalty * 0.7 else "AQI moderate"
            penalties.append(("aqi", -round(p), text))
    else:
        penalties.append(("aqi", 0, "AQI data unavailable"))

    # PM10 / Dust
    if hour.pm10 is not None:
        p = _linear_penalty(hour.pm10, t.pm10_ok, t.pm10_bad, t.pm10_swim_max_penalty)
        if p > 0:
            penalties.append(("dust", -round(p), _dust_penalty_text(hour.pm10, p, t.pm10_swim_max_penalty)))

    # Dog heat penalty (not hard gate - dogs cool in water)
    if hour.feelslike_c is not None:
        p = _linear_penalty(hour.feelslike_c, t.dog_swim_heat_ok_c, t.dog_swim_heat_bad_c, t.dog_swim_heat_max_penalty)
        if p > 0:
            penalties.append(("heat", -round(p), "Warm for paws"))
    else:
        penalties.append(("heat", 0, "Temp data unavailable"))

    # Dog UV
    if hour.uv_index is not None:
        p = _linear_penalty(hour.uv_index, t.uv_ok, t.uv_bad, t.uv_swim_dog_max_penalty)
        if p > 0:
            penalties.append(("uv", -round(p), "UV elevated"))
    else:
        penalties.append(("uv", 0, "UV data unavailable"))

    total = sum(p[1] for p in penalties)
    score = max(0, min(100, 100 + total))

    sun_mult = _sun_multiplier(hour.hour_utc, hour.sunrise_utc, hour.sunset_utc)
    if sun_mult == 0.0:
        return ModeScore(
            score=0, label="Nope",
            reasons=[ReasonChip(factor="dark", text="After dark - no night swimming", emoji="danger", penalty=100)],
            hard_gated=True,
        )
    elif sun_mult < 1.0:
        score = max(0, int(score * sun_mult))

    label = score_to_label(score)
    reasons = _build_reason_chips(penalties, score, "swim_dog")

    return ModeScore(score=score, label=label, reasons=reasons, hard_gated=False)


def _score_run_solo(hour: HourData, t: Thresholds) -> ModeScore:
    if _is_rain_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[_rain_gate_chip(hour, t)], hard_gated=True,
        )
    if _is_wind_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[ReasonChip(factor="wind", text="Wind too strong", emoji="danger", penalty=0)],
            hard_gated=True,
        )

    penalties: list[tuple[str, int, str]] = []

    # Heat
    if hour.feelslike_c is not None:
        p = _linear_penalty(hour.feelslike_c, t.run_heat_ok_c, t.run_heat_bad_c, t.run_heat_max_penalty)
        if p > 0:
            text = "Too hot to run" if p >= t.run_heat_max_penalty * 0.8 else f"Warm {hour.feelslike_c:.0f}°C"
            penalties.append(("heat", -round(p), text))
    else:
        penalties.append(("heat", 0, "Temp data unavailable"))

    # UV
    if hour.uv_index is not None:
        p = _linear_penalty(hour.uv_index, t.uv_ok, t.uv_bad, t.uv_run_max_penalty)
        if p > 0:
            text = "UV very high" if p >= t.uv_run_max_penalty * 0.7 else "UV elevated"
            penalties.append(("uv", -round(p), text))
    else:
        penalties.append(("uv", 0, "UV data unavailable"))

    # AQI
    if hour.eu_aqi is not None:
        p = _linear_penalty(float(hour.eu_aqi), float(t.aqi_ok), float(t.aqi_bad), t.aqi_run_max_penalty)
        if p > 0:
            text = "Air quality poor" if p >= t.aqi_run_max_penalty * 0.7 else "AQI moderate"
            penalties.append(("aqi", -round(p), text))
    else:
        penalties.append(("aqi", 0, "AQI data unavailable"))

    # PM10 / Dust
    if hour.pm10 is not None:
        p = _linear_penalty(hour.pm10, t.pm10_ok, t.pm10_bad, t.pm10_run_max_penalty)
        if p > 0:
            penalties.append(("dust", -round(p), _dust_penalty_text(hour.pm10, p, t.pm10_run_max_penalty)))

    # Wind (penalty, not gate - already checked gate above)
    if hour.gust_ms is not None:
        p = _linear_penalty(hour.gust_ms, t.wind_ok_ms, t.wind_bad_ms, t.wind_run_max_penalty)
        if p > 0:
            penalties.append(("wind", -round(p), f"Gusty {hour.gust_ms:.0f}m/s"))
    else:
        penalties.append(("wind", 0, "Wind data unavailable"))

    # Rain (soft penalty)
    if hour.precip_prob_pct is not None:
        p = _linear_penalty(float(hour.precip_prob_pct), t.rain_prob_ok_pct, t.rain_prob_bad_pct, t.rain_run_max_penalty)
        if p > 0:
            penalties.append(("rain", -round(p), "Rain possible"))

    total = sum(p[1] for p in penalties)
    score = max(0, min(100, 100 + total))
    label = score_to_label(score)
    reasons = _build_reason_chips(penalties, score, "run_solo")

    return ModeScore(score=score, label=label, reasons=reasons, hard_gated=False)


def _score_run_dog(hour: HourData, t: Thresholds) -> ModeScore:
    if _is_rain_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[_rain_gate_chip(hour, t)], hard_gated=True,
        )
    if _is_wind_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[ReasonChip(factor="wind", text="Wind too strong", emoji="danger", penalty=0)],
            hard_gated=True,
        )
    if _is_dog_heat_gated(hour, t):
        return ModeScore(
            score=0, label="Nope",
            reasons=[ReasonChip(factor="heat", text="Too hot for dog", emoji="danger", penalty=0)],
            hard_gated=True,
        )

    penalties: list[tuple[str, int, str]] = []
    dog_mult = t.dog_multiplier

    # Heat (1.2x multiplier)
    if hour.feelslike_c is not None:
        p = _linear_penalty(hour.feelslike_c, t.run_heat_ok_c, t.run_heat_bad_c, t.run_heat_max_penalty)
        p = p * dog_mult
        if p > 0:
            text = "Too hot to run" if p >= t.run_heat_max_penalty * dog_mult * 0.8 else f"Warm {hour.feelslike_c:.0f}°C"
            penalties.append(("heat", -round(p), text))
    else:
        penalties.append(("heat", 0, "Temp data unavailable"))

    # UV (1.2x multiplier)
    if hour.uv_index is not None:
        p = _linear_penalty(hour.uv_index, t.uv_ok, t.uv_bad, t.uv_run_max_penalty)
        p = p * dog_mult
        if p > 0:
            text = "UV very high" if p >= t.uv_run_max_penalty * dog_mult * 0.7 else "UV elevated"
            penalties.append(("uv", -round(p), text))
    else:
        penalties.append(("uv", 0, "UV data unavailable"))

    # AQI (1.2x multiplier)
    if hour.eu_aqi is not None:
        p = _linear_penalty(float(hour.eu_aqi), float(t.aqi_ok), float(t.aqi_bad), t.aqi_run_max_penalty)
        p = p * dog_mult
        if p > 0:
            text = "Air quality poor" if p >= t.aqi_run_max_penalty * dog_mult * 0.7 else "AQI moderate"
            penalties.append(("aqi", -round(p), text))
    else:
        penalties.append(("aqi", 0, "AQI data unavailable"))

    # PM10 / Dust (1.2x multiplier)
    if hour.pm10 is not None:
        p = _linear_penalty(hour.pm10, t.pm10_ok, t.pm10_bad, t.pm10_run_max_penalty)
        p = p * dog_mult
        if p > 0:
            penalties.append(("dust", -round(p), _dust_penalty_text(hour.pm10, p, t.pm10_run_max_penalty * dog_mult)))

    # Wind (no multiplier)
    if hour.gust_ms is not None:
        p = _linear_penalty(hour.gust_ms, t.wind_ok_ms, t.wind_bad_ms, t.wind_run_max_penalty)
        if p > 0:
            penalties.append(("wind", -round(p), f"Gusty {hour.gust_ms:.0f}m/s"))
    else:
        penalties.append(("wind", 0, "Wind data unavailable"))

    # Rain (no multiplier)
    if hour.precip_prob_pct is not None:
        p = _linear_penalty(float(hour.precip_prob_pct), t.rain_prob_ok_pct, t.rain_prob_bad_pct, t.rain_run_max_penalty)
        if p > 0:
            penalties.append(("rain", -round(p), "Rain possible"))

    total = sum(p[1] for p in penalties)
    score = max(0, min(100, 100 + total))
    label = score_to_label(score)
    reasons = _build_reason_chips(penalties, score, "run_dog")

    return ModeScore(score=score, label=label, reasons=reasons, hard_gated=False)


def score_hour(
    hour: HourData,
    thresholds: Thresholds | None = None,
) -> ScoringOutput:
    """Score a single hour for all 4 activity modes."""
    t = thresholds or BALANCED_THRESHOLDS

    return ScoringOutput(
        hour_utc=hour.hour_utc,
        scoring_version="score_v2",
        swim_solo=_score_swim_solo(hour, t),
        swim_dog=_score_swim_dog(hour, t),
        run_solo=_score_run_solo(hour, t),
        run_dog=_score_run_dog(hour, t),
    )
