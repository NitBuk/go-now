# Repo Bootstrap (V1)

## Monorepo Layout
/apps
  /mobile_flutter
  /dashboard_nextjs
/services
  /api_fastapi
  /ingest_worker
/docs
/infra

## Shared Contracts
Create `/services/shared_contracts` (or `/packages/contracts`):
- forecast DTO
- health DTO
- profile DTO (profile_v1)
- scoring version constants

## API Service (FastAPI)
Structure:
- main.py (routers)
- routers/public.py
- routers/private.py
- auth/firebase_verify.py
- storage/firestore.py
- models/schemas.py
- config.py

Public routes:
- /v1/public/forecast
- /v1/public/health

Private routes:
- /v1/profile (GET/POST/DELETE)

## Ingest Worker
- main.py consumes Pub/Sub message
- provider/open_meteo.py fetch + raw store
- normalize/normalize_v1.py -> rows
- load/bigquery.py
- load/firestore_serving.py
- dq/checks_v1.py

## Mobile Flutter
Modules:
- auth (Firebase)
- onboarding flow + presets
- forecast client (public endpoint)
- scoring engine (local)
- notifications (local schedule)
- profile persistence

## Dashboard Next.js
Pages:
- status
- forecast
- quality
- architecture

Server-side:
- BigQuery client (service account)
API fallback:
- /v1/public/health
