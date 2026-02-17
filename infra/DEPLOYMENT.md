# Deployment Reference

Deployed **2026-02-17**. All resources in GCP project `go-now-487612`, region `europe-west1`.

---

## GCP Project

| Field | Value |
|-------|-------|
| Project ID | `go-now-487612` |
| Project Number | `841486153499` |
| Region | `europe-west1` |
| Owner | `nitzanbuk@gmail.com` |

### Enabled APIs

Cloud Run, Firestore, BigQuery, Pub/Sub, Cloud Scheduler, Cloud Storage, Artifact Registry, Cloud Build, IAM, IAM Credentials

---

## Cloud Run Services

| Service | URL | Auth | Service Account |
|---------|-----|------|-----------------|
| `api-fastapi` | https://api-fastapi-841486153499.europe-west1.run.app | Public (unauthenticated) | `api-service@go-now-487612.iam.gserviceaccount.com` |
| `ingest-worker` | https://ingest-worker-841486153499.europe-west1.run.app | Authenticated (Pub/Sub OIDC) | `ingest-worker@go-now-487612.iam.gserviceaccount.com` |
| `dashboard` | https://dashboard-841486153499.europe-west1.run.app | Public (unauthenticated) | Default compute SA |

### Environment Variables

**api-fastapi:**
- `GOOGLE_CLOUD_PROJECT=go-now-487612`
- `ENV=prod`
- `GCS_RAW_BUCKET=go-now-487612-raw`
- `BQ_DATASET=gonow_v1`
- `CORS_ALLOWED_ORIGINS=http://localhost:3000,https://dashboard-841486153499.europe-west1.run.app`

**ingest-worker:**
- `GOOGLE_CLOUD_PROJECT=go-now-487612`
- `ENV=prod`
- `GCS_RAW_BUCKET=go-now-487612-raw`
- `BQ_DATASET=gonow_v1`

**dashboard:**
- `NEXT_PUBLIC_API_URL=https://api-fastapi-841486153499.europe-west1.run.app`

---

## Service Accounts

| Email | Purpose | IAM Roles |
|-------|---------|-----------|
| `api-service@go-now-487612.iam.gserviceaccount.com` | API Cloud Run | `roles/datastore.user` |
| `ingest-worker@go-now-487612.iam.gserviceaccount.com` | Ingest worker Cloud Run | `roles/datastore.user`, `roles/bigquery.dataEditor`, `roles/bigquery.jobUser`, `roles/storage.objectCreator`, `roles/run.invoker` (on ingest-worker service) |
| `github-deployer@go-now-487612.iam.gserviceaccount.com` | GitHub Actions CI/CD | `roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser` |

---

## Artifact Registry

| Field | Value |
|-------|-------|
| Repo | `europe-west1-docker.pkg.dev/go-now-487612/go-now/` |
| Format | Docker |

### Images

| Image | Tag |
|-------|-----|
| `europe-west1-docker.pkg.dev/go-now-487612/go-now/api-fastapi` | `v1`, `latest` (via CI) |
| `europe-west1-docker.pkg.dev/go-now-487612/go-now/ingest-worker` | `v1`, `latest` (via CI) |
| `europe-west1-docker.pkg.dev/go-now-487612/go-now/dashboard` | `v1`, `latest` (via CI) |

### Dockerfiles (repo root)

| File | Builds | Notes |
|------|--------|-------|
| `Dockerfile.api` | API + scoring engine | Multi-stage; copies both `services/scoring_engine/` and `services/api_fastapi/` to preserve relative path dependency |
| `Dockerfile.ingest` | Ingest worker | Multi-stage; standalone service |
| `Dockerfile.dashboard` | Next.js dashboard | 3-stage (deps, build, standalone runtime); `node:20-slim` |

---

## Pub/Sub

