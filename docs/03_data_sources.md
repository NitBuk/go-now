# Data Sources (V1)

## Scope

- **Location:** Single forecast point — Tel Aviv Coast (`area_id: tel_aviv_coast`, lat 32.08, lon 34.77).
- **Horizon:** 7-day hourly forecast (168 hours).
- **Refresh cadence:** Every 1 hour (backend ingestion job via Cloud Scheduler → Pub/Sub).
- **Client access:** App reads from our API (`/v1/public/forecast`), never directly from the provider.

## Provider: Open-Meteo (V1)

Three Open-Meteo API endpoints, all free tier:

| Endpoint | Variables | URL |
|----------|-----------|-----|
| Weather Forecast | temperature, feels-like, wind, gusts, precip, UV | `https://api.open-meteo.com/v1/forecast` |
| Marine Forecast | wave height, wave period, wave direction | `https://marine-api.open-meteo.com/v1/marine` |
| Air Quality | EU AQI, PM10, PM2.5 | `https://air-quality-api.open-meteo.com/v1/air-quality` |

> **License:** Open-Meteo free tier is non-commercial. Monetization requires a paid plan or provider swap. The `ForecastProvider` abstraction enables swapping without app changes.

### Sample API URLs

**Weather:**
```
https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.77&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation_probability,precipitation,uv_index&forecast_days=7&timezone=auto
```

**Marine:**
```
https://marine-api.open-meteo.com/v1/marine?latitude=32.08&longitude=34.77&hourly=wave_height,wave_period,wave_direction&forecast_days=7&timezone=auto
```

**Air Quality:**
```
https://air-quality-api.open-meteo.com/v1/air-quality?latitude=32.08&longitude=34.77&hourly=european_aqi,pm10,pm2_5&forecast_days=7&timezone=auto
```

### Sample Response Shape (Weather, abbreviated)

```json
{
  "latitude": 32.08,
  "longitude": 34.78,
  "generationtime_ms": 0.5,
  "utc_offset_seconds": 7200,
  "timezone": "Asia/Jerusalem",
  "hourly_units": {
    "time": "iso8601",
    "temperature_2m": "°C",
    "apparent_temperature": "°C",
    "wind_speed_10m": "km/h",
    "wind_gusts_10m": "km/h",
    "precipitation_probability": "%",
    "precipitation": "mm",
    "uv_index": ""
  },
  "hourly": {
    "time": ["2025-06-01T00:00", "2025-06-01T01:00", "..."],
    "temperature_2m": [24.1, 23.8, "..."],
    "apparent_temperature": [25.3, 24.9, "..."],
    "wind_speed_10m": [12.5, 11.2, "..."],
    "wind_gusts_10m": [18.0, 16.5, "..."],
    "precipitation_probability": [0, 0, "..."],
    "precipitation": [0.0, 0.0, "..."],
    "uv_index": [0.0, 0.0, "..."]
  }
}
```

> **Important:** Open-Meteo returns wind in **km/h**. We normalize to **m/s** during ingestion (÷ 3.6).

## Normalization Mapping

Explicit mapping from raw Open-Meteo variable names to our curated/serving field names:

| Open-Meteo Raw Variable | Raw Unit | Curated/Serving Field | Target Unit | Transform |
|--------------------------|----------|----------------------|-------------|-----------|
| `wave_height` | m | `wave_height_m` | m | passthrough |
| `wave_period` | s | `wave_period_s` | s | passthrough |
| `wave_direction` | ° | `wave_direction_deg` | ° | passthrough (UI-only) |
| `temperature_2m` | °C | `air_temp_c` | °C | passthrough |
| `apparent_temperature` | °C | `feelslike_c` | °C | passthrough |
| `wind_speed_10m` | km/h | `wind_ms` | m/s | `÷ 3.6` |
| `wind_gusts_10m` | km/h | `gust_ms` | m/s | `÷ 3.6` |
| `precipitation_probability` | % | `precip_prob_pct` | % (0–100) | passthrough |
| `precipitation` | mm | `precip_mm` | mm | passthrough |
| `uv_index` | — | `uv_index` | — | passthrough |
| `european_aqi` | EU AQI | `eu_aqi` | EU AQI (0–500) | passthrough |
| `pm10` | µg/m³ | `pm10` | µg/m³ | passthrough |
| `pm2_5` | µg/m³ | `pm2_5` | µg/m³ | passthrough |

**Key conversions:**
- Wind: `km/h → m/s` (divide by 3.6)
- All other variables: passthrough (unit already matches our schema)

## Data Model: Three Storage Layers

### Layer 1: Raw (Cloud Storage)

Store the full provider JSON response as-is for auditability and replay.

**Path pattern:**
```
gs://{bucket}/raw/openmeteo/{endpoint}/area_id=tel_aviv_coast/{YYYY}/{MM}/{DD}/{HH}/{request_hash}.json
```

Where `{endpoint}` is `weather`, `marine`, or `air_quality`.

