# Scoring Engine (V1)

## Overview

The scoring engine runs **on-device** (Flutter/Dart). For each hour in the 7-day forecast, it produces 4 mode scores (0–100) with labels and reason chips. The engine reads threshold values from the user's profile (populated by preset selection — see canonical table in `02_user_profile_schema.md`).

**Version:** `score_v1` — logged with every recommendation and notification event.

## Output Schema

For each hourly forecast entry, the scoring engine produces:

```json
{
  "hour_utc": "2025-06-01T08:00:00Z",
  "modes": {
    "swim_solo": {
      "score": 82,
      "label": "Good",
      "reasons": [
        {"factor": "waves", "text": "Waves 0.5m", "emoji": "check", "penalty": 0},
        {"factor": "aqi", "text": "AQI moderate", "emoji": "warning", "penalty": -12},
        {"factor": "wind", "text": "Breezy", "emoji": "warning", "penalty": -6}
      ],
      "hard_gated": false
    },
    "swim_dog": { "..." },
    "run_solo": { "..." },
    "run_dog": { "..." }
  }
}
```

### Labels

| Score Range | Label | Color Tier |
|-------------|-------|-----------|
| 85–100 | Perfect | Green |
| 70–84 | Good | Light green |
| 45–69 | Meh | Yellow |
| 20–44 | Bad | Orange |
| 0–19 | Nope | Red |

### Reason Chip Schema

```json
{
  "factor": "waves|heat|uv|aqi|wind|rain|cold",
  "text": "string (short, user-facing)",
  "emoji": "check|warning|danger|info",
  "penalty": -35
}
```

- Each mode produces **2–5 reason chips**.
- Negative penalties are listed first (sorted by magnitude, largest first).
- If `score >= 70`, include 1 positive chip (penalty = 0, emoji = `"check"`).

## Inputs

The engine receives one `HourlyForecast` object per hour (from `/v1/public/forecast` → Firestore serving doc) and one `Thresholds` object from the user's profile.

### Forecast Fields Used

| Field | Type | Source Column | Used By |
|-------|------|--------------|---------|
| `wave_height_m` | float? | `wave_height_m` | swim_solo, swim_dog |
| `feelslike_c` | float? | `feelslike_c` | all modes |
| `wind_ms` | float? | `wind_ms` | (not used directly — gust_ms is used) |
| `gust_ms` | float? | `gust_ms` | all modes |
| `precip_prob_pct` | int? | `precip_prob_pct` | all modes (hard gate + penalty) |
| `precip_mm` | float? | `precip_mm` | all modes (hard gate) |
| `uv_index` | float? | `uv_index` | run_solo, run_dog, swim_dog (heat gate) |
| `eu_aqi` | int? | `eu_aqi` | all modes |

### Threshold Fields (from profile)

All threshold field names and their preset values are defined in the canonical table in `02_user_profile_schema.md`. The scoring engine reads these directly from the user's `thresholds` object.

## Null / Missing Data Handling

