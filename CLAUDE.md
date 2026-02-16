# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Go Now — Tel Aviv Coast Buddy** is a public web app that tells users hourly whether it's a good time to swim or run on the Tel Aviv coast. It scores 4 activity modes (swim solo, swim with dog, run solo, run with dog) from 0–100 using wave, weather, UV, air quality, and rain data.

**Status:** V1 in development. Backend services (ingest worker, API, scoring engine) are implemented with tests. Next.js web app is the primary frontend.

## V1/V2 Scope

| Feature | V1 (Web) | V2 (Mobile) |
|---------|----------|-------------|
| Scoring | Server-side Python, Balanced preset | On-device Dart, user presets |
| Auth | None | Firebase (Google + Apple) |
| Profiles | None | Firestore user profiles |
| Notifications | None | Local push notifications |
| UI | Next.js web (mobile-first) | Flutter native app |
| Private API | None | POST/GET/DELETE /v1/profile |
| Personalization | None | Chill/Balanced/Strict presets |

## Architecture (V1)

```
Cloud Scheduler (hourly) → Pub/Sub → Ingest Worker (Cloud Run, Python)
                                        ├→ Cloud Storage (raw JSON)
                                        ├→ BigQuery (normalized hourly data)
                                        └→ Firestore (serving cache)

API Service (FastAPI, Cloud Run)
  ├─ /v1/public/forecast  — raw hourly forecast data
  ├─ /v1/public/scores    — forecast + pre-computed scores (Balanced preset)
  └─ /v1/public/health    — pipeline health status

Scoring Engine (Python package, used by API)
  └─ Balanced preset hardcoded, shared across all users

Next.js Web App (mobile-first, reads from API)
  ├─ /          — Forecast page (scores, timeline, best windows)
  └─ /status    — Pipeline health + architecture overview
```

**Key design decisions:**
- Scoring engine runs server-side (Python) in V1, on-device (Dart) in V2
- Single location (Tel Aviv Coast), single provider (Open-Meteo free tier)
- Three storage layers: raw (Cloud Storage), curated (BigQuery), serving (Firestore)
- Provider abstraction (`ForecastProvider` interface) for future swaps
- Everyone gets Balanced preset in V1; personalization deferred to V2

## Monorepo Layout

```
/apps/dashboard_nextjs     # Next.js public web app (mobile-first, Tailwind)
/apps/mobile_flutter       # (V2) Flutter native app
/services/api_fastapi      # FastAPI on Cloud Run (public endpoints)
/services/ingest_worker    # Python Cloud Run worker (fetch, normalize, load)
/services/scoring_engine   # Python scoring engine package (used by API)
/services/shared_contracts # Shared DTOs: forecast, health, scoring
/docs                      # Full spec documents
/infra                     # Infrastructure notes, bootstrap config
```

## Tech Stack

| Component | Tech |
|-----------|------|
| API | Python 3.11+, FastAPI |
| Ingest Worker | Python |
| Scoring Engine | Python (standalone package) |
| Web App | Next.js 16, TypeScript, Tailwind CSS |
| Storage | Firestore, BigQuery, Cloud Storage |
| Infra | Cloud Run, Pub/Sub, Cloud Scheduler |

## Running Services

```bash
# Scoring engine tests
cd services/scoring_engine && uv run pytest tests/ -v

# API tests (includes scoring integration)
cd services/api_fastapi && uv run pytest tests/ -v

# Ingest worker tests
cd services/ingest_worker && uv run pytest tests/ -v

# Web app dev server
cd apps/dashboard_nextjs && npm run dev
```

## Scoring Engine

The scoring engine (`services/scoring_engine/`) computes 4 mode scores (0–100) per hourly forecast. Spec: `docs/04_scoring_engine_v1.md`.

1. Hard gates: heavy rain → 0 for all; extreme wind → 0 for run; dog heat → 0 for run_dog
2. Penalty scoring: start at 100, subtract per factor (waves, heat, UV, AQI, wind, rain)
3. Dog modes: stricter thresholds + 1.2x multipliers on heat/AQI/UV penalties
4. Reason chips: 2–5 per mode from top penalty contributors + 1 positive if score >= 70

Labels: 85–100 "Perfect", 70–84 "Good", 45–69 "Meh", 20–44 "Bad", 0–19 "Nope"

Thresholds use the Balanced preset from `docs/02_user_profile_schema.md` canonical table. The scoring engine is a standalone Python package (`services/scoring_engine/`) installed as a path dependency by the API.

## Firestore Collections

- `forecasts/{area_id}` — serving forecast doc (168 hourly objects, public read)

## Spec Documents

Read `docs/00_README.md` for the recommended reading order. Key references:
- **Scoring logic:** `docs/04_scoring_engine_v1.md` (thresholds, gates, penalties, reason chips)
- **Data sources:** `docs/03_data_sources.md` (Open-Meteo API variables, ingestion strategy)
- **Backend endpoints:** `docs/05_backend_architecture.md` (API routes, Firestore model, BigQuery tables)
- **UI/UX:** `docs/10_UX_UI_SPEC.md` (onboarding flow, tab structure, tone: minimal + classy)
- **Build order:** `docs/00_EXECUTION_ORDER.md` (9 MVP phases)

## Infrastructure Philosophy

Serverless-first, minimal cost. V1 uses ClickOps to bootstrap fast, with settings documented in `/infra/bootstrap_notes/`. Terraform planned for V1.1 when architecture stabilizes.
