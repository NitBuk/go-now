# Execution Order (MVP)

A practical build order to keep momentum and reduce rework.

1) **Ingest worker**
   - Fetch provider forecast hourly
   - Write raw JSON to Cloud Storage
   - Normalize rows to BigQuery
   - Update Firestore serving doc: `forecasts/tel_aviv_coast`

2) **Public API**
   - `GET /v1/public/forecast`
   - `GET /v1/public/health`

3) **Flutter UI (raw)**
   - Fetch public forecast
   - Render 7-day hourly timeline (raw values)

4) **Scoring engine (on-device)**
   - Compute 4 mode scores + labels + reason chips
   - Render scored timeline

5) **Onboarding + presets**
   - Google/Apple sign-in
   - Chill/Balanced/Strict preset selection
   - Dog profile (optional)
   - Save profile locally + to Firestore (private endpoints)

6) **Local notifications**
   - Compute best windows (>=60 minutes)
   - Schedule 24–48h notifications
   - Reschedule on forecast update

7) **Next.js dashboard (public)**
   - Freshness + ingest status
   - Forecast explorer charts from BigQuery (API fallback)
   - Data quality page
   - Architecture page

8) **Private profile endpoints**
   - `GET/POST/DELETE /v1/profile`
   - Export profile JSON (V1.1 optional)

9) **Polish + release**
   - App store metadata, screenshots
   - Monitoring alerts + cost controls
