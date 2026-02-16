# Testing Strategy (V1)

## Philosophy

- **Scoring engine gets the most coverage** — it's the core product logic, runs on-device, and must produce identical results across all platforms.
- **Integration tests validate the pipeline** — mock the provider, verify the full ingest flow.
- **UI tests cover critical paths** — onboarding, forecast display, preset changes.
- **Don't test framework code** — trust FastAPI, Flutter, and Next.js to work. Test our logic.

## Coverage Targets

| Component | Target | Rationale |
|-----------|--------|-----------|
| Scoring engine (Dart) | > 90% line coverage | Core product logic; must be bulletproof |
| Scoring engine (Python test mirror) | > 90% line coverage | Golden test parity with Dart |
| API endpoints | > 80% line coverage | Request/response validation, auth flows |
| Ingest worker | > 70% line coverage | Pipeline logic, normalization, DQ checks |
| Flutter UI | Key flows covered | Onboarding, forecast display, settings |
| Dashboard | Smoke tests | Page renders, data fetches |

## Scoring Engine Tests

The scoring engine is the highest-priority test target. It must produce identical results in Dart (production) and Python (reference/validation).

### Golden Test Fixtures

A shared JSON file (`/services/shared_contracts/test_fixtures/scoring_golden_tests.json`) defines test cases that both the Dart and Python implementations must pass:

```json
{
  "scoring_version": "score_v1",
  "preset": "balanced",
  "thresholds": { "...from 02_user_profile_schema.md canonical table..." },
  "test_cases": [
    {
      "id": "perfect_conditions",
      "description": "All variables at comfortable levels",
      "input": {
        "wave_height_m": 0.2,
        "feelslike_c": 24.0,
        "gust_ms": 5.0,
        "precip_prob_pct": 0,
        "precip_mm": 0.0,
        "uv_index": 3.0,
        "eu_aqi": 30
      },
      "expected": {
        "swim_solo": {"score": 100, "label": "Perfect", "hard_gated": false},
        "swim_dog": {"score": 100, "label": "Perfect", "hard_gated": false},
        "run_solo": {"score": 100, "label": "Perfect", "hard_gated": false},
        "run_dog": {"score": 100, "label": "Perfect", "hard_gated": false}
      }
    },
    {
      "id": "all_null",
      "description": "All variables null — no penalties, info chips only",
      "input": {
        "wave_height_m": null,
        "feelslike_c": null,
        "gust_ms": null,
        "precip_prob_pct": null,
        "precip_mm": null,
        "uv_index": null,
        "eu_aqi": null
      },
      "expected": {
        "swim_solo": {"score": 100, "label": "Perfect", "hard_gated": false},
        "run_dog": {"score": 100, "label": "Perfect", "hard_gated": false}
      }
    },
    {
      "id": "rain_hard_gate",
      "description": "Heavy rain gates all modes",
      "input": {
        "wave_height_m": 0.2,
        "feelslike_c": 24.0,
        "gust_ms": 5.0,
        "precip_prob_pct": 30,
        "precip_mm": 5.0,
        "uv_index": 3.0,
        "eu_aqi": 30
      },
      "expected": {
        "swim_solo": {"score": 0, "label": "Nope", "hard_gated": true},
        "swim_dog": {"score": 0, "label": "Nope", "hard_gated": true},
        "run_solo": {"score": 0, "label": "Nope", "hard_gated": true},
        "run_dog": {"score": 0, "label": "Nope", "hard_gated": true}
      }
    }
  ]
}
```

Full test case list from `04_scoring_engine_v1.md` edge case table (12 cases) plus:
- All 3 presets (Chill, Balanced, Strict) for boundary threshold cases
- Reason chip count validation (2–5 chips per mode)
- Positive chip presence when score >= 70

### Dart Test Suite (Flutter)

**Location:** `apps/mobile_flutter/test/scoring/`

```
scoring_engine_test.dart      # Golden test runner: loads JSON fixtures, asserts all cases
swim_solo_test.dart           # Unit tests for swim_solo edge cases
swim_dog_test.dart            # Unit tests for swim_dog edge cases
run_solo_test.dart            # Unit tests for run_solo edge cases
run_dog_test.dart             # Unit tests for run_dog edge cases
reason_chips_test.dart        # Chip generation, tie-breaking, positive chip selection
hard_gates_test.dart          # Rain gate, wind gate, dog heat gate
preset_thresholds_test.dart   # Verify preset→threshold mapping matches canonical table
```

