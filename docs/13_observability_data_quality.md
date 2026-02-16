# Observability & Data Quality (V1)

## Overview

This doc covers three areas:
1. **Metrics** — what we measure and alert on
2. **Logging** — structured log format for all services
3. **Data quality** — automated checks and degraded state handling

## Metrics Catalog

### Ingest Worker Metrics

| Metric Name | Type | Labels | Description | Alert Threshold |
|-------------|------|--------|-------------|----------------|
| `ingest_run_duration_seconds` | histogram | `area_id`, `status` | Total ingest pipeline duration | > 60s P95 |
| `ingest_run_status` | counter | `area_id`, `status` | Count of ingest runs by status (success/degraded/failed) | 3 consecutive `failed` |
| `provider_request_duration_seconds` | histogram | `endpoint`, `status_code` | Open-Meteo API call latency | > 10s P95 |
| `provider_retry_count` | counter | `endpoint` | Number of retries per endpoint | > 5/hour |
| `normalized_rows_count` | gauge | `area_id` | Number of hourly rows after normalization | < 100 |
| `dq_flags_count` | counter | `area_id`, `flag_type` | Data quality flags per ingest run | > 0 (warning) |
| `storage_write_duration_seconds` | histogram | `layer` (gcs/bq/firestore), `status` | Write latency per storage layer | > 5s P95 |
| `forecast_age_minutes` | gauge | `area_id` | Minutes since last successful Firestore update | > 90 (warning), > 180 (critical) |

### API Service Metrics

| Metric Name | Type | Labels | Description | Alert Threshold |
|-------------|------|--------|-------------|----------------|
| `api_request_duration_seconds` | histogram | `endpoint`, `method`, `status_code` | Request latency | > 200ms P95 |
| `api_request_count` | counter | `endpoint`, `method`, `status_code` | Request count | — |
| `api_error_count` | counter | `endpoint`, `error_code` | Error responses (4xx, 5xx) | > 10 5xx/hour |
| `firestore_read_duration_seconds` | histogram | `collection` | Firestore read latency | > 500ms P95 |
| `auth_failure_count` | counter | `reason` (expired/invalid/missing) | Auth failures | > 50/hour (possible attack) |

### On-Device Metrics (Flutter, local only in V1)

| Metric Name | Type | Description |
|-------------|------|-------------|
| `scoring_duration_ms` | histogram | Time to score all 168 hours × 4 modes |
| `forecast_fetch_duration_ms` | histogram | API call to fetch forecast |
| `notification_scheduled_count` | counter | Notifications scheduled per recompute |
| `notification_opened_count` | counter | Notifications tapped |

> V1: on-device metrics are logged locally only. V1.1: opt-in upload to analytics.

## Structured Log Format

All backend services emit structured JSON logs to Cloud Logging.

### Log Schema

```json
{
  "timestamp": "2025-06-01T12:00:05.123Z",
  "severity": "INFO|WARNING|ERROR",
  "service": "api_fastapi|ingest_worker",
  "component": "string (e.g., 'provider', 'normalize', 'firestore')",
  "message": "Human-readable log message",
  "context": {
    "request_id": "uuid",
    "area_id": "tel_aviv_coast",
    "ingest_run_id": "run_20250601_120000_abc123",
    "user_id": "string (only for private endpoints, never in public logs)"
  },
  "data": {
    "...additional structured data..."
  },
  "error": {
    "type": "string (exception class name)",
    "message": "string",
    "stack_trace": "string (ERROR severity only)"
  }
}
```

### Log Levels

| Severity | When | Example |
|----------|------|---------|
| **INFO** | Normal operations | "Ingest run completed", "Forecast served" |
| **WARNING** | Degraded but functional | "Low hour count: 142", "Stale forecast served" |
| **ERROR** | Failures requiring attention | "Provider timeout after 3 retries", "Firestore write failed" |

### Key Log Events

