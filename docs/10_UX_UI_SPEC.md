# UX/UI Spec (V1)

## Tone & Style

- **Language:** English only (V1).
- **Visual:** Modern, minimal, high contrast, calm spacing. Clean lines, generous whitespace, no visual clutter.
- **Humor:** Classy, occasional, short. The humor lives in the microcopy — the design itself is clean and serious. Never noisy, never try-hard.
- **Personality:** The app feels like a friend who checks the weather so you don't have to. Confident, concise, never condescending.

## Information Architecture

Three tabs (V1):

| Tab | Purpose | Icon |
|-----|---------|------|
| Today | Instant answer: should I go now? | Sun/wave icon |
| Planner | 7-day hourly timeline for planning ahead | Calendar icon |
| Profile | Settings, preset, notifications, account | Person icon |

---

## Today Tab (Dashboard)

### Purpose

Instant answer to "Is now a good time?" Show the best upcoming window and the current conditions at a glance.

### Layout (top to bottom)

#### Header

- **Title:** "Tel Aviv Coast" (left-aligned)
- **Freshness badge** (right-aligned):
  - "Updated Xm ago" — normal state (neutral color)
  - Yellow badge if data is > 90 minutes old: "Updated 92m ago"
  - Red badge if data is > 180 minutes old: "Updated 3h+ ago"
  - Tap badge to force refresh

#### Next Best Window Cards

One card per enabled mode, scrollable horizontally if more than 2 modes are enabled. Each card shows:

- **Mode label:** "Swim" / "Swim with {dog_name}" / "Run" / "Run with {dog_name}"
- **Time range:** "07:00-09:00"
- **Score:** Large number + label (e.g., "87 Perfect")
- **Top reason chip:** The single most relevant chip (e.g., "Waves calm")
- **Tap action:** Scrolls to that hour in the Planner tab

If a mode has no qualifying window today (score < 70 for all hours):
- Card shows the mode label with "--" score
- Text: "No good windows today"

#### "Now" Row

Current-hour snapshot for the user's primary mode:

- **Score** + **label** (colored by tier)
- **All reason chips** for the current hour (2-5 chips)
- If current hour is hard-gated: show "Nope" with the gate reason chip (e.g., "Heavy rain")

#### Upcoming Hours Preview

Compact list of the next 6 hours with:
- Hour label ("08:00", "09:00", ...)
- Score color dot
- Label text ("Perfect", "Good", "Meh", ...)
- Tap to open hour detail bottom sheet (same as Planner tab detail)

### Today Tab — Empty States

| Condition | Display |
|-----------|---------|
| No forecast data yet (first launch, data loading) | Skeleton shimmer cards. Text below: "Forecast is loading. The coast isn't going anywhere." |
| Forecast loaded but no good windows today | "No good windows today. Tomorrow looks better." with a button: "Check Planner" |
| User has no dog but views a dog mode card | Card not shown — only enabled modes appear. If user enables dog mode in Settings without having a dog profile, show: "Add your dog in Profile to see dog-friendly scores." |
| All modes disabled | "No activities selected. Head to Profile to pick swim or run." |

### Today Tab — Error States

| Condition | Display |
|-----------|---------|
| Network failure on initial load | Full-screen: "Couldn't load forecast." + pull-to-refresh prompt + "Check your connection" subtext |
| Network failure on refresh (cached data exists) | Show cached data + banner at top: "Offline. Showing last known forecast." |
| Stale data (> 90 min) | Yellow freshness badge. Data still shown. |
| Stale data (> 180 min) | Red freshness badge + banner: "Last update was a while ago. Data may be off." |
| API error (non-network) | "Something went wrong. Pull down to retry." |

### Today Tab — Loading States

- **Initial load:** Skeleton screen with shimmer effect on all cards and rows. Header shows immediately (static text).
- **Pull-to-refresh:** Standard Material/Cupertino refresh indicator at top. Existing data remains visible during refresh.
- **Background refresh:** No visible indicator — data updates silently. Freshness badge updates on completion.

