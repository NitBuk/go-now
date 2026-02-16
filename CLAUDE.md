# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Go Now — Tel Aviv Coast Buddy** is a mobile app + public dashboard that tells users hourly whether it's a good time to swim or run on the Tel Aviv coast. It scores 4 activity modes (swim solo, swim with dog, run solo, run with dog) from 0–100 using wave, weather, UV, air quality, and rain data.

**Status:** Specification phase. All docs are in `/docs/`, no application code yet. See `docs/00_EXECUTION_ORDER.md` for the 9-phase MVP build order.

## Architecture

```
Cloud Scheduler (hourly) → Pub/Sub → Ingest Worker (Cloud Run, Python)
                                        ├→ Cloud Storage (raw JSON)
                                        ├→ BigQuery (normalized hourly data)
                                        └→ Firestore (serving cache)

API Service (FastAPI, Cloud Run)
  ├─ Public: /v1/public/forecast, /v1/public/health
  └─ Private: /v1/profile (Firebase Auth)

Flutter Mobile App (on-device scoring + local notifications)
Next.js Dashboard (public pipeline status + forecast explorer)
```

**Key design decisions:**
- Scoring engine runs on-device (Flutter), not on backend — cost efficiency and privacy
- Single location (Tel Aviv Coast) in V1, single provider (Open-Meteo free tier)
- Three storage layers: raw (Cloud Storage), curated (BigQuery), serving (Firestore)
- Provider abstraction (`ForecastProvider` interface) for future swaps
- Preset-based personalization (Chill/Balanced/Strict) — no custom numeric thresholds in V1

## Monorepo Layout

```
/apps/mobile_flutter      # Flutter app (auth, scoring, notifications, onboarding)
/apps/dashboard_nextjs    # Next.js public dashboard (BigQuery reads, API fallback)
/services/api_fastapi     # FastAPI on Cloud Run (public + private endpoints)
/services/ingest_worker   # Python Cloud Run worker (fetch, normalize, load)
/services/shared_contracts  # Shared DTOs: forecast, health, profile, scoring version
/docs                     # Full spec (11 documents)
/infra                    # Infrastructure notes, bootstrap config
```

## Tech Stack

| Component | Tech |
|-----------|------|
| API | Python 3.10+, FastAPI |
| Ingest Worker | Python |
| Mobile | Flutter (Dart) |
| Dashboard | Next.js (TypeScript/React) |
| Auth | Firebase (Google + Apple) |
| Storage | Firestore, BigQuery, Cloud Storage |
| Infra | Cloud Run, Pub/Sub, Cloud Scheduler |

## Scoring Engine

The scoring engine (`docs/04_scoring_engine_v1.md`) is core logic that must be implemented identically in the Flutter app. For each hourly forecast, it computes 4 scores (0–100) by:
1. Checking hard gates (heavy rain → 0 for all; extreme wind → 0 for run; dog heat danger → 0 for run_dog)
2. Starting at base 100, subtracting penalties per factor (waves, heat, UV, AQI, wind, rain)
3. Dog modes use stricter thresholds and 1.2x multipliers on heat/AQI/UV penalties
4. Generating 2–5 reason chips per mode from top penalty contributors

Labels: 85–100 "Perfect", 70–84 "Good", 45–69 "Meh", 20–44 "Bad", 0–19 "Nope"

## Firestore Collections

- `forecasts/{area_id}` — serving forecast doc (168 hourly objects, public read)
- `users/{user_id}` — user profile (schema `profile_v1`, owner-only access)

## Spec Documents

Read `docs/00_README.md` for the recommended reading order. Key references:
- **Scoring logic:** `docs/04_scoring_engine_v1.md` (thresholds, gates, penalties, reason chips)
- **User profile schema:** `docs/02_user_profile_schema.md` (profile_v1 JSON structure)
- **Data sources:** `docs/03_data_sources.md` (Open-Meteo API variables, ingestion strategy)
- **Backend endpoints:** `docs/05_backend_architecture.md` (API routes, Firestore model, BigQuery tables)
- **Notifications:** `docs/06_notification_spec.md` (local scheduling, anti-spam rules)
- **UI/UX:** `docs/10_UX_UI_SPEC.md` (onboarding flow, tab structure, tone: minimal + classy)
- **Build order:** `docs/00_EXECUTION_ORDER.md` (9 MVP phases)

## Infrastructure Philosophy

Serverless-first, minimal cost. V1 uses ClickOps to bootstrap fast, with settings documented in `/infra/bootstrap_notes/`. Terraform planned for V1.1 when architecture stabilizes.
