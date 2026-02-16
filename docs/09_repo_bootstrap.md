# Repo Bootstrap (V1)

## Monorepo Layout

```
go-now/
├── apps/
│   ├── mobile_flutter/          # Flutter app (auth, scoring, notifications, onboarding)
│   └── dashboard_nextjs/        # Next.js public dashboard (BigQuery reads, API fallback)
├── services/
│   ├── api_fastapi/             # FastAPI on Cloud Run (public + private endpoints)
│   ├── ingest_worker/           # Python Cloud Run worker (fetch, normalize, load)
│   └── shared_contracts/        # Shared DTOs: forecast, health, profile, scoring version
├── docs/                        # Full spec (11 documents)
├── infra/                       # Infrastructure notes, bootstrap config
│   └── bootstrap_notes/         # ClickOps settings documentation
├── .pre-commit-config.yaml      # Pre-commit hooks configuration
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Tooling Versions

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | For FastAPI + ingest worker |
| Flutter | 3.22+ | Stable channel |
| Dart | 3.4+ | Bundled with Flutter SDK |
| Node.js | 20 LTS | For Next.js dashboard |
| npm | 10+ | Bundled with Node.js 20 |
| Firebase CLI | latest | For auth, Firestore rules, hosting deploys |
| Google Cloud SDK | latest | For Cloud Run, BigQuery, GCS, Pub/Sub |
| Docker | 24+ | For building Cloud Run container images |

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/{org}/go-now.git
cd go-now
```

### 2. Install Python Dependencies

```bash
cd services/api_fastapi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ../ingest_worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Each Python service has its own virtual environment. Use Python 3.11+.

### 3. Install Flutter

Follow the official guide at [flutter.dev/docs/get-started/install](https://flutter.dev/docs/get-started/install). Then:

```bash
flutter channel stable
flutter upgrade
flutter doctor    # Verify all checks pass
```

Navigate to the mobile app and fetch dependencies:

```bash
cd apps/mobile_flutter
flutter pub get
```

### 4. Install Node.js Dependencies

```bash
cd apps/dashboard_nextjs
npm install
```

### 5. Set Up Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add    # Select dev project, alias it as "dev"
firebase use --add    # Select prod project, alias it as "prod"
firebase use dev      # Default to dev for local development
```

### 6. Copy Environment Files

Each service has an `.env.example` template. Copy and fill in values:

```bash
# API service
cp services/api_fastapi/.env.example services/api_fastapi/.env

# Ingest worker
cp services/ingest_worker/.env.example services/ingest_worker/.env

# Dashboard
cp apps/dashboard_nextjs/.env.example apps/dashboard_nextjs/.env.local
```

See the "Environment Variable Templates" section below for required values.

### 7. Start Services Locally

**API service:**
```bash
cd services/api_fastapi
source .venv/bin/activate
uvicorn main:app --reload --port 8080
```

**Ingest worker** (manual trigger for testing):
```bash
cd services/ingest_worker
source .venv/bin/activate
python main.py --local-trigger '{"area_id": "tel_aviv_coast", "horizon_days": 7}'
```

**Dashboard:**
```bash
cd apps/dashboard_nextjs
npm run dev    # Starts on http://localhost:3000
```

**Flutter app:**
```bash
cd apps/mobile_flutter
flutter run    # Launches on connected device or simulator
```

## Environment Variable Templates

### `services/api_fastapi/.env.example`

```bash
# GCP Project
GOOGLE_CLOUD_PROJECT=gonow-dev

# Firestore (set for local emulator, remove for real Firestore)
FIRESTORE_EMULATOR_HOST=localhost:8081

# Server
PORT=8080

# Firebase Auth (for token verification)
FIREBASE_PROJECT_ID=gonow-dev
```

### `services/ingest_worker/.env.example`

