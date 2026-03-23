# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-03-24

### Added
- Scoring engine with 4 activity modes (swim solo, swim with dog, run solo, run with dog)
- Hard gates for heavy rain, extreme wind, and dog heat risk
- Penalty-based scoring (0-100) with reason chips explaining each score
- Sunset-based swim score gating (ramps to 0 after dark)
- FastAPI backend with public endpoints (`/v1/public/forecast`, `/v1/public/scores`, `/v1/public/health`)
- Ingest worker pulling hourly data from Open-Meteo (wave, weather, UV, AQI)
- Three storage layers: Cloud Storage (raw), BigQuery (analytics), Firestore (serving)
- Next.js mobile-first web app with score cards, hourly timeline, and best-window recommendations
- 4 path-filtered CI/CD pipelines with keyless GCP deployment
- Deployed to Cloud Run at [go-now.dev](https://go-now.dev)
