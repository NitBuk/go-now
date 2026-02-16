# Execution Order (MVP)

A practical build order to keep momentum and reduce rework. Each phase has a definition of done and an effort estimate.

## Effort Key

| T-Shirt | Meaning |
|---------|---------|
| S | 1–2 days |
| M | 3–5 days |
| L | 1–2 weeks |
| XL | 2–3 weeks |

## Phase Overview

```
Phase 1: Ingest Worker ────────────────────────────→ [L]
Phase 2: Public API ───────────────────────────────→ [M]
Phase 3: Flutter UI (raw) ─────────────────────────→ [M]
Phase 4: Scoring Engine (on-device) ───────────────→ [L]
Phase 5: Onboarding + Presets ─────────────────────→ [L]
Phase 6: Local Notifications ──────────────────────→ [M]
Phase 7: Next.js Dashboard ────────────────────────→ [L]
Phase 8: Private Profile Endpoints ────────────────→ [M]
Phase 9: Polish + Release ─────────────────────────→ [XL]
```

**Parallelization:** Phases 7 (Dashboard) and 6 (Notifications) can run in parallel with Phase 5 (Onboarding). Phase 8 can start as soon as Phase 2 is done. See notes per phase.

---

## Phase 1: Ingest Worker — [L]

Build the hourly data ingestion pipeline from Open-Meteo to three storage layers.

**Deliverables:**
- `OpenMeteoProviderV1` implementation (fetch 3 endpoints, normalize, merge)
- Raw JSON → Cloud Storage writer
- Normalized rows → BigQuery loader
- Serving doc → Firestore writer
- Data quality checks (range, null rate, hour count)
- Idempotency via `(area_id, hour_bucket_utc)` dedup
- Retry with exponential backoff + jitter (3 retries per endpoint)
- `ingest_runs_v1` tracking table

**Definition of Done:**
- [ ] Cloud Scheduler triggers hourly → Pub/Sub → Ingest Worker
- [ ] All 3 storage layers populated with 168 hourly rows
- [ ] `ingest_runs_v1` row written with status `success`
- [ ] DQ checks flag out-of-range or high-null data as `degraded`
- [ ] Retry logic tested with mock timeouts
- [ ] Idempotency tested (duplicate triggers produce no duplicate writes)
- [ ] Unit tests for normalization (km/h → m/s, field mapping) passing

**Key specs:** `03_data_sources.md`, `13_observability_data_quality.md`

---

## Phase 2: Public API — [M]

Stand up the FastAPI service with public endpoints.

**Deliverables:**
- `GET /v1/public/forecast` — reads from Firestore, adds freshness flag
- `GET /v1/public/health` — returns pipeline status
- Standardized error response envelope
- Structured JSON logging
- Dockerfile + Cloud Run deployment

**Definition of Done:**
- [ ] `/v1/public/forecast?area_id=tel_aviv_coast` returns forecast JSON with freshness field
- [ ] `/v1/public/health` returns healthy/degraded/unhealthy based on forecast age
- [ ] Error responses match the standard envelope format
- [ ] CORS configured for dashboard origin + localhost
- [ ] Deployed to Cloud Run, accessible via HTTPS
- [ ] API endpoint tests passing (happy path + error cases)

**Key specs:** `05_backend_architecture.md`, `14_api_reference.md`

**Can start in parallel with:** Late Phase 1 (once Firestore serving doc format is finalized)

---

## Phase 3: Flutter UI (Raw) — [M]

Build the Flutter app shell with raw forecast display (no scoring yet).

**Deliverables:**
- App scaffolding: 3-tab navigation (Today, Planner, Profile)
- Forecast client: fetch from `/v1/public/forecast`
- Planner tab: 7-day hourly timeline rendering raw values
- Loading states (skeleton shimmer), error states, offline caching
- Pull-to-refresh

**Definition of Done:**
- [ ] App builds and runs on iOS and Android
- [ ] Planner tab shows 168 hours of raw forecast data
- [ ] Loading skeleton displayed while fetching
- [ ] Error banner shown on network failure
- [ ] Cached forecast available offline
- [ ] Freshness badge shows "Updated Xm ago"

**Key specs:** `10_UX_UI_SPEC.md` (Planner tab, loading/error states)

**Depends on:** Phase 2 (public API must be deployed)

---

## Phase 4: Scoring Engine (On-Device) — [L]

Implement the scoring engine in Dart and integrate into the Flutter UI.

**Deliverables:**
- Dart scoring engine: hard gates, penalty scoring, reason chips for all 4 modes
- Score labels and color tiers
- Null/missing data handling with info chips
- Golden test fixtures (shared JSON, run in both Dart and Python)
- Planner tab updated to show scored hours (color bars, labels, chips)
- Hour detail bottom sheet with score + reasons + raw data
- Hard-gated hours dimmed with gate reason

**Definition of Done:**
- [ ] All 12 edge case test cases from `04_scoring_engine_v1.md` pass in Dart
- [ ] Golden test parity: Python reference tests pass with identical results
- [ ] Planner tab shows score-colored hour rows with labels and micro-icons
- [ ] Hour detail sheet shows big score, reason chips, raw data table
- [ ] Hard-gated hours ("Nope") are visually distinct (dimmed, gate reason shown)
- [ ] Scoring uses Balanced preset thresholds by default
- [ ] `scoring_version: "score_v1"` logged with outputs

**Key specs:** `04_scoring_engine_v1.md`, `02_user_profile_schema.md` (thresholds), `11_testing_strategy.md`

---

## Phase 5: Onboarding + Presets — [L]

Full onboarding flow, Firebase Auth, preset selection, and profile persistence.

