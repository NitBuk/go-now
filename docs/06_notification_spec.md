# Notifications Spec (V1)

## Goal

Notify users when a good activity window appears for their enabled modes, without backend push infrastructure. All notifications are **local** — computed and scheduled on-device using forecast data and the user's profile.

## Strategy

1. App fetches the public forecast from `/v1/public/forecast` (or reads from Firestore serving cache).
2. Scoring engine runs on-device using the user's `thresholds` object (populated by preset selection).
3. Engine identifies "good windows" — contiguous blocks of >= 60 minutes where average score >= 70 ("Good" or better).
4. App schedules local notifications for the next 24-48 hours, respecting per-mode toggles and quiet hours.
5. Recompute and reschedule triggers:
   - After onboarding completion
   - After preset change in Settings
   - After mode toggle change in Settings
   - After daily app open (cold or warm start)
   - After new forecast data is fetched (freshness check on foreground resume)
   - After timezone offset change (DST transition)
   - After app update (first launch post-update)
   - After device restart (via background task re-registration)

## User Controls

Notification preferences are stored in the user profile under `notification_preferences`. See `02_user_profile_schema.md` for the canonical schema.

### Per-Mode Toggles

Notifications use per-mode toggles, **not** a single on/off switch:

```json
"notification_preferences": {
  "enabled": true,
  "mode_toggles": {
    "swim_solo": true,
    "swim_dog": true,
    "run_solo": true,
    "run_dog": false
  },
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "07:00"
  }
}
```

- **`enabled`**: Master kill switch. If `false`, no notifications are scheduled regardless of mode toggles.
- **`mode_toggles`**: Independent toggle per mode. Only modes set to `true` receive notifications.
- **Default at onboarding**: `mode_toggles` are initialized based on `activities_enabled` and `dog.has_dog`. For example, if the user enables swim but has no dog, `swim_solo = true`, `swim_dog = false`, `run_solo = false`, `run_dog = false`.

### Quiet Hours

- When `quiet_hours.enabled` is `true`, no notifications fire between `start` and `end` (24h format, device local time).
- Default window: 22:00-07:00. User-configurable in Settings.
- If a notification would fire during quiet hours, it is **suppressed** (not deferred). The user sees the window when they open the app.

## Minimum Window Rule

- A window must be a contiguous block of >= 60 minutes (at least 1 consecutive hour at hourly forecast resolution).
- Only windows with average score >= 70 ("Good" or better) qualify for notifications.
- Windows are ranked by average score across their hours.
- Tie-breaker: earliest start time.
- Return top 2 windows per mode per day (for notification scheduling).

See `04_scoring_engine_v1.md` — Minimum Recommendation Window section for the full algorithm.

## Scheduling Policy

- **Max 2 notifications per mode per day**: "Next best window" + "Backup window".
- **Max 4 notifications per day total** across all modes, unless the user has explicitly enabled more than 2 modes (in which case: max 2 per enabled mode, up to 8 total).
- Notifications are scheduled as local notifications with a precise fire time (not interval-based).
- On reschedule: cancel all previously scheduled notifications, then schedule fresh.

## Notification Timing Logic

### When Notifications Fire

Notifications are scheduled to arrive **before** the activity window, giving the user time to prepare.

**Morning windows (window starts before 12:00):**
- Notification fires at **06:30 the same day**.
- If quiet hours are enabled and 06:30 falls within quiet hours, fire at `quiet_hours.end` (e.g., 07:00).

**Afternoon/evening windows (window starts 12:00 or later):**
- Notification fires at **06:30 the same day** (bundled with morning notification if both exist).
- If a second afternoon window exists, the backup notification fires at **12:00** the same day.

**Next-day windows:**
- If the best window for tomorrow is already known (e.g., forecast covers 48+ hours), schedule a notification for **06:30 the day before** as a heads-up.
- Template uses "tomorrow" framing: "Tomorrow's looking good for a swim. 07:00-09:00."

### Quiet Hours Interaction

- If the computed fire time falls within `[quiet_hours.start, quiet_hours.end)`, the notification is **not sent** (silent suppression).
- No deferral — the information is available in-app when the user opens it.

## Permission Request Flow

### iOS

1. **Onboarding screen 5 (Notifications)**: Request notification permission via `UNUserNotificationCenter.requestAuthorization`.
2. **If granted**: Schedule normally.
3. **If denied**: Use **provisional notifications** (`UNAuthorizationOptions.provisional`). These deliver silently to the notification center without banner/sound. The user can promote them to full notifications from the lock screen.
4. **If previously denied (on subsequent app opens)**: Do not re-request. Show an in-app banner: "Enable notifications to get swim/run alerts" with a "Settings" button that opens `UIApplication.openSettingsURLString` (deep link to app notification settings).

### Android