**Run:** `cd apps/mobile_flutter && flutter test test/scoring/`

### Python Test Suite (Reference)

**Location:** `services/shared_contracts/tests/scoring/`

```
test_scoring_golden.py        # Same golden fixtures, Python reference implementation
test_scoring_edge_cases.py    # Python-specific edge case tests
```

**Run:** `cd services/shared_contracts && pytest tests/scoring/ -v`

**Purpose:** The Python tests serve as the reference implementation. If Dart and Python disagree on a test case, the Python implementation is authoritative (easier to debug and update).

## API Endpoint Tests

**Location:** `services/api_fastapi/tests/`

**Framework:** pytest + httpx (async test client for FastAPI)

```
test_public_forecast.py       # GET /v1/public/forecast — happy path, missing area_id, stale data
test_public_health.py         # GET /v1/public/health — fresh, stale, degraded states
test_profile_crud.py          # GET/POST/DELETE /v1/profile — auth required, validation, not found
test_auth.py                  # JWT validation, missing token, expired token, invalid token
test_error_responses.py       # Verify error envelope format for all error codes
```

### Key Test Cases

| Endpoint | Test | Expected |
|----------|------|----------|
| `GET /v1/public/forecast` | Valid area_id | 200 + forecast JSON |
| `GET /v1/public/forecast` | Missing area_id | 400 + error envelope |
| `GET /v1/public/forecast` | Unknown area_id | 404 + error envelope |
| `GET /v1/public/health` | Fresh forecast | 200 + `status: "healthy"` |
| `GET /v1/public/health` | Stale forecast (>90min) | 200 + `status: "degraded"` |
| `GET /v1/profile` | Valid JWT | 200 + profile JSON |
| `GET /v1/profile` | No auth header | 401 + error envelope |
| `GET /v1/profile` | Expired JWT | 401 + error envelope |
| `POST /v1/profile` | Valid profile | 200 + updated profile |
| `POST /v1/profile` | Invalid schema_version | 400 + error envelope |
| `DELETE /v1/profile` | Valid JWT | 204 + profile deleted |

**Mocking:** Use Firestore emulator for tests. Mock Firebase Auth token validation with a test helper that generates valid/invalid JWTs.

**Run:** `cd services/api_fastapi && pytest tests/ -v`

## Ingest Worker Tests

**Location:** `services/ingest_worker/tests/`

**Framework:** pytest

```
test_fetch.py                 # Mock HTTP responses from Open-Meteo; test retry logic
test_normalize.py             # Unit conversion (km/h → m/s), field mapping, null handling
test_dq_checks.py             # Range checks, null rate, hour count, timestamp continuity
test_idempotency.py           # Verify duplicate runs are skipped
test_pipeline_integration.py  # Full pipeline with mocked provider + emulated storage
```

### Integration Test: Mock Provider Pipeline

```python
def test_full_ingest_pipeline(mock_openmeteo, firestore_emulator, bq_emulator):
    """End-to-end: trigger ingest → mock API responses → verify all 3 storage layers."""
    # 1. Mock Open-Meteo to return fixture data
    mock_openmeteo.register(weather=FIXTURE_WEATHER, marine=FIXTURE_MARINE, aq=FIXTURE_AQ)

    # 2. Run ingest pipeline
    result = run_ingest(area_id="tel_aviv_coast", horizon_days=7)

    # 3. Verify raw files in mock GCS
    assert mock_gcs.exists("raw/openmeteo/weather/...")

    # 4. Verify BQ rows
    rows = bq_emulator.query("SELECT * FROM hourly_forecast_v1 WHERE area_id = 'tel_aviv_coast'")
    assert len(rows) == 168

    # 5. Verify Firestore serving doc
    doc = firestore_emulator.get("forecasts/tel_aviv_coast")
    assert doc["ingest_status"] == "success"
    assert len(doc["hours"]) == 168
```

### Failure Scenario Tests

