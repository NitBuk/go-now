# Data Sources (V1)

## Scope
- V1 supports a single forecast point: **Tel Aviv Coast**.
- Horizon: **7-day hourly forecast**.
- Refresh cadence: **every 1 hour** (backend ingestion job).
- App reads from our backend API (not directly from provider), so we can:
  - cache + control costs
  - switch providers later (monetization-ready)

## Provider (V1)
Use Open-Meteo for:
- Weather (hourly)
- Marine (hourly)
- Air Quality (hourly)

Important: Open-Meteo free usage is non-commercial; monetization later requires a paid plan or provider swap.
We design an abstraction `ForecastProvider` to allow switching later without breaking the app.

## Forecast Point (V1)
Single coordinate (stored in config):
- area_id: `tel_aviv_coast`
- lat: 32.08
- lon: 34.77

Note: The exact point is a pragmatic approximation for the Tel Aviv shoreline.

## Data Variables Needed (Hourly)

### Marine
- wave_height_m (significant wave height)
- wave_period_s (optional, if available)
- wave_direction_deg (optional in V1, used for UI only)

### Weather
- temperature_2m_c
- apparent_temperature_c (feels like)
- wind_speed_10m_ms
- wind_gusts_10m_ms
- precipitation_probability_pct (preferred)
- precipitation_mm (optional if available)
- uv_index

### Air Quality
- european_aqi
- pm10 (optional; useful for "dust day" explanations)
- pm2_5 (optional)

## Data Model Contract (Internal)
We store **raw** and **curated** forms.

### Raw
- Store the full provider JSON response as-is.
- Path:
  - `gs://<bucket>/raw/openmeteo/area_id=tel_aviv_coast/YYYY/MM/DD/HH/<request_hash>.json`
- Include metadata fields:
  - fetched_at_utc
  - provider_name
  - provider_request_url
  - schema_version

### Curated (Normalized)
A normalized hourly table for analytics + debugging:
- BigQuery table: `hourly_forecast_v1`

Columns (minimum):
- area_id STRING
- hour_utc TIMESTAMP
- wave_height_m FLOAT
- wave_period_s FLOAT (nullable)
- air_temp_c FLOAT
- feelslike_c FLOAT
- wind_ms FLOAT
- gust_ms FLOAT
- precip_prob_pct INT64 (nullable)
- precip_mm FLOAT (nullable)
- uv_index FLOAT
- eu_aqi INT64
- pm10 FLOAT (nullable)
- pm2_5 FLOAT (nullable)
- fetched_at_utc TIMESTAMP
- provider STRING
- schema_version STRING

### Serving (Firestore)
A single doc per area for fast app reads:
- collection: `forecasts`
- doc id: `tel_aviv_coast`

Fields:
- area_id
- updated_at_utc
- provider
- horizon_days
- hours: array of 168 hourly objects (7*24):
  - hour_utc
  - wave_height_m
  - wave_period_s?
  - air_temp_c
  - feelslike_c
  - wind_ms
  - gust_ms
  - precip_prob_pct?
  - precip_mm?
  - uv_index
  - eu_aqi
  - pm10?
  - pm2_5?

Reason: the app needs a single fast fetch.

## Fetch + Cache Rules
Backend ingestion job runs hourly:
- If provider call fails:
  - keep last successful forecast in Firestore
  - log error and alert (dashboard)
- Serving freshness:
  - "fresh" if updated_at_utc within 90 minutes

## Provider Abstraction (Code)
Define:
- interface `ForecastProvider`
  - `fetch_forecast(area_id, lat, lon, horizon_days) -> RawForecast`
  - `normalize(raw) -> NormalizedHourlyRows`

Implement:
- `OpenMeteoProviderV1`

This allows adding later:
- commercial provider if monetization begins

## Rate Limiting + Cost Control
- Backend is the only component calling provider.
- Request count is tiny:
  - 1 area * 1/hour = 24 calls/day for each endpoint set
- Add exponential backoff and jitter on failures.
- Deduplicate ingestion runs by checking if a run already wrote for the current hour bucket.

## Data Quality Checks (V1)
On each ingest, validate:
- ~168 hours exist for horizon=7 days (allow fewer; log warning)
- Range checks:
  - wave_height_m in [0, 10]
  - eu_aqi in [0, 500]
  - uv_index in [0, 15]
  - feelslike_c in [-5, 55]
- If any key metric is missing for >10% of hours -> mark ingest status = degraded
