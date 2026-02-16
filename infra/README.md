# Infrastructure (V1)

## Philosophy

Serverless-first, minimal cost, managed services over ops:

- **Serverless over clusters.** Cloud Run scale-to-zero means zero cost when idle. No Kubernetes, no VMs.
- **Managed services over ops.** Firestore, BigQuery, Pub/Sub, Cloud Scheduler -- all fully managed. No database administration, no queue servers.
- **Infra automation when it pays off.** V1 uses ClickOps to bootstrap fast. Terraform in V1.1 when architecture stabilizes and infra-as-code ROI is clear.

## GCP Project Structure

| Environment | Project ID | Purpose |
|-------------|-----------|---------|
| Development | `go-now-dev` | Local testing, CI/CD, staging deployments |
| Production | `go-now-prod` | Live app, real users |

**Region:** `europe-west1` (Belgium) -- closest GCP region to Tel Aviv with full service availability.

**Naming convention:** All resources use the prefix `go-now-{env}-` where `{env}` is `dev` or `prod`. Example: `go-now-prod-raw` (Cloud Storage bucket), `go-now-dev-raw`.

## GCP Services Used

| Service | Purpose | V1 Configuration |
|---------|---------|-----------------|
| Cloud Run | API service + ingest worker | 2 services, scale-to-zero |
| Firestore | Serving cache + user profiles | Native mode, `(default)` database |
| BigQuery | Curated analytics + ingest run tracking | Dataset `go_now_v1` |
| Cloud Storage | Raw provider JSON archive | Single bucket per environment |
| Pub/Sub | Ingest trigger queue | 1 topic + 1 push subscription + 1 DLQ |
| Cloud Scheduler | Hourly ingest cron | 1 job |
| Firebase Auth | User authentication | Google + Apple providers |
| Secret Manager | API keys, sensitive config | Referenced via Cloud Run env var mounts |

## IAM: Service Accounts and Roles

Each service runs with a dedicated service account following the principle of least privilege.

### `api-service@{project}.iam.gserviceaccount.com`

API Service (FastAPI on Cloud Run). Reads forecasts and reads/writes user profiles in Firestore.

| IAM Role | Scope | Purpose |
|----------|-------|---------|
| `roles/datastore.user` | Project | Read/write Firestore documents (forecasts + user profiles) |

### `ingest-worker@{project}.iam.gserviceaccount.com`

Ingest Worker (Python on Cloud Run). Fetches provider data, writes to all three storage layers.

| IAM Role | Scope | Purpose |
|----------|-------|---------|
| `roles/storage.objectCreator` | Bucket: `go-now-{env}-raw` | Write raw JSON to Cloud Storage |
| `roles/bigquery.dataEditor` | Dataset: `go_now_v1` | Insert rows into BigQuery tables |
| `roles/datastore.user` | Project | Write to Firestore forecast serving doc |

### `dashboard-reader@{project}.iam.gserviceaccount.com`

Next.js Dashboard. Reads analytics data from BigQuery for charts and pipeline status.

| IAM Role | Scope | Purpose |
|----------|-------|---------|
| `roles/bigquery.dataViewer` | Dataset: `go_now_v1` | Read-only access to BigQuery tables |

### Pub/Sub Push Subscription IAM

The Pub/Sub push subscription to the Ingest Worker requires the subscription's service account to have `roles/run.invoker` on the Ingest Worker Cloud Run service. This ensures only authenticated Pub/Sub messages can trigger the worker.

## Cost Estimate (Monthly, V1 Scale)

Assumes: ~100 DAU, 1 location, hourly ingestion, scale-to-zero.

| Service | Free Tier Included | Estimated Usage | Estimated Cost |
|---------|-------------------|-----------------|---------------|
| Cloud Run (API) | 2M requests/month, 360K vCPU-seconds | ~3K requests/month, <1K vCPU-sec | $0.00 |
| Cloud Run (Ingest) | Included above | 720 invocations/month (24/day x 30), ~30s each | $0.00 |
| Firestore | 50K reads/day, 20K writes/day | ~3K reads/day (app), 24 writes/day (forecast) | $0.00 |
| BigQuery | 1 TB queries/month, 10 GB storage free | <1 GB storage, <10 GB queries/month | $0.00 |
| Cloud Storage | 5 GB storage free | ~50 MB/month (raw JSON: 72 files/day x ~5 KB) | $0.00 |
| Pub/Sub | 10 GB/month free | <1 MB/month | $0.00 |
| Cloud Scheduler | 3 jobs free | 1 job | $0.00 |
| Firebase Auth | Free for all providers | <100 MAU | $0.00 |
| Secret Manager | 6 active versions free | 2-3 secrets | $0.00 |
| **Total** | | | **$0.00 (free tier)** |