| Scenario | Setup | Expected |
|----------|-------|----------|
| Marine endpoint timeout | Mock returns 504 after 3 retries | Ingest status = `degraded`, wave fields null |
| All endpoints fail | All mocks return 500 | Ingest status = `failed`, no writes to BQ/Firestore |
| Malformed JSON | Mock returns invalid JSON | Endpoint treated as failed; others proceed |
| Duplicate run | Run ingest twice for same hour bucket | Second run skipped (idempotency) |
| Out-of-range values | wave_height_m = 15.0 | DQ flag added, row still ingested |

**Run:** `cd services/ingest_worker && pytest tests/ -v`

## Flutter Widget & Integration Tests

**Location:** `apps/mobile_flutter/test/`

```
# Widget tests (unit-level UI)
widgets/
  score_card_test.dart        # Score card renders correctly for each tier
  reason_chip_test.dart       # Chip displays text + emoji correctly
  hour_row_test.dart          # Hour row shows score, label, icons
  preset_selector_test.dart   # Preset cards, selection state

# Integration tests (multi-widget flows)
integration/
  onboarding_flow_test.dart   # Full onboarding: sign in → activities → dog → preset → done
  forecast_display_test.dart  # Fetch forecast → render timeline → tap hour → detail sheet
  settings_flow_test.dart     # Change preset → verify threshold update → verify score recalc
```

### Key Flutter Test Cases

| Test | What It Validates |
|------|-------------------|
| Onboarding happy path | All 6 screens complete; profile written to mock Firestore |
| Onboarding skip dog | Dog screen skipped; dog modes disabled in notification_preferences |
| Forecast loading state | Skeleton shimmer shown while fetching |
| Forecast error state | Error banner shown on network failure |
| Stale data warning | Yellow badge shown when forecast > 90min old |
| Hard-gated hour display | "Nope" hours shown dimmed with gate reason |
| Preset change | Switching preset updates thresholds and re-scores all hours |
| Delete account | Confirmation dialog → API call → sign out → return to welcome |

**Run:** `cd apps/mobile_flutter && flutter test`

**Integration tests (on device/emulator):** `flutter test integration_test/`

## Dashboard Tests

**Location:** `apps/dashboard_nextjs/__tests__/`

**Framework:** Playwright for E2E, Jest for unit tests

```
e2e/
  status_page.spec.ts         # Page loads, freshness indicator renders
  forecast_page.spec.ts       # Charts render with mock data
  quality_page.spec.ts        # DQ table renders
  navigation.spec.ts          # All pages accessible, links work

unit/
  format_helpers.test.ts      # Date formatting, freshness calculation, number rounding
  api_client.test.ts          # API fallback logic
```

### E2E Smoke Tests

| Test | Assertion |
|------|-----------|
| Status page loads | Freshness indicator visible, no console errors |
| Forecast charts render | At least 1 chart element rendered with data points |
| Quality table renders | Table has > 0 rows |
| Architecture diagram | Mermaid diagram rendered |
| Mobile responsive | All pages render at 375px viewport width |

**Run:** `cd apps/dashboard_nextjs && npx playwright test`

## Test Environments

| Environment | Storage | Auth | Provider |
|-------------|---------|------|----------|
| **Unit tests** | In-memory mocks | Mock JWT helper | N/A |
| **Integration tests** | Firebase emulator suite (Firestore, Auth) + BQ emulator | Emulator auth | Mock HTTP (responses from fixtures) |
| **E2E (Dashboard)** | Mock API server (MSW) | N/A (public pages) | N/A |
| **Staging** (V1.1) | Dev Firebase project | Dev Firebase Auth | Real Open-Meteo (dev project) |

### Firebase Emulator Suite

Used for API and ingest worker integration tests:

```bash
firebase emulators:start --only firestore,auth
```

Tests connect to emulator via `FIRESTORE_EMULATOR_HOST=localhost:8080`.

## CI Integration

Tests run in CI via GitHub Actions (see `12_ci_cd_pipeline.md`):

- **On every PR:** All unit tests + integration tests
- **On merge to main:** Full suite including E2E
- **Coverage reports:** Uploaded as PR comments via codecov or similar
- **Test failures block merge** — no exceptions
