# TestFlight Release

This app is ready for Apple distribution once the repository owner has an active Apple Developer Program membership and selects that paid team in Xcode.

## Apple Account Prerequisites

- Active Apple Developer Program membership.
- The paid development team added in Xcode under Settings > Accounts.
- An Apple Distribution certificate managed by Xcode.
- An App Store Connect app record using bundle ID `com.nitbuk.gonow`.

## App Store Connect Record

Create an iOS app with these values:

- Name: `Go Now`
- Primary language: English
- Bundle ID: `com.nitbuk.gonow`
- SKU: `go-now-ios`
- Category: Weather

The first beta uses version `0.1.0`, build `1`, and requires iOS 17 or later.

## Archive And Upload

1. Open `GoNow.xcodeproj` in Xcode.
2. Select the `GoNow` target and the paid team under Signing & Capabilities.
3. Select Any iOS Device (arm64) as the run destination.
4. Choose Product > Archive.
5. In Organizer, choose Distribute App > App Store Connect > Upload.

The app only uses Apple-provided HTTPS networking and declares that it does not use non-exempt encryption.

## TestFlight Notes

Suggested beta description:

> Native Go Now forecast experience for Tel Aviv Coast. Check current swim, run, and dog-walk scores; inspect best windows and hourly conditions; compare seven-day metrics; and view service status and scoring guidance.

Suggested testing focus:

- Forecast refresh and offline/stale states.
- Today mode switching and day detail charts.
- Planner day expansion and hour detail sheets.
- Status, Formula, and About screens.
- Light and dark appearance on small and large iPhones.

## Before Each Upload

- Increment `CURRENT_PROJECT_VERSION` for every uploaded build.
- Keep `MARKETING_VERSION` aligned with the App Store Connect version.
- Run the unit tests and a Release archive build.
- Confirm the production API health endpoint is healthy.
- Test on a physical iPhone before inviting external testers.