**Deliverables:**
- Firebase Auth integration (Google + Apple sign-in)
- 6-screen onboarding flow (Welcome → Activities → Dog → Preset → Notifications → Done)
- Preset-to-threshold mapping (canonical table from `02_user_profile_schema.md`)
- Profile persistence: local storage + Firestore sync
- Today tab: "Next best window" cards, "Now" row, vibe microcopy
- Preset change in Settings re-applies thresholds and re-scores

**Definition of Done:**
- [ ] User can sign in with Google and Apple
- [ ] Onboarding completes in < 90 seconds (tested)
- [ ] Profile written to Firestore in `users/{user_id}` matching `profile_v1` schema
- [ ] Preset selection writes correct absolute threshold values
- [ ] Today tab shows next best window per enabled mode
- [ ] Changing preset in Settings updates scores immediately
- [ ] Profile loads from local cache first, syncs from Firestore on app open
- [ ] Delete account flow works end-to-end

**Key specs:** `02_user_profile_schema.md`, `10_UX_UI_SPEC.md` (onboarding, Today tab, Profile tab)

---

## Phase 6: Local Notifications — [M]

On-device notification scheduling based on scored forecast windows.

**Deliverables:**
- Window detection: contiguous >= 60min blocks with avg score >= 70
- Notification scheduling: max 2 per mode per day
- Per-mode toggles (from `notification_preferences.mode_toggles`)
- Quiet hours support
- Reschedule on: onboarding complete, preset change, forecast refresh
- Platform-specific: Android channels per mode, iOS categories

**Definition of Done:**
- [ ] Notifications schedule for valid windows (score >= 70, >= 60 min)
- [ ] Per-mode toggles respected (disabled modes get no notifications)
- [ ] Quiet hours suppress notifications in configured time range
- [ ] Max 4 notifications/day total (anti-spam)
- [ ] Notifications reschedule on preset change and forecast update
- [ ] Tapping notification opens Today tab scrolled to relevant hour
- [ ] DST transition triggers reschedule

**Key specs:** `06_notification_spec.md`, `04_scoring_engine_v1.md` (minimum window)

**Can run in parallel with:** Phase 5 (needs scoring from Phase 4)

---

## Phase 7: Next.js Dashboard — [L]

Public portfolio dashboard showing pipeline status and forecast data.

**Deliverables:**
- 4 pages: Status, Forecast Explorer, Data Quality, Architecture
- SSR from BigQuery with ISR (5-min revalidation)
- Recharts time-series charts
- Mermaid architecture diagram
- Responsive design (mobile-first)
- SEO meta tags

**Definition of Done:**
- [ ] Status page shows freshness gauge, last ingest status, 24h success sparkline
- [ ] Forecast explorer shows 4 interactive time-series charts
- [ ] Data quality page shows missingness, range violations, DQ flags timeline
- [ ] Architecture page renders Mermaid diagram with component descriptions
- [ ] Pages render correctly at 375px, 768px, and 1024px viewports
- [ ] OpenGraph meta tags present for social sharing
- [ ] Deployed to Cloud Run, publicly accessible

**Key specs:** `07_dashboard_spec.md`, `05_backend_architecture.md` (Mermaid diagram)

**Can run in parallel with:** Phases 5 and 6 (independent of mobile app)

---

## Phase 8: Private Profile Endpoints — [M]

Backend endpoints for profile CRUD with Firebase Auth.

**Deliverables:**
- Firebase JWT validation middleware
- `GET /v1/profile` — read profile from Firestore
- `POST /v1/profile` — create/update with validation
- `DELETE /v1/profile` — delete profile document
- Request validation: schema_version, preset enum, threshold ranges

**Definition of Done:**
- [ ] JWT validation rejects expired, invalid, and missing tokens
- [ ] `GET /v1/profile` returns 404 for non-existent profiles
- [ ] `POST /v1/profile` validates all fields per `02_user_profile_schema.md`
- [ ] `DELETE /v1/profile` removes Firestore document and returns 204
- [ ] All error responses use standard envelope format
- [ ] Auth tests passing (valid token, expired, missing, invalid)

**Key specs:** `14_api_reference.md`, `02_user_profile_schema.md`, `05_backend_architecture.md`

**Can start after:** Phase 2 (builds on public API service)

---

## Phase 9: Polish + Release — [XL]

Final quality pass and app store submission.

**Deliverables:**
- App store metadata: name, description, screenshots, privacy policy
- Monitoring alerts configured (forecast staleness, API errors, ingest failures)
- Cost controls verified (free tier compliance)
- Scoring parity CI check (Dart vs Python golden tests)
- End-to-end smoke test on physical devices
- TestFlight / Play Console internal testing

**Definition of Done:**
- [ ] App submitted to App Store and Play Store review
- [ ] Dashboard deployed and publicly accessible
- [ ] All CI pipelines green (lint, test, build)
- [ ] Monitoring alerts fire correctly for simulated failures
- [ ] Cost estimate confirmed < $5/month at launch scale
- [ ] Delete account works end-to-end (GDPR/privacy compliance)
- [ ] Forecast freshness SLO met (< 90min P95) for 72+ hours
- [ ] README and docs up-to-date

**Key specs:** `08_deployment_release.md`, `12_ci_cd_pipeline.md`, `13_observability_data_quality.md`

---

## Dependency Graph

```
Phase 1 (Ingest) ──→ Phase 2 (Public API) ──→ Phase 3 (Flutter Raw) ──→ Phase 4 (Scoring)
                                                                              │
                          Phase 2 ──→ Phase 8 (Profile Endpoints)             │
                                                                              ▼
                                                              Phase 5 (Onboarding) ──→ Phase 9 (Polish)
                                                                    │
                                                              Phase 6 (Notifications) ──→ Phase 9

                          Phase 1 ──→ Phase 7 (Dashboard) ──────────────────→ Phase 9
```
