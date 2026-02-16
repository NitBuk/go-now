# Backend Architecture (V1)

## Goals

- Cheap, serverless, robust from day 1.
- Real data engineering: ingestion pipeline, raw + curated storage, serving cache, observability + data quality checks.
- Scoring + notifications run on-device (Flutter) for cost efficiency and privacy.
- Single location (Tel Aviv Coast), single provider (Open-Meteo free tier).

## System Architecture

```mermaid
graph LR
    subgraph Trigger
        CS[Cloud Scheduler<br/>hourly cron]
    end

    subgraph Messaging
        PS[Pub/Sub<br/>ingest-trigger topic]
    end

    subgraph Ingestion
        IW[Ingest Worker<br/>Cloud Run · Python]
    end

    subgraph External
        OM[Open-Meteo API<br/>weather + marine + air quality]
    end

    subgraph Storage
        GCS[Cloud Storage<br/>raw JSON]
        BQ[BigQuery<br/>curated hourly data<br/>+ ingest runs]
        FS[Firestore<br/>serving cache<br/>+ user profiles]
    end

    subgraph API
        API[API Service<br/>Cloud Run · FastAPI]
    end

    subgraph Clients
        APP[Flutter Mobile App<br/>on-device scoring]
        DASH[Next.js Dashboard<br/>public status + explorer]
    end

    subgraph Auth
        FA[Firebase Auth<br/>Google + Apple]
    end

    CS -->|publish message| PS
    PS -->|push subscription| IW
    IW -->|fetch forecasts| OM
    IW -->|write raw JSON| GCS
    IW -->|load normalized rows| BQ
    IW -->|update serving doc| FS

    API -->|read forecasts| FS
    API -->|read/write profiles| FS
    API -->|validate JWT| FA

    APP -->|GET /v1/public/forecast| API
    APP -->|GET/POST/DELETE /v1/profile| API
    APP -->|sign in| FA

    DASH -->|query analytics| BQ
    DASH -->|GET /v1/public/forecast<br/>GET /v1/public/health| API
```

## Technology Decision Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| API framework | FastAPI (Python) | Async-native, auto-generated OpenAPI docs, fast development, same language as ingest worker |
| Compute | Cloud Run | Serverless, scale-to-zero (no cost when idle), no cluster management, HTTP-triggered |
| Message queue | Pub/Sub | Managed, at-least-once delivery, dead-letter support, decouples scheduler from worker |
| Serving cache | Firestore | Sub-10ms reads, real-time listeners (future), generous free tier (50K reads/day), client SDK for Flutter |
| Analytics store | BigQuery | Serverless columnar warehouse, cheap storage ($0.02/GB/month), dashboard queries without impacting serving |
| Raw archive | Cloud Storage | Cheapest blob storage, full auditability, replay capability for reprocessing |
| Auth | Firebase Auth | Drop-in Google + Apple sign-in, JWT validation via Admin SDK, free tier covers V1 scale |
| Scheduler | Cloud Scheduler | Managed cron, direct Pub/Sub integration, 3 free jobs/month |

## API Service (FastAPI on Cloud Run)

### Service Configuration

| Setting | Value |
|---------|-------|
| Runtime | Python 3.11+ |
| Min instances | 0 (scale to zero) |
| Max instances | 2 |
| Memory | 256 MB |
| CPU | 1 |
| Timeout | 30s |
| Concurrency | 80 |
| Ingress | All traffic |
| Port | 8080 |

### Endpoints

#### `GET /v1/public/forecast`

Returns the 7-day hourly forecast for an area. No authentication required.

**Query Parameters:**

| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| `area_id` | string | yes | — | Must be `"tel_aviv_coast"` in V1 |
| `days` | int | no | 7 | Range: [1, 7] |

**Request:**
```
GET /v1/public/forecast?area_id=tel_aviv_coast&days=7
```

