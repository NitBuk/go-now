import Foundation
import Combine

@MainActor
final class ForecastStore: ObservableObject {
    private let client: ForecastFetching
    @Published private(set) var state: ForecastLoadState = .idle
    @Published private(set) var lastRefresh: Date?

    init(client: ForecastFetching) {
        self.client = client
    }

    var forecast: ScoredForecast? {
        if case .loaded(let forecast) = state { return forecast }
        if case .refreshing(let forecast) = state { return forecast }
        if case .failed(_, let cached) = state { return cached }
        return nil
    }

    func loadIfNeeded() async {
        guard case .idle = state else { return }
        await refresh()
    }

    func refresh() async {
        let cached = forecast
        state = cached.map(ForecastLoadState.refreshing) ?? .loading
        do {
            let forecast = try await client.fetchScores(days: 7)
            lastRefresh = .now
            state = .loaded(forecast)
        } catch is CancellationError {
            return
        } catch {
            state = .failed(message: error.localizedDescription, cached: cached)
        }
    }
}

enum ForecastLoadState {
    case idle
    case loading
    case refreshing(ScoredForecast)
    case loaded(ScoredForecast)
    case failed(message: String, cached: ScoredForecast?)
}

extension ForecastStore {
    static var previewLoaded: ForecastStore {
        let store = ForecastStore(client: PreviewForecastClient(result: .success(.preview)))
        store.state = .loaded(.preview)
        return store
    }
}

struct PreviewForecastClient: ForecastFetching {
    let result: Result<ScoredForecast, Error>

    func fetchScores(days: Int) async throws -> ScoredForecast {
        try result.get()
    }
}

extension ScoredForecast {
    static var preview: ScoredForecast {
        try! JSONDecoder.goNowAPI.decode(ScoredForecast.self, from: previewJSON)
    }

    private static var previewJSON: Data {
        """
        {
          "area_id": "tel_aviv_coast",
          "updated_at_utc": "2026-06-18T05:30:00Z",
          "provider": "open_meteo",
          "freshness": "fresh",
          "forecast_age_minutes": 12,
          "horizon_days": 7,
          "scoring_version": "score_v2",
          "daily": [],
          "hours": [
            \(previewHour("2026-06-18T05:00:00Z", swim: 88, label: "Perfect")),
            \(previewHour("2026-06-18T06:00:00Z", swim: 92, label: "Perfect")),
            \(previewHour("2026-06-18T07:00:00Z", swim: 76, label: "Good")),
            \(previewHour("2026-06-18T08:00:00Z", swim: 61, label: "Meh")),
            \(previewHour("2026-06-18T09:00:00Z", swim: 35, label: "Bad")),
            \(previewHour("2026-06-18T10:00:00Z", swim: 0, label: "Nope"))
          ]
        }
        """.data(using: .utf8)!
    }

    private static func previewHour(_ hour: String, swim: Int, label: String) -> String {
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
            "swim_solo": \(previewScore(swim, label)),
            "swim_dog": \(previewScore(max(swim - 3, 0), label)),
            "run_solo": \(previewScore(84, "Good")),
            "run_dog": \(previewScore(78, "Good"))
          }
        }
        """
    }

    private static func previewScore(_ score: Int, _ label: String) -> String {
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
