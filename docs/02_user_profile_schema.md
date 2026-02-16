# User Profile Schema (V1)

## Goals

- Personalize hourly scores for 4 modes: swim_solo, swim_dog, run_solo, run_dog.
- Keep the schema small, explainable, and preset-driven.
- V1 supports only **Tel Aviv Coast** (single location).

## Storage

- **Auth:** Firebase Auth (Google + Apple providers).
- **Profile:** Firestore collection `users/{user_id}`.
- **Writes:** Profile created at onboarding; updated via `POST /v1/profile`.
- **Reads:** App reads from local cache first, syncs from Firestore on app open.

## Profile JSON (V1)

```json
{
  "schema_version": "profile_v1",
  "user_id": "string (Firebase UID)",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",

  "user": {
    "display_name": "string",
    "units": "metric",
    "language": "en"
  },

  "preferences": {
    "preset": "balanced",
    "activities_enabled": {
      "swim": true,
      "run": true
    },
    "time_preference": {
      "morning": true,
      "midday": false,
      "sunset": true,
      "night": false
    }
  },

  "notification_preferences": {
    "enabled": true,
    "mode_toggles": {
      "swim_solo": true,
      "swim_dog": true,
      "run_solo": true,
      "run_dog": false
    },
    "quiet_hours": {
      "enabled": false,
      "start": "22:00",
      "end": "07:00"
    }
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
  },

  "dog": {
    "has_dog": true,
    "dog_name": "string",
    "size": "medium",
    "coat": "short",
    "heat_sensitivity": "medium"
  },

  "location": {
    "area_id": "tel_aviv_coast",
    "lat": 32.08,
    "lon": 34.77
  },

  "privacy": {
    "analytics_opt_in": true
  }
}
```

## Field Reference

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | Always `"profile_v1"` |
| `user_id` | string | yes | Firebase UID (set by backend, not user-editable) |
| `created_at` | ISO-8601 | yes | Set once at profile creation |
| `updated_at` | ISO-8601 | yes | Updated on every profile write |

### `user` Object

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `display_name` | string | no | 1–50 chars, trimmed | `"Beach Buddy"` |
| `units` | enum | yes | `"metric"` only in V1 | `"metric"` |
| `language` | enum | yes | `"en"` only in V1 | `"en"` |

> **V1.1 deferred:** `humor_style` field (was in earlier drafts). All V1 users get the default minimal/classy/occasional tone. Custom humor styles may return in V1.1.

### `preferences` Object

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `preset` | enum | yes | `"chill"` \| `"balanced"` \| `"strict"` | `"balanced"` |
| `activities_enabled.swim` | bool | yes | — | `true` |
| `activities_enabled.run` | bool | yes | — | `true` |
| `time_preference.morning` | bool | yes | — | `true` |
| `time_preference.midday` | bool | yes | — | `false` |
| `time_preference.sunset` | bool | yes | — | `true` |
| `time_preference.night` | bool | yes | — | `false` |

**How `preset` works:** When the user selects a preset during onboarding (or changes it in settings), the app immediately writes the corresponding absolute threshold values to the `thresholds` object. The `preset` field is stored for UI display purposes and for re-computing thresholds if the canonical table changes in a future scoring version. The scoring engine reads only from `thresholds`, never from `preset` directly.

### `notification_preferences` Object

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `enabled` | bool | yes | — | `true` |
| `mode_toggles.swim_solo` | bool | yes | — | matches `activities_enabled.swim` |
| `mode_toggles.swim_dog` | bool | yes | — | `true` if `dog.has_dog && activities_enabled.swim` |
| `mode_toggles.run_solo` | bool | yes | — | matches `activities_enabled.run` |
| `mode_toggles.run_dog` | bool | yes | — | `true` if `dog.has_dog && activities_enabled.run` |
| `quiet_hours.enabled` | bool | yes | — | `false` |
| `quiet_hours.start` | string | yes | `HH:MM` 24h format | `"22:00"` |
| `quiet_hours.end` | string | yes | `HH:MM` 24h format | `"07:00"` |

**Default logic:** At onboarding, `mode_toggles` are initialized based on which activities the user enabled and whether they have a dog. Users can individually toggle each mode in Settings.

### `thresholds` Object

| Field | Type | Unit | Validation | Description |
|-------|------|------|------------|-------------|
| `swim_wave_meh_m` | float | meters | [0.1, 3.0] | Wave height where swim starts feeling "meh" |
| `swim_wave_bad_m` | float | meters | [0.2, 5.0] | Wave height where swim score drops hard |
| `swim_dog_wave_meh_m` | float | meters | [0.1, 3.0] | Dog swim "meh" wave threshold |
| `swim_dog_wave_bad_m` | float | meters | [0.2, 5.0] | Dog swim "bad" wave threshold |
| `run_hot_feelslike_warn_c` | float | °C | [20, 40] | Feels-like temp where run starts getting penalized |
| `run_hot_feelslike_bad_c` | float | °C | [25, 45] | Feels-like temp where run score drops hard |
| `dog_heat_warn_feelslike_c` | float | °C | [18, 35] | Dog heat warning threshold |
| `dog_heat_bad_feelslike_c` | float | °C | [22, 40] | Dog heat hard-gate threshold |
| `uv_warn` | float | UV index | [1, 12] | UV level where penalties start |
| `uv_bad` | float | UV index | [3, 15] | UV level where penalties are severe |
| `aqi_warn_eu` | int | EU AQI | [10, 200] | AQI where penalties start |
| `aqi_bad_eu` | int | EU AQI | [30, 300] | AQI where penalties are severe |
| `wind_warn_ms` | float | m/s | [3, 20] | Gust speed where penalties start |
| `wind_bad_ms` | float | m/s | [5, 25] | Gust speed that hard-gates running |

