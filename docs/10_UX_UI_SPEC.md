# UX/UI Spec (V1)

## Tone & Style
- Language: English only
- Visual: modern, minimal, high contrast, calm spacing
- Humor: classy, occasional, short (never noisy)

Examples:
- “Surfer energy: rising.”
- “Dust vibes: not today.”
- “Dog paws deserve better 🐾”

## Information Architecture
Tabs (V1):
1) Today
2) Planner (7-day hourly)
3) Profile / Settings

### 1) Today (Dashboard)
Goal: instant answer.
Components:
- Header: “Tel Aviv Coast”
- Top card: “Next best window” per mode
- Secondary card: “Today’s vibe” (1 sentence)
- Compact “Now” row: current hour score + reason chips

### 2) Planner (7-day Hourly Timeline)
Controls:
- Mode selector: Swim / Run
- Toggle: Solo / With dog
- Preset badge shown (Chill/Balanced/Strict)

Timeline:
- Day sections
- Each hour row shows:
  - score color (subtle)
  - label
  - 1–2 micro-icons (wave / UV / AQI / wind)

Hour detail sheet:
- Big score + label
- Reasons chips (2–5)
- Raw data table:
  - wave height
  - gusts
  - feels-like
  - UV
  - EU AQI
  - rain probability

### 3) Profile / Settings
- Profile basics: display name, dog fields
- Preset selector (no manual edits in V1)
- Notifications toggle
- Privacy: analytics opt-in
- Account: export profile JSON, delete account

## Onboarding (fast, premium pacing)
Goal: < 90 seconds.

Screen 1: Welcome
- “Plan the coast. Skip the guesswork.”
- Sign in: Google / Apple

Screen 2: Choose activities
- Swim / Run / Both

Screen 3: Dog?
- If yes: name + size + coat + heat sensitivity

Screen 4: Pick your vibe (Presets)
- Chill: “More go, fewer warnings.”
- Balanced: “Smart defaults.”
- Strict: “Only when it’s really good.”

Screen 5: Notifications
- “Want a heads-up when a 60+ min window appears?”
- Toggle on/off

Finish:
- “You’re set. The coast awaits.”

## Preset Mapping (V1)
Presets map to threshold multipliers used by scoring:

Balanced:
- baseline thresholds

Chill:
- waves: +0.15m tolerance
- heat: +1.5°C tolerance (run + dog)
- AQI: +20 EU AQI tolerance
- UV: +1 tolerance

Strict:
- waves: -0.15m tolerance
- heat: -1.5°C tolerance
- AQI: -20 EU AQI tolerance
- UV: -1 tolerance

Note: V1 does not expose numeric thresholds to users.
