# Notifications Spec (V1)

## Goal
Notify users when a good window (>= 60 minutes) appears for their selected modes,
without expensive backend push.

## Strategy (V1)
- Compute recommendations on-device using:
  - public forecast from `/v1/public/forecast`
  - user preset + dog profile from local storage / Firestore
- Schedule local notifications for the next 24–48 hours.
- Recompute + reschedule:
  - after onboarding
  - after preset changes
  - after daily app open
  - after new forecast fetched (freshness check)

## User Controls
- Notifications toggle: On/Off
- Quiet hours: optional in V1 (default off)
- Modes enabled for notifications:
  - Swim solo
  - Swim with dog
  - Run solo
  - Run with dog

Default: enabled for modes the user selected in onboarding.

## Minimum Window Rule
- A window must be a contiguous block of >= 60 minutes.
- Prefer highest average score across the window.
- Schedule notifications only for windows whose average score >= 70 ("Good" or better).

## Scheduling Policy
- Maintain at most 2 upcoming notifications per mode per day:
  - "Next best window"
  - "Backup window"

## Templates (minimal, classy)
### Swim solo
Title: "Swim window"
Body:
- "Best time: 07:00–08:00. Waves calm."

### Swim with dog
Title: "Swim with 🐾"
Body:
- "07:00–08:00 looks good. Waves low."

### Run solo
Title: "Run window"
Body:
- "18:00–19:00. Cooler + lower UV."

### Run with dog
Title: "Dog run window 🐾"
Body:
- "18:00–19:00. Safer heat + UV."

## Anti-spam Rules
- Never send more than 4 notifications/day total unless user opts in later.
- If user disables notifications, cancel all scheduled.
- If dog heat gate triggers -> never schedule run_dog for that hour.

## Logging (DE + debugging)
On-device log events (local only in V1):
- `notif_scheduled`: mode, window_start, window_end, avg_score, scoring_version
- `notif_opened`: mode, opened_at
- `notif_disabled`