---

## Planner Tab (7-Day Hourly Timeline)

### Purpose

Detailed hourly breakdown for the next 7 days. The power-user view for planning ahead.

### Controls Bar

- **Mode selector:** Swim / Run toggle (pill-style segmented control)
- **Sub-toggle:** Solo / With dog (smaller toggle, below or beside mode selector)
  - "With dog" option shows dog name if available: "With {dog_name}"
  - If user has no dog and taps "With dog": show tooltip "Add your dog in Profile first"
- **Preset badge:** Small chip showing current preset (e.g., "Balanced"). Tap opens preset selector bottom sheet (same as Settings preset picker). Non-intrusive — informational by default.

### Day Sections

Each day is a collapsible section:

- **Day header:** "Today", "Tomorrow", "Wednesday Jun 4", etc.
- **Day summary:** Best score for the day + time (e.g., "Best: 92 at 07:00")
- Default state: Today and Tomorrow expanded, future days collapsed

### Hour Rows

Each hour within a day section:

| Element | Description |
|---------|-------------|
| Score color bar | Vertical bar on left edge, colored by score tier (see Score Tier Colors) |
| Time | "07:00" (24h format, device local time) |
| Score + label | "87 Perfect" |
| Micro-icons | 1-2 small icons for the top contributing factors (wave, UV, AQI, wind, rain, heat) |
| Tap action | Opens hour detail bottom sheet |

#### Hard-Gated Hours ("Nope")

- Row is **dimmed** (reduced opacity to 40%)
- Score shows "0" with ~~strikethrough~~ on the label
- Gate reason shown inline: "Heavy rain" / "Wind too strong" / "Too hot for {dog_name}"
- Tap still opens detail sheet (user can see why)

### Hour Detail Bottom Sheet

Triggered by tapping any hour row. Slides up with backdrop blur.

| Section | Content |
|---------|---------|
| Score circle | Large circular display with score number (count-up animation) + label text + tier color |
| Reason chips | 2-5 chips from the scoring engine, styled by severity (check/warning/danger/info) |
| Raw data table | Key-value pairs with units |

**Raw data table fields:**

| Label | Value | Unit |
|-------|-------|------|
| Wave height | 0.5 | m |
| Wind gusts | 8 | m/s |
| Feels like | 26 | C |
| UV index | 5 | — |
| Air quality (EU AQI) | 42 | — |
| Rain probability | 10 | % |
| Rain amount | 0.0 | mm |

If a value is null/unavailable: show "--" with "(no data)" caption.

### Planner Tab — Empty States

| Condition | Display |
|-----------|---------|
| No forecast data | Full-screen: "Waiting for forecast data..." with shimmer skeleton |
| Forecast loaded, all hours are "Nope" for selected mode | Day section shows all dimmed rows. Banner at top: "Rough day for {mode}. Check other modes or try tomorrow." |
| User selects dog mode without having a dog | Show rows normally but with banner: "Add your dog in Profile to personalize dog scores." Scores use default dog thresholds. |

### Planner Tab — Error States

| Condition | Display |
|-----------|---------|
| Network failure (no cached data) | "Couldn't load forecast. Pull down to retry." |
| Network failure (cached data exists) | Banner: "Offline -- showing last known forecast" + cached data displayed |
| Partial data (some days missing) | Show available days. Missing days show: "Forecast not available for this day yet." |

### Planner Tab — Loading States

- **Initial load:** Skeleton shimmer for day sections and hour rows. Controls bar renders immediately.
- **Pull-to-refresh:** Standard refresh indicator. Existing data stays visible.
- **Day expansion:** Instant (no loading state needed — data is already in memory).

---

## Profile / Settings Tab

### Purpose

User identity, personalization, notification control, and account management.

### Layout (top to bottom)

#### Profile Basics

