# Scoring Engine (V1)

## Output
For each hour H in the 7-day forecast:
- Produce 4 scores (0–100):
  1) swim_solo
  2) swim_dog
  3) run_solo
  4) run_dog
- Produce a label and short reasons for each mode.

### Labels
- 85–100: "Perfect"
- 70–84:  "Good"
- 45–69:  "Meh"
- 20–44:  "Bad"
- 0–19:   "Nope"

### Reasons
Return 2–5 reason chips:
- Short, modern, minimal tone
- Example: "Waves 0.9m 😬", "UV high", "AQI good ✅", "Wind gusty"

## Inputs (hourly)
V1 uses one forecast point: Tel Aviv Coast.

### Marine
- wave_height_m
- wave_period_s (optional in v1 scoring)

### Weather
- temp_c
- feelslike_c
- wind_ms
- gust_ms
- precipitation_prob (or rain_mm)
- uv_index

### Air Quality
- european_aqi (EU AQI)
- pm10 (optional)
- pm2_5 (optional)

## Hard gates (score forced to 0)

### All modes
- Heavy rain gate:
  - if rain_mm >= 3.0 -> 0
  - else if precip_prob >= 80% -> 0

### Run (both)
- Very high wind:
  - gust_ms >= threshold.wind_bad_ms -> 0
  (reason: "Wind too strong")

### Dog modes (extra gates)
Dog heat risk is condition-based.

Compute:
- dog_heat_bad = (feelslike_c >= dog_heat_bad_feelslike_c) OR (uv_index >= uv_bad AND feelslike_c >= dog_heat_warn_feelslike_c)
If dog_heat_bad -> run_dog = 0 (reason: "Too hot for dog 🐾")

Note: swim_dog is penalized by heat, not hard-gated in V1.

## Scoring (0–100)
Start with base_score = 100, subtract penalties.

### Swim solo
Penalties:
- Waves:
  - if wave_height_m >= swim_wave_bad_m -> -70
  - else if wave_height_m >= swim_wave_meh_m -> -35
- Wind:
  - if gust_ms >= wind_warn_ms -> -15
- Air quality:
  - if EU_AQI >= aqi_bad_eu -> -25
  - else if EU_AQI >= aqi_warn_eu -> -12
- Temperature comfort (optional):
  - if feelslike_c <= 14 -> -10
  - if feelslike_c >= 32 -> -10

Clamp to [0, 100].

### Swim with dog
Same as swim solo, but stricter:
- Waves use dog thresholds:
  - if wave_height_m >= swim_dog_wave_bad_m -> -80
  - else if wave_height_m >= swim_dog_wave_meh_m -> -45
- Add heat penalty:
  - if feelslike_c >= dog_heat_warn_feelslike_c -> -15
  - if uv_index >= uv_warn -> -10

### Run solo
Penalties:
- Heat:
  - if feelslike_c >= run_hot_feelslike_bad_c -> -60
  - else if feelslike_c >= run_hot_feelslike_warn_c -> -30
- UV:
  - if uv_index >= uv_bad -> -25
  - else if uv_index >= uv_warn -> -12
- Air quality:
  - if EU_AQI >= aqi_bad_eu -> -40
  - else if EU_AQI >= aqi_warn_eu -> -18
- Wind:
  - if gust_ms >= wind_warn_ms -> -12
- Rain (if precip_prob 40–79%): -10

### Run with dog
Same as run solo, but:
- Apply dog hard gate described above (may force 0).
- Otherwise, stricter penalties:
  - Heat penalties multiplied by 1.2
  - AQI penalties multiplied by 1.2
  - UV penalties multiplied by 1.2

## Reason generation
For each mode:
- Track penalty contributions by factor: waves / heat / uv / aqi / wind / rain
- Select top 2–4 highest penalty factors as reasons
- Add 1 positive reason if score >= 70 (e.g., "AQI good ✅" or "Waves low ✅")

## Minimum recommendation window
When suggesting "best time":
- Only consider contiguous blocks of >= 60 minutes.
- Prefer the highest average score over the window, tie-breaker by earliest start.

## Versioning
- scoring_version: "score_v1"
- Log scoring_version with each recommendation and notification schedule event.