| Resource | Value |
|----------|-------|
| Topic | `projects/go-now-487612/topics/ingest-trigger` |
| DLQ Topic | `projects/go-now-487612/topics/ingest-trigger-dlq` |
| Push Subscription | `ingest-trigger-sub` |
| DLQ Subscription | `ingest-trigger-dlq-sub` (pull) |

### Push Subscription Config

| Field | Value |
|-------|-------|
| Endpoint | `https://ingest-worker-841486153499.europe-west1.run.app` |
| Auth | OIDC token via `ingest-worker@go-now-487612.iam.gserviceaccount.com` |
| Ack deadline | 300s |
| Max delivery attempts | 5 |
| Dead letter topic | `ingest-trigger-dlq` |

The Pub/Sub service agent (`service-841486153499@gcp-sa-pubsub.iam.gserviceaccount.com`) has `roles/iam.serviceAccountTokenCreator` to mint OIDC tokens.

---

## Cloud Scheduler

| Field | Value |
|-------|-------|
| Job name | `ingest-trigger` |
| Location | `europe-west1` |
| Schedule | `0 * * * *` (every hour, UTC) |
| Target | Pub/Sub topic `ingest-trigger` |
| Message body | `{"area_id":"tel_aviv_coast","horizon_days":7}` |
| State | ENABLED |

### Manual trigger

```bash
gcloud scheduler jobs run ingest-trigger --location=europe-west1 --project=go-now-487612
```

---

## Storage

### Cloud Storage

| Bucket | Purpose |
|--------|---------|
| `gs://go-now-487612-raw` | Raw provider JSON responses |

### Firestore

| Field | Value |
|-------|-------|
| Database | `(default)` |
| Mode | Native |
| Collection | `forecasts/{area_id}` — serving forecast doc (168 hourly objects) |

### BigQuery

| Field | Value |
|-------|-------|
| Dataset | `go-now-487612.gonow_v1` |
| Location | `europe-west1` |

**Table: `hourly_forecast_v1`**
- Partitioned by `hour_utc` (DAY)
- Clustered by `area_id`

| Column | Type |
|--------|------|
| `area_id` | STRING |
| `hour_utc` | TIMESTAMP |
| `wave_height_m` | FLOAT |
| `wave_period_s` | FLOAT |
| `air_temp_c` | FLOAT |
| `feelslike_c` | FLOAT |
| `wind_ms` | FLOAT |
| `gust_ms` | FLOAT |
| `precip_prob_pct` | INTEGER |
| `precip_mm` | FLOAT |
| `uv_index` | FLOAT |
| `eu_aqi` | INTEGER |
| `pm10` | FLOAT |
| `pm2_5` | FLOAT |
| `fetched_at_utc` | TIMESTAMP |
| `provider` | STRING |
| `ingest_run_id` | STRING |
| `schema_version` | STRING |

**Table: `ingest_runs_v1`**
- Partitioned by `started_at_utc` (DAY)

| Column | Type | Mode |
|--------|------|------|
| `run_id` | STRING | NULLABLE |
| `area_id` | STRING | NULLABLE |
| `started_at_utc` | TIMESTAMP | NULLABLE |
| `finished_at_utc` | TIMESTAMP | NULLABLE |
| `status` | STRING | NULLABLE |
| `provider` | STRING | NULLABLE |
| `hours_ingested` | INTEGER | NULLABLE |
| `dq_flags` | STRING | REPEATED |
| `error_message` | STRING | NULLABLE |
| `schema_version` | STRING | NULLABLE |

---

## CI/CD — GitHub Actions

### Repository