When a forecast variable is `null` (provider didn't return data for that hour):

| Variable | If Null | Reason Chip |
|----------|---------|-------------|
| `wave_height_m` | Skip wave penalty (assume 0 penalty) | Add `"Wave data unavailable"` info chip |
| `feelslike_c` | Skip heat/cold penalty; skip dog heat gate | Add `"Temp data unavailable"` info chip |
| `gust_ms` | Skip wind penalty; skip wind hard gate | Add `"Wind data unavailable"` info chip |
| `precip_prob_pct` | Skip rain hard gate (use `precip_mm` only if available) | — |
| `precip_mm` | Skip rain hard gate (use `precip_prob_pct` only if available) | — |
| `uv_index` | Skip UV penalty; skip compound dog heat gate UV component | Add `"UV data unavailable"` info chip |
| `eu_aqi` | Skip AQI penalty | Add `"AQI data unavailable"` info chip |

**If both `precip_prob_pct` and `precip_mm` are null:** Skip rain hard gate entirely; no rain penalty.

**Principle:** Missing data never triggers a penalty or hard gate. Missing data adds an informational chip so the user knows the score is less reliable.

## Hard Gates (Score Forced to 0)

Hard gates are evaluated **before** penalty scoring. If any gate triggers, the mode score is immediately set to 0 with a "Nope" label.

### Rain Gate — All Modes

```
IF precip_mm != null AND precip_mm >= 3.0:
    score = 0, reason = "Heavy rain"
ELSE IF precip_prob_pct != null AND precip_prob_pct >= 80:
    score = 0, reason = "Rain very likely"
```

### Wind Gate — Run Modes Only (run_solo, run_dog)

```
IF gust_ms != null AND gust_ms >= thresholds.wind_bad_ms:
    score = 0, reason = "Wind too strong"
```

### Dog Heat Gate — run_dog Only

Compound condition (heat + UV interaction):

```
IF feelslike_c != null:
    basic_heat_bad = (feelslike_c >= thresholds.dog_heat_bad_feelslike_c)
    compound_heat_bad = (
        uv_index != null
        AND uv_index >= thresholds.uv_bad
        AND feelslike_c >= thresholds.dog_heat_warn_feelslike_c
    )
    IF basic_heat_bad OR compound_heat_bad:
        score = 0, reason = "Too hot for dog"
```

> **Note:** `swim_dog` is *penalized* by heat but not hard-gated. The rationale is that dogs can cool off in the water.

## Penalty Scoring

Start with `base_score = 100`. Subtract penalties per factor. Clamp result to `[0, 100]`.

### swim_solo

| Factor | Condition | Penalty | Reason Text |
|--------|-----------|---------|-------------|
| Waves | `wave_height_m >= swim_wave_bad_m` | -70 | "Waves {X}m — rough" |
| Waves | `wave_height_m >= swim_wave_meh_m` (and < bad) | -35 | "Waves {X}m" |
| Wind | `gust_ms >= wind_warn_ms` | -15 | "Gusty {X}m/s" |
| AQI | `eu_aqi >= aqi_bad_eu` | -25 | "Air quality poor" |
| AQI | `eu_aqi >= aqi_warn_eu` (and < bad) | -12 | "AQI moderate" |
| Cold | `feelslike_c <= 14` | -10 | "Chilly {X}°C" |
| Heat | `feelslike_c >= 32` | -10 | "Hot {X}°C" |

### swim_dog

Same as swim_solo, with these changes:

| Factor | Condition | Penalty | Reason Text |
|--------|-----------|---------|-------------|
| Waves | `wave_height_m >= swim_dog_wave_bad_m` | -80 | "Waves too rough for dog" |
| Waves | `wave_height_m >= swim_dog_wave_meh_m` (and < bad) | -45 | "Waves {X}m — watch your dog" |
| Dog heat | `feelslike_c >= dog_heat_warn_feelslike_c` | -15 | "Warm for paws" |
| Dog UV | `uv_index >= uv_warn` | -10 | "UV elevated" |

> swim_dog also inherits the wind and AQI penalties from swim_solo (same values).

### run_solo

| Factor | Condition | Penalty | Reason Text |
|--------|-----------|---------|-------------|
| Heat | `feelslike_c >= run_hot_feelslike_bad_c` | -60 | "Too hot to run" |
| Heat | `feelslike_c >= run_hot_feelslike_warn_c` (and < bad) | -30 | "Warm {X}°C" |
| UV | `uv_index >= uv_bad` | -25 | "UV very high" |
| UV | `uv_index >= uv_warn` (and < bad) | -12 | "UV elevated" |
| AQI | `eu_aqi >= aqi_bad_eu` | -40 | "Air quality poor" |
| AQI | `eu_aqi >= aqi_warn_eu` (and < bad) | -18 | "AQI moderate" |
| Wind | `gust_ms >= wind_warn_ms` | -12 | "Gusty {X}m/s" |
| Rain | `precip_prob_pct` in [40, 79] | -10 | "Rain possible" |

### run_dog

Same penalty structure as run_solo, with the **1.2x dog multiplier** applied to heat, AQI, and UV penalties:

| Factor | Base Penalty | Dog Multiplied | Applied |
|--------|-------------|---------------|---------|
| Heat (bad) | -60 | × 1.2 = -72 | -72 |
| Heat (warn) | -30 | × 1.2 = -36 | -36 |
| UV (bad) | -25 | × 1.2 = -30 | -30 |
| UV (warn) | -12 | × 1.2 = -14.4 | -14 (rounded) |
| AQI (bad) | -40 | × 1.2 = -48 | -48 |
| AQI (warn) | -18 | × 1.2 = -21.6 | -22 (rounded) |
| Wind | -12 | no multiplier | -12 |
| Rain | -10 | no multiplier | -10 |

**1.2x multiplier application order:** Multiply the base penalty value by 1.2, round to nearest integer, then subtract from score. Clamping to [0, 100] happens **after** all penalties are summed.

> **Clarification:** The 1.2x multiplier is applied to the penalty value before summing, not after clamping. Example: if base_score = 100 and heat_bad (-72) + UV_bad (-30) = -102, the score before clamping is -2, which clamps to 0.

## Reason Chip Generation

### Algorithm

```
1. Collect all (factor, penalty_amount, reason_text) tuples from scoring
2. Sort by abs(penalty_amount) descending
3. Take top 2–4 penalty factors as "negative" chips
4. If final score >= 70:
     Add 1 "positive" chip for the highest-value OK factor
     (e.g., "Waves calm" if wave penalty was 0)
5. Total chips: 2–5 per mode
```

### Tie-Breaking

When two factors have the same absolute penalty:

1. Use this priority order: rain > heat > waves > uv > aqi > wind > cold
2. If still tied, include both (up to the 4-chip max for negative chips)

### Positive Chip Selection

When `score >= 70`, select the positive chip from the first factor in this list that has zero penalty:

1. Waves → "Waves calm" (swim modes) or skip (run modes)
2. Heat → "Nice temperature"
3. UV → "UV low"
4. AQI → "Air quality good"
5. Wind → "Calm wind"

Only 1 positive chip is added.

## Reference Implementation: swim_solo Pseudocode

```python
def score_swim_solo(hour: HourlyForecast, t: Thresholds) -> ModeScore:
    # Hard gates
    if is_rain_gated(hour):
        return ModeScore(score=0, label="Nope", reasons=[rain_gate_reason(hour)], hard_gated=True)

    penalties = []

    # Waves
    if hour.wave_height_m is not None:
        if hour.wave_height_m >= t.swim_wave_bad_m:
            penalties.append(("waves", -70, f"Waves {hour.wave_height_m}m — rough"))
        elif hour.wave_height_m >= t.swim_wave_meh_m:
            penalties.append(("waves", -35, f"Waves {hour.wave_height_m}m"))
    else:
        penalties.append(("waves", 0, "Wave data unavailable"))  # info chip

    # Wind
    if hour.gust_ms is not None:
        if hour.gust_ms >= t.wind_warn_ms:
            penalties.append(("wind", -15, f"Gusty {hour.gust_ms:.0f}m/s"))

    # AQI
    if hour.eu_aqi is not None:
        if hour.eu_aqi >= t.aqi_bad_eu:
            penalties.append(("aqi", -25, "Air quality poor"))
        elif hour.eu_aqi >= t.aqi_warn_eu:
            penalties.append(("aqi", -12, "AQI moderate"))

    # Cold comfort
    if hour.feelslike_c is not None:
        if hour.feelslike_c <= 14:
            penalties.append(("cold", -10, f"Chilly {hour.feelslike_c:.0f}°C"))
        elif hour.feelslike_c >= 32:
            penalties.append(("heat", -10, f"Hot {hour.feelslike_c:.0f}°C"))

    # Compute score
    total_penalty = sum(p[1] for p in penalties)
    score = max(0, min(100, 100 + total_penalty))
    label = score_to_label(score)

    # Build reason chips
    reasons = build_reason_chips(penalties, score)

    return ModeScore(score=score, label=label, reasons=reasons, hard_gated=False)


def is_rain_gated(hour: HourlyForecast) -> bool:
    if hour.precip_mm is not None and hour.precip_mm >= 3.0:
        return True
    if hour.precip_prob_pct is not None and hour.precip_prob_pct >= 80:
        return True
    return False


def score_to_label(score: int) -> str:
    if score >= 85: return "Perfect"
    if score >= 70: return "Good"
    if score >= 45: return "Meh"
    if score >= 20: return "Bad"
    return "Nope"
```

## Edge Case Test Cases

These test cases should be implemented as golden tests in the scoring engine test suite:

| # | Scenario | Key Inputs | Expected swim_solo | Expected run_dog | Notes |
|---|----------|------------|-------------------|-----------------|-------|
| 1 | All perfect | waves 0.2m, feels 24°C, UV 3, AQI 30, gust 5m/s, no rain | 100 "Perfect" | 100 "Perfect" | Baseline: no penalties |
| 2 | All null | every field null | 100 "Perfect" | 100 "Perfect" | No data = no penalty + info chips |
| 3 | Rain hard gate | precip_mm = 5.0 | 0 "Nope" | 0 "Nope" | All modes gated |
| 4 | Precip prob gate | precip_prob_pct = 85, precip_mm = 0.5 | 0 "Nope" | 0 "Nope" | Probability alone triggers gate |
| 5 | Wind hard gate (run only) | gust_ms = 15 (> wind_bad_ms=14) | score > 0 (swim not gated) | 0 "Nope" | Wind gates run modes only |
| 6 | Dog heat gate | feelslike_c = 30 (>= dog_heat_bad=29) | N/A | 0 "Nope" (run_dog) | Only run_dog gated; swim_dog penalized |
| 7 | Compound dog heat | feelslike_c = 27, UV = 9 (>= uv_bad=8, >= dog_heat_warn=26) | N/A | 0 "Nope" (run_dog) | UV + heat compound gate |
| 8 | Boundary: exactly at warn | waves 0.6m (== swim_wave_meh_m) | 65 "Meh" (-35) | N/A | >= means "at threshold" triggers |
| 9 | Max penalties stacked | waves 1.2m, AQI 120, gust 12m/s, feelslike 33°C | 0 "Nope" (-70-25-15-10) | 0 "Nope" | Sum exceeds 100; clamps to 0 |
| 10 | Dog multiplier edge | run_solo heat_warn (-30), run_dog same = -36 | N/A | score = 64 (100-36) vs solo 70 | Multiplier makes difference |
| 11 | Swim_dog wave threshold | waves 0.85m (>= swim_dog_wave_bad=0.8, < swim_wave_bad=1.0) | 65 "Meh" (-35 meh) | N/A swim_dog: 20 "Bad" (-80) | Dog uses stricter wave thresholds |
| 12 | Stale data | all fields present but forecast is > 3 hours old | Score computes normally | Score computes normally | Staleness is UI concern, not scoring |

> Test case threshold values assume the **Balanced** preset. Adjust for Chill/Strict preset tests using the canonical table in `02_user_profile_schema.md`.

## Minimum Recommendation Window

When computing "best time" windows for notifications or the "Today" tab:

1. Find contiguous blocks of hours where `score >= 70` ("Good" or better).
2. Only consider blocks of **>= 60 minutes** (at least 1 consecutive hour, since forecast is hourly).
3. Rank windows by **average score** across the window's hours.
4. Tie-breaker: earliest start time.
5. Return top 2 windows per mode per day (for notification scheduling).

## Versioning

- **`scoring_version`:** `"score_v1"` — included in every scoring output, notification event, and recommendation log.
- **Purpose:** When scoring logic changes (e.g., new penalty values, new factors), the version increments. This allows debugging why a past notification was sent and comparing scoring accuracy across versions.
