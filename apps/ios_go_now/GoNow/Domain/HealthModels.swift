import Foundation

enum SystemHealthStatus: String, Decodable {
    case healthy
    case degraded
    case unhealthy
}

enum ForecastFreshness: String, Decodable {
    case fresh
    case stale
}

struct HealthForecast: Decodable, Hashable {
    let areaId: String
    let updatedAtUtc: Date?
    let ageMinutes: Int
    let freshness: ForecastFreshness
    let ingestStatus: String
    let hoursCount: Int

    enum CodingKeys: String, CodingKey {
        case areaId = "area_id"
        case updatedAtUtc = "updated_at_utc"
        case ageMinutes = "age_minutes"
        case freshness
        case ingestStatus = "ingest_status"
        case hoursCount = "hours_count"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        areaId = try container.decode(String.self, forKey: .areaId)
        ageMinutes = try container.decode(Int.self, forKey: .ageMinutes)
        freshness = try container.decode(ForecastFreshness.self, forKey: .freshness)
        ingestStatus = try container.decode(String.self, forKey: .ingestStatus)
        hoursCount = try container.decode(Int.self, forKey: .hoursCount)

        let updatedString = try container.decode(String.self, forKey: .updatedAtUtc)
        if updatedString.isEmpty {
            updatedAtUtc = nil
        } else if let parsed = GoNowDateParser.parse(updatedString) {
            updatedAtUtc = parsed
        } else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath + [CodingKeys.updatedAtUtc], debugDescription: "Invalid ISO-8601 date: \(updatedString)")
            )
        }
    }
}

struct HealthResponse: Decodable, Hashable {
    let status: SystemHealthStatus
    let version: String
    let scoringVersion: String
    let forecast: HealthForecast
    let timestampUtc: Date

    enum CodingKeys: String, CodingKey {
        case status
        case version
        case scoringVersion = "scoring_version"
        case forecast
        case timestampUtc = "timestamp_utc"
    }
}