1. **Android 13+ (API 33+)**: `POST_NOTIFICATIONS` runtime permission required. Request at onboarding screen 5.
2. **Android 12 and below**: No runtime permission needed; notifications work by default.
3. **If denied on Android 13+**: Show in-app banner: "Enable notifications to get swim/run alerts" with a button that opens app notification settings via `Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)`.
4. **Never re-request** after an explicit denial. Android tracks this and will not show the system dialog again after two denials. Always use the Settings deep link instead.

### Denied State Banner

When notification permission is denied on either platform:

- Show a dismissible banner at the top of the Profile/Settings tab.
- Banner text: "Enable notifications to get swim/run alerts"
- Action button: "Open Settings" (deep links to OS notification settings for the app).
- Banner reappears once per app session (dismiss persists until next cold start).

## Platform Differences

### Android: Notification Channels

Create one channel per mode. Users can independently control each channel in Android system settings:

| Channel ID | Channel Name | Description |
|------------|-------------|-------------|
| `swim_solo` | Swim alerts | Solo swimming conditions |
| `swim_dog` | Dog swim alerts | Swimming with dog conditions |
| `run_solo` | Run alerts | Solo running conditions |
| `run_dog` | Dog run alerts | Running with dog conditions |

- Default importance: `IMPORTANCE_DEFAULT` (sound + notification shade).
- Channel creation happens at first app launch (or after update if new channels are added).
- Channels are never deleted — Android does not allow recreation of a deleted channel.

### iOS: Notification Categories

Define categories for actionable notifications:

| Category ID | Actions |
|-------------|---------|
| `activity_window` | "View Details" (opens app to Today tab), "Dismiss" |

- Use `UNNotificationCategory` with `UNNotificationAction`.
- Provisional notifications: supported on iOS 12+. Deliver to notification center silently.

### Both Platforms

- **Local notifications only** — no push server, no APNs/FCM integration in V1.
- **Badge count**: Not used in V1 (always 0). Avoids confusion with stale badges.
- **Sound**: System default notification sound. No custom sounds in V1.

## Deep Link Targets

Tapping a notification opens the app to the **Today tab**, scrolled to the relevant hour.

### Deep Link Format

```
gonow://today?hour=2025-06-01T08:00&mode=swim_solo
```

| Parameter | Description |
|-----------|-------------|
| `hour` | ISO-8601 hour (local time) of the window start |
| `mode` | The mode this notification was for (`swim_solo`, `swim_dog`, `run_solo`, `run_dog`) |

### Behavior

1. App opens to the Today tab.
2. Mode selector switches to the relevant mode (e.g., swim_solo).
3. Timeline scrolls to the notified hour.
4. If the hour is in the past (user tapped late), show the hour anyway with a "(past)" label.
5. If forecast data has been updated since the notification was scheduled, show current data (scores may differ from what was in the notification).

## Scheduling Edge Cases

### Timezone

- All notification scheduling uses **device local time** (expected: `Asia/Jerusalem` for Tel Aviv users).
- Notification fire times are converted to absolute timestamps using the device's current timezone offset.

### DST Transitions

Israel observes DST (IDT, UTC+3 in summer; IST, UTC+2 in winter). On a DST transition:

1. App detects timezone offset change on foreground resume or background task execution.
2. All scheduled notifications are **cancelled and rescheduled** using the new offset.
3. Log event: `notif_dst_reschedule` with old/new offset.

### Device Restart

- Android: Use `WorkManager` with a periodic task (minimum interval 15 minutes) to check if notifications need rescheduling. Also register a `BOOT_COMPLETED` BroadcastReceiver to trigger reschedule on device restart.
- iOS: Background app refresh (`BGAppRefreshTask`) registered at app launch. iOS manages scheduling; no guaranteed timing, but typically runs within a few hours. Notifications scheduled before restart persist in the iOS notification center.

### App Update

- On first launch after an app update (`PackageInfo.version` differs from stored version):
  1. Cancel all existing scheduled notifications.
  2. Re-run scoring engine with latest logic.
  3. Reschedule all notifications.
  4. Update stored version.
- This ensures scoring version changes are reflected in notifications immediately.

### Forecast Staleness

- If the most recent forecast data is older than 3 hours, **do not schedule new notifications** — keep existing ones.
- If forecast data is older than 6 hours, **cancel all scheduled notifications** and show an in-app warning: "Forecast data is stale. Notifications paused until data refreshes."

## Notification Templates

### Tone

Minimal, classy, informative. Notifications should feel like a friend with a weather app, not a marketing bot. No excessive emoji. Use the dog's name when available.

### Swim Solo

**Title:** "Swim window"

| Context | Body |
|---------|------|
| Perfect window | "The sea is calling. 07:00-09:00 looks perfect." |
| Good window | "Best time: 07:00-08:00. Waves calm." |
| Backup window | "Backup plan: 17:00-18:00 if morning doesn't work." |
| Tomorrow heads-up | "Tomorrow morning looks good for a swim. 07:00-09:00." |

### Swim with Dog

**Title:** "Swim with {dog_name}"

