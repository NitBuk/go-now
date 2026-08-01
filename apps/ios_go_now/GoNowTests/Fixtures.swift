import Foundation
@testable import GoNow

enum TestFixtures {
    static var forecastJSON: Data {
        """
        {
          "area_id": "tel_aviv_coast",
          "updated_at_utc": "2026-06-18T05:30:00.066482+00:00",
          "provider": "open_meteo",
          "freshness": "fresh",
          "forecast_age_minutes": 12,
          "horizon_days": 7,
          "scoring_version": "score_v2",
          "daily": [
            {
              "date": "2026-06-18",
              "sunrise_utc": "2026-06-18T02:32:00+00:00",
              "sunset_utc": "2026-06-18T16:52:00+00:00"
            }
          ],
          "hours": [
            \(hourJSON("2026-06-18T05:00:00Z", swim: 66, label: "Meh")),
            \(hourJSON("2026-06-18T06:00:00Z", swim: 88, label: "Perfect")),
            \(hourJSON("2026-06-18T07:00:00Z", swim: 92, label: "Perfect")),
            \(hourJSON("2026-06-18T08:00:00Z", swim: 76, label: "Good")),
            \(hourJSON("2026-06-18T09:00:00Z", swim: 42, label: "Bad")),
            \(hourJSON("2026-06-19T06:00:00Z", swim: 80, label: "Good"))
          ]
        }
        """.data(using: .utf8)!
    }

    static var forecast: ScoredForecast {
        try! JSONDecoder.goNowAPI.decode(ScoredForecast.self, from: forecastJSON)
    }

    static var healthJSON: Data {
        """
        {
          "status": "healthy",
          "version": "1.0.0",
          "scoring_version": "score_v2",
          "forecast": {
            "area_id": "tel_aviv_coast",
            "updated_at_utc": "2026-06-18T05:30:00.066482+00:00",
            "age_minutes": 12,
            "freshness": "fresh",
            "ingest_status": "success",
            "hours_count": 168
          },
          "timestamp_utc": "2026-06-18T05:42:00+00:00"
        }
        """.data(using: .utf8)!
    }

    static func hourJSON(_ hour: String, swim: Int, label: String) -> String {
        """
        {
          "hour_utc": "\(hour)",
          "wave_height_m": 0.4,
          "wave_period_s": 5.2,
          "air_temp_c": 24.0,
          "feelslike_c": 25.0,
          "wind_ms": 3.0,
          "gust_ms": 5.0,
          "precip_prob_pct": 10,
          "precip_mm": 0.0,
          "uv_index": 4.0,
          "eu_aqi": 42,
          "pm10": 18.0,
          "pm2_5": 8.0,
          "scores": {
            "swim_solo": \(scoreJSON(swim, label)),
            "swim_dog": \(scoreJSON(max(swim - 3, 0), label)),
            "run_solo": \(scoreJSON(84, "Good")),
            "run_dog": \(scoreJSON(78, "Good"))
          }
        }
        """
    }

    static func scoreJSON(_ score: Int, _ label: String) -> String {
        """
        {
          "score": \(score),
          "label": "\(label)",
          "hard_gated": false,
          "reasons": [
            {"factor": "waves", "text": "Waves calm", "emoji": "check", "penalty": 0},
            {"factor": "uv", "text": "UV manageable", "emoji": "info", "penalty": -3}
          ]
        }
        """
    }
}
