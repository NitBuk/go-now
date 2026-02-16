# Deployment & Release (V1)

This document covers deployment procedures, versioning strategy, rollback plans, and release validation for all Go Now components.

## Environments

| Environment | Purpose | Firebase Project |
|-------------|---------|-----------------|
| dev | Development, testing, staging | `gonow-dev` |
| prod | Production, public-facing | `gonow-prod` |

Each environment has its own:
- Firebase project (Auth, Firestore, Hosting)
- GCP project (Cloud Run, BigQuery, Cloud Storage, Pub/Sub, Scheduler)
- Service accounts with environment-specific permissions
- `.env` files (never shared between environments)

## Versioning Strategy

### Backend Services (API + Ingest Worker)

**Semantic versioning** in Docker image tags:

```
Format: v{MAJOR}.{MINOR}.{PATCH}
Examples: v1.0.0, v1.1.3, v1.2.0
```

- **MAJOR:** Breaking API changes or schema migrations.
- **MINOR:** New features, new endpoints, non-breaking changes.
- **PATCH:** Bug fixes, dependency updates, config changes.

Docker images are tagged with both the version and `latest`:
```
gcr.io/{project}/api-fastapi:v1.0.0
gcr.io/{project}/api-fastapi:latest
gcr.io/{project}/ingest-worker:v1.0.0
gcr.io/{project}/ingest-worker:latest
```

### Mobile (Flutter)

Dual versioning as required by app stores:

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `versionCode` | int (monotonic) | 1, 2, 3, ... | Android Play Store ordering |
| `versionName` | semver string | 1.0.0, 1.1.0 | User-facing version display |

Set in `pubspec.yaml`:
```yaml
version: 1.1.0+3   # versionName+versionCode
```

Rules:
- `versionCode` must increment by at least 1 for every store upload (never reuse or decrement).
- `versionName` follows semver and is displayed in the app's About/Settings screen.

### Dashboard (Next.js)

**Git SHA-based versioning.** No semantic version needed for a continuously deployed public site.

```
Image tag: gcr.io/{project}/dashboard:abc1234
Displayed in footer: "Build abc1234"
```

The 7-character git SHA of the deployed commit is shown in the dashboard footer for debugging.

### Scoring Engine

**Version string:** `score_v1`

- Embedded in every scoring output, notification event, and user profile.
- Does not change with app version bumps — only changes when scoring logic (thresholds, penalties, gates) changes.
- When the scoring version changes, it becomes `score_v2`, and a migration path is documented.

## Mobile (Flutter)

### iOS

**Prerequisites:**
- [ ] Apple Developer Program membership active
- [ ] App ID registered with "Sign in with Apple" capability
- [ ] Firebase iOS app configured (`GoogleService-Info.plist` in project)
- [ ] Push notification certificates configured (for future use)

**Release Steps:**
- [ ] Update `versionName` and `versionCode` in `pubspec.yaml`
- [ ] Set bundle identifier: `com.gonow.app`
- [ ] Configure code signing in Xcode (automatic or manual provisioning)
- [ ] Build release archive: `flutter build ipa`
- [ ] Upload to App Store Connect via Xcode or `xcrun altool`
- [ ] Submit build to TestFlight for internal testing
- [ ] Complete store listing: screenshots (6.7" + 5.5"), description, privacy details
- [ ] Submit for App Store review
- [ ] Monitor review status; respond to any rejection feedback

### Android

**Prerequisites:**
- [ ] Google Play Console account active
- [ ] Upload keystore created and stored securely (not in repo)
- [ ] Firebase Android app configured (`google-services.json` in project)
- [ ] Signing key registered in Play Console (App Signing by Google Play)

**Release Steps:**
- [ ] Update `versionName` and `versionCode` in `pubspec.yaml`
- [ ] Configure `key.properties` with keystore path and credentials
- [ ] Build release bundle: `flutter build appbundle`
- [ ] Upload AAB to Play Console
- [ ] Release track progression: Internal Testing --> Closed Testing --> Production
- [ ] Complete store listing: screenshots, description, content rating questionnaire
- [ ] Roll out to production (staged rollout recommended: 10% --> 50% --> 100%)

## Firebase

**Auth Providers:**
- [ ] Enable Google Sign-In (both dev and prod projects)
- [ ] Enable Apple Sign-In (both dev and prod projects)
- [ ] Configure OAuth consent screen (project name, support email)

