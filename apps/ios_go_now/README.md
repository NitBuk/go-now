# Go Now iOS

Native SwiftUI client for Go Now. The first release is scoped to native parity with the current public web dashboard and uses the backend scored forecast contract as the source of truth.

## Scope

- iOS 17+ SwiftUI app.
- Public forecast experience only: Today, Planner, Profile/settings-lite.
- API scoring via `GET /v1/public/scores?area_id=tel_aviv_coast&days=7`.
- No Firebase auth, user profiles, push notifications, or on-device scoring in the first release.

## Run

Open `GoNow.xcodeproj` in Xcode and run the `GoNow` scheme on an iPhone simulator.

The app defaults to:

```text
https://api-fastapi-841486153499.europe-west1.run.app
```

For local API development, pass a launch argument:

```text
--api-base-url http://localhost:8080
```

or set:

```text
GO_NOW_API_BASE_URL=http://localhost:8080
```

## Architecture

- `App`: root tab shell and navigation.
- `Domain`: scored forecast models and forecast analytics.
- `Networking`: typed URLSession API client and error envelope mapping.
- `State`: observable forecast loading/cache state.
- `DesignSystem`: shared score colors, cards, chips, loading/empty states.
- `Features`: Today, Planner, Profile/settings-lite views.

The web app remains a lightly maintained public demo/status client over the same scored API contract.