**Metadata embedded in each file:**
```json
{
  "_meta": {
    "fetched_at_utc": "2025-06-01T12:00:05Z",
    "provider_name": "open_meteo",
    "provider_request_url": "https://api.open-meteo.com/v1/forecast?...",
    "endpoint": "weather",
    "schema_version": "raw_v1",
    "ingest_run_id": "run_20250601_120000_abc123"
  },
  "response": { "...full Open-Meteo response..." }
}
```

### Layer 2: Curated (BigQuery)

Normalized hourly table for analytics, debugging, and dashboard queries.

**Table: `hourly_forecast_v1`**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `area_id` | STRING | no | Always `"tel_aviv_coast"` in V1 |
| `hour_utc` | TIMESTAMP | no | Hour bucket (truncated to hour) |
| `wave_height_m` | FLOAT64 | yes | Significant wave height |
| `wave_period_s` | FLOAT64 | yes | Wave period |
| `air_temp_c` | FLOAT64 | yes | Air temperature |
| `feelslike_c` | FLOAT64 | yes | Apparent temperature |
| `wind_ms` | FLOAT64 | yes | Wind speed (converted from km/h) |
| `gust_ms` | FLOAT64 | yes | Gust speed (converted from km/h) |
| `precip_prob_pct` | INT64 | yes | Precipitation probability |
| `precip_mm` | FLOAT64 | yes | Precipitation amount |
| `uv_index` | FLOAT64 | yes | UV index |
| `eu_aqi` | INT64 | yes | European AQI |
| `pm10` | FLOAT64 | yes | PM10 |
| `pm2_5` | FLOAT64 | yes | PM2.5 |
| `fetched_at_utc` | TIMESTAMP | no | When provider data was fetched |
| `provider` | STRING | no | `"open_meteo"` |
| `ingest_run_id` | STRING | no | Links to `ingest_runs_v1` |
| `schema_version` | STRING | no | `"curated_v1"` |

**Partitioning:** By `hour_utc` (day-level partitioning). **Clustering:** By `area_id`.

### Layer 3: Serving (Firestore)

Single document per area for fast app reads.

**Collection:** `forecasts` | **Doc ID:** `tel_aviv_coast`

```json
{
  "area_id": "tel_aviv_coast",
  "updated_at_utc": "2025-06-01T12:00:10Z",
  "provider": "open_meteo",
  "horizon_days": 7,
  "ingest_status": "success",
  "hours": [
    {
      "hour_utc": "2025-06-01T00:00:00Z",
      "wave_height_m": 0.4,
      "wave_period_s": 5.2,
      "air_temp_c": 24.1,
      "feelslike_c": 25.3,
      "wind_ms": 3.5,
      "gust_ms": 5.0,
      "precip_prob_pct": 0,
      "precip_mm": 0.0,
      "uv_index": 0.0,
      "eu_aqi": 42,
      "pm10": 18.5,
      "pm2_5": 8.2
    }
  ]
}
```

**`hours` array:** 168 objects (7 × 24). Missing hours are omitted (not padded with nulls).

## Ingestion Pipeline

### Trigger

Cloud Scheduler fires hourly → publishes to Pub/Sub topic `ingest-trigger`:

```json
{ "area_id": "tel_aviv_coast", "horizon_days": 7 }
```

### Pipeline Steps

```
1. Receive Pub/Sub message
2. Check idempotency (skip if this hour_bucket already ingested successfully)
3. Fetch all 3 Open-Meteo endpoints (weather, marine, air_quality)
4. Write raw JSON to Cloud Storage (3 files)
5. Normalize: merge 3 responses into hourly rows, apply unit conversions
6. Run data quality checks
7. Load to BigQuery (hourly_forecast_v1)
8. Update Firestore serving doc (forecasts/tel_aviv_coast)
9. Write ingest run record to BigQuery (ingest_runs_v1)
```

### Idempotency

Deduplication key: `(area_id, hour_bucket_utc)` where `hour_bucket_utc` is the truncated-to-hour fetch time.

- Before fetching, query `ingest_runs_v1` for a `success` row with matching key.
- If found → skip fetch, log `ingest_skipped`, exit.
- This prevents duplicate writes if Cloud Scheduler fires twice or Pub/Sub redelivers.

### Retry Policy

Applies to each Open-Meteo API call individually:

| Attempt | Delay | Max |
|---------|-------|-----|
| 1st retry | 1s + jitter (0–500ms) | — |
| 2nd retry | 2s + jitter (0–500ms) | — |
| 3rd retry | 4s + jitter (0–500ms) | — |
| After 3rd | Give up for this endpoint | — |

**Jitter:** Random uniform [0, 500ms] added to each delay to prevent thundering herd.

### Failure Scenario Matrix

