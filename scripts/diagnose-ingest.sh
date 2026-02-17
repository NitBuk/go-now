#!/usr/bin/env bash
#
# diagnose-ingest.sh — Runbook to diagnose stale ingest data
#
# Usage:
#   ./scripts/diagnose-ingest.sh                   # uses default project
#   ./scripts/diagnose-ingest.sh --trigger          # also sends a test message
#
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-go-now-487612}"
REGION="europe-west1"
SCHEDULER_JOB="ingest-trigger"
TOPIC="ingest-trigger"
DLQ_TOPIC="ingest-trigger-dlq"
DLQ_SUB="ingest-trigger-dlq-sub"
WORKER_SERVICE="ingest-worker"
API_SERVICE="api-fastapi"
BQ_DATASET="gonow_v1"
TRIGGER="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

header() { echo -e "\n${YELLOW}═══ $1 ═══${NC}"; }
ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
warn()   { echo -e "  ${YELLOW}!${NC} $1"; }
fail()   { echo -e "  ${RED}✗${NC} $1"; }

# ─────────────────────────────────────────────
header "1. Cloud Scheduler Job"
# ─────────────────────────────────────────────
if gcloud scheduler jobs describe "$SCHEDULER_JOB" \
    --project="$PROJECT" --location="$REGION" --format=json 2>/dev/null | \
    python3 -c "
import sys, json
j = json.load(sys.stdin)
state = j.get('state', 'UNKNOWN')
last = j.get('lastAttemptTime', 'never')
status = j.get('status', {}).get('code', 0)
print(f'  State: {state}')
print(f'  Last attempt: {last}')
print(f'  Last status code: {status}')
if state != 'ENABLED':
    print('  ⚠  Job is NOT enabled!')
    sys.exit(1)
if status != 0:
    print('  ⚠  Last execution returned non-zero status')
    sys.exit(1)
"; then
    ok "Scheduler job looks healthy"
else
    fail "Scheduler job issue detected (or job does not exist)"
fi

# ─────────────────────────────────────────────
header "2. Pub/Sub Subscription Health"
# ─────────────────────────────────────────────
echo "  Topic:"
gcloud pubsub topics describe "$TOPIC" --project="$PROJECT" --format="value(name)" 2>/dev/null \
    && ok "Topic exists" || fail "Topic $TOPIC not found"

echo "  Subscriptions on topic:"
gcloud pubsub subscriptions list --project="$PROJECT" \
    --filter="topic:projects/$PROJECT/topics/$TOPIC" \
    --format="table(name,pushConfig.pushEndpoint,ackDeadlineSeconds)" 2>/dev/null \
    || warn "Could not list subscriptions"

# ─────────────────────────────────────────────
header "3. Dead Letter Queue"
# ─────────────────────────────────────────────
DLQ_COUNT=$(gcloud pubsub subscriptions pull "$DLQ_SUB" \
    --project="$PROJECT" --limit=5 --auto-ack --format=json 2>/dev/null || echo "[]")

DLQ_N=$(echo "$DLQ_COUNT" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
if [ "$DLQ_N" = "0" ] || [ "$DLQ_N" = "?" ]; then
    ok "No messages in DLQ (or DLQ sub does not exist)"
else
    warn "$DLQ_N messages pulled from DLQ — delivery failures detected"
    echo "$DLQ_COUNT" | python3 -c "
import sys, json
msgs = json.load(sys.stdin)
for m in msgs[:3]:
    print(f'  Message ID: {m.get(\"message\",{}).get(\"messageId\",\"?\")}')
    print(f'  Publish time: {m.get(\"message\",{}).get(\"publishTime\",\"?\")}')
" 2>/dev/null || true
fi

# ─────────────────────────────────────────────
header "4. Cloud Run Ingest Worker Logs (last 30 min)"
# ─────────────────────────────────────────────
echo "  Recent errors/warnings:"
gcloud logging read \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$WORKER_SERVICE\" AND severity>=WARNING AND timestamp>=\"$(date -u -v-30M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '30 minutes ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)\"" \
    --project="$PROJECT" --limit=10 --format="table(timestamp,severity,textPayload)" 2>/dev/null \
    || warn "Could not read logs (check permissions or service name)"

echo "  Recent requests:"
gcloud logging read \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$WORKER_SERVICE\" AND httpRequest.requestUrl:\"*\" AND timestamp>=\"$(date -u -v-30M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '30 minutes ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)\"" \
    --project="$PROJECT" --limit=5 --format="table(timestamp,httpRequest.status,httpRequest.latency)" 2>/dev/null \
    || true

# ─────────────────────────────────────────────
header "5. BigQuery Ingest Runs (last 24h)"
# ─────────────────────────────────────────────
bq query --project_id="$PROJECT" --use_legacy_sql=false --format=prettyjson --max_rows=10 "
SELECT
  run_id,
  area_id,
  status,
  hours_ingested,
  started_at,
  finished_at,
  error_message
FROM \`$PROJECT.$BQ_DATASET.ingest_runs_v1\`
WHERE started_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY started_at DESC
LIMIT 10
" 2>/dev/null || warn "Could not query BigQuery (dataset may not exist yet)"

# ─────────────────────────────────────────────
header "6. API Health Endpoint"
# ─────────────────────────────────────────────
API_URL=$(gcloud run services describe "$API_SERVICE" \
    --project="$PROJECT" --region="$REGION" \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -n "$API_URL" ]; then
    ok "API URL: $API_URL"
    echo "  Health response:"
    curl -s "$API_URL/v1/public/health" | python3 -m json.tool 2>/dev/null \
        || warn "Health endpoint not responding"
else
    fail "Could not resolve API Cloud Run URL (service may not be deployed)"
fi

# ─────────────────────────────────────────────
header "7. Manual Trigger"
# ─────────────────────────────────────────────
if [ "$TRIGGER" = "--trigger" ]; then
    echo "  Publishing test message to $TOPIC..."
    gcloud pubsub topics publish "$TOPIC" \
        --project="$PROJECT" \
        --message='{"area_id":"tel_aviv_coast","horizon_days":7}' 2>/dev/null \
        && ok "Message published" || fail "Failed to publish"

    echo "  Tailing worker logs for 30s..."
    timeout 30 gcloud logging tail \
        "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$WORKER_SERVICE\"" \
        --project="$PROJECT" --format="table(timestamp,textPayload)" 2>/dev/null \
        || warn "Log tailing ended (timeout or permission issue)"
else
    echo "  Skipped (pass --trigger to send a test message and tail logs)"
fi

echo ""
echo "Done. Review output above to identify the pipeline bottleneck."
