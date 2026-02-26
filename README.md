# Go Now — Tel Aviv Coast Buddy

[![Live Demo](https://img.shields.io/badge/Live%20Demo-go--now-blue)](https://dashboard-841486153499.europe-west1.run.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![GCP](https://img.shields.io/badge/GCP-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com)

[![CI — API](https://github.com/NitBuk/go-now/actions/workflows/ci-api.yml/badge.svg)](https://github.com/NitBuk/go-now/actions/workflows/ci-api.yml)
[![CI — Dashboard](https://github.com/NitBuk/go-now/actions/workflows/ci-dashboard.yml/badge.svg)](https://github.com/NitBuk/go-now/actions/workflows/ci-dashboard.yml)
[![CI — Ingest](https://github.com/NitBuk/go-now/actions/workflows/ci-ingest.yml/badge.svg)](https://github.com/NitBuk/go-now/actions/workflows/ci-ingest.yml)
[![CI — Scoring](https://github.com/NitBuk/go-now/actions/workflows/ci-scoring.yml/badge.svg)](https://github.com/NitBuk/go-now/actions/workflows/ci-scoring.yml)

**[Live Demo](https://dashboard-841486153499.europe-west1.run.app)**

---

## Why this exists

Before Go Now, every coastal trip started the same way: four apps, one decision. I'd check the weather forecast, pull up the surf/wind report on Windguru, look up the UV index, and open an air quality dashboard. Then I'd try to mentally combine all of that — is 1.2m swell too rough? Is AQI 80 acceptable? Is UV high enough to skip it? Every time.

Bringing my dog made it worse. Dogs overheat faster than humans, are more sensitive to air quality, and unlike me, can't tell me when they've had enough. I had to be more conservative and more deliberate — but I was still doing it with the same scattered data across four different tabs.

So I built Go Now. It pulls wave, weather, UV, AQI, wind, and rain data every hour and runs it through a scoring engine. The result: a single number per activity. 85+ means go. Below 45, stay home. No tab-switching, no mental math.

---

## What It Scores

Four modes, each scored 0–100. The dog modes use stricter thresholds — dogs can't tell you they're overheating.

| Mode | Score | Label |
|---|---|---|
| Swim solo | 0–100 | Perfect / Good / Meh / Bad / Nope |
| Swim with dog | 0–100 | Stricter thresholds |
| Run solo | 0–100 | Wind + heat focused |
| Run with dog | 0–100 | Stricter heat/AQI penalties |

Scores factor in wave height, UV index, air quality (AQI), heat index, wind speed, rain, and sunset time (swim scores drop to 0 after dark).

---

## Architecture

```
Cloud Scheduler (hourly) → Pub/Sub → Ingest Worker (Cloud Run, Python)
                                        ├→ Cloud Storage (raw JSON)
                                        ├→ BigQuery (normalized hourly data)
                                        └→ Firestore (serving cache)

API Service (FastAPI, Cloud Run)
  ├─ GET /v1/public/forecast  — raw hourly forecast data
  ├─ GET /v1/public/scores    — forecast + pre-computed scores
  └─ GET /v1/public/health    — pipeline health status

Scoring Engine (Python package, used by API)
  └─ Hard gates → penalty scoring → reason chips

Next.js Web App (mobile-first, reads from API)
  ├─ /          — Forecast page (scores, timeline, best windows)
  └─ /status    — Pipeline health + architecture overview
```

**Key design decisions:**
- Serverless-first, minimal cost (Cloud Run + free tier Open-Meteo)
- Three storage layers: raw archive (GCS), analytics (BigQuery), serving (Firestore)
- Scoring engine is a standalone Python package — no GCP deps, fully testable
- Single location (Tel Aviv coast), Balanced preset for all users in V1

---

## Project Structure

```
/apps/dashboard_nextjs     # Next.js public web app (mobile-first, Tailwind)
/apps/mobile_flutter       # (V2) Flutter native app — not yet started
/services/api_fastapi      # FastAPI on Cloud Run (public endpoints)
/services/ingest_worker    # Python Cloud Run worker (fetch, normalize, load)
/services/scoring_engine   # Python scoring engine package (used by API)
/services/shared_contracts # Shared DTOs: forecast, health, scoring
/docs                      # Full spec documents
/infra                     # Infrastructure notes, bootstrap config
```

---

## Local Setup (Full Stack)

Running the full stack locally requires a GCP project. For frontend-only dev, see the [web app README](apps/dashboard_nextjs/README.md) — you can point at the live API.

### Prerequisites

- GCP account with a project created
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 20+

### Steps

**1. Clone the repo**

```bash
git clone https://github.com/NitBuk/go-now.git
cd go-now
```

**2. Configure the ingest worker**

```bash
cp services/ingest_worker/.env.example services/ingest_worker/.env
# Edit .env — set GOOGLE_CLOUD_PROJECT to your project ID
```

**3. Configure the API**

```bash
cp services/api_fastapi/.env.example services/api_fastapi/.env
# Edit .env — set GOOGLE_CLOUD_PROJECT, remove FIRESTORE_EMULATOR_HOST for real Firestore
```

**4. Enable GCP APIs**

```bash
gcloud services enable firestore.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com
```

**5. Create a service account**

```bash
gcloud iam service-accounts create gonow-local \
  --display-name="Go Now Local Dev"

# Grant required roles
PROJECT_ID=$(gcloud config get-value project)
SA="gonow-local@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/bigquery.dataEditor"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/bigquery.jobUser"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"

# Download key
gcloud iam service-accounts keys create ~/gonow-key.json --iam-account=$SA
export GOOGLE_APPLICATION_CREDENTIALS=~/gonow-key.json
```

**6. Create GCP resources**

```bash
# Cloud Storage bucket
gsutil mb gs://your-project-raw

# BigQuery dataset
bq mk gonow_v1

# Firestore (native mode, choose a region)
gcloud firestore databases create --region=europe-west1
```

Update your `.env` files to match the resource names you created.

**7. Run the ingest worker once to populate data**

```bash
cd services/ingest_worker
uv sync
uv run python -m src.main
```

**8. Start the API**

```bash
cd services/api_fastapi
uv sync
uv run uvicorn src.main:app --reload --port 8080
```

**9. Start the frontend**

```bash
cd apps/dashboard_nextjs
npm install
cp .env.example .env.local
# .env.local already points at localhost:8080 — or leave blank to use that default
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running Tests

```bash
# Scoring engine (no GCP deps)
cd services/scoring_engine && uv run pytest tests/ -v

# API tests
cd services/api_fastapi && uv run pytest tests/ -v

# Ingest worker tests
cd services/ingest_worker && uv run pytest tests/ -v
```

---

## CI/CD

Four independent GitHub Actions pipelines — one per service, path-filtered so only the affected pipeline runs on each push.

| Pipeline | Trigger paths | PR | Push to main |
|---|---|---|---|
| CI — API | `services/api_fastapi/**`, `services/scoring_engine/**` | lint + test | lint + test + build + deploy |
| CI — Dashboard | `apps/dashboard_nextjs/**` | lint + build | lint + build + deploy |
| CI — Ingest | `services/ingest_worker/**` | lint + test | lint + test + build + deploy |
| CI — Scoring | `services/scoring_engine/**` | lint + test | lint + test (library only) |

**Deploy steps (push to main):**
1. Build Docker image tagged with commit SHA
2. Push to GCP Artifact Registry
3. Deploy to Cloud Run (`--image <sha>` for reproducible rollbacks)

**Auth:** Keyless via [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) — no service account keys stored in GitHub.

---

## V1 / V2 Roadmap

| Feature | V1 (this repo) | V2 (planned) |
|---|---|---|
| Scoring | Server-side Python, Balanced preset | On-device Dart, user presets |
| Auth | None | Firebase (Google + Apple) |
| Profiles | None | Firestore user profiles |
| Notifications | None | Local push notifications |
| UI | Next.js web (mobile-first) | Flutter native app |
| Personalization | None | Chill / Balanced / Strict presets |

---

## License

[MIT](LICENSE)