**Relationship to presets:** Users never edit thresholds directly in V1. The `preset` selection writes absolute values from the canonical mapping table below. Custom threshold editing is planned for V1.1.

### `dog` Object

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `has_dog` | bool | yes | — | `false` |
| `dog_name` | string | if `has_dog` | 1–30 chars | — |
| `size` | enum | if `has_dog` | `"small"` \| `"medium"` \| `"large"` | — |
| `coat` | enum | if `has_dog` | `"short"` \| `"medium"` \| `"long"` | — |
| `heat_sensitivity` | enum | if `has_dog` | `"low"` \| `"medium"` \| `"high"` | `"medium"` |

> **V1 note:** `size`, `coat`, and `heat_sensitivity` are collected at onboarding but do **not** affect scoring in V1 (all dogs use the same thresholds). They're stored for V1.1 personalization where large/long-coat/high-sensitivity dogs will get stricter heat thresholds.

### `location` Object

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `area_id` | string | yes | `"tel_aviv_coast"` only in V1 |
| `lat` | float | yes | Fixed: `32.08` |
| `lon` | float | yes | Fixed: `34.77` |

### `privacy` Object

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `analytics_opt_in` | bool | yes | `true` |

## Canonical Preset-to-Threshold Mapping

This is the **single source of truth** for how presets map to threshold values. The scoring engine (`04_scoring_engine_v1.md`) reads from the user's `thresholds` object, which is populated from this table based on the selected preset.

| Threshold Field | Chill | Balanced | Strict |
|----------------|-------|----------|--------|
| `swim_wave_meh_m` | 0.75 | 0.60 | 0.45 |
| `swim_wave_bad_m` | 1.15 | 1.00 | 0.85 |
| `swim_dog_wave_meh_m` | 0.75 | 0.60 | 0.45 |
| `swim_dog_wave_bad_m` | 0.95 | 0.80 | 0.65 |
| `run_hot_feelslike_warn_c` | 29.5 | 28.0 | 26.5 |
| `run_hot_feelslike_bad_c` | 33.5 | 32.0 | 30.5 |
| `dog_heat_warn_feelslike_c` | 27.5 | 26.0 | 24.5 |
| `dog_heat_bad_feelslike_c` | 30.5 | 29.0 | 27.5 |
| `uv_warn` | 7 | 6 | 5 |
| `uv_bad` | 9 | 8 | 7 |
| `aqi_warn_eu` | 80 | 60 | 40 |
| `aqi_bad_eu` | 120 | 100 | 80 |
| `wind_warn_ms` | 10 | 10 | 10 |
| `wind_bad_ms` | 14 | 14 | 14 |

**Derivation:** Balanced is the baseline. Chill adds tolerance (+0.15m waves, +1.5°C heat, +20 EU AQI, +1 UV). Strict subtracts the same amounts. Wind thresholds are safety-critical and do not vary by preset.

## Required Fields at Onboarding

The onboarding flow must collect (or default) these fields:

1. **Sign in** → `user_id` (from Firebase Auth)
2. **Display name** → `user.display_name` (skip → `"Beach Buddy"`)
3. **Activities** → `preferences.activities_enabled` (at least one must be `true`)
4. **Dog** → `dog.has_dog`; if `true` → `dog_name`, `size`, `coat`, `heat_sensitivity`
5. **Preset** → `preferences.preset` (writes `thresholds` from canonical table)
6. **Notifications** → `notification_preferences.enabled` (defaults `mode_toggles` from activities + dog)
7. **Privacy** → `privacy.analytics_opt_in` (default `true`, user can opt out)

All other fields use defaults. The full profile JSON is written to Firestore in a single `set()` call at onboarding completion.

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles: owner-only read/write
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      // Validate schema_version on write
      allow write: if request.resource.data.schema_version == 'profile_v1';
    }

    // Forecast serving docs: public read, no client write
    match /forecasts/{areaId} {
      allow read: if true;
      allow write: if false; // Only backend service account writes
    }
  }
}
```

> **Note:** The ingest worker writes to `forecasts/` using a service account with server-side SDK (bypasses security rules). The `allow write: if false` rule only blocks client-side writes.

## Schema Evolution

- **V1 → V1.1 migration path:** Add new fields with defaults; never remove fields in minor versions.
- **`schema_version`** is checked by the app on profile load. If the app expects `profile_v1` but sees an unknown version, it shows a "please update" prompt.
- **Threshold recalculation:** If the canonical preset table changes in a future scoring version, the app re-applies the user's stored `preset` to regenerate `thresholds` on first launch after update.
