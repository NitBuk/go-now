# CI/CD Pipeline (V1)

## Branch Strategy

- **`main`** — production branch. Always deployable.
- **Feature branches** — `feat/`, `fix/`, `docs/` prefixes. Short-lived (< 1 week).
- **No `develop` branch** — keep it simple. Feature branches merge to `main` via PR.
- **PR requirements:** All checks pass + 1 approval (self-approve OK for solo dev in V1).

## GitHub Actions Workflows

### 1. `ci-api.yml` — API Service

**Trigger:** PR or push to `main` when files change in `services/api_fastapi/**` or `services/shared_contracts/**`

```yaml
name: CI — API Service
on:
  pull_request:
    paths:
      - 'services/api_fastapi/**'
      - 'services/shared_contracts/**'
  push:
    branches: [main]
    paths:
      - 'services/api_fastapi/**'
      - 'services/shared_contracts/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: |
          cd services/api_fastapi
          pip install -r requirements.txt -r requirements-dev.txt
      - name: Lint (ruff + black)
        run: |
          cd services/api_fastapi
          ruff check .
          black --check .
      - name: Type check (mypy)
        run: |
          cd services/api_fastapi
          mypy . --ignore-missing-imports
      - name: Unit tests
        run: |
          cd services/api_fastapi
          pytest tests/ -v --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: services/api_fastapi/coverage.xml
          flags: api

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Build and push container
        run: |
          cd services/api_fastapi
          gcloud builds submit --tag gcr.io/${{ vars.GCP_PROJECT }}/api-fastapi:${{ github.sha }}
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy api-fastapi \
            --image gcr.io/${{ vars.GCP_PROJECT }}/api-fastapi:${{ github.sha }} \
            --region europe-west1 \
            --platform managed \
            --allow-unauthenticated
```

### 2. `ci-ingest.yml` — Ingest Worker

**Trigger:** PR or push to `main` when files change in `services/ingest_worker/**` or `services/shared_contracts/**`

```yaml
name: CI — Ingest Worker
on:
  pull_request:
    paths:
      - 'services/ingest_worker/**'
      - 'services/shared_contracts/**'
  push:
    branches: [main]
    paths:
      - 'services/ingest_worker/**'
      - 'services/shared_contracts/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: |
          cd services/ingest_worker
          pip install -r requirements.txt -r requirements-dev.txt
      - name: Lint (ruff + black)
        run: |
          cd services/ingest_worker
          ruff check .
          black --check .
      - name: Unit + integration tests
        run: |
          cd services/ingest_worker
          pytest tests/ -v --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: services/ingest_worker/coverage.xml
          flags: ingest

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Build and push container
        run: |
          cd services/ingest_worker
          gcloud builds submit --tag gcr.io/${{ vars.GCP_PROJECT }}/ingest-worker:${{ github.sha }}
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ingest-worker \
            --image gcr.io/${{ vars.GCP_PROJECT }}/ingest-worker:${{ github.sha }} \
            --region europe-west1 \
            --platform managed \
            --no-allow-unauthenticated
```

### 3. `ci-flutter.yml` — Flutter Mobile App

**Trigger:** PR or push to `main` when files change in `apps/mobile_flutter/**` or `services/shared_contracts/**`

```yaml
name: CI — Flutter
on:
  pull_request:
    paths:
      - 'apps/mobile_flutter/**'
      - 'services/shared_contracts/**'
  push:
    branches: [main]
    paths:
      - 'apps/mobile_flutter/**'
      - 'services/shared_contracts/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.x'
          channel: 'stable'
          cache: true
      - name: Install dependencies
        run: |
          cd apps/mobile_flutter
          flutter pub get
      - name: Analyze
        run: |
          cd apps/mobile_flutter
          dart analyze --fatal-infos
      - name: Format check
        run: |
          cd apps/mobile_flutter
          dart format --set-exit-if-changed .
      - name: Unit tests + scoring golden tests
        run: |
          cd apps/mobile_flutter
          flutter test --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: apps/mobile_flutter/coverage/lcov.info
          flags: flutter
```

> **Note:** Flutter build (iOS/Android) is manual in V1. Automated builds via Fastlane/Codemagic planned for V1.1.

### 4. `ci-dashboard.yml` — Next.js Dashboard

**Trigger:** PR or push to `main` when files change in `apps/dashboard_nextjs/**`