- **Display name:** Editable text field (tap to edit inline). Default: "Beach Buddy".
- **Dog section:**
  - If `has_dog = true`: Show dog name, size, coat, heat sensitivity — all editable.
  - If `has_dog = false`: Show "Add a dog" button. Tapping opens the dog form (same fields as onboarding screen 3).
  - Removing a dog: "Remove dog" text button at bottom of dog section. Confirmation dialog: "Remove {dog_name}? Dog mode scores will use defaults." Sets `has_dog = false` and disables `swim_dog` / `run_dog` notification toggles.

#### Preset Selector

Visual cards for each preset, vertically stacked:

| Preset | Description | Visual |
|--------|-------------|--------|
| Chill | "More go, fewer warnings. Higher tolerance for waves, heat, and AQI." | Relaxed icon/illustration |
| Balanced | "Smart defaults. The recommended starting point." | Balanced/center icon (selected by default) |
| Strict | "Only when it's really good. Lower tolerance across the board." | Shield/precise icon |

- Active preset has a highlighted border + checkmark.
- Tapping a different preset shows a confirmation: "Switch to {preset}? Your scores will update."
- On confirm: app writes new threshold values from the canonical preset-to-threshold mapping (see `02_user_profile_schema.md`) and triggers notification reschedule.
- Threshold values are **not shown** to the user in V1. The preset description is sufficient.

#### Notification Settings

- **Master toggle:** "Notifications" on/off (maps to `notification_preferences.enabled`)
- **Per-mode toggles** (shown when master is on):
  - "Swim solo" toggle
  - "Swim with {dog_name}" toggle (disabled/hidden if `has_dog = false`)
  - "Run solo" toggle
  - "Run with {dog_name}" toggle (disabled/hidden if `has_dog = false`)
- **Quiet hours:**
  - Toggle: "Quiet hours" on/off
  - When on: time pickers for start and end (default 22:00-07:00)

This section maps directly to `notification_preferences` in `02_user_profile_schema.md`.

If notification permission is denied at the OS level: show banner at top of this section: "Notifications are blocked. Tap to open Settings." with deep link to OS notification settings.

#### Privacy

- **Analytics opt-in toggle:** "Help improve Go Now" with subtext "Anonymous usage data. No personal info shared." Maps to `privacy.analytics_opt_in`.

#### Account

- **Export profile:** Button that generates and downloads the user's profile as JSON. Uses the `profile_v1` schema. Triggers a share sheet (iOS) or download (Android).
- **Delete account:** Red text button. Tapping shows a confirmation dialog:
  - Title: "Delete your account?"
  - Body: "This removes your profile, preferences, and notification history. This can't be undone."
  - Actions: "Cancel" (dismiss) / "Delete" (calls `DELETE /v1/profile`, signs out, returns to welcome screen)

#### App Info

- App version (e.g., "1.0.0")
- Scoring version (e.g., "score_v1")
- Data source: "Weather data from Open-Meteo" (tappable link to open-meteo.com)
- "Made for the Tel Aviv coast"

---

## Onboarding Flow

### Goal

Fast, premium pacing. Under 90 seconds for the full flow. Every screen has one clear action. No walls of text.

### Screen 1: Welcome

- **Headline:** "Plan the coast. Skip the guesswork."
- **Subtext:** "Hourly swim and run scores for the Tel Aviv coast."
- **Actions:** "Sign in with Google" / "Sign in with Apple" (large buttons, stacked vertically)
- **Background:** Subtle gradient or muted coastal image (no heavy imagery)

### Screen 2: Activities

- **Headline:** "What do you do at the coast?"
- **Options:** Three large tap targets:
  - "Swim" (wave icon)
  - "Run" (running icon)
  - "Both" (combined icon)
- **Minimum:** One must be selected. "Both" is pre-highlighted as default.
- **Tap behavior:** Single-tap selects, tap again deselects. "Both" toggles both swim + run.
- **Continue button** at bottom (disabled until at least one is selected).

### Screen 3: Dog?

