# Public Dashboard Spec (Next.js)

## Goal
A public link that showcases:
- ingestion freshness
- data quality
- the live 7-day Tel Aviv forecast
- the pipeline architecture (data engineering credibility)

## Audience
Recruiters / peers / portfolio visitors.

## Primary Data Source
- BigQuery (primary)
- API fallback:
  - `/v1/public/health`
  - `/v1/public/forecast`

## Pages

### 1) Home / Status
- Freshness indicator: "Updated X minutes ago"
- Last ingest status: success/degraded/failed
- Provider latency summary
- SLA target: update <= 90 minutes

### 2) Forecast Explorer
Time-series charts (7 days hourly):
- wave_height_m
- feelslike_c
- uv_index
- eu_aqi

### 3) Data Quality
- Missingness summary per variable
- Range check flags
- Degraded runs list

### 4) Architecture
Diagram:
Scheduler -> Pub/Sub -> Ingest Worker -> (GCS raw + BQ curated + Firestore serving) -> API -> App

## Public Access
Fully public.
Do not expose secrets or user data.
Only Tel Aviv shared forecast + pipeline metadata.
