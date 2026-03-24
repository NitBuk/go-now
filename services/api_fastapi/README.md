# Go Now - API Service

FastAPI service that serves scored forecast data from Firestore to the web frontend.

## Endpoints

| Route | Description |
|---|---|
| `GET /v1/public/forecast` | Raw hourly forecast data (168 hours) |
| `GET /v1/public/scores` | Forecast + pre-computed scores (Balanced preset) |
| `GET /v1/public/health` | Pipeline health status |

## Example Requests

With the dev server running on port 8080:

```bash
# Pipeline health
curl http://localhost:8080/v1/public/health

# Scored forecast (truncated)
curl "http://localhost:8080/v1/public/scores?area_id=tel_aviv_coast&days=1" \
  | python3 -m json.tool | head -60
```

Interactive docs (Swagger UI): [http://localhost:8080/docs](http://localhost:8080/docs)

To find the Cloud Run URL after deployment:
```bash
gcloud run services describe api-fastapi --region europe-west1 --format="value(status.url)"
```

## Stack

- **Python 3.11+**
- **FastAPI**
- **Google Cloud Firestore** (serving cache)

## Local Dev

```bash
# Install dependencies
uv sync

# Start dev server
uv run uvicorn src.main:app --reload --port 8080
```

The API will be available at [http://localhost:8080](http://localhost:8080). Interactive docs at [http://localhost:8080/docs](http://localhost:8080/docs).

## Environment

Copy `.env.example` to `.env` and fill in your GCP project ID:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `FIRESTORE_EMULATOR_HOST` | Set to `localhost:8081` for local Firestore emulator (remove for real Firestore) |
| `PORT` | Server port (default: `8080`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `LOG_LEVEL` | Logging level (default: `INFO`) |
| `ENV` | Environment name (`dev` or `prod`) |

## GCP Dependencies

- **Firestore** - reads `forecasts/{area_id}` collection for serving cache

## Tests

```bash
uv run pytest tests/ -v
```

## Full Setup

See the [root README](../../README.md) for full local stack setup.