```bash
# GCP Project
GOOGLE_CLOUD_PROJECT=gonow-dev

# Storage
GCS_BUCKET=gonow-dev-raw

# BigQuery
BQ_DATASET=gonow_v1

# Pub/Sub
PUBSUB_TOPIC=ingest-trigger

# Open-Meteo (no API key needed for free tier)
OPEN_METEO_BASE_URL=https://api.open-meteo.com
```

### `apps/dashboard_nextjs/.env.example`

```bash
# API fallback URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# BigQuery (server-side only, never exposed to client)
GOOGLE_CLOUD_PROJECT=gonow-dev
BQ_DATASET=gonow_v1

# Google Cloud credentials (for local dev, use ADC)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Shared Contracts

The `/services/shared_contracts` directory contains canonical DTO definitions used across all components. Each DTO is defined in both TypeScript (for the dashboard) and Python (for backend services). The Flutter/Dart implementations should match these structures exactly.

### ForecastHourly

The hourly forecast object as served by the API and stored in Firestore. See `03_data_sources.md` for field origins.

**TypeScript:**

```typescript
// services/shared_contracts/typescript/forecast.ts

export interface ForecastHourly {
  hour_utc: string;             // ISO-8601 timestamp
  wave_height_m: number | null;
  wave_period_s: number | null;
  air_temp_c: number | null;
  feelslike_c: number | null;
  wind_ms: number | null;
  gust_ms: number | null;
  precip_prob_pct: number | null;
  precip_mm: number | null;
  uv_index: number | null;
  eu_aqi: number | null;
  pm10: number | null;
  pm2_5: number | null;
}

export interface ForecastDocument {
  area_id: string;
  updated_at_utc: string;       // ISO-8601 timestamp
  provider: string;
  horizon_days: number;
  ingest_status: "success" | "degraded" | "failed";
  hours: ForecastHourly[];
}
```

**Python:**

```python
# services/shared_contracts/python/forecast.py

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ForecastHourly:
    hour_utc: datetime
    wave_height_m: Optional[float] = None
    wave_period_s: Optional[float] = None
    air_temp_c: Optional[float] = None
    feelslike_c: Optional[float] = None
    wind_ms: Optional[float] = None
    gust_ms: Optional[float] = None
    precip_prob_pct: Optional[int] = None
    precip_mm: Optional[float] = None
    uv_index: Optional[float] = None
    eu_aqi: Optional[int] = None
    pm10: Optional[float] = None
    pm2_5: Optional[float] = None


@dataclass
class ForecastDocument:
    area_id: str
    updated_at_utc: datetime
    provider: str
    horizon_days: int
    ingest_status: str  # "success" | "degraded" | "failed"
    hours: list[ForecastHourly]
```

### HealthResponse

The health endpoint response. See `05_backend_architecture.md` for endpoint spec.

**TypeScript:**

```typescript
// services/shared_contracts/typescript/health.ts

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  forecast_age_minutes: number;
  last_ingest_at_utc: string;     // ISO-8601
  last_ingest_status: "success" | "degraded" | "failed";
  provider: string;
  hours_available: number;
}
```

**Python:**

```python
# services/shared_contracts/python/health.py

from dataclasses import dataclass
from datetime import datetime


@dataclass
class HealthResponse:
    status: str                     # "ok" | "degraded" | "error"
    forecast_age_minutes: int
    last_ingest_at_utc: datetime
    last_ingest_status: str         # "success" | "degraded" | "failed"
    provider: str
    hours_available: int
```

### ProfileV1

The user profile schema. Canonical definition in `02_user_profile_schema.md`.

**TypeScript:**

```typescript
// services/shared_contracts/typescript/profile.ts

export interface ProfileV1 {
  schema_version: "profile_v1";
  user_id: string;
  created_at: string;               // ISO-8601
  updated_at: string;               // ISO-8601

  user: {
    display_name: string;
    units: "metric";
    language: "en";
  };

