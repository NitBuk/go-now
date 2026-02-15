# User Profile Schema (V1)

## Goals
- Personalize hourly "good time" scores for:
  - Swim (solo)
  - Swim (with dog)
  - Run (solo)
  - Run (with dog)
- Keep the schema small and explainable.
- V1 supports only **Tel Aviv Coast** (single location).

## Storage
- Auth via Firebase Auth (Google + Apple providers).
- Profile stored in Firestore.
- Future: profile changes produce `profile_updated_at` for analytics/debug.

## Profile JSON (V1)

```json
{
  "schema_version": "profile_v1",
  "user_id": "string",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",

  "user": {
    "display_name": "string",
    "units": "metric",
    "language": "en",
    "humor_style": "minimal_classy_occasional_jokes"
  },

  "preferences": {
    "activities_enabled": {
      "swim": true,
      "run": true
    },

    "time_preference": {
      "morning": true,
      "midday": false,
      "sunset": true,
      "night": false
    },

    "sensitivities": {
      "waves_strictness": "medium",
      "heat_strictness": "medium",
      "air_quality_strictness": "medium",
      "wind_strictness": "low",
      "rain_strictness": "high"
    },

    "thresholds": {
      "swim_wave_meh_m": 0.6,
      "swim_wave_bad_m": 1.0,

      "swim_dog_wave_meh_m": 0.6,
      "swim_dog_wave_bad_m": 0.8,

      "run_hot_feelslike_warn_c": 28,
      "run_hot_feelslike_bad_c": 32,

      "dog_heat_warn_feelslike_c": 26,
      "dog_heat_bad_feelslike_c": 29,

      "uv_warn": 6,
      "uv_bad": 8,

      "aqi_warn_eu": 60,
      "aqi_bad_eu": 100,

      "wind_warn_ms": 10,
      "wind_bad_ms": 14
    }
  },

  "dog": {
    "has_dog": true,
    "dog_name": "string",
    "size": "small|medium|large",
    "coat": "short|medium|long",
    "heat_sensitivity": "low|medium|high"
  },

  "location": {
    "area_id": "tel_aviv_coast",
    "lat": 32.08,
    "lon": 34.77,
    "note": "Single forecast point in V1"
  },

  "privacy": {
    "analytics_opt_in": true
  }
}
```

## Notes on thresholds
- Thresholds are defaults. Users can tune them later in Settings (not in V1).
- `aqi_*` uses European AQI scale (0–100+).
- Dog heat thresholds default stricter than human running.

## Required fields for onboarding (V1)
- user.display_name (or skip -> "Beach Buddy")
- preferences.activities_enabled
- dog.has_dog (if true -> dog fields)
- privacy.analytics_opt_in (default true, user can opt out)
- preset selection (Chill/Balanced/Strict)
