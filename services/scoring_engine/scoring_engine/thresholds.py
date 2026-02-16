"""Threshold constants for scoring presets.

Each penalty factor is defined by three values:
  ok   — below this, zero penalty
  bad  — at/above this, maximum penalty
  max_penalty — the penalty applied at the bad threshold

Between ok and bad, the penalty scales linearly.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Thresholds:
    # --- Swim waves ---
    swim_wave_ok_m: float = 0.3
    swim_wave_bad_m: float = 1.5
    swim_wave_max_penalty: float = 70

    # --- Swim dog waves (stricter) ---
    swim_dog_wave_ok_m: float = 0.3
    swim_dog_wave_bad_m: float = 1.0
    swim_dog_wave_max_penalty: float = 80

    # --- Run heat ---
    run_heat_ok_c: float = 26.0
    run_heat_bad_c: float = 38.0
    run_heat_max_penalty: float = 60

    # --- Swim heat ---
    swim_heat_ok_c: float = 28.0
    swim_heat_bad_c: float = 40.0
    swim_heat_max_penalty: float = 10

    # --- Swim cold (reversed: penalty grows as temp drops below ok) ---
    swim_cold_ok_c: float = 18.0
    swim_cold_bad_c: float = 10.0  # lower = worse
    swim_cold_max_penalty: float = 15

    # --- Dog heat (swim_dog penalty — dogs can cool in water) ---
    dog_swim_heat_ok_c: float = 24.0
    dog_swim_heat_bad_c: float = 34.0
    dog_swim_heat_max_penalty: float = 20

    # --- UV ---
    uv_ok: float = 4.0
    uv_bad: float = 10.0
    uv_run_max_penalty: float = 25
    uv_swim_dog_max_penalty: float = 15  # swim_dog UV penalty

    # --- AQI ---
    aqi_ok: int = 40
    aqi_bad: int = 120
    aqi_swim_max_penalty: float = 25
    aqi_run_max_penalty: float = 40

    # --- Wind ---
    wind_ok_ms: float = 7.0
    wind_bad_ms: float = 14.0
    wind_swim_max_penalty: float = 15
    wind_run_max_penalty: float = 12

    # --- Rain probability (soft penalty for run) ---
    rain_prob_ok_pct: float = 30.0
    rain_prob_bad_pct: float = 79.0
    rain_run_max_penalty: float = 10

    # --- Hard gate thresholds (unchanged — binary, not ramped) ---
    rain_gate_mm: float = 3.0
    rain_gate_prob_pct: int = 80
    wind_gate_ms: float = 14.0  # run modes only
    dog_heat_gate_c: float = 29.0  # run_dog basic gate
    dog_heat_compound_warn_c: float = 26.0  # run_dog compound gate
    dog_heat_compound_uv: float = 8.0  # run_dog compound gate UV threshold

    # --- Dog multiplier for run_dog ---
    dog_multiplier: float = 1.2


BALANCED_THRESHOLDS = Thresholds()