| Event | Severity | Service | Context Fields |
|-------|----------|---------|---------------|
| `ingest_started` | INFO | ingest_worker | `area_id`, `ingest_run_id` |
| `provider_fetch_success` | INFO | ingest_worker | `endpoint`, `duration_ms`, `hour_count` |
| `provider_fetch_retry` | WARNING | ingest_worker | `endpoint`, `attempt`, `error_type` |
| `provider_fetch_failed` | ERROR | ingest_worker | `endpoint`, `attempts`, `error_message` |
| `normalize_complete` | INFO | ingest_worker | `row_count`, `null_counts` |
| `dq_check_flag` | WARNING | ingest_worker | `flag_type`, `details` |
| `storage_write_success` | INFO | ingest_worker | `layer`, `duration_ms` |
| `storage_write_failed` | ERROR | ingest_worker | `layer`, `error_message` |
| `ingest_completed` | INFO | ingest_worker | `status`, `duration_ms`, `dq_flags` |
| `ingest_skipped` | INFO | ingest_worker | `reason` ("idempotency") |
| `api_request` | INFO | api_fastapi | `endpoint`, `method`, `status_code`, `duration_ms` |
| `auth_success` | INFO | api_fastapi | `user_id` |
| `auth_failure` | WARNING | api_fastapi | `reason`, `token_preview` (first 8 chars only) |
| `profile_updated` | INFO | api_fastapi | `user_id`, `fields_changed` |
| `profile_deleted` | INFO | api_fastapi | `user_id` |

## SLOs (Service Level Objectives)