- **Headline:** "Got a four-legged buddy?"
- **Options:** "Yes" / "No" (large buttons)
- **If "Yes":** Expand form below:
  - Dog name (text field, required, 1-30 chars)
  - Size: Small / Medium / Large (segmented control)
  - Coat: Short / Medium / Long (segmented control)
  - Heat sensitivity: Low / Medium / High (segmented control, default: Medium)
  - Subtext: "We'll use this to keep {name} safe in the heat."
- **If "No":** Continue button activates immediately. Dog mode toggles are disabled.

### Screen 4: Preset

- **Headline:** "How picky are you?"
- **Options:** Three vertically stacked cards:
  - **Chill:** "More go, fewer warnings." Subtext: "Higher tolerance for waves, heat, and AQI."
  - **Balanced:** "Smart defaults." Subtext: "The recommended starting point." (Pre-selected, subtle highlight)
  - **Strict:** "Only when it's really good." Subtext: "Lower tolerance across the board."
- **Single selection:** Tapping one deselects the others.

### Screen 5: Notifications

- **Headline:** "Want a heads-up when conditions are good?"
- **Subtext:** "We'll notify you about good windows for your activities. No spam."
- **Per-mode toggles:** Pre-defaulted based on activities selected in screen 2 + dog from screen 3:
  - If user chose "Swim" + has dog: `swim_solo = true`, `swim_dog = true`
  - If user chose "Run" + no dog: `run_solo = true`, `run_dog = false` (disabled)
  - etc.
- **OS permission request:** Triggered when user taps "Continue" with at least one toggle on. See `06_notification_spec.md` for platform-specific permission flow.
- **Skip option:** "Not now" text link below toggles. Sets `notification_preferences.enabled = false`.

### Screen 6: Done

- **Headline:** "You're set. The coast awaits."
- **Subtext:** "Your first forecast is loading."
- **Action:** "Let's go" button (transitions to Today tab)
- **Background:** Success state — brief confetti or checkmark animation (respects Reduce Motion)

---

## Animations & Transitions

### Page Transitions

| Transition | Animation | Duration |
|------------|-----------|----------|
| Navigate forward | Slide-in from right | 300ms ease-in-out |
| Navigate back | Slide-out to right | 300ms ease-in-out |
| Tab switch | Cross-fade | 200ms ease |
| Bottom sheet open | Slide-up from bottom + backdrop blur | 250ms ease-out |
| Bottom sheet close | Slide-down + backdrop clear | 200ms ease-in |
| Onboarding screens | Slide-in from right (forward flow) | 300ms ease-in-out |

### Score Animations

- **Score reveal (hour detail sheet):** Count-up animation from 0 to the actual score value. Duration: 300ms with ease-out curve. Numbers tick through intermediate values.
- **Score color:** Fades in alongside the count-up, reaching full tier color at the final value.
- **Reason chips:** Stagger-fade in after score reveal completes. Each chip fades in 100ms apart.

### Refresh Animations

- **Pull-to-refresh:** Standard Material refresh indicator (Android) / Cupertino sliver refresh (iOS). Consistent with platform conventions.
- **Data update (background):** Scores that change after a refresh do a brief pulse animation (scale 1.0 -> 1.05 -> 1.0 over 200ms) to draw attention.

### Reduce Motion

When the system "Reduce Motion" accessibility setting is enabled:
- Score count-up: disabled. Score displays instantly at final value.
- Page transitions: instant cut (no slide).
- Tab switch: instant cut (no fade).
- Chip stagger: all chips appear simultaneously.
- Pulse animation: disabled.
- Confetti on onboarding done: replaced with static checkmark.

---

## Haptics

| Action | Haptic | iOS | Android |
|--------|--------|-----|---------|
| Tab switch | Light | `UIImpactFeedbackGenerator(.light)` | `HapticFeedback.lightImpact` |
| Preset selection | Medium | `UIImpactFeedbackGenerator(.medium)` | `HapticFeedback.mediumImpact` |
| Onboarding completion | Success | `UINotificationFeedbackGenerator(.success)` | `HapticFeedback.heavyImpact` |
| Pull-to-refresh trigger | Light | `UIImpactFeedbackGenerator(.light)` | `HapticFeedback.lightImpact` |
| Toggle switch | Light | `UIImpactFeedbackGenerator(.light)` | `HapticFeedback.lightImpact` |