| Field | Value |
|-------|-------|
| Repo | [NitBuk/go-now](https://github.com/NitBuk/go-now) |
| Default branch | `main` |

### Workload Identity Federation (keyless auth)

| Resource | Value |
|----------|-------|
| Pool | `projects/841486153499/locations/global/workloadIdentityPools/github-pool` |
| Provider | `projects/841486153499/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| Issuer | `https://token.actions.githubusercontent.com` |
| Attribute condition | `assertion.repository=='NitBuk/go-now'` |
| Service account | `github-deployer@go-now-487612.iam.gserviceaccount.com` |

### GitHub Repository Variables

| Variable | Value |
|----------|-------|
| `GCP_PROJECT_ID` | `go-now-487612` |
| `WIF_PROVIDER` | `projects/841486153499/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `github-deployer@go-now-487612.iam.gserviceaccount.com` |

### Workflows

| Workflow | File | Trigger (PR) | Trigger (push main) | Steps |
|----------|------|-------------|---------------------|-------|
| CI — API | `.github/workflows/ci-api.yml` | `services/api_fastapi/**`, `services/scoring_engine/**` | Same | uv sync → ruff lint → pytest → build `Dockerfile.api` → push AR → deploy Cloud Run |
| CI — Ingest Worker | `.github/workflows/ci-ingest.yml` | `services/ingest_worker/**` | Same | uv sync → ruff lint → pytest → build `Dockerfile.ingest` → push AR → deploy Cloud Run |
| CI — Scoring Engine | `.github/workflows/ci-scoring.yml` | `services/scoring_engine/**` | None (library only) | uv sync → pytest |
| CI — Dashboard | `.github/workflows/ci-dashboard.yml` | `apps/dashboard_nextjs/**` | Same | npm ci → eslint → next build → build `Dockerfile.dashboard` → push AR → deploy Cloud Run |

**PR triggers:** Run test/lint/build jobs only (no deploy).
**Push to main:** Run test/lint/build, then deploy to Cloud Run.

---

## Diagnostic Tooling

### `scripts/diagnose-ingest.sh`

Runbook that checks each pipeline component in order:

1. Cloud Scheduler job status and last fire time
2. Pub/Sub topic and subscription health
3. Dead Letter Queue messages
4. Cloud Run ingest-worker logs (last 30 min)
5. BigQuery `ingest_runs_v1` (last 24h)
6. API `/v1/public/health` endpoint
7. Manual trigger (optional, pass `--trigger`)

```bash
# Diagnose only
./scripts/diagnose-ingest.sh

# Diagnose + trigger test ingest and tail logs
./scripts/diagnose-ingest.sh --trigger
```

---

## Useful Commands

```bash
# Check API health
curl -s https://api-fastapi-841486153499.europe-west1.run.app/v1/public/health | python3 -m json.tool

# Check scores
curl -s https://api-fastapi-841486153499.europe-west1.run.app/v1/public/scores | python3 -m json.tool

# Manually trigger ingest
gcloud scheduler jobs run ingest-trigger --location=europe-west1 --project=go-now-487612

# Tail ingest worker logs
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"ingest-worker\"" \
  --project=go-now-487612 --limit=20 --format="value(timestamp,textPayload)" --freshness=10m

# Check recent BQ ingest runs
bq query --project_id=go-now-487612 --use_legacy_sql=false \
  "SELECT run_id, status, hours_ingested, started_at_utc FROM gonow_v1.ingest_runs_v1 ORDER BY started_at_utc DESC LIMIT 5"

# Check DLQ for failed messages
gcloud pubsub subscriptions pull ingest-trigger-dlq-sub --project=go-now-487612 --limit=5 --auto-ack

# Redeploy a service manually (example: API)
gcloud builds submit --config=<(cat <<'YAML'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.api', '-t', 'europe-west1-docker.pkg.dev/go-now-487612/go-now/api-fastapi:v1', '.']
images:
  - 'europe-west1-docker.pkg.dev/go-now-487612/go-now/api-fastapi:v1'
YAML
) --project=go-now-487612 --region=europe-west1 .

gcloud run deploy api-fastapi \
  --image=europe-west1-docker.pkg.dev/go-now-487612/go-now/api-fastapi:v1 \
  --region=europe-west1 --project=go-now-487612
```