| Scenario | Detection | Action | Ingest Status |
|----------|-----------|--------|---------------|
| Single endpoint timeout (e.g., marine) | Retry exhausted after 3 attempts | Ingest remaining endpoints; set missing variables to `null` | `degraded` |
| All endpoints timeout | All 3 retry-exhausted | No write to BQ/Firestore; log error | `failed` |
| Partial data (< 140 hours returned) | Hour count check | Ingest available hours; log warning | `degraded` |
| Malformed JSON response | JSON parse error | Reject endpoint; treat as timeout scenario | `degraded` or `failed` |
| BigQuery write fails | BQ client exception | Firestore still updated (serving unblocked); alert | `degraded` |
| Firestore write fails | Firestore client exception | BQ still updated (analytics unblocked); alert | `degraded` |
| Both BQ and Firestore fail | Both exceptions | Log error, full failure | `failed` |
| Out-of-range values | DQ range checks | Flag but ingest (don't reject); add to `dq_flags` | `degraded` |

### Transaction Boundaries

Writes to the three storage layers are **not atomic**:

1. **Cloud Storage (raw)** — written first. If this fails, entire run fails.
2. **BigQuery (curated)** — written second. Uses `INSERT` (append); idempotent via dedup key.
3. **Firestore (serving)** — written last. Uses `set()` (full overwrite of forecast doc).

**If BQ succeeds but Firestore fails:** The serving doc retains the previous forecast. App will show stale data (detected via `updated_at_utc` freshness check). Dashboard will show the latest data from BQ. The next hourly ingest will retry the full pipeline, overwriting both.

**If Firestore succeeds but BQ fails:** App has fresh data. Dashboard/analytics are stale until next successful ingest. Alert fires for BQ write failure.

## Staleness Cascade

What each component does when data is older than 90 minutes:

| Component | Staleness Signal | Behavior |
|-----------|-----------------|----------|
| **Firestore serving doc** | `updated_at_utc` > 90min old | Continues serving last known data |
| **API `/v1/public/forecast`** | Checks `updated_at_utc` | Returns data with `"freshness": "stale"` flag |
| **API `/v1/public/health`** | Checks `updated_at_utc` | Returns `"status": "degraded"`, `"forecast_age_minutes": N` |
| **Flutter app** | Reads `freshness` field or computes from `updated_at_utc` | Shows "Updated X min ago" badge; yellow warning if > 90min |
| **Dashboard** | Reads `ingest_runs_v1` + Firestore timestamp | Shows red freshness indicator; lists failed runs |
| **Notifications** | App checks freshness before scheduling | If stale > 3 hours, skip notification scheduling; show "Data may be outdated" |

## Provider Abstraction

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class NormalizedHourlyRow:
    area_id: str
    hour_utc: datetime
    wave_height_m: Optional[float]
    wave_period_s: Optional[float]
    air_temp_c: Optional[float]
    feelslike_c: Optional[float]
    wind_ms: Optional[float]
    gust_ms: Optional[float]
    precip_prob_pct: Optional[int]
    precip_mm: Optional[float]
    uv_index: Optional[float]
    eu_aqi: Optional[int]
    pm10: Optional[float]
    pm2_5: Optional[float]

class ForecastProvider(ABC):
    @abstractmethod
    def fetch_raw(self, area_id: str, lat: float, lon: float, horizon_days: int) -> dict:
        """Fetch raw JSON from provider. Returns dict with raw response per endpoint."""
        ...

    @abstractmethod
    def normalize(self, raw: dict, area_id: str, fetched_at_utc: datetime) -> list[NormalizedHourlyRow]:
        """Convert raw provider response to normalized hourly rows."""
        ...
```

**V1 implementation:** `OpenMeteoProviderV1` — fetches 3 endpoints, merges by hour, converts wind km/h → m/s.

## Data Quality Checks (V1)

Run after normalization, before loading:

| Check | Rule | Action |
|-------|------|--------|
| Hour count | >= 140 of expected 168 | Warning if < 140; degraded if < 100 |
| Wave height range | [0, 10] m | Flag out-of-range; don't reject row |
| EU AQI range | [0, 500] | Flag out-of-range; don't reject row |
| UV index range | [0, 15] | Flag out-of-range; don't reject row |
| Feels-like range | [-5, 55] °C | Flag out-of-range; don't reject row |
| Wind speed range | [0, 50] m/s | Flag out-of-range; don't reject row |
| Key metric null rate | null count / total hours > 10% for any key metric | Mark ingest `degraded`; add to `dq_flags` |
| Timestamp continuity | Gaps > 1 hour between consecutive entries | Warning; log gap details |

**Key metrics** (null rate check applies): `wave_height_m`, `feelslike_c`, `wind_ms`, `uv_index`, `eu_aqi`.

**DQ flags** are stored as an array of strings in `ingest_runs_v1`, e.g.: `["low_hour_count:142", "null_rate_high:wave_height_m:15%"]`.

## Rate Limiting + Cost Control

- Backend is the **only** component calling the provider (app never calls Open-Meteo directly).
- Request volume: 1 area × 3 endpoints × 1/hour = **72 calls/day**.
- Well within Open-Meteo's free tier limit (10,000 calls/day).
- Idempotency prevents duplicate fetches from scheduler re-fires.