Haptics are disabled when the device vibration setting is off.

---

## Gestures

| Gesture | Location | Action |
|---------|----------|--------|
| Pull-to-refresh | Today tab, Planner tab | Refresh forecast data |
| Horizontal swipe | Planner tab day sections | Swipe between days (left = next day, right = previous day) |
| Tap hour row | Planner tab | Open hour detail bottom sheet |
| Tap "Next best window" card | Today tab | Navigate to Planner tab, scrolled to that hour |
| Long-press hour row | Planner tab | Show tooltip: "Share coming in a future update" (V1.1 quick-share) |
| Swipe down on bottom sheet | Hour detail sheet | Dismiss the sheet |
| Tap backdrop | Hour detail sheet | Dismiss the sheet |

---

## Color System

### Dark Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0D1117` | App background, scaffold |
| Surface | `#161B22` | Tab bar, navigation areas |
| Card | `#1C2128` | Cards, elevated containers |
| Text Primary | `#E6EDF3` | Headlines, scores, primary content |
| Text Secondary | `#8B949E` | Timestamps, captions, secondary info |
| Divider | `#30363D` | Section separators, card borders |
| Input Background | `#21262D` | Text fields, toggle tracks (off state) |

### Light Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#FFFFFF` | App background, scaffold |
| Surface | `#F6F8FA` | Tab bar, navigation areas |
| Card | `#FFFFFF` | Cards (with subtle shadow: 0 1px 3px rgba(0,0,0,0.08)) |
| Text Primary | `#1F2328` | Headlines, scores, primary content |
| Text Secondary | `#656D76` | Timestamps, captions, secondary info |
| Divider | `#D0D7DE` | Section separators, card borders |
| Input Background | `#F6F8FA` | Text fields, toggle tracks (off state) |

### Score Tier Colors (Both Modes)

These colors are designed for high contrast against both dark and light backgrounds. They are the same in both modes.

| Tier | Score Range | Label | Hex | Usage |
|------|------------|-------|-----|-------|
| Perfect | 85-100 | "Perfect" | `#2DA44E` | Score text, color bar, card accent |
| Good | 70-84 | "Good" | `#57AB5A` | Score text, color bar, card accent |
| Meh | 45-69 | "Meh" | `#D29922` | Score text, color bar, card accent |
| Bad | 20-44 | "Bad" | `#E16F24` | Score text, color bar, card accent |
| Nope | 0-19 | "Nope" | `#F85149` | Score text, color bar, card accent |

### Freshness Badge Colors

| State | Condition | Color |
|-------|-----------|-------|
| Fresh | Data < 90 min old | Text Secondary (neutral) |
| Stale | Data 90-180 min old | `#D29922` (amber) |
| Very stale | Data > 180 min old | `#F85149` (red) |

### Chip Colors

Reason chips use a subtle background tint based on their severity:

| Emoji/Severity | Background (dark mode) | Background (light mode) | Text |
|----------------|----------------------|------------------------|------|
| `check` (positive) | `#2DA44E` at 15% opacity | `#2DA44E` at 10% opacity | `#2DA44E` |
| `warning` (moderate) | `#D29922` at 15% opacity | `#D29922` at 10% opacity | `#D29922` |
| `danger` (severe) | `#F85149` at 15% opacity | `#F85149` at 10% opacity | `#F85149` |
| `info` (neutral/missing data) | `#8B949E` at 15% opacity | `#656D76` at 10% opacity | Text Secondary |

---

## Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 32sp | Semibold (600) | Score number in hour detail sheet |
| H1 | 24sp | Semibold (600) | Section titles ("Tel Aviv Coast", day headers) |
| H2 | 20sp | Medium (500) | Card titles ("Next best window", mode labels) |
| Body | 16sp | Regular (400) | Descriptions, raw data values, onboarding text |
| Caption | 14sp | Regular (400) | Timestamps, secondary info, "Updated Xm ago" |
| Chip | 13sp | Medium (500) | Reason chip text |
| Overline | 12sp | Medium (500) | Preset badge, small labels |

**Font family:** System default.
- iOS: SF Pro (SF Pro Display for Display/H1, SF Pro Text for Body and smaller)
- Android: Roboto

**Line height:** 1.4x for body text, 1.2x for headlines, 1.0x for display scores.

---

## Accessibility

### Contrast

- WCAG AA compliance: minimum 4.5:1 contrast ratio for normal text, 3:1 for large text (>= 18sp or >= 14sp bold).
- All score tier colors meet 4.5:1 against both dark and light mode backgrounds.
- Chip text colors meet 4.5:1 against their respective chip backgrounds.

### Tap Targets

- Minimum tap target size: **44x44pt** on both platforms (Apple HIG and Material guidelines).
- Hour rows in Planner: full-width tap target, minimum 48pt height.
- Toggle switches: 44x44pt minimum.
- Onboarding buttons: 48pt height minimum, full-width.

### Screen Readers (VoiceOver / TalkBack)

| Element | Announcement |
|---------|-------------|
| Score card (Today tab) | "{mode}: score {N}, {label}. {reason1}, {reason2}." Example: "Swim solo: score 87, Perfect. Waves calm, nice temperature." |
| Hour row (Planner) | "{time}: score {N}, {label}. {icon1}, {icon2}." Example: "7 AM: score 92, Perfect. Low waves, good air quality." |
| Preset card | "{preset name}. {description}. {selected/not selected}." |
| Score color bar | Not announced (decorative, color info is in the label text) |
| Freshness badge | "Data updated {X} minutes ago" / "Data is stale, updated {X} hours ago" |
| Hard-gated hour | "{time}: not recommended. {gate reason}." Example: "2 PM: not recommended. Heavy rain." |
| Notification toggle | "{mode} notifications, {on/off}." |

### Dynamic Type

- All text scales with the system Dynamic Type / font size setting.
- Layout reflows at larger text sizes: cards stack vertically, hour rows expand height.
- Score display (Display size) has a maximum cap at 48sp to prevent layout overflow.
- Tested at: Default, Large, Extra Large, AX1, AX3 sizes.

### Reduce Motion

See the Animations section. All animations respect the system "Reduce Motion" setting.

### Color Independence

- Score tiers always show **text labels** ("Perfect", "Good", "Meh", "Bad", "Nope") alongside color. Color is never the sole indicator.
- Reason chips include text content; the severity icon/color is supplementary.
- Charts and color bars include text or pattern alternatives for color-blind users.

---

## Microcopy

The voice of Go Now: confident, concise, occasionally funny. Never sarcastic, never condescending. Humor is dry and understated.

### Score-Based Microcopy (Today Tab "Vibe" Line)

**Perfect day (85-100):**
1. "The coast is calling. Go now."
2. "Sea glass smooth. You know what to do."
3. "If the ocean could text, it'd say 'come over.'"

**Good day (70-84):**
4. "Pretty good out there. A few things to know."
5. "Not bad at all. Check the details."

**Meh day (45-69):**
6. "Could go either way. Your call."
7. "Meh, but you've seen worse."

**Bad day (20-44):**
8. "Hard pass today. Netflix won't judge."
9. "The coast says not today. Trust it."

**Nope day (0-19):**
10. "Somewhere between 'no' and 'absolutely not.'"

### Dog-Specific Microcopy

11. "Paws off the pavement -- too hot for {dog_name}."
12. "{dog_name} says: early morning or bust."
13. "Safe for paws. Go get sandy."

### Data State Microcopy

**Stale data:**
14. "Last update was a while ago. Data may be off."

**Loading / empty:**
15. "Forecast is loading. The coast isn't going anywhere."

### Microcopy Selection Logic

