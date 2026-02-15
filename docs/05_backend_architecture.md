# Backend Architecture (V1)

## Goals
- Cheap, serverless, robust from day 1.
- Show real data engineering:
  - ingestion pipeline
  - raw + curated storage
  - serving cache
  - observability + data quality checks
- Keep the scoring + notifications on-device for cost efficiency.

## Components

### 1) API Service (FastAPI)
Runs on Cloud Run.

Responsibilities:
- Serve public forecast (no auth)
- Auth verification (Firebase JWT) for private endpoints
- Serve user profile from Firestore
- Health and freshness endpoints

Endpoints (V1)
Public:
- GET `/v1/public/forecast?area_id=tel_aviv_coast&days=7`
- GET `/v1/public/health`

Private:
- GET `/v1/profile`
- POST `/v1/profile`
- DELETE `/v1/profile`

Enhanced (future):
- GET `/v1/enhanced/recommendations?min_minutes=60`
- POST `/v1/enhanced/feedback`

Auth:
- App sends Firebase ID token for private endpoints.
- Backend validates token and extracts `user_id`.

### 2) Ingest Worker (Python)
Runs on Cloud Run (separate service).
Triggered by Pub/Sub message.

Responsibilities:
- fetch provider forecasts
- write raw JSON to Cloud Storage
- normalize and load to BigQuery
- update Firestore serving doc

### 3) Scheduler + Queue
- Cloud Scheduler triggers hourly.
- Publishes message to Pub/Sub:
  - `{ "area_id": "tel_aviv_coast", "horizon_days": 7 }`

Pub/Sub is our "Kafka-lite".

### 4) Storage Layers
- Cloud Storage (raw)
- BigQuery (curated / analytics)
- Firestore (serving + user profiles)

## Firestore Data Model

### `users/{user_id}`
Stores profile JSON from `profile_v1`.

### `forecasts/{area_id}`
Stores serving forecast doc:
- updated_at_utc
- provider
- horizon_days
- hours: [ ... 168 objects ... ]

## BigQuery Tables

### `hourly_forecast_v1`
Normalized hourly rows.

### `ingest_runs_v1`
One row per ingest run:
- run_id
- area_id
- started_at_utc / finished_at_utc
- status: success | degraded | failed
- provider
- hours_count
- dq_flags (array)
- error_message (nullable)

## Cost Control Principles
- Provider calls only from ingest worker.
- Ingest only 1 location in V1.
- API reads primarily from Firestore, not BigQuery.
- Keep payload compact (168 hourly entries).
- Keep scoring on-device.

## Observability
Emit logs/metrics from both services:
- ingest success/fail counts
- provider latency
- firestore write latency
- api latency p50/p95
- forecast freshness minutes

Alerts:
- freshness > 180 minutes (forecast stale)
- ingest failure 3 times in a row

## Security
- Public endpoints expose only shared Tel Aviv data.
- Private endpoints protected by Firebase Auth.
- Least-privilege service accounts:
  - API: Firestore users + read forecasts
  - Worker: Storage write, BigQuery write, Firestore forecasts write

## Deletion & Export
Delete (V1):
- DELETE `/v1/profile` deletes `users/{user_id}`.

Export (V1.1 optional):
- GET `/v1/profile/export` returns profile JSON.