  preferences: {
    preset: "chill" | "balanced" | "strict";
    activities_enabled: {
      swim: boolean;
      run: boolean;
    };
    time_preference: {
      morning: boolean;
      midday: boolean;
      sunset: boolean;
      night: boolean;
    };
  };

  notification_preferences: {
    enabled: boolean;
    mode_toggles: {
      swim_solo: boolean;
      swim_dog: boolean;
      run_solo: boolean;
      run_dog: boolean;
    };
    quiet_hours: {
      enabled: boolean;
      start: string;               // "HH:MM" 24h format
      end: string;                 // "HH:MM" 24h format
    };
  };

  thresholds: {
    swim_wave_meh_m: number;
    swim_wave_bad_m: number;
    swim_dog_wave_meh_m: number;
    swim_dog_wave_bad_m: number;
    run_hot_feelslike_warn_c: number;
    run_hot_feelslike_bad_c: number;
    dog_heat_warn_feelslike_c: number;
    dog_heat_bad_feelslike_c: number;
    uv_warn: number;
    uv_bad: number;
    aqi_warn_eu: number;
    aqi_bad_eu: number;
    wind_warn_ms: number;
    wind_bad_ms: number;
  };

  dog: {
    has_dog: boolean;
    dog_name?: string;
    size?: "small" | "medium" | "large";
    coat?: "short" | "medium" | "long";
    heat_sensitivity?: "low" | "medium" | "high";
  };

  location: {
    area_id: "tel_aviv_coast";
    lat: number;
    lon: number;
  };

  privacy: {
    analytics_opt_in: boolean;
  };
}
```

**Python:**

```python
# services/shared_contracts/python/profile.py

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class UserInfo:
    display_name: str = "Beach Buddy"
    units: str = "metric"
    language: str = "en"


@dataclass
class ActivitiesEnabled:
    swim: bool = True
    run: bool = True


@dataclass
class TimePreference:
    morning: bool = True
    midday: bool = False
    sunset: bool = True
    night: bool = False


@dataclass
class Preferences:
    preset: str = "balanced"  # "chill" | "balanced" | "strict"
    activities_enabled: ActivitiesEnabled = field(default_factory=ActivitiesEnabled)
    time_preference: TimePreference = field(default_factory=TimePreference)


@dataclass
class ModeToggles:
    swim_solo: bool = True
    swim_dog: bool = True
    run_solo: bool = True
    run_dog: bool = False


@dataclass
class QuietHours:
    enabled: bool = False
    start: str = "22:00"
    end: str = "07:00"


@dataclass
class NotificationPreferences:
    enabled: bool = True
    mode_toggles: ModeToggles = field(default_factory=ModeToggles)
    quiet_hours: QuietHours = field(default_factory=QuietHours)


@dataclass
class Thresholds:
    swim_wave_meh_m: float = 0.60
    swim_wave_bad_m: float = 1.00
    swim_dog_wave_meh_m: float = 0.60
    swim_dog_wave_bad_m: float = 0.80
    run_hot_feelslike_warn_c: float = 28.0
    run_hot_feelslike_bad_c: float = 32.0
    dog_heat_warn_feelslike_c: float = 26.0
    dog_heat_bad_feelslike_c: float = 29.0
    uv_warn: float = 6.0
    uv_bad: float = 8.0
    aqi_warn_eu: int = 60
    aqi_bad_eu: int = 100
    wind_warn_ms: float = 10.0
    wind_bad_ms: float = 14.0


@dataclass
class DogInfo:
    has_dog: bool = False
    dog_name: Optional[str] = None
    size: Optional[str] = None       # "small" | "medium" | "large"
    coat: Optional[str] = None       # "short" | "medium" | "long"
    heat_sensitivity: Optional[str] = "medium"  # "low" | "medium" | "high"


@dataclass
class Location:
    area_id: str = "tel_aviv_coast"
    lat: float = 32.08
    lon: float = 34.77