V1 is designed to run entirely within GCP free tier limits. At >1,000 DAU, expect $2-5/month primarily from Firestore reads. See `05_backend_architecture.md` for cost control decisions.

## Bootstrap Checklist

Ordered steps to set up the V1 infrastructure from scratch. Document every setting in `/infra/bootstrap_notes/` as you go.

### 1. Create GCP Projects

```
gcloud projects create go-now-dev --name="Go Now Dev"
gcloud projects create go-now-prod --name="Go Now Prod"
gcloud billing accounts list  # find billing account ID
gcloud billing projects link go-now-dev --billing-account=BILLING_ACCOUNT_ID
gcloud billing projects link go-now-prod --billing-account=BILLING_ACCOUNT_ID
```

### 2. Enable APIs

Enable required APIs in both projects:

```
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  bigquery.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  --project=go-now-prod
```

### 3. Create Firebase Projects and Enable Auth Providers

- Go to [Firebase Console](https://console.firebase.google.com/).
- Add Firebase to both GCP projects (`go-now-dev`, `go-now-prod`).
- Enable Authentication providers:
  - **Google:** Enable, configure OAuth consent screen.
  - **Apple:** Enable, configure Apple Service ID + key (requires Apple Developer account).
- Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) for the Flutter app.

### 4. Create Firestore Database

```
gcloud firestore databases create \
  --location=europe-west1 \
  --type=firestore-native \
  --project=go-now-prod
```

Uses `(default)` database in native mode. Region must match Cloud Run region for minimal latency.

### 5. Create BigQuery Dataset and Tables

```
bq mk --location=EU \
  --dataset go-now-prod:go_now_v1

bq mk --table \
  --time_partitioning_field=hour_utc \
  --time_partitioning_type=DAY \
  --clustering_fields=area_id \
  go-now-prod:go_now_v1.hourly_forecast_v1 \
  infra/schemas/hourly_forecast_v1.json

bq mk --table \
  --time_partitioning_field=started_at_utc \
  --time_partitioning_type=DAY \
  go-now-prod:go_now_v1.ingest_runs_v1 \
  infra/schemas/ingest_runs_v1.json
```

Table schemas are defined in `03_data_sources.md` (Layer 2: Curated) and `05_backend_architecture.md` (ingest_runs_v1).

### 6. Create Cloud Storage Bucket

```
gcloud storage buckets create gs://go-now-prod-raw \
  --location=europe-west1 \
  --uniform-bucket-level-access \
  --project=go-now-prod
```

Lifecycle rule: auto-delete objects older than 90 days (raw JSON is for replay/debugging, not permanent archive).

```
gcloud storage buckets update gs://go-now-prod-raw \
  --lifecycle-file=infra/lifecycle_rules/raw_bucket.json
```

### 7. Create Pub/Sub Topic and Subscription

```
# Main topic
gcloud pubsub topics create ingest-trigger \
  --project=go-now-prod

# Dead-letter topic
gcloud pubsub topics create ingest-trigger-dlq \
  --project=go-now-prod

# Push subscription (update URL after Cloud Run deploy)
gcloud pubsub subscriptions create ingest-trigger-push \
  --topic=ingest-trigger \
  --push-endpoint=https://ingest-worker-HASH.europe-west1.run.app \
  --ack-deadline=120 \
  --message-retention-duration=7d \
  --dead-letter-topic=ingest-trigger-dlq \
  --max-delivery-attempts=5 \
  --project=go-now-prod
```

### 8. Deploy Cloud Run Services

Create service accounts first:

```
# API service account
gcloud iam service-accounts create api-service \
  --display-name="API Service" \
  --project=go-now-prod

# Ingest worker service account
gcloud iam service-accounts create ingest-worker \
  --display-name="Ingest Worker" \
  --project=go-now-prod

# Dashboard reader service account
gcloud iam service-accounts create dashboard-reader \
  --display-name="Dashboard Reader" \
  --project=go-now-prod
```

Grant IAM roles (see IAM section above for role details):

```
# API service
gcloud projects add-iam-policy-binding go-now-prod \
  --member="serviceAccount:api-service@go-now-prod.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Ingest worker
gcloud projects add-iam-policy-binding go-now-prod \
  --member="serviceAccount:ingest-worker@go-now-prod.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud storage buckets add-iam-policy-binding gs://go-now-prod-raw \
  --member="serviceAccount:ingest-worker@go-now-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

bq update --dataset \
  --source=infra/iam/ingest_worker_bq_access.json \
  go-now-prod:go_now_v1

# Dashboard reader
bq update --dataset \
  --source=infra/iam/dashboard_reader_bq_access.json \
  go-now-prod:go_now_v1
```

