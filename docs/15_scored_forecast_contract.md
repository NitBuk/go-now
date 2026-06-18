# Scored Forecast Contract

This is the canonical public client contract for both the Next.js dashboard and the native iOS app.

## Endpoint

`GET /v1/public/scores?area_id=tel_aviv_coast&days=7`

The backend owns scoring for the first native iOS release. Clients render the returned scored hours and do not reimplement scoring locally.

## Response

```json
{
  "area_id": "tel_aviv_coast",
  "updated_at_utc": "2026-06-18T05:30:00Z",
  "provider": "open_meteo",
  "freshness": "fresh",
  "forecast_age_minutes": 12,
  "horizon_days": 7,
  "scoring_version": "score_v2",
  "hours": [
    {
      "hour_utc": "2026-06-18T06:00:00Z",
      "wave_height_m": 0.4,
      "wave_period_s": 5.2,
      "air_temp_c": 24.0,
      "feelslike_c": 25.0,
      "wind_ms": 3.0,
      "gust_ms": 5.0,
      "precip_prob_pct": 10,
      "precip_mm": 0.0,
      "uv_index": 4.0,
      "eu_aqi": 42,
      "pm10": 18.0,
      "pm2_5": 8.0,
      "scores": {
        "swim_solo": {
          "score": 88,
          "label": "Perfect",
          "hard_gated": false,
          "reasons": [
            {"factor": "waves", "text": "Waves calm", "emoji": "check", "penalty": 0}
          ]
        },
        "swim_dog": {},
        "run_solo": {},
        "run_dog": {}
      }
    }
  ],
  "daily": [
    {
      "date": "2026-06-18",
      "sunrise_utc": "2026-06-18T02:32:00Z",
      "sunset_utc": "2026-06-18T16:52:00Z"
    }
  ]
}
```

## Client Rules

- Treat `scores` as authoritative. Do not recompute penalties or hard gates in clients.
- Render all four modes: `swim_solo`, `swim_dog`, `run_solo`, `run_dog`.
- Freshness states: `< 90` minutes is fresh, `90...179` is stale, and `>= 180` is very stale.
- Null raw values render as `--`.
- API errors use the existing error envelope from `docs/14_api_reference.md`.

## Maintenance Policy

The native iOS app and web dashboard share this contract. The web dashboard remains working and lightly maintained, while new primary product UX work happens in the native iOS app first.