@dataclass
class Privacy:
    analytics_opt_in: bool = True


@dataclass
class ProfileV1:
    schema_version: str = "profile_v1"
    user_id: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: UserInfo = field(default_factory=UserInfo)
    preferences: Preferences = field(default_factory=Preferences)
    notification_preferences: NotificationPreferences = field(
        default_factory=NotificationPreferences
    )
    thresholds: Thresholds = field(default_factory=Thresholds)
    dog: DogInfo = field(default_factory=DogInfo)
    location: Location = field(default_factory=Location)
    privacy: Privacy = field(default_factory=Privacy)
```

### ScoringOutput

The scoring engine output per hour. See `04_scoring_engine_v1.md` for scoring logic.

**TypeScript:**

```typescript
// services/shared_contracts/typescript/scoring.ts

export interface ReasonChip {
  factor: "waves" | "heat" | "uv" | "aqi" | "wind" | "rain" | "cold";
  text: string;
  emoji: "check" | "warning" | "danger" | "info";
  penalty: number;
}

export type ScoreLabel = "Perfect" | "Good" | "Meh" | "Bad" | "Nope";

export interface ModeScore {
  score: number;                 // 0-100
  label: ScoreLabel;
  reasons: ReasonChip[];         // 2-5 chips
  hard_gated: boolean;
}

export interface ScoringOutput {
  hour_utc: string;              // ISO-8601
  scoring_version: "score_v1";
  modes: {
    swim_solo: ModeScore;
    swim_dog: ModeScore;
    run_solo: ModeScore;
    run_dog: ModeScore;
  };
}
```

**Python:**

```python
# services/shared_contracts/python/scoring.py

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ReasonChip:
    factor: str       # "waves" | "heat" | "uv" | "aqi" | "wind" | "rain" | "cold"
    text: str
    emoji: str        # "check" | "warning" | "danger" | "info"
    penalty: int


@dataclass
class ModeScore:
    score: int                            # 0-100
    label: str                            # "Perfect" | "Good" | "Meh" | "Bad" | "Nope"
    reasons: list[ReasonChip] = field(default_factory=list)  # 2-5 chips
    hard_gated: bool = False


@dataclass
class ScoringOutput:
    hour_utc: datetime
    scoring_version: str = "score_v1"
    swim_solo: ModeScore = field(default_factory=ModeScore)
    swim_dog: ModeScore = field(default_factory=ModeScore)
    run_solo: ModeScore = field(default_factory=ModeScore)
    run_dog: ModeScore = field(default_factory=ModeScore)
```

## API Service (FastAPI)

```
services/api_fastapi/
├── main.py                      # App factory, router registration
├── routers/
│   ├── public.py                # /v1/public/forecast, /v1/public/health
│   └── private.py               # /v1/profile (GET/POST/DELETE)
├── auth/
│   └── firebase_verify.py       # Firebase JWT token verification
├── storage/
│   └── firestore.py             # Firestore client (read/write users, read forecasts)
├── models/
│   └── schemas.py               # Pydantic models (request/response schemas)
├── config.py                    # Environment config loader
├── requirements.txt
├── Dockerfile
├── .env.example
└── tests/
    ├── test_public.py
    ├── test_private.py
    └── conftest.py
```

**Public routes:**
- `GET /v1/public/forecast?area_id=tel_aviv_coast&days=7`
- `GET /v1/public/health`

**Private routes (Firebase Auth required):**
- `GET /v1/profile`
- `POST /v1/profile`
- `DELETE /v1/profile`

## Ingest Worker

```
services/ingest_worker/
├── main.py                      # Entry point: consumes Pub/Sub message
├── provider/
│   ├── base.py                  # ForecastProvider abstract class
│   └── open_meteo.py            # OpenMeteoProviderV1: fetch + raw store
├── normalize/
│   └── normalize_v1.py          # Merge 3 responses into normalized rows
├── load/
│   ├── bigquery.py              # Write to hourly_forecast_v1, ingest_runs_v1
│   └── firestore_serving.py     # Update forecasts/{area_id} serving doc
├── dq/
│   └── checks_v1.py             # Data quality checks (ranges, nulls, counts)
├── config.py                    # Environment config loader
├── requirements.txt
├── Dockerfile
├── .env.example
└── tests/
    ├── test_open_meteo.py
    ├── test_normalize.py
    ├── test_dq.py
    └── conftest.py
