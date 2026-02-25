# Go Now — Ingest Worker

Cloud Run job that fetches hourly weather/ocean data from Open-Meteo and writes it to Firestore, BigQuery, and Cloud Storage. Triggered hourly via Cloud Pub/Sub.

## What It Does

1. Fetches raw forecast data from the Open-Meteo free API (no key required)
2. Normalizes the data into hourly rows
3. Writes to three storage layers:
   - **Cloud Storage** — raw JSON archive
   - **BigQuery** — normalized hourly data
   - **Firestore** — serving cache read by the API

## Stack

- **Python 3.11+**
- **Google Cloud Firestore**, **BigQuery**, **Cloud Storage**
- Triggered via **Cloud Pub/Sub** (Cloud Scheduler → Pub/Sub → Cloud Run)

## Local Dev (Manual Trigger)

```bash
# Install dependencies
uv sync

# Run once manually
uv run python -m src.main
```

## Environment

Copy `.env.example` to `.env` and fill in your GCP project details:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `GCS_RAW_BUCKET` | Cloud Storage bucket for raw JSON |
| `BQ_DATASET` | BigQuery dataset name |
| `PUBSUB_TOPIC` | Pub/Sub topic name |
| `OPEN_METEO_BASE_URL` | Open-Meteo API base URL (no key needed) |
| `LOG_LEVEL` | Logging level (default: `INFO`) |
| `ENV` | Environment name (`dev` or `prod`) |

## GCP Dependencies

- **Firestore** — writes `forecasts/{area_id}` serving cache
- **BigQuery** — writes normalized hourly rows to `{BQ_DATASET}.hourly_forecast`
- **Cloud Storage** — archives raw JSON to `{GCS_RAW_BUCKET}`

## Tests

```bash
uv run pytest tests/ -v
```

## Full Setup

See the [root README](../../README.md) for full local stack setup including GCP resource creation.