**Firestore:**
- [ ] Create collection: `users` (auto-created on first profile write)
- [ ] Create collection: `forecasts` (seeded by first ingest run)
- [ ] Deploy security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
      allow write: if request.resource.data.schema_version == 'profile_v1';
    }
    match /forecasts/{areaId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

- [ ] Test rules: verify anonymous read of `forecasts/`, verify owner-only access to `users/`

## Backend (Cloud Run)

### Services

| Service | Image | Min Instances | Max Instances | Memory | CPU |
|---------|-------|---------------|---------------|--------|-----|
| `api-fastapi` | `gcr.io/{project}/api-fastapi:{version}` | 0 (dev), 1 (prod) | 5 | 512Mi | 1 |
| `ingest-worker` | `gcr.io/{project}/ingest-worker:{version}` | 0 | 3 | 512Mi | 1 |

### Build and Deploy

```bash
# Build and push (from service directory)
docker build -t gcr.io/{project}/api-fastapi:v1.0.0 .
docker push gcr.io/{project}/api-fastapi:v1.0.0

# Deploy to Cloud Run
gcloud run deploy api-fastapi \
  --image gcr.io/{project}/api-fastapi:v1.0.0 \
  --region me-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT={project}"

# Deploy ingest worker (no public access)
gcloud run deploy ingest-worker \
  --image gcr.io/{project}/ingest-worker:v1.0.0 \
  --region me-west1 \
  --platform managed \
  --no-allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT={project},GCS_BUCKET={bucket},BQ_DATASET={dataset}"
```

### Service Account Permissions

**API service account (`api-sa@{project}.iam.gserviceaccount.com`):**
- [ ] Firestore read/write on `users/` collection
- [ ] Firestore read on `forecasts/` collection

**Ingest worker service account (`ingest-sa@{project}.iam.gserviceaccount.com`):**
- [ ] Cloud Storage write to raw bucket
- [ ] BigQuery write to `hourly_forecast_v1` and `ingest_runs_v1`
- [ ] Firestore write to `forecasts/` collection
- [ ] Pub/Sub subscriber on `ingest-trigger` topic

### Scheduler Setup

- [ ] Create Cloud Scheduler job:
```bash
gcloud scheduler jobs create pubsub ingest-hourly \
  --schedule "0 * * * *" \
  --topic ingest-trigger \
  --message-body '{"area_id": "tel_aviv_coast", "horizon_days": 7}' \
  --time-zone "UTC"
```

## Dashboard (Next.js)

### Deploy Options

**Option A: Firebase Hosting (recommended for V1)**
```bash
cd apps/dashboard_nextjs
npm run build
firebase deploy --only hosting
```

**Option B: Cloud Run**
```bash
docker build -t gcr.io/{project}/dashboard:$(git rev-parse --short HEAD) .
docker push gcr.io/{project}/dashboard:$(git rev-parse --short HEAD)
gcloud run deploy dashboard \
  --image gcr.io/{project}/dashboard:$(git rev-parse --short HEAD) \
  --region me-west1 \
  --platform managed \
  --allow-unauthenticated
```

### Dashboard Service Account

- [ ] BigQuery read access to `hourly_forecast_v1` and `ingest_runs_v1` (server-side only)
- [ ] No Firestore access (dashboard reads from BigQuery, not Firestore)

## Rollback Strategy

### Cloud Run Services (API + Ingest Worker)

Cloud Run maintains revision history. To rollback:

```bash
# List recent revisions
gcloud run revisions list --service api-fastapi --region me-west1

# Route 100% traffic to the previous revision
gcloud run services update-traffic api-fastapi \
  --region me-west1 \
  --to-revisions=api-fastapi-PREVIOUS_REVISION=100
```

Rollback is instant (no new deployment needed). The previous container image is still available.

**When to rollback:**
- Health check returns non-200 after deploy.
- Error rate spikes in Cloud Run metrics.
- Forecast freshness degrades (ingest worker issue).

### Flutter Mobile App

**App store releases cannot be rolled back.** Once a version is published and installed on devices, it cannot be remotely reverted.

Mitigation strategies:
- **Feature flags:** Use a Firestore document (`config/feature_flags`) to disable problematic features remotely without an app update.
- **Minimum version enforcement:** API checks app version header; if below minimum, returns a "please update" response.
- **Staged rollout (Android):** Use Play Console's staged rollout (10% --> 50% --> 100%) to catch issues early. Halt rollout if problems are detected.
- **Expedited review (iOS):** Request expedited review from Apple if a critical fix is needed.

### Dashboard (Next.js)

Redeploy the previous commit:

```bash
# Firebase Hosting: deploy from previous commit
git checkout {previous-commit-sha}
cd apps/dashboard_nextjs && npm run build
firebase deploy --only hosting

# Cloud Run: route traffic to previous revision
gcloud run services update-traffic dashboard \
  --region me-west1 \
  --to-revisions=dashboard-PREVIOUS_REVISION=100
```

## Pre-Release Validation

Complete these checks before any production release:

### API Service

- [ ] Run full test suite: `pytest services/api_fastapi/tests/ -v`
- [ ] Verify `/v1/public/health` returns 200 with `status: ok` or `status: degraded`
- [ ] Verify `/v1/public/forecast?area_id=tel_aviv_coast` returns valid forecast JSON
- [ ] Verify `/v1/profile` returns 401 without auth token
- [ ] Verify `/v1/profile` returns 200 with valid Firebase token
- [ ] Check that DELETE `/v1/profile` removes the Firestore document
- [ ] Verify response times: p95 < 500ms for public endpoints
- [ ] Review Cloud Run logs for any startup errors

### Ingest Worker

- [ ] Run full test suite: `pytest services/ingest_worker/tests/ -v`
- [ ] Trigger a manual ingest run (publish test message to Pub/Sub)
- [ ] Verify raw JSON files appear in Cloud Storage at expected path
- [ ] Verify rows appear in `hourly_forecast_v1` BigQuery table
- [ ] Verify `ingest_runs_v1` has a new row with `status: success`
- [ ] Verify `forecasts/tel_aviv_coast` Firestore document is updated
- [ ] Verify idempotency: re-trigger the same message, confirm it skips

### Mobile App

- [ ] Run unit tests: `flutter test`
- [ ] Run integration tests on both iOS simulator and Android emulator
- [ ] Verify onboarding flow completes and creates profile in Firestore
- [ ] Verify scoring engine produces expected output for golden test cases
- [ ] Verify notification scheduling (check local notification in device settings)
- [ ] Verify delete account flow removes Firestore profile
- [ ] Verify app handles stale forecast gracefully (shows "Updated X min ago")
- [ ] Verify app displays correctly on small screens (iPhone SE) and large screens (iPad)

### Dashboard

- [ ] Run build: `npm run build` (no errors or warnings)
- [ ] Verify all 4 pages load without errors
- [ ] Verify BigQuery connection works (Status page shows real data)
- [ ] Verify "Refresh" button triggers API fallback and updates display
- [ ] Verify responsive layout on mobile, tablet, and desktop viewports
- [ ] Verify meta tags and OpenGraph image render correctly (use og-debugger)

## Health Check Validation (Post-Deploy)

Run these checks immediately after every production deployment:

### API Service (automated)

```bash
# Check health endpoint
curl -s https://api.gonow.example.com/v1/public/health | jq .

# Expected: {"status": "ok", "forecast_age_minutes": <60, ...}
# If forecast_age_minutes > 90: investigate ingest pipeline

# Check forecast endpoint
curl -s "https://api.gonow.example.com/v1/public/forecast?area_id=tel_aviv_coast" | jq '.hours | length'

# Expected: 168 (or close to it)
```

### Ingest Worker (after scheduled trigger)

```bash
# Query latest ingest run from BigQuery
bq query --use_legacy_sql=false \
  'SELECT run_id, status, hours_count, started_at_utc
   FROM `{project}.{dataset}.ingest_runs_v1`
   ORDER BY started_at_utc DESC
   LIMIT 1'

# Expected: status = "success", hours_count >= 140
```

### Dashboard (manual)

- [ ] Open dashboard URL in browser
- [ ] Verify Status page shows current pipeline data (not stale placeholder)
- [ ] Verify Forecast Explorer charts render with data points
- [ ] Verify Data Quality page shows ingest run history
- [ ] Check browser console for JavaScript errors

## Release Checklist

Complete all items before declaring a release successful:

### Pipeline Health
- [ ] Forecast freshness visible in dashboard (green indicator)
- [ ] At least 3 consecutive successful ingest runs after deploy
- [ ] No new DQ flags or degraded runs caused by the release

### App Functionality
- [ ] App handles stale forecast gracefully (shows last update time, yellow warning)
- [ ] Delete account works end-to-end (app --> API --> Firestore deletion)
- [ ] Scoring output matches golden test cases for Balanced preset
- [ ] Notifications fire correctly for "Good" or better windows

### Observability
- [ ] Logging active: ingest runs table (`ingest_runs_v1`) updated correctly
- [ ] Cloud Run metrics visible: request count, latency, error rate
- [ ] Alerts configured: freshness > 180 min, 3 consecutive ingest failures

### Security
- [ ] No secrets in client-side code or public dashboard
- [ ] Firestore security rules deployed and tested
- [ ] API private endpoints reject unauthenticated requests
- [ ] Service accounts use least-privilege permissions

### Store Compliance (mobile releases only)
- [ ] Privacy policy URL set in store listings
- [ ] Data safety / App Privacy sections completed
- [ ] Screenshots and descriptions are current
- [ ] App content rating questionnaire submitted
