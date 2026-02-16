# Tel Aviv Coast Buddy — Product Vision (V1)

## One-Liner

A clean, modern mobile app that tells you — for every hour in the next 7 days — whether it's a good time to **swim or run**, **solo or with your dog**, on the Tel Aviv coast.

## Problem

People want a simple, confident answer to: **"Should I go now?"**

But the decision is multi-factor:

- **Waves** — safe to swim? Too rough for the dog?
- **Heat + UV** — especially dangerous for dogs on hot pavement
- **Wind** — sand + running comfort
- **Air quality** — dust days (hamsin/sharav)
- **Rain probability** — nobody wants to get caught out

Most apps show raw weather data. This app converts it into an opinionated hourly plan with clear reasons.

## Target Users (V1)

| Segment | Need |
|---------|------|
| Tel Aviv residents who swim/run at the beach | Quick go/no-go answer, not raw data |
| Dog owners | Extra safety logic (heat, UV, AQI thresholds) |
| Minimalism-oriented users | Clean design and clarity over endless charts |

## V1 Scope

- **Location:** Tel Aviv Coast (single forecast point: 32.08°N, 34.77°E)
- **Horizon:** 7 days, hourly resolution
- **Modes:**
  - Swim (solo)
  - Swim (with dog)
  - Run (solo)
  - Run (with dog)
- **Personalization:** Preset-based only (Chill / Balanced / Strict) — no custom threshold edits
- **Notifications:** On-device local scheduling (computed from forecast + scoring)
- **Data pipeline:** Hourly cloud ingestion → 3-layer storage (raw, curated, serving)
- **Public dashboard:** Pipeline freshness, sample conditions, data quality signals

## Non-Goals (V1)

| Non-Goal | Rationale |
|----------|-----------|
| Multi-city support | Single location keeps infra simple; expand in V2 |
| Beach-specific micro-conditions (Hilton vs Frishman) | No reliable hyperlocal marine data source |
| Home screen widgets | Deferred to V1.1 based on user demand |
| Social features, clubs, group runs | Out of product scope |
| ML-based personalization | V1 is fully deterministic; ML requires usage data first |
| Custom numeric threshold editing | Presets cover 90% of users; custom editing adds UX complexity |

## Key Technical Decisions

| Decision | Why |
|----------|-----|
| **Flutter** for mobile | Single codebase for iOS + Android; strong animation support; Dart scoring engine runs identically on both platforms |
| **FastAPI** for backend | Async Python; fast to build; great OpenAPI docs; lightweight for serverless |
| **Scoring on-device** | Zero backend compute cost per user; works offline; instant preset changes without API round-trip |
| **Firebase Auth** | Drop-in Google + Apple sign-in; free tier covers V1 scale; Firestore integration |
| **Open-Meteo** as data provider | Free tier for non-commercial; hourly marine + weather + AQI in one provider; provider abstraction (`ForecastProvider`) allows future swap |
| **3-layer storage** (raw → curated → serving) | Raw for auditability, BigQuery for analytics/debugging, Firestore for fast app reads |
| **Local notifications** (not push) | No push infra cost; scoring runs on-device so notification windows are already computed |
| **Next.js dashboard** | SSR from BigQuery; portfolio-ready; demonstrates data engineering pipeline publicly |

## Differentiators

- **Hourly go/no-go score with reasons** — not just raw data, an opinionated recommendation
- **Dog-aware safety logic** — hard gates block unsafe conditions (heat + UV compound danger)
- **Minimal UI + occasional humor** — classy microcopy, never noisy
- **Visible, trustworthy data pipeline** — public dashboard shows freshness, quality, and architecture

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Onboarding completion | < 90 seconds median | Analytics: timestamp delta (onboarding_start → onboarding_complete) |
| Week-1 retention | 3+ opens in first 7 days | Analytics: distinct app_open events per user per week |
| Notification opt-in rate | > 60% of onboarded users | Analytics: notification_enabled / onboarding_complete |
| Forecast freshness | < 90 min P95 | Dashboard: `updated_at_utc` delta from ingest_runs_v1 |
| Recommendation usefulness | Qualitative (V1.1) | In-app feedback prompt after 2 weeks |

## Safety Principles

- **No medical advice** — scores reflect weather suitability, not health guidance
- **Clear "Nope" gates** — unsafe dog conditions are hard-blocked (score = 0), not just warned
- **Always show the "why"** — every score includes 2–5 reason chips explaining the rating
- **Transparent data** — public dashboard shows when data is stale or degraded
- **Conservative defaults** — Balanced preset errs toward caution for dog modes
