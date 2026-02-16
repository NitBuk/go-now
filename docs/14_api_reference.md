# API Reference (V1)

## Base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://api-fastapi-HASH.europe-west1.run.app` |
| Local dev | `http://localhost:8000` |

All endpoints are prefixed with `/v1/`.

## Authentication

### Public Endpoints

No authentication required. Accessible to anyone.

### Private Endpoints

Require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

**Token validation:** Backend validates the JWT using Firebase Admin SDK:
1. Verify signature against Firebase public keys
2. Check `exp` claim (reject expired tokens)
3. Check `aud` claim matches the Firebase project ID
4. Extract `sub` claim as `user_id`

**Token refresh:** Clients must refresh tokens before expiry (Firebase SDK handles this automatically).

## Error Response Envelope

All error responses use this standard format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description",
    "details": {}
  },
  "request_id": "uuid-v4"
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters or body |
| 400 | `INVALID_SCHEMA_VERSION` | Profile `schema_version` doesn't match expected value |
| 401 | `AUTH_REQUIRED` | No Authorization header provided |
| 401 | `TOKEN_EXPIRED` | Firebase token has expired |
| 401 | `TOKEN_INVALID` | Firebase token failed validation |
| 403 | `FORBIDDEN` | Authenticated but not authorized for this resource |
| 404 | `NOT_FOUND` | Resource not found (area_id, profile) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Public Endpoints

### GET `/v1/public/forecast`

Retrieve the current 7-day hourly forecast for an area.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `area_id` | string | yes | — | Area identifier (V1: `tel_aviv_coast` only) |
| `days` | int | no | `7` | Forecast horizon in days (1–7) |

**Request:**
```bash
curl "https://API_URL/v1/public/forecast?area_id=tel_aviv_coast&days=7"
```

**Response 200:**
```json
{
  "area_id": "tel_aviv_coast",
  "updated_at_utc": "2025-06-01T12:00:10Z",
  "provider": "open_meteo",
  "freshness": "fresh",
  "forecast_age_minutes": 15,
  "horizon_days": 7,
  "hours": [
    {
      "hour_utc": "2025-06-01T00:00:00Z",
      "wave_height_m": 0.4,
      "wave_period_s": 5.2,
      "air_temp_c": 24.1,
      "feelslike_c": 25.3,
      "wind_ms": 3.5,
      "gust_ms": 5.0,
      "precip_prob_pct": 0,
      "precip_mm": 0.0,
      "uv_index": 0.0,
      "eu_aqi": 42,
      "pm10": 18.5,
      "pm2_5": 8.2
    }
  ]
}
```

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `area_id` | string | Echoed area identifier |
| `updated_at_utc` | ISO-8601 | When the forecast was last ingested |
| `provider` | string | Data provider name |
| `freshness` | string | `"fresh"` if < 90min old, `"stale"` otherwise |
| `forecast_age_minutes` | int | Minutes since last update |
| `horizon_days` | int | Number of days in the forecast |
| `hours` | array | Hourly forecast objects (up to 168). See `03_data_sources.md` for field definitions |

**Freshness logic:**
- `forecast_age_minutes < 90` → `freshness: "fresh"`
- `forecast_age_minutes >= 90` → `freshness: "stale"`

**Error responses:**

| Status | When |
|--------|------|
| 400 | Missing `area_id` parameter |
| 404 | Unknown `area_id` |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "area_id is required",
    "details": {}
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### GET `/v1/public/health`

Health check endpoint for monitoring and dashboard.

**Request:**
```bash
curl "https://API_URL/v1/public/health"
```

**Response 200:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "scoring_version": "score_v1",
  "forecast": {
    "area_id": "tel_aviv_coast",
    "updated_at_utc": "2025-06-01T12:00:10Z",
    "age_minutes": 15,
    "freshness": "fresh",
    "ingest_status": "success",
    "hours_count": 168
  },
  "timestamp_utc": "2025-06-01T12:15:00Z"
}
```

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"healthy"` (forecast fresh), `"degraded"` (forecast stale or ingest degraded), `"unhealthy"` (no forecast data) |
| `version` | string | API service version (semver) |
| `scoring_version` | string | Current scoring engine version |
| `forecast.area_id` | string | Monitored area |
| `forecast.updated_at_utc` | ISO-8601 | Last successful forecast update |
| `forecast.age_minutes` | int | Minutes since last update |
| `forecast.freshness` | string | `"fresh"` or `"stale"` |
| `forecast.ingest_status` | string | `"success"`, `"degraded"`, or `"failed"` |
| `forecast.hours_count` | int | Number of hourly entries in current forecast |
| `timestamp_utc` | ISO-8601 | Current server time |

