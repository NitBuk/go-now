# Go Now - Scoring Engine

Standalone Python package that computes swim and run activity scores (0-100) from hourly forecast data. Zero cloud dependencies -- works with any location's forecast data. Tel Aviv coast is the first live deployment.

## Scoring Logic

Scores are computed per hour for 4 activity modes:

| Mode | Description |
|---|---|
| `swim_solo` | Swimming without a dog |
| `swim_dog` | Swimming with a dog (stricter thresholds) |
| `run_solo` | Running without a dog |
| `run_dog` | Running with a dog (stricter thresholds) |

**Pipeline:**
1. **Hard gates** - heavy rain sets all scores to 0; extreme wind zeros run scores; night-time zeros swim scores (after sunset)
2. **Penalty scoring** - start at 100, subtract per factor (waves, heat, UV, AQI, wind, rain)
3. **Dog modes** - stricter thresholds + 1.2× multipliers on heat/AQI/UV penalties
4. **Reason chips** - 2-5 chips per mode from top penalty contributors; +1 positive chip if score ≥ 70

**Labels:** 85-100 "Perfect" · 70-84 "Good" · 45-69 "Meh" · 20-44 "Bad" · 0-19 "Nope"

## Usage

```python
from scoring_engine import score_hour, BALANCED_THRESHOLDS
from shared_contracts.python.forecast import ForecastHourly
from datetime import datetime, timezone

forecast_row = ForecastHourly(
    hour_utc=datetime(2025, 6, 1, 9, 0, tzinfo=timezone.utc),
    wave_height_m=0.8,
    air_temp_c=28.0,
    feelslike_c=31.0,
    wind_ms=4.5,
    uv_index=6.0,
    eu_aqi=35,
    precip_prob_pct=5,
    precip_mm=0.0,
)

result = score_hour(forecast_row, BALANCED_THRESHOLDS, sunset_utc="2025-06-01T18:30:00Z")

print(result.swim_solo)   # ModeScore(score=82, label="Good", reasons=[...])
print(result.run_dog)     # ModeScore(score=45, label="Meh", reasons=[...])
```

See [`services/shared_contracts/`](../shared_contracts/README.md) for the full `ForecastHourly` field definitions.

## Install as a Dependency

```toml
# pyproject.toml
[tool.uv.sources]
scoring-engine = { path = "../../services/scoring_engine", editable = true }
```

## Tests

```bash
uv run pytest tests/ -v
```

## Full Setup

See the [root README](../../README.md).