| SLO | Target | Measurement | Alert |
|-----|--------|-------------|-------|
| **Forecast freshness** | < 90 min P95 | `forecast_age_minutes` gauge | Warning at 90min, critical at 180min |
| **API latency** | < 200ms P95 | `api_request_duration_seconds` histogram | Warning at 200ms, critical at 500ms |
| **Ingest success rate** | > 99% over 7 days | `ingest_run_status` counter (success / total) | < 95% over 24h |
| **API availability** | > 99.5% over 7 days | `api_request_count` (non-5xx / total) | < 99% over 24h |
| **Provider availability** | > 95% over 7 days | `provider_request_duration_seconds` (non-timeout / total) | Informational (can't control provider) |

## Alert Routing

V1 uses Cloud Monitoring alerts → email notifications.

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Forecast stale | `forecast_age_minutes > 180` for 10+ min | Critical | Check ingest worker logs; manual re-trigger if needed |
| Ingest 3x failure | 3 consecutive `ingest_run_status = failed` | Critical | Check provider status; check service account permissions |
| API 5xx spike | > 10 5xx responses in 5 minutes | Critical | Check Cloud Run logs; consider rollback |
| API latency spike | P95 > 500ms for 10+ min | Warning | Check Firestore latency; check Cloud Run scaling |
| DQ degraded run | `ingest_run_status = degraded` | Warning | Review DQ flags; check if provider data quality changed |
| Auth failure spike | > 50 auth failures in 1 hour | Warning | Possible token refresh issue or attack |

**V1.1:** Add Slack/PagerDuty integration for critical alerts.

## Data Quality Framework

### Automated Checks (run every ingest)

Defined in `03_data_sources.md` § Data Quality Checks. Summary:

| Check | Rule | Severity |
|-------|------|----------|
| Hour count | >= 140 of 168 | Warning (<140), Error (<100) |
| Range: wave_height_m | [0, 10] m | Warning per out-of-range row |
| Range: eu_aqi | [0, 500] | Warning per out-of-range row |
| Range: uv_index | [0, 15] | Warning per out-of-range row |
| Range: feelslike_c | [-5, 55] °C | Warning per out-of-range row |
| Range: wind_ms | [0, 50] m/s | Warning per out-of-range row |
| Null rate per key metric | > 10% | Ingest marked `degraded` |
| Timestamp continuity | Gaps > 1 hour | Warning |

### Degraded State Handling

When ingest status is `degraded`:

```
1. Firestore serving doc is STILL updated (with available data)
2. `ingest_status` field set to "degraded" in serving doc
3. API /v1/public/health returns status: "degraded" with details
4. Dashboard shows yellow indicator
5. Flutter app shows "Some data may be incomplete" badge
6. Scoring engine handles null fields gracefully (see 04_scoring_engine_v1.md § Null Handling)
7. DQ flags logged to ingest_runs_v1 for debugging
```

### Data Quality Dashboard

The Next.js dashboard (`07_dashboard_spec.md` § Page 3: Data Quality) shows:
- Null rate per variable (last 7 days)
- Out-of-range flag count
- Degraded/failed run timeline (last 30 days)
- Recent ingest runs table from `ingest_runs_v1`

## Top 5 Failure Scenario Runbooks

### 1. Forecast Data Stale (> 180 minutes)

**Symptoms:** Dashboard shows red freshness indicator. App shows stale warning.

**Diagnosis:**
```bash
# Check recent ingest runs
bq query 'SELECT * FROM ingest_runs_v1 ORDER BY started_at_utc DESC LIMIT 5'

# Check Cloud Scheduler
gcloud scheduler jobs describe ingest-hourly --location=europe-west1

# Check ingest worker logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ingest-worker"' --limit=50 --format=json
```

**Resolution:**
1. If scheduler stopped → re-enable: `gcloud scheduler jobs resume ingest-hourly`
2. If worker crashing → check logs for error, fix, redeploy
3. If provider down → wait for recovery (retry will pick up next hour)
4. Manual re-trigger: publish message to Pub/Sub topic `ingest-trigger`

### 2. Provider API Consistently Failing

**Symptoms:** Multiple `failed` ingest runs. Provider timeout errors in logs.

**Diagnosis:**
```bash
# Check Open-Meteo status (manual)
curl -s "https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.77&hourly=temperature_2m&forecast_days=1" | jq .

# Check provider error rate
bq query "SELECT status, COUNT(*) FROM ingest_runs_v1 WHERE started_at_utc > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR) GROUP BY status"
```

**Resolution:**
1. If provider is down → wait; app serves stale data gracefully
2. If our IP is blocked → check if rate limit exceeded (shouldn't be at 72 calls/day)
3. If API URL changed → update provider implementation, redeploy

### 3. API Service Returning 5xx Errors

**Symptoms:** Alert fires. App shows error state.

**Diagnosis:**
```bash
# Check Cloud Run logs
gcloud logging read 'resource.labels.service_name="api-fastapi" AND severity>=ERROR' --limit=20

# Check Cloud Run instance health
gcloud run services describe api-fastapi --region=europe-west1
```

**Resolution:**
1. Check error logs for root cause (Firestore connection, code bug, OOM)
2. If recent deploy → rollback: route traffic to previous revision
3. If Firestore issue → check Firestore console for quota/errors
4. If OOM → increase Cloud Run memory limit

### 4. Firestore Write Failures (Ingest)

**Symptoms:** Ingest runs show `degraded` with Firestore error. BQ has data but app shows stale.

**Diagnosis:**
```bash
# Check Firestore status
gcloud firestore operations list

# Check service account permissions
gcloud projects get-iam-policy $PROJECT --flatten="bindings[].members" --filter="bindings.members:ingest-worker@"
```

**Resolution:**
1. Check service account has `roles/datastore.user`
2. Check Firestore quotas in GCP console
3. Manual fix: run a one-off script to read latest BQ data and write to Firestore

### 5. Scoring Produces Unexpected Results

**Symptoms:** Users report scores that don't match conditions.

**Diagnosis:**
1. Check which `scoring_version` the user is on (from notification logs)
2. Fetch the forecast data for the reported hour
3. Run scoring engine with same inputs + user's thresholds in Python test harness
4. Compare with expected output

**Resolution:**
1. If scoring bug → fix in both Dart and Python, add regression test case to golden fixtures
2. If data quality issue → check DQ flags for that hour's ingest run
3. If threshold issue → verify user's preset maps to correct threshold values
