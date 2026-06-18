import Foundation

enum ActivityMode: String, CaseIterable, Codable, Identifiable {
    case swimSolo = "swim_solo"
    case swimDog = "swim_dog"
    case runSolo = "run_solo"
    case runDog = "run_dog"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .swimSolo: "Swim"
        case .swimDog: "Swim + Dog"
        case .runSolo: "Run"
        case .runDog: "Run + Dog"
        }
    }

    var compactTitle: String {
        switch self {
        case .swimSolo: "Swim"
        case .swimDog: "Dog swim"
        case .runSolo: "Run"
        case .runDog: "Dog run"
        }
    }

    var symbolName: String {
        switch self {
        case .swimSolo: "figure.pool.swim"
        case .swimDog: "pawprint.fill"
        case .runSolo: "figure.run"
        case .runDog: "figure.walk.motion"
        }
    }
}

enum ScoreLabel: String, CaseIterable, Codable {
    case perfect = "Perfect"
    case good = "Good"
    case meh = "Meh"
    case bad = "Bad"
    case nope = "Nope"

    var accessibilitySummary: String {
        switch self {
        case .perfect: "Perfect conditions"
        case .good: "Good conditions"
        case .meh: "Mixed conditions"
        case .bad: "Poor conditions"
        case .nope: "Not recommended"
        }
    }

    static func label(for score: Int) -> ScoreLabel {
        switch score {
        case 85...100: .perfect
        case 70..<85: .good
        case 45..<70: .meh
        case 20..<45: .bad
        default: .nope
        }
    }
}

enum ReasonSeverity: String, Codable {
    case check
    case warning
    case danger
    case info
}

struct ReasonChip: Decodable, Hashable, Identifiable {
    var id: String { "\(factor)-\(text)-\(penalty)" }
    let factor: String
    let text: String
    let emoji: ReasonSeverity
    let penalty: Int
}

struct ModeScore: Decodable, Hashable {
    let score: Int
    let label: ScoreLabel
    let reasons: [ReasonChip]
    let hardGated: Bool

    enum CodingKeys: String, CodingKey {
        case score
        case label
        case reasons
        case hardGated = "hard_gated"
    }
}

struct ModeScores: Decodable, Hashable {
    let swimSolo: ModeScore
    let swimDog: ModeScore
    let runSolo: ModeScore
    let runDog: ModeScore

    enum CodingKeys: String, CodingKey {
        case swimSolo = "swim_solo"
        case swimDog = "swim_dog"
        case runSolo = "run_solo"
        case runDog = "run_dog"
    }

    subscript(mode: ActivityMode) -> ModeScore {
        switch mode {
        case .swimSolo: swimSolo
        case .swimDog: swimDog
        case .runSolo: runSolo
        case .runDog: runDog
        }
    }
}

struct ScoredHour: Decodable, Hashable, Identifiable {
    var id: Date { hourUtc }

    let hourUtc: Date
    let waveHeightM: Double?
    let wavePeriodS: Double?
    let airTempC: Double?
    let feelslikeC: Double?
    let windMs: Double?
    let gustMs: Double?
    let precipProbPct: Int?
    let precipMm: Double?
    let uvIndex: Double?
    let euAqi: Int?
    let pm10: Double?
    let pm25: Double?
    let scores: ModeScores

    enum CodingKeys: String, CodingKey {
        case hourUtc = "hour_utc"
        case waveHeightM = "wave_height_m"
        case wavePeriodS = "wave_period_s"
        case airTempC = "air_temp_c"
        case feelslikeC = "feelslike_c"
        case windMs = "wind_ms"
        case gustMs = "gust_ms"
        case precipProbPct = "precip_prob_pct"
        case precipMm = "precip_mm"
        case uvIndex = "uv_index"
        case euAqi = "eu_aqi"
        case pm10
        case pm25 = "pm2_5"
        case scores
    }
}

struct DailySunTime: Decodable, Hashable, Identifiable {
    var id: String { date }
    let date: String
    let sunriseUtc: Date
    let sunsetUtc: Date

    enum CodingKeys: String, CodingKey {
        case date
        case sunriseUtc = "sunrise_utc"
        case sunsetUtc = "sunset_utc"
    }
}

struct ScoredForecast: Decodable, Hashable {
    let areaId: String
    let updatedAtUtc: Date
    let provider: String
    let freshness: String
    let forecastAgeMinutes: Int
    let horizonDays: Int
    let scoringVersion: String
    let hours: [ScoredHour]
    let daily: [DailySunTime]

    enum CodingKeys: String, CodingKey {
        case areaId = "area_id"
        case updatedAtUtc = "updated_at_utc"
        case provider
        case freshness
        case forecastAgeMinutes = "forecast_age_minutes"
        case horizonDays = "horizon_days"
        case scoringVersion = "scoring_version"
        case hours
        case daily
    }
}

extension JSONDecoder {
    static var goNowAPI: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            if let date = GoNowDateParser.parse(value) {
                return date
            }
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Invalid ISO-8601 date: \(value)")
            )
        }
        return decoder
    }
}

enum GoNowDateParser {
    static func parse(_ value: String) -> Date? {
        DateFormatter.goNowMicroseconds.date(from: value)
            ?? DateFormatter.goNowMilliseconds.date(from: value)
            ?? ISO8601DateFormatter.goNowFractional.date(from: value)
            ?? ISO8601DateFormatter.goNow.date(from: value)
    }
}

private extension ISO8601DateFormatter {
    static let goNow: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let goNowFractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

private extension DateFormatter {
    static let goNowMicroseconds: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"
        return formatter
    }()

    static let goNowMilliseconds: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX"
        return formatter
    }()
}