- The "vibe" line on the Today tab is selected based on the **best score across enabled modes** for the current hour.
- One line is chosen at random from the pool for the matching tier.
- The line refreshes when data is updated or the hour changes (not on every screen visit — prevent jarring changes).
- Dog-specific lines are used only when a dog mode is the top-scoring enabled mode.

---

## Preset Descriptions

Used in onboarding (screen 4) and Profile/Settings tab. These describe intent, not numbers. Actual threshold values are in `02_user_profile_schema.md`.

| Preset | Tagline | Description |
|--------|---------|-------------|
| Chill | "More go, fewer warnings." | Higher tolerance for waves, heat, and AQI. You'll get more "Good" windows. Best for experienced swimmers/runners who can handle imperfect conditions. |
| Balanced | "Smart defaults." | The recommended starting point. Works for most people. Scores reflect what a typical beachgoer would consider comfortable. |
| Strict | "Only when it's really good." | Lower tolerance across the board. Fewer "Good" windows, but when it says go, conditions are genuinely great. Best for cautious users or those with health sensitivities. |

---

## Offline Mode

### Cached Data Behavior

- The app caches the last successfully fetched forecast in local storage.
- On network failure, the app displays cached data with a visible offline indicator.

### Offline Indicators

| Location | Indicator |
|----------|-----------|
| Today tab | Banner below header: "Offline -- showing last known forecast" (grey background) |
| Planner tab | Same banner below controls bar |
| Profile tab | No offline banner (profile is always local) |

### Offline Limitations

- Pull-to-refresh shows error: "No connection. Try again later."
- Notification scheduling uses cached data (scores may be outdated).
- Freshness badge continues to age (will turn yellow/red as data gets stale).
- Preset changes work offline (threshold update is local). Profile syncs to Firestore when connectivity returns.

---

## Platform-Specific Notes

### iOS

- Use Cupertino-style navigation where appropriate (large titles, swipe-back gesture).
- Tab bar at bottom (standard iOS).
- Bottom sheets use iOS modal presentation style (grabber handle at top).
- Status bar: light content on dark mode, dark content on light mode.
- Safe area insets respected on all screens (notch, Dynamic Island, home indicator).

### Android

- Use Material 3 components (Material You theming on Android 12+).
- Tab bar at bottom (Material 3 navigation bar).
- Bottom sheets use Material BottomSheet with drag handle.
- Edge-to-edge rendering with system bar insets.
- Predictive back gesture support (Android 14+).
- Notification channels created per mode (see `06_notification_spec.md`).

### Shared

- Both platforms use the same color system, typography scale, and layout structure.
- Adaptive icons/styling handled by Flutter's platform-aware widgets.
- Minimum supported: iOS 15+, Android 8.0+ (API 26+).

---

## Screen Inventory

Complete list of all screens and states for implementation tracking:

| # | Screen | States |
|---|--------|--------|
| 1 | Onboarding: Welcome | Default |
| 2 | Onboarding: Activities | Default, at least one selected, none selected (continue disabled) |
| 3 | Onboarding: Dog | No (collapsed), Yes (form expanded), form validation error |
| 4 | Onboarding: Preset | Default (Balanced selected), other selected |
| 5 | Onboarding: Notifications | Toggles on, toggles off, OS permission dialog, permission denied |
| 6 | Onboarding: Done | Default, loading first forecast |
| 7 | Today tab | Loaded, loading (skeleton), empty (no good windows), error (network), stale data, offline (cached), all modes disabled |
| 8 | Planner tab | Loaded, loading (skeleton), empty (no data), error (network), offline (cached), no dog (dog toggle message), all hours nope |
| 9 | Hour detail sheet | Loaded, hard-gated hour, missing data fields |
| 10 | Profile tab | Default, editing name, editing dog, no dog, notification permission denied banner |
| 11 | Preset selector | Default, confirmation dialog on change |
| 12 | Delete account dialog | Confirmation, deleting (loading), error |
| 13 | Export profile | Share sheet / download initiated |
