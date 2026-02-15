# Deployment & Release (V1)

This is a practical checklist for:
- mobile release (iOS + Android)
- backend deploy (API + ingest worker)
- dashboard deploy (public)

## Environments
- dev
- prod

Use separate Firebase projects:
- firebase-dev
- firebase-prod

## Mobile (Flutter)

### iOS
Prereqs:
- Apple Developer Program
- App ID + Sign in with Apple configured
- Firebase iOS app configured (GoogleService-Info.plist)

Steps (high level):
1) Set bundle id + versioning
2) Configure signing in Xcode
3) Build release archive
4) Upload to App Store Connect / TestFlight
5) Store listing, screenshots, privacy details
6) Submit for review

### Android
Prereqs:
- Google Play Console account
- Keystore created and stored securely
- Firebase Android app configured (google-services.json)

Steps:
1) Configure app signing + versionCode/versionName
2) Build AAB (Android App Bundle)
3) Upload to Play Console (internal testing → closed testing → production)
4) Store listing + screenshots
5) Rollout

## Firebase
- Enable Auth providers:
  - Google
  - Apple
- Firestore:
  - create collections: `users`, `forecasts`
- Security rules:
  - users: read/write only by owner
  - forecasts: public read

## Backend (Cloud Run)
Services:
- api_fastapi
- ingest_worker

Recommended:
- build container images (Docker)
- deploy each to Cloud Run (dev/prod)

Permissions:
- API service account:
  - Firestore read/write users
  - Firestore read forecasts
- Worker service account:
  - Cloud Storage write (raw)
  - BigQuery write (curated)
  - Firestore write forecasts

Scheduler:
- hourly trigger
- publish Pub/Sub message with area_id tel_aviv_coast

## Dashboard (Next.js)
- Deploy public dashboard:
  - Firebase Hosting or Cloud Run
- Server-side reads:
  - BigQuery (primary)
- API fallback:
  - `/v1/public/health`

## Release Checklist
- Forecast freshness visible in dashboard
- App handles stale forecast gracefully (shows last update time)
- Delete account works end-to-end
- Logging and ingest_runs table updated correctly