| Context | Body |
|---------|------|
| Perfect window | "{dog_name} approved. 07:00-09:00 — calm waves, good temps." |
| Good window | "07:00-08:00 looks good for a swim with {dog_name}. Waves low." |
| Backup window | "Afternoon backup: 17:00-18:00 works for {dog_name} too." |
| Tomorrow heads-up | "Tomorrow's looking good for {dog_name}. Morning swim, calm sea." |

### Run Solo

**Title:** "Run window"

| Context | Body |
|---------|------|
| Perfect window | "Lace up. 06:00-07:30 is perfect — cool, calm, clean air." |
| Good window | "18:00-19:00. Cooler + lower UV." |
| Backup window | "Backup plan: 17:00-18:00 if morning doesn't work." |
| Tomorrow heads-up | "Tomorrow evening looks solid for a run. 18:00-19:30." |

### Run with Dog

**Title:** "Run with {dog_name}"

| Context | Body |
|---------|------|
| Perfect window | "Morning run with {dog_name}? 06:00-07:30 before the heat kicks in." |
| Good window | "18:00-19:00 is safe for {dog_name}. Cooler temps, lower UV." |
| Backup window | "Backup option: 17:00-18:00. Still comfortable for paws." |
| Heat warning | "No good run windows for {dog_name} today. Too warm." |
| Tomorrow heads-up | "{dog_name} would approve of tomorrow morning. 06:00-07:30." |

### Template Variables

| Variable | Source |
|----------|--------|
| `{dog_name}` | `profile.dog.dog_name` (fallback: "your dog") |
| `{window_start}` | Start time of the window, formatted as `HH:MM` in device local time |
| `{window_end}` | End time of the window, formatted as `HH:MM` in device local time |
| `{top_reason}` | Text from the highest-magnitude positive reason chip (e.g., "Waves calm") |

### Template Selection Logic

1. If the best window scores >= 85 average: use the "Perfect" template.
2. If the best window scores >= 70 average: use the "Good" template.
3. If scheduling a second window: use the "Backup" template.
4. If scheduling for tomorrow: use the "Tomorrow" template.
5. If no qualifying window exists for a dog mode due to heat: use the "Heat warning" template (run_dog only).

## Anti-Spam Rules

1. **Max 2 notifications per mode per day.** No exceptions.
2. **Max 4 notifications per day total** (extends to max 2 x enabled_modes if more than 2 modes are enabled).
3. **No duplicate windows**: If two modes share the same best window time, send one notification per mode (they may have different scores/reasons).
4. **Hard-gated hours are never notified**: If a dog heat gate triggers for an hour, that hour is excluded from run_dog windows.
5. **Cancel on disable**: If the user disables notifications (`enabled = false`) or disables a specific mode toggle, immediately cancel all scheduled notifications for affected modes.
6. **No re-notification for the same window**: If a window was already notified and the user opens the app (which triggers reschedule), do not re-schedule a notification for a window within 30 minutes of a previously-fired notification.

## Logging

On-device log events (local analytics only in V1, sent to analytics backend if `privacy.analytics_opt_in` is `true`):

| Event | Fields | When |
|-------|--------|------|
| `notif_scheduled` | `mode`, `window_start`, `window_end`, `avg_score`, `scoring_version`, `fire_time` | When a notification is scheduled |
| `notif_fired` | `mode`, `window_start`, `notification_id` | When the notification actually fires (callback from OS) |
| `notif_opened` | `mode`, `opened_at`, `notification_id`, `deep_link` | When user taps a notification |
| `notif_dismissed` | `mode`, `notification_id` | When user swipes away / dismisses (Android only, not reliably available on iOS) |
| `notif_cancelled` | `mode`, `reason` (`user_disabled` / `reschedule` / `stale_data`) | When a scheduled notification is cancelled |
| `notif_permission_granted` | `platform`, `provisional` (bool) | When notification permission is granted |
| `notif_permission_denied` | `platform` | When notification permission is denied |
| `notif_dst_reschedule` | `old_offset`, `new_offset`, `count_rescheduled` | When DST transition triggers reschedule |
| `notif_settings_deep_link` | — | When user taps the "Open Settings" banner |

All events include `scoring_version` and `timestamp` automatically.

## Flutter Implementation Notes

### Recommended Packages

- **`flutter_local_notifications`**: Cross-platform local notification scheduling.
- **`permission_handler`**: Runtime permission requests (Android 13+, iOS).
- **`workmanager`** (Android): Background periodic tasks for reschedule after reboot.
- **`timezone`** + **`flutter_timezone`**: Timezone-aware scheduling with `TZDateTime`.

### Notification ID Strategy

Use a deterministic ID scheme to allow cancellation and deduplication:

```
notification_id = hash(mode + date + window_index)
```

- `mode`: e.g., `"swim_solo"`
- `date`: e.g., `"2025-06-01"`
- `window_index`: `0` (best) or `1` (backup)

This ensures rescheduling replaces the correct notification rather than creating duplicates.