**Response — 200 OK:**
```json
{
  "area_id": "tel_aviv_coast",
  "updated_at_utc": "2025-06-01T12:00:10Z",
  "provider": "open_meteo",
  "horizon_days": 7,
  "freshness": "fresh",
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

**Notes:**
- `freshness` is `"fresh"` if `updated_at_utc` is less than 90 minutes old, otherwise `"stale"`.
- The `hours` array contains up to `days * 24` objects. Missing hours are omitted (not null-padded).
- When `days < 7`, the response filters `hours` to only include the requested range starting from the current hour.
- Full hourly field schema is defined in `03_data_sources.md` (Layer 3: Serving).

---

#### `GET /v1/public/health`

Returns pipeline health and forecast freshness. No authentication required. Used by the dashboard and monitoring.

**Request:**
```
GET /v1/public/health
```

**Response — 200 OK:**
```json
{
  "status": "healthy",
  "forecast_area_id": "tel_aviv_coast",
  "forecast_updated_at_utc": "2025-06-01T12:00:10Z",
  "forecast_age_minutes": 12,
  "scoring_version": "score_v1",
  "api_version": "v1",
  "timestamp_utc": "2025-06-01T12:12:30Z"
}
```

**`status` values:**
- `"healthy"` — forecast is fresh (< 90 min old).
- `"degraded"` — forecast is stale (>= 90 min old) or last ingest was `degraded`.
- `"unhealthy"` — forecast is very stale (> 180 min) or last ingest `failed`.

---

#### `GET /v1/profile`

Returns the authenticated user's profile. Requires Firebase JWT.

**Request:**
```
GET /v1/profile
Authorization: Bearer <firebase_id_token>
```

**Response — 200 OK:**
```json
{
  "schema_version": "profile_v1",
  "user_id": "abc123def456",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:05:00Z",
  "user": {
    "display_name": "Nitzan",
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
    "dog_name": "Rex",
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

**Profile schema details:** See `02_user_profile_schema.md` for full field reference, validation rules, and preset-to-threshold mapping.

---

#### `POST /v1/profile`

Creates or updates the authenticated user's profile. Requires Firebase JWT. Upsert semantics: creates on first call, updates on subsequent calls.

**Request:**
```
POST /v1/profile
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user": {
    "display_name": "Nitzan",
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
    "dog_name": "Rex",
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

**Backend behavior:**
1. Validate JWT, extract `user_id`.
2. Validate request body against `profile_v1` schema (see `02_user_profile_schema.md` for field validation rules).
3. Set `schema_version` to `"profile_v1"`, `user_id` from JWT.
4. Set `created_at` on first write; always update `updated_at`.
5. Write to `users/{user_id}` using Firestore `set()` with merge.

**Response — 201 Created (first write) / 200 OK (update):**
```json
{
  "schema_version": "profile_v1",
  "user_id": "abc123def456",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:05:00Z"
}
```

---

#### `DELETE /v1/profile`

Deletes the authenticated user's profile from Firestore. Requires Firebase JWT.

**Request:**
```
DELETE /v1/profile
Authorization: Bearer <firebase_id_token>
```

**Response — 200 OK:**
```json
{
  "deleted": true,
  "user_id": "abc123def456"
}
```

**Response — 404 Not Found (no profile exists):**
```json
{
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "No profile found for this user.",
    "details": {}
  },
  "request_id": "req_abc123"
}
```

**Note:** This deletes only the Firestore profile document. It does not delete the Firebase Auth account. Firebase Auth account deletion is handled client-side via the Firebase SDK.

### Error Response Envelope

All error responses use a standardized envelope:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  },
  "request_id": "string"
}
```

- `code` — Machine-readable error code (UPPER_SNAKE_CASE).
- `message` — Human-readable description. Safe to display in UI.
- `details` — Optional structured data (e.g., validation errors). Empty object `{}` when not applicable.
- `request_id` — Unique ID generated per request for tracing. Format: `req_{ulid}`.

**Error code catalog:**

| Code | When Used |
|------|-----------|
| `INVALID_AREA_ID` | `area_id` not recognized |
| `INVALID_PARAMETER` | Query param or body field fails validation |
| `MISSING_AUTH_TOKEN` | Private endpoint called without `Authorization` header |
| `INVALID_AUTH_TOKEN` | Firebase JWT validation failed (expired, malformed, wrong issuer) |
| `PROFILE_NOT_FOUND` | `GET /v1/profile` or `DELETE /v1/profile` with no existing profile |
| `SCHEMA_VALIDATION_ERROR` | `POST /v1/profile` body does not match `profile_v1` schema |
| `INTERNAL_ERROR` | Unhandled server error |

### HTTP Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 200 | OK | Successful read, update, or delete |
| 201 | Created | Profile created for the first time via `POST /v1/profile` |
| 400 | Bad Request | Invalid query parameter, malformed request body, schema validation failure |
| 401 | Unauthorized | Missing or invalid Firebase JWT |
| 403 | Forbidden | Valid JWT but user does not have access to the requested resource |
| 404 | Not Found | Profile does not exist, or unknown `area_id` |
| 500 | Internal Server Error | Unhandled exception, Firestore/BQ unavailable |

### Authentication Flow

Private endpoints (`/v1/profile`, `/v1/profile/*`) require authentication:

```
1. Client signs in via Firebase Auth SDK (Google or Apple provider).
2. Client obtains a Firebase ID token (JWT).
3. Client sends request with header: Authorization: Bearer <firebase_id_token>
4. Backend middleware:
   a. Extracts token from Authorization header.
   b. Validates JWT using Firebase Admin SDK (firebase_admin.auth.verify_id_token()).
   c. Checks token expiry, issuer, and audience.
   d. Extracts user_id (uid) from the verified token claims.
   e. Attaches user_id to the request context.
5. Route handler uses request.state.user_id to scope Firestore reads/writes.
```

**Token refresh:** Firebase ID tokens expire after 1 hour. The Flutter app uses the Firebase SDK's automatic token refresh. The backend does not handle refresh tokens -- it only validates ID tokens.

**Public endpoints** (`/v1/public/*`) do not require authentication. The `Authorization` header is ignored if present.

### CORS Policy

| Setting | Public Endpoints (`/v1/public/*`) | Private Endpoints (`/v1/profile`) |
|---------|----------------------------------|-----------------------------------|
| Allowed Origins | `*` (any origin) | App bundle ID origins, `http://localhost:3000` (dev dashboard) |
| Allowed Methods | `GET, OPTIONS` | `GET, POST, DELETE, OPTIONS` |
| Allowed Headers | `Content-Type` | `Content-Type, Authorization` |
| Credentials | `false` | `true` |
| Max Age | 3600s | 3600s |

**Rationale:** Public forecast data is open -- anyone can embed it. Private endpoints restrict origins to the app and local development. The dashboard only reads public endpoints.

### Rate Limiting

None for V1. Cloud Run's concurrency limits (80 per instance, max 2 instances = 160 concurrent) are sufficient for the expected load. Re-evaluate at >1,000 DAU.

If rate limiting becomes necessary, implement at the Cloud Run level using a middleware that counts requests per IP/user_id with a Firestore or Redis counter.

### Environment Configuration

All configuration is injected via Cloud Run environment variables. No `.env` files in production.

| Variable | Description | Example |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | GCP project ID | `go-now-prod` |
| `FIRESTORE_DATABASE` | Firestore database ID | `(default)` |
| `FIREBASE_PROJECT_ID` | Firebase project ID (for JWT validation) | `go-now-prod` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,https://gonow.app` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `ENV` | Environment name | `prod` |

Secrets (API keys, service account credentials) are stored in Secret Manager and referenced via Cloud Run secret mounts. See `infra/README.md` for secrets management details.

## Ingest Worker (Python on Cloud Run)

### Service Configuration

| Setting | Value |
|---------|-------|
| Runtime | Python 3.11+ |
| Min instances | 0 |
| Max instances | 1 |
| Memory | 512 MB |
| CPU | 1 |
| Timeout | 120s |
| Trigger | Pub/Sub push subscription |

### Pipeline Details

Full ingestion pipeline steps, retry policy, failure scenarios, idempotency, and transaction boundaries are defined in `03_data_sources.md` (Ingestion Pipeline section).

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | GCP project ID | `go-now-prod` |
| `GCS_RAW_BUCKET` | Cloud Storage bucket for raw JSON | `go-now-prod-raw` |
| `BQ_DATASET` | BigQuery dataset name | `go_now_v1` |
| `FIRESTORE_DATABASE` | Firestore database ID | `(default)` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `ENV` | Environment name | `prod` |

## Scheduler + Pub/Sub

### Cloud Scheduler Job

| Setting | Value |
|---------|-------|
| Name | `ingest-hourly` |
| Schedule | `0 * * * *` (top of every hour) |
| Timezone | `UTC` |
| Target | Pub/Sub topic `ingest-trigger` |
| Payload | `{"area_id": "tel_aviv_coast", "horizon_days": 7}` |
| Retry config | Max 3 retries, 10s min backoff |

### Pub/Sub Topic

| Setting | Value |
|---------|-------|
| Topic | `ingest-trigger` |
| Subscription | `ingest-trigger-push` (push to Ingest Worker Cloud Run URL) |
| Ack deadline | 120s (matches worker timeout) |
| Message retention | 7 days |
| Dead-letter topic | `ingest-trigger-dlq` (for messages that fail after all retries) |

## Firestore Data Model

### `forecasts/{area_id}`

Serving forecast document. Public read, backend-only write.

One document per area (V1 has only `tel_aviv_coast`). Contains the full 7-day hourly forecast as a denormalized array for fast single-read access.

Full document schema and field definitions: see `03_data_sources.md` (Layer 3: Serving).

### `users/{user_id}`

User profile document. Owner-only read/write.

Full document schema, field reference, validation rules, and preset-to-threshold mapping: see `02_user_profile_schema.md`.

Firestore security rules are defined in `02_user_profile_schema.md` (Firestore Security Rules section).

## BigQuery Tables

### Dataset: `go_now_v1`

#### `hourly_forecast_v1`

Normalized hourly rows for analytics and dashboard queries. Full column definitions: see `03_data_sources.md` (Layer 2: Curated).

Partitioning: by `hour_utc` (day-level). Clustering: by `area_id`.

#### `ingest_runs_v1`

One row per ingest pipeline execution. Used for idempotency checks, freshness monitoring, and pipeline debugging.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `run_id` | STRING | no | Unique run identifier. Format: `run_{YYYYMMDD}_{HHMMSS}_{random6}` |
| `area_id` | STRING | no | Always `"tel_aviv_coast"` in V1 |
| `started_at_utc` | TIMESTAMP | no | When the ingest run began |
| `finished_at_utc` | TIMESTAMP | no | When the ingest run completed |
| `status` | STRING | no | `"success"`, `"degraded"`, or `"failed"` |
| `provider` | STRING | no | `"open_meteo"` |
| `hours_ingested` | INT64 | no | Number of hourly rows written |
| `dq_flags` | ARRAY<STRING> | yes | Data quality flags (e.g., `["low_hour_count:142"]`) |
| `error_message` | STRING | yes | Error details if `status != "success"` |
| `schema_version` | STRING | no | `"ingest_run_v1"` |

Partitioning: by `started_at_utc` (day-level). No clustering needed (small table).

## Observability

Observability, structured logging, alerting, and data quality monitoring are defined in `13_observability_data_quality.md`.

Key alerts referenced by other components:
- Forecast freshness > 180 minutes.
- 3 consecutive ingest failures.
- BigQuery or Firestore write failures.

## Security

### Principle of Least Privilege

Each service runs with a dedicated service account. No service account has more permissions than it needs.

| Service Account | Purpose | IAM Roles |
|----------------|---------|-----------|
| `api-service@{project}.iam.gserviceaccount.com` | API Service | `roles/datastore.user` (Firestore read/write for profiles and forecasts) |
| `ingest-worker@{project}.iam.gserviceaccount.com` | Ingest Worker | `roles/storage.objectCreator` (GCS raw writes), `roles/bigquery.dataEditor` (BQ writes), `roles/datastore.user` (Firestore forecast doc writes) |
| `dashboard-reader@{project}.iam.gserviceaccount.com` | Dashboard (BQ queries) | `roles/bigquery.dataViewer` (read-only BQ access) |

See `infra/README.md` for full IAM setup.

### Data Privacy

- Public endpoints expose only shared Tel Aviv forecast data. No user data is accessible without authentication.
- Private endpoints (`/v1/profile`) are scoped to the authenticated user's own profile via `user_id` from the JWT. A user cannot read or modify another user's profile.
- Profile deletion (`DELETE /v1/profile`) removes all user data from Firestore.
- The `privacy.analytics_opt_in` field controls whether the app sends analytics events (enforced client-side).

### Network Security

- All Cloud Run services use HTTPS only (enforced by Cloud Run).
- Ingest Worker is not publicly accessible -- triggered only via Pub/Sub push subscription with IAM authentication.
- Firestore security rules enforce client-side access control (see `02_user_profile_schema.md`).
- The API service account authenticates to Firestore and BigQuery via workload identity (no key files in production).

## Cost Control

| Decision | Impact |
|----------|--------|
| Scale-to-zero on all Cloud Run services | Zero cost when idle (nights, low-traffic periods) |
| Single location in V1 | 72 provider calls/day (1 area x 3 endpoints x 24 hours) |
| Firestore for serving reads | API reads one document per forecast request (1 read unit) |
| BigQuery for analytics only | Dashboard is the only BQ reader; no real-time BQ queries from app |
| On-device scoring | No server-side compute for scoring; reduces API complexity and cost |
| Compact Firestore docs | Single forecast doc with 168 hourly objects (~15 KB); well under 1 MB limit |
| No CDN in V1 | Unnecessary overhead for single-region, low-traffic app |

Estimated monthly cost at V1 scale: under $5/month. See `infra/README.md` for detailed cost breakdown.

## Deletion and Data Export

### `DELETE /v1/profile`

Deletes the `users/{user_id}` document from Firestore. Does not delete the Firebase Auth account (handled client-side). Does not affect forecast data or BigQuery records (no user data stored there).

### Export (V1.1 deferred)

`GET /v1/profile/export` -- returns the full profile JSON. Planned for V1.1 as part of GDPR data portability compliance.