**Status logic:**
- `forecast.age_minutes < 90` AND `ingest_status == "success"` → `"healthy"`
- `forecast.age_minutes >= 90` OR `ingest_status == "degraded"` → `"degraded"`
- No forecast document exists → `"unhealthy"`

---

## Private Endpoints

All private endpoints require `Authorization: Bearer <firebase_id_token>`.

### GET `/v1/profile`

Retrieve the authenticated user's profile.

**Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" "https://API_URL/v1/profile"
```

**Response 200:**
```json
{
  "schema_version": "profile_v1",
  "user_id": "firebase-uid-abc123",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:30:00Z",
  "user": {
    "display_name": "Beach Buddy",
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
    "dog_name": "Luna",
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

See `02_user_profile_schema.md` for complete field reference and validation rules.

**Error responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid auth token |
| 404 | Profile not found (user hasn't completed onboarding) |

---

### POST `/v1/profile`

Create or update the authenticated user's profile.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "profile_v1",
    "user": {
      "display_name": "Nitzan"
    },
    "preferences": {
      "preset": "strict",
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
        "run_dog": true
      },
      "quiet_hours": {
        "enabled": true,
        "start": "22:00",
        "end": "07:00"
      }
    },
    "thresholds": {
      "swim_wave_meh_m": 0.45,
      "swim_wave_bad_m": 0.85,
      "swim_dog_wave_meh_m": 0.45,
      "swim_dog_wave_bad_m": 0.65,
      "run_hot_feelslike_warn_c": 26.5,
      "run_hot_feelslike_bad_c": 30.5,
      "dog_heat_warn_feelslike_c": 24.5,
      "dog_heat_bad_feelslike_c": 27.5,
      "uv_warn": 5,
      "uv_bad": 7,
      "aqi_warn_eu": 40,
      "aqi_bad_eu": 80,
      "wind_warn_ms": 10,
      "wind_bad_ms": 14
    },
    "dog": {
      "has_dog": true,
      "dog_name": "Luna",
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
  }' \
  "https://API_URL/v1/profile"
```

**Behavior:**
- **Create:** If no profile exists for this `user_id`, creates a new one. Sets `created_at` and `updated_at`.
- **Update:** If profile exists, overwrites the full document. Updates `updated_at`. The `user_id` and `created_at` are preserved from the existing doc.

**Backend validation:**
1. `schema_version` must be `"profile_v1"`
2. `location.area_id` must be `"tel_aviv_coast"` (V1)
3. `preferences.preset` must be one of `"chill"`, `"balanced"`, `"strict"`
4. At least one activity must be enabled
5. Threshold values must be within validation ranges (see `02_user_profile_schema.md`)
6. `user_id` is set from the JWT `sub` claim (ignored if provided in body)

**Response 200:**
```json
{
  "schema_version": "profile_v1",
  "user_id": "firebase-uid-abc123",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T12:30:00Z",
  "...full profile..."
}
```

**Error responses:**

| Status | When |
|--------|------|
| 400 | Invalid `schema_version`, missing required fields, invalid enum values, out-of-range thresholds |
| 401 | Missing or invalid auth token |

---

### DELETE `/v1/profile`

Delete the authenticated user's profile. This is a permanent, irreversible action.

**Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://API_URL/v1/profile"
```

**Behavior:**
1. Delete `users/{user_id}` document from Firestore
2. Return 204 (no body)

> **Note:** This does NOT delete the Firebase Auth account. The user can sign in again and create a new profile. Firebase Auth account deletion is handled client-side via the Firebase SDK.

**Response 204:** No body.

**Error responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid auth token |
| 404 | Profile not found |

---

## Versioning Policy

- **URL versioning:** All endpoints prefixed with `/v1/`
- **Breaking changes:** New major version (`/v2/`) with deprecation period for `/v1/`
- **Non-breaking additions:** New optional fields added to existing responses without version bump
- **Scoring version:** Tracked separately via `scoring_version` field (see `04_scoring_engine_v1.md`)
- **Profile schema version:** Tracked via `schema_version` field in profile document

## CORS Policy

| Origin | Allowed | Credentials |
|--------|---------|-------------|
| `https://dashboard.gonow.app` (prod) | Yes | No |
| `http://localhost:3000` (dev dashboard) | Yes | No |
| Flutter app (native) | N/A (not browser) | N/A |
| All other origins | No | No |

Public endpoints allow the dashboard origin. Private endpoints also allow the dashboard origin (for future admin features in V1.1, if needed).

## Rate Limiting

**V1:** No application-level rate limiting. Cloud Run's built-in concurrency limits (default 80 concurrent requests per instance) provide natural throttling. Re-evaluate at > 1000 DAU.

**V1.1 consideration:** Add per-IP rate limiting (e.g., 100 requests/minute for public, 30 requests/minute for private) if abuse is detected.