```yaml
name: CI — Dashboard
on:
  pull_request:
    paths:
      - 'apps/dashboard_nextjs/**'
  push:
    branches: [main]
    paths:
      - 'apps/dashboard_nextjs/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/dashboard_nextjs/package-lock.json
      - name: Install dependencies
        run: |
          cd apps/dashboard_nextjs
          npm ci
      - name: Lint
        run: |
          cd apps/dashboard_nextjs
          npx eslint . --ext .ts,.tsx
      - name: Type check
        run: |
          cd apps/dashboard_nextjs
          npx tsc --noEmit
      - name: Unit tests
        run: |
          cd apps/dashboard_nextjs
          npm test -- --ci
      - name: Build
        run: |
          cd apps/dashboard_nextjs
          npm run build
      - name: E2E tests (Playwright)
        run: |
          cd apps/dashboard_nextjs
          npx playwright install --with-deps chromium
          npx playwright test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/dashboard_nextjs/package-lock.json
      - name: Install and build
        run: |
          cd apps/dashboard_nextjs
          npm ci
          npm run build
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - name: Deploy to Cloud Run
        run: |
          cd apps/dashboard_nextjs
          gcloud builds submit --tag gcr.io/${{ vars.GCP_PROJECT }}/dashboard:${{ github.sha }}
          gcloud run deploy dashboard \
            --image gcr.io/${{ vars.GCP_PROJECT }}/dashboard:${{ github.sha }} \
            --region europe-west1 \
            --platform managed \
            --allow-unauthenticated
```

### 5. `ci-scoring-parity.yml` — Cross-Platform Scoring Parity

**Trigger:** PR when files change in scoring-related paths

```yaml
name: CI — Scoring Parity
on:
  pull_request:
    paths:
      - 'apps/mobile_flutter/lib/scoring/**'
      - 'services/shared_contracts/tests/scoring/**'
      - 'services/shared_contracts/test_fixtures/**'

jobs:
  parity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.x'
          channel: 'stable'
      - name: Run Python golden tests
        run: |
          cd services/shared_contracts
          pip install -r requirements-dev.txt
          pytest tests/scoring/test_scoring_golden.py -v --tb=short
      - name: Run Dart golden tests
        run: |
          cd apps/mobile_flutter
          flutter pub get
          flutter test test/scoring/scoring_engine_test.dart -v
      - name: Compare results
        run: |
          echo "Both Dart and Python golden tests passed — scoring parity verified."
```

## Build → Test → Deploy Gates

```
PR opened
  └→ CI runs (lint → type check → test → build)
       ├→ All pass → PR mergeable
       └→ Any fail → PR blocked

Merge to main
  └→ CI runs again on main
       ├→ Tests pass → Deploy triggered
       └→ Tests fail → Deploy blocked, alert team
            └→ Container built → Pushed to GCR → Deployed to Cloud Run
```

### Gate Rules

| Gate | Blocks Deploy? | Details |
|------|---------------|---------|
| Lint failure | Yes | ruff/black (Python), dart analyze, ESLint (TS) |
| Type check failure | Yes | mypy (Python), dart analyze, tsc (TS) |
| Unit test failure | Yes | Any test failure blocks |
| Coverage drop > 5% | Warning | Comment on PR, don't block |
| Build failure | Yes | Container must build successfully |
| E2E test failure | Yes (dashboard only) | Playwright tests must pass |

## Environment Promotion

V1 uses a single production environment. Dev testing happens locally with emulators.

```
Local (emulators)  →  main branch  →  Production (Cloud Run)
```

**V1.1 plan:** Add a `staging` environment with a separate GCP project for pre-production validation.

## Secrets Management

GitHub Actions secrets (set in repo settings):

| Secret | Description | Used By |
|--------|-------------|---------|
| `GCP_SA_KEY` | Service account JSON key for deployments | All deploy jobs |

GitHub Actions variables:

| Variable | Description | Value |
|----------|-------------|-------|
| `GCP_PROJECT` | GCP project ID | `go-now-prod` |

## Rollback Procedure

### Cloud Run Services (API, Ingest, Dashboard)

```bash
# List recent revisions
gcloud run revisions list --service=api-fastapi --region=europe-west1

# Route 100% traffic to previous revision
gcloud run services update-traffic api-fastapi \
  --region=europe-west1 \
  --to-revisions=api-fastapi-PREVIOUS=100
```

**When to rollback:**
- `/v1/public/health` returns non-200 after deploy
- Error rate spikes in Cloud Run logs
- Ingest worker fails 2+ consecutive runs after deploy

### Flutter App

- App Store/Play Store releases **cannot be rolled back**.
- Emergency mitigation: deploy a backend feature flag to disable broken functionality.
- Always test on physical device before submitting to stores.

### Dashboard

- Redeploy previous git SHA: `gcloud run deploy dashboard --image gcr.io/PROJECT/dashboard:PREVIOUS_SHA`
