# Tel Aviv Coast Buddy — Product Vision (V1)

## One-liner
A clean, modern mobile app that tells you — for every hour in the next 7 days — whether it’s a good time to **swim or run**, **solo or with your dog**, on the Tel Aviv coast.

## Problem
People want a simple, confident answer to: “Should I go now?”
But the decision is multi-factor:
- waves (surfers / rough water)
- heat + UV (especially for dogs)
- wind (sand + comfort)
- air quality (dust days)
- rain probability

Most apps show raw weather. This app converts it into an opinionated hourly plan with reasons.

## Target Users (V1)
- Tel Aviv residents who swim/run at the beach
- Dog owners who need extra safety logic (heat/UV/AQI)
- Users who value minimal design and clarity over endless charts

## V1 Scope
- Location: **Tel Aviv Coast** (single forecast point)
- Horizon: **7 days**, hourly
- Modes:
  - Swim (solo)
  - Swim (with dog)
  - Run (solo)
  - Run (with dog)
- Onboarding personalization:
  - **Presets only**: Chill / Balanced / Strict
  - No custom threshold edits in V1
- Notifications:
  - On-device scheduling (computed from forecast + scoring)
- Data pipeline:
  - Hourly ingestion + caching via backend
- Public dashboard:
  - Pipeline freshness + sample conditions + data quality signals

## Non-goals (V1)
- Multi-city support
- Beach-specific micro-conditions (Hilton vs others)
- Widgets
- Social features, clubs, group runs
- ML-based personalization (we start deterministic)

## Differentiators
- Hourly “go/no-go” score with reasons (not just raw data)
- Dog-aware logic that blocks unsafe conditions (condition-based)
- Minimal UI + “occasional jokes” microcopy, never noisy
- A visible, trustworthy data pipeline (public status page)

## Success Metrics (early)
- Activation: user completes onboarding in < 90 seconds
- Retention: user opens app 3+ times in first week
- Notification opt-in rate
- “Recommendation usefulness” feedback (V1.1)

## Safety Principles
- No medical advice
- Clear “Nope” gates for unsafe dog-running conditions
- Always show the *why* (reasons) behind the score
