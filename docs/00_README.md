# Go Now — Tel Aviv Coast Buddy: Spec Docs

Hourly swim and run scores for the Tel Aviv coast — solo or with your dog.

This folder contains the complete planning and specification documents for **Go Now V1**.

## Recommended Reading Order

### Foundations
1. `01_vision.md` — Product vision, target users, success metrics, key technical decisions
2. `02_user_profile_schema.md` — **Canonical reference** for profile JSON, preset-to-threshold mapping, field validation, Firestore security rules

### Data Pipeline
3. `03_data_sources.md` — Open-Meteo provider, normalization mapping, 3-layer storage model, retry/failure handling, staleness cascade
4. `04_scoring_engine_v1.md` — Hard gates, penalty scoring, reason chips, null handling, pseudocode, edge case test table

### Backend & Infrastructure
5. `05_backend_architecture.md` — System architecture (Mermaid diagram), API schemas, auth flow, error codes, CORS, environment config
6. `infra/README.md` — GCP project structure, IAM roles, cost estimate, bootstrap checklist, secrets management

### Client-Facing
7. `06_notification_spec.md` — Per-mode toggles, timing logic, permission flow, platform differences, scheduling edge cases
8. `10_UX_UI_SPEC.md` — Full UI spec: all screens with empty/error/loading states, color system, typography, accessibility, microcopy, animations

### Operational
9. `07_dashboard_spec.md` — Public dashboard: 4 pages, data fetching strategy, charting, responsive design, SEO
10. `08_deployment_release.md` — Environments, rollback strategy, health checks, versioning, release checklist
11. `09_repo_bootstrap.md` — Monorepo layout, tooling versions, local dev setup, shared contracts, linting, pre-commit hooks

### New Docs (V1)
12. `11_testing_strategy.md` — Test pyramid: scoring golden tests, API tests, ingest integration tests, Flutter widget tests, dashboard E2E
13. `12_ci_cd_pipeline.md` — GitHub Actions workflows per component, build gates, environment promotion, rollback
14. `13_observability_data_quality.md` — Metrics catalog, structured logging, SLOs, alert routing, failure runbooks
15. `14_api_reference.md` — OpenAPI-style endpoint docs with curl examples, error codes, auth details

## Execution Order (Implementation)

See `00_EXECUTION_ORDER.md` for the 9-phase MVP build order with T-shirt estimates, definitions of done, and parallelization notes.

## Infrastructure

See `../infra/README.md` for GCP project setup, IAM roles, cost estimates, and the bootstrap checklist.
