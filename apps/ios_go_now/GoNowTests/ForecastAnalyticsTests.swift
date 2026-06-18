import XCTest
@testable import GoNow

final class ForecastAnalyticsTests: XCTestCase {
    func testCurrentHourUsesLatestHourNotAfterNow() {
        let now = ISO8601DateFormatter().date(from: "2026-06-18T07:30:00Z")!

        let hour = ForecastAnalytics.currentHour(in: TestFixtures.forecast, now: now)

        XCTAssertEqual(hour?.hourUtc, ISO8601DateFormatter().date(from: "2026-06-18T07:00:00Z"))
    }

    func testUpcomingHoursSkipsPastHours() {
        let now = ISO8601DateFormatter().date(from: "2026-06-18T06:30:00Z")!

        let hours = ForecastAnalytics.upcomingHours(in: TestFixtures.forecast, now: now, limit: 2)

        XCTAssertEqual(hours.map(\.hourUtc), [
            ISO8601DateFormatter().date(from: "2026-06-18T07:00:00Z")!,
            ISO8601DateFormatter().date(from: "2026-06-18T08:00:00Z")!
        ])
    }

    func testBestWindowUsesBestContiguousGoodAverage() {
        let now = ISO8601DateFormatter().date(from: "2026-06-18T05:30:00Z")!

        let window = ForecastAnalytics.bestWindow(in: TestFixtures.forecast, mode: .swimSolo, now: now)

        XCTAssertEqual(window?.startHour.hourUtc, ISO8601DateFormatter().date(from: "2026-06-18T06:00:00Z"))
        XCTAssertEqual(window?.endHour.hourUtc, ISO8601DateFormatter().date(from: "2026-06-18T08:00:00Z"))
        XCTAssertEqual(window?.averageScore, 85)
        XCTAssertEqual(window?.label, .perfect)
    }

    func testDaysGroupByJerusalemCalendarDay() {
        let now = ISO8601DateFormatter().date(from: "2026-06-18T05:00:00Z")!

        let days = ForecastAnalytics.days(in: TestFixtures.forecast, now: now)

        XCTAssertEqual(days.count, 2)
        XCTAssertEqual(days.first?.title, "Today")
        XCTAssertEqual(days.first?.hours.count, 5)
    }
}
