# Go Now - Shared Contracts

Data transfer objects (DTOs) shared across services. Currently Python only -- a TypeScript mirror is planned for V2.

## Contents

### `python/forecast.py`
Forecast data structures passed between the ingest worker, scoring engine, and API.

| Class | Used by |
|---|---|
| `ForecastHourly` | Scoring engine input; one object per forecast hour |
| `ForecastDocument` | Firestore serving document (all 168 hours + metadata) |

**`ForecastHourly` fields:** `hour_utc`, `wave_height_m`, `wave_period_s`, `air_temp_c`, `feelslike_c`, `wind_ms`, `gust_ms`, `precip_prob_pct`, `precip_mm`, `uv_index`, `eu_aqi`, `pm10`, `pm2_5`

### `python/scoring.py`
Scoring engine output structures.

| Class | Description |
|---|---|
| `ReasonChip` | Single reason chip: factor, display text, severity emoji, penalty points |
| `ModeScore` | Score (0-100), label, reason chips, and hard-gate flag for one activity mode |
| `ScoringOutput` | All 4 mode scores for a single hour (`swim_solo`, `swim_dog`, `run_solo`, `run_dog`) |

### `python/health.py`
API health response shape (`HealthResponse`): pipeline status, forecast age, last ingest metadata.

## Usage

The scoring engine imports from `shared_contracts` directly:

```python
from shared_contracts.python.forecast import ForecastHourly
from shared_contracts.python.scoring import ScoringOutput
```

In service `pyproject.toml` files, it is referenced as a path dependency:

```toml
[tool.uv.sources]
shared-contracts = { path = "../../services/shared_contracts", editable = true }
```

## Updating Contracts

Changes here affect every service that imports from this package. When modifying a contract:
1. Update the Python dataclass
2. Update all callers (ingest worker, API, scoring engine)
3. Run tests across affected services: `uv run pytest tests/ -v`