Deploy services:

```
# API Service
gcloud run deploy api-service \
  --source=services/api_fastapi \
  --region=europe-west1 \
  --service-account=api-service@go-now-prod.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=2 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=30 \
  --concurrency=80 \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=go-now-prod,ENV=prod,LOG_LEVEL=INFO" \
  --project=go-now-prod

# Ingest Worker
gcloud run deploy ingest-worker \
  --source=services/ingest_worker \
  --region=europe-west1 \
  --service-account=ingest-worker@go-now-prod.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=1 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=120 \
  --no-allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=go-now-prod,GCS_RAW_BUCKET=go-now-prod-raw,BQ_DATASET=go_now_v1,ENV=prod,LOG_LEVEL=INFO" \
  --project=go-now-prod
```

After deploying the Ingest Worker, update the Pub/Sub push subscription endpoint with the Cloud Run service URL.

### 9. Create Cloud Scheduler Job

```
gcloud scheduler jobs create pubsub ingest-hourly \
  --schedule="0 * * * *" \
  --time-zone="UTC" \
  --topic=ingest-trigger \
  --message-body='{"area_id": "tel_aviv_coast", "horizon_days": 7}' \
  --location=europe-west1 \
  --project=go-now-prod
```

### 10. Deploy Firestore Security Rules

Create `firestore.rules` from the rules defined in `02_user_profile_schema.md`:

```
firebase deploy --only firestore:rules --project=go-now-prod
```

## Secrets Management

### Approach

Use **Google Cloud Secret Manager** for all sensitive values. Never store secrets in environment variables directly, `.env` files, or source control.

### Secrets Inventory (V1)

| Secret Name | Contents | Used By |
|-------------|----------|---------|
| `firebase-admin-sdk-key` | Firebase Admin SDK service account JSON (for JWT validation) | API Service |

V1 uses only Open-Meteo (no API key required for free tier). If a paid provider is added in V1.1, its API key goes here.

### How Secrets Are Consumed

Cloud Run services reference secrets as environment variables or mounted volumes:

```
gcloud run services update api-service \
  --set-secrets="FIREBASE_ADMIN_KEY=firebase-admin-sdk-key:latest" \
  --region=europe-west1 \
  --project=go-now-prod
```

**Alternative (preferred for JSON keys):** Mount as a volume:

```
gcloud run services update api-service \
  --set-secrets="/secrets/firebase-admin-key=firebase-admin-sdk-key:latest" \
  --region=europe-west1 \
  --project=go-now-prod
```

### Secret Rotation

No automated rotation in V1. Firebase Admin SDK keys do not expire. If a secret is compromised:

1. Create a new secret version in Secret Manager.
2. Redeploy the affected Cloud Run service (picks up `latest` version automatically on next cold start).
3. Disable the old secret version.

## ClickOps vs Terraform

### V1: ClickOps + Documentation

Bootstrap fast. Document every manual setting in `/infra/bootstrap_notes/` with screenshots and CLI commands.

**Why ClickOps for V1:**
- Architecture is still stabilizing (resource names, regions, configurations may change).
- Total infrastructure is small (~10 resources).
- Time spent writing Terraform modules exceeds time saved.

**What gets documented:**
- Every GCP console action or CLI command run during setup.
- Service configurations (memory, CPU, concurrency, timeout).
- IAM bindings.
- Firestore indexes (if any beyond default).
- BigQuery table schemas.

### V1.1: Terraform Migration

When architecture stabilizes, migrate to Terraform:

- One module per service (Cloud Run, Pub/Sub, BigQuery, Firestore, Cloud Storage).
- State stored in a GCS backend bucket.
- Separate `.tfvars` for dev and prod.
- CI/CD pipeline runs `terraform plan` on PR, `terraform apply` on merge to main.

**Migration trigger:** When any of these happen:
- Second environment needed beyond dev/prod.
- Third-party contributor needs to replicate the infra.
- Infrastructure drift becomes painful to debug.

## Directory Structure

```
/infra/
  README.md                    # This file
  bootstrap_notes/             # Step-by-step notes from manual setup
    01_project_creation.md
    02_api_enable.md
    03_firebase_setup.md
    ...
  schemas/                     # BigQuery table schema JSON files
    hourly_forecast_v1.json
    ingest_runs_v1.json
  lifecycle_rules/             # GCS lifecycle policy JSON
    raw_bucket.json
  iam/                         # IAM policy binding JSON files
    ingest_worker_bq_access.json
    dashboard_reader_bq_access.json
  firestore.rules              # Firestore security rules (deployed via Firebase CLI)
```