```

## Mobile Flutter

```
apps/mobile_flutter/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── auth/
│   │   ├── auth_service.dart         # Firebase Auth (Google + Apple)
│   │   └── auth_state.dart           # Auth state management
│   ├── onboarding/
│   │   ├── onboarding_flow.dart      # Multi-step onboarding screens
│   │   └── preset_selector.dart      # Chill/Balanced/Strict preset picker
│   ├── forecast/
│   │   ├── forecast_client.dart      # HTTP client for /v1/public/forecast
│   │   └── forecast_models.dart      # ForecastHourly, ForecastDocument
│   ├── scoring/
│   │   ├── scoring_engine.dart       # On-device scoring (score_v1)
│   │   ├── scoring_models.dart       # ModeScore, ReasonChip, ScoringOutput
│   │   └── thresholds.dart           # Preset-to-threshold mapping
│   ├── notifications/
│   │   ├── notification_scheduler.dart  # Local notification scheduling
│   │   └── anti_spam.dart            # Anti-spam rules
│   ├── profile/
│   │   ├── profile_service.dart      # Firestore profile sync
│   │   └── profile_models.dart       # ProfileV1 Dart model
│   └── ui/
│       ├── screens/                  # Tab screens (Today, Week, Settings)
│       ├── widgets/                  # Shared widgets (score card, reason chips)
│       └── theme.dart                # Minimal + classy theme
├── test/
│   ├── scoring/
│   │   └── scoring_engine_test.dart  # Golden tests from 04_scoring_engine_v1.md
│   ├── forecast/
│   │   └── forecast_client_test.dart
│   └── profile/
│       └── profile_service_test.dart
├── pubspec.yaml
├── analysis_options.yaml
├── android/
│   └── app/
│       └── google-services.json      # Firebase config (gitignored)
└── ios/
    └── Runner/
        └── GoogleService-Info.plist  # Firebase config (gitignored)
```

**Modules:**
- **auth:** Firebase Authentication (Google + Apple sign-in)
- **onboarding:** Multi-step flow collecting activities, dog info, preset, notifications
- **forecast:** HTTP client for public forecast endpoint
- **scoring:** On-device scoring engine (`score_v1`) — must match spec in `04_scoring_engine_v1.md`
- **notifications:** Local notification scheduling with anti-spam rules from `06_notification_spec.md`
- **profile:** Firestore profile persistence and sync

## Dashboard Next.js

```
apps/dashboard_nextjs/
├── app/
│   ├── layout.tsx                # Root layout, meta tags, navigation
│   ├── page.tsx                  # Home / Status page
│   ├── forecast/
│   │   └── page.tsx              # Forecast Explorer page
│   ├── quality/
│   │   └── page.tsx              # Data Quality page
│   ├── architecture/
│   │   └── page.tsx              # Architecture page
│   ├── api/
│   │   └── og/
│   │       └── route.tsx         # OpenGraph image generation
│   └── sitemap.ts                # Auto-generated sitemap
├── components/                   # React components (see 07_dashboard_spec.md)
├── lib/
│   ├── bigquery.ts               # BigQuery client (server-side only)
│   ├── api.ts                    # API fallback client
│   ├── scoring.ts                # Balanced-preset score computation
│   └── types.ts                  # Shared TypeScript types
├── public/
│   └── robots.txt
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

