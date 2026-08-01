import XCTest
@testable import GoNow

final class GoNowTests: XCTestCase {
    func testDecodesScoredForecastContract() throws {
        let forecast = try JSONDecoder.goNowAPI.decode(ScoredForecast.self, from: TestFixtures.forecastJSON)

        XCTAssertEqual(forecast.areaId, "tel_aviv_coast")
        XCTAssertEqual(forecast.scoringVersion, "score_v2")
        XCTAssertEqual(forecast.hours.count, 6)
        XCTAssertEqual(forecast.hours[1].scores[.swimSolo].score, 88)
        XCTAssertEqual(forecast.hours[1].scores[.swimSolo].label, .perfect)
        XCTAssertEqual(forecast.hours[1].pm25, 8.0)
    }

    func testModeLabelsMatchProductCopy() {
        XCTAssertEqual(ActivityMode.swimSolo.title, "Swim")
        XCTAssertEqual(ActivityMode.swimDog.title, "Swim + Dog")
        XCTAssertEqual(ActivityMode.runSolo.title, "Run")
        XCTAssertEqual(ActivityMode.runDog.title, "Run + Dog")
    }

    func testFreshnessThresholds() {
        XCTAssertEqual(ForecastAnalytics.freshnessState(ageMinutes: 89), .fresh)
        XCTAssertEqual(ForecastAnalytics.freshnessState(ageMinutes: 90), .stale)
        XCTAssertEqual(ForecastAnalytics.freshnessState(ageMinutes: 180), .veryStale)
    }

    func testDecodesHealthContract() throws {
        let health = try JSONDecoder.goNowAPI.decode(HealthResponse.self, from: TestFixtures.healthJSON)

        XCTAssertEqual(health.status, .healthy)
        XCTAssertEqual(health.version, "1.0.0")
        XCTAssertEqual(health.scoringVersion, "score_v2")
        XCTAssertEqual(health.forecast.areaId, "tel_aviv_coast")
        XCTAssertEqual(health.forecast.hoursCount, 168)
        XCTAssertEqual(health.forecast.freshness, .fresh)
        XCTAssertNotNil(health.forecast.updatedAtUtc)
    }

    func testForecastMetricExtractsAndFormatsValues() {
        let hour = TestFixtures.forecast.hours[1]

        XCTAssertEqual(ForecastMetric.score.value(in: hour, mode: .swimSolo), 88)
        XCTAssertEqual(ForecastMetric.temperature.formatted(ForecastMetric.temperature.value(in: hour, mode: .swimSolo)), "25°")
        XCTAssertEqual(ForecastMetric.waves.formatted(ForecastMetric.waves.value(in: hour, mode: .swimSolo)), "0.4m")
        XCTAssertEqual(ForecastMetric.rain.formatted(ForecastMetric.rain.value(in: hour, mode: .swimSolo)), "10%")
    }

    func testDayMetricSummaryUsesMetricRangeAndBestScore() {
        let day = ForecastAnalytics.days(in: TestFixtures.forecast, now: TestFixtures.forecast.hours[0].hourUtc).first!
        let summary = day.metricSummary(for: .score, mode: .swimSolo)

        XCTAssertEqual(summary.min, 42)
        XCTAssertEqual(summary.max, 92)
        XCTAssertEqual(summary.bestScore, 92)
        XCTAssertEqual(summary.bestLabel, .perfect)
        XCTAssertEqual(summary.bestHour?.hourUtc, TestFixtures.forecast.hours[2].hourUtc)
    }
}