**Pages:**
- **status** — Pipeline health, freshness gauge, current conditions
- **forecast** — 7-day time-series charts, score heatmap
- **quality** — Missingness, range violations, DQ flags timeline
- **architecture** — Mermaid diagram, component descriptions

**Server-side:** BigQuery client using service account (read-only).
**API fallback:** `/v1/public/health`, `/v1/public/forecast` via client-side fetch.

## Linting and Formatting

### Python (API + Ingest Worker)

| Tool | Purpose | Config |
|------|---------|--------|
| black | Code formatting | `line-length = 100` |
| ruff | Linting (replaces flake8, isort) | Default rules + `line-length = 100` |
| mypy | Type checking | `strict = true` (per service) |

Configuration in each service's `pyproject.toml`:

```toml
[tool.black]
line-length = 100

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "UP"]

[tool.mypy]
strict = true
python_version = "3.11"
```

### Dart (Flutter Mobile App)

| Tool | Purpose | Config |
|------|---------|--------|
| dart format | Code formatting | Default (80 char line length) |
| dart analyze | Static analysis | `analysis_options.yaml` (recommended lints) |

Configuration in `apps/mobile_flutter/analysis_options.yaml`:

```yaml
include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_const_constructors: true
    avoid_print: true
    prefer_final_locals: true
```

### TypeScript / JavaScript (Dashboard)

| Tool | Purpose | Config |
|------|---------|--------|
| ESLint | Linting | Next.js default config + strict TypeScript rules |
| Prettier | Code formatting | Default settings (printWidth: 80, singleQuote: true) |

Configuration in `apps/dashboard_nextjs/`:

```json
// .prettierrc
{
  "printWidth": 80,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true
}
```

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

## Pre-Commit Hooks

Use [pre-commit](https://pre-commit.com/) framework with the following `.pre-commit-config.yaml` at the repo root:

```yaml
# .pre-commit-config.yaml
repos:
  # Python formatting and linting
  - repo: https://github.com/psf/black
    rev: "24.4.2"
    hooks:
      - id: black
        args: ["--check", "--line-length=100"]
        files: ^services/

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: "v0.4.4"
    hooks:
      - id: ruff
        files: ^services/

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: "v1.10.0"
    hooks:
      - id: mypy
        files: ^services/
        additional_dependencies: []

  # Dart formatting and analysis
  - repo: local
    hooks:
      - id: dart-format
        name: dart format
        entry: dart format --set-exit-if-changed
        language: system
        files: ^apps/mobile_flutter/.*\.dart$

      - id: dart-analyze
        name: dart analyze
        entry: bash -c "cd apps/mobile_flutter && dart analyze --fatal-infos"
        language: system
        files: ^apps/mobile_flutter/.*\.dart$

  # JavaScript/TypeScript formatting and linting
  - repo: local
    hooks:
      - id: prettier-check
        name: prettier
        entry: bash -c "cd apps/dashboard_nextjs && npx prettier --check ."
        language: system
        files: ^apps/dashboard_nextjs/

      - id: eslint
        name: eslint
        entry: bash -c "cd apps/dashboard_nextjs && npx eslint ."
        language: system
        files: ^apps/dashboard_nextjs/

  # Secret detection
  - repo: https://github.com/gitleaks/gitleaks
    rev: "v8.18.2"
    hooks:
      - id: gitleaks
```

### Installing Pre-Commit Hooks

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files    # Verify everything passes
```

### Hook Summary

| Scope | Checks | Blocks Commit On |
|-------|--------|-----------------|
| Python (`services/`) | black --check, ruff, mypy | Formatting violations, lint errors, type errors |
| Dart (`apps/mobile_flutter/`) | dart format --set-exit-if-changed, dart analyze | Formatting violations, analysis issues |
| JS/TS (`apps/dashboard_nextjs/`) | prettier --check, eslint | Formatting violations, lint errors |
| All files | gitleaks | Detected secrets (API keys, tokens, passwords) |
