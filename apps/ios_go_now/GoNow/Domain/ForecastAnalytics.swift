import Foundation

struct BestWindow: Hashable {
    let startHour: ScoredHour
    let endHour: ScoredHour
    let averageScore: Int
    let label: ScoreLabel
    let lengthHours: Int
}

struct DayForecast: Identifiable, Hashable {
    var id: Date { startOfDay }
    let startOfDay: Date
    let title: String
    let hours: [ScoredHour]

    func bestScore(for mode: ActivityMode) -> ModeScore? {
        hours.max { $0.scores[mode].score < $1.scores[mode].score }?.scores[mode]
    }

    func bestHour(for mode: ActivityMode) -> ScoredHour? {
        hours.max { $0.scores[mode].score < $1.scores[mode].score }
    }
}

enum ForecastAnalytics {
    static let goNowCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Jerusalem") ?? .current
        return calendar
    }()

    static func currentHour(in forecast: ScoredForecast, now: Date = .now) -> ScoredHour? {
        forecast.hours.last { $0.hourUtc <= now } ?? forecast.hours.first
    }

    static func upcomingHours(in forecast: ScoredForecast, now: Date = .now, limit: Int = 6) -> [ScoredHour] {
        forecast.hours.filter { $0.hourUtc >= now }.prefix(limit).map { $0 }
    }

    static func nextDayHours(in forecast: ScoredForecast, now: Date = .now) -> [ScoredHour] {
        let lowerBound = now.addingTimeInterval(-3600)
        let upperBound = now.addingTimeInterval(24 * 3600)
        return forecast.hours.filter { $0.hourUtc >= lowerBound && $0.hourUtc <= upperBound }
    }

    static func bestWindow(in forecast: ScoredForecast, mode: ActivityMode, now: Date = .now) -> BestWindow? {
        let futureHours = forecast.hours.filter { $0.hourUtc > now }
        var bestStart: Int?
        var bestEnd: Int?
        var bestAverage = 0.0
        var currentStart: Int?

        for index in 0...futureHours.count {
            let score = index < futureHours.count ? futureHours[index].scores[mode].score : 0
            if score >= 70 {
                currentStart = currentStart ?? index
            } else if let start = currentStart {
                let window = futureHours[start..<index]
                let average = Double(window.map { $0.scores[mode].score }.reduce(0, +)) / Double(window.count)
                if average > bestAverage {
                    bestStart = start
                    bestEnd = index - 1
                    bestAverage = average
                }
                currentStart = nil
            }
        }

        guard let bestStart, let bestEnd else { return nil }
        let averageScore = Int(bestAverage.rounded())
        return BestWindow(
            startHour: futureHours[bestStart],
            endHour: futureHours[bestEnd],
            averageScore: averageScore,
            label: ScoreLabel.label(for: averageScore),
            lengthHours: bestEnd - bestStart + 1
        )
    }

    static func days(in forecast: ScoredForecast, now: Date = .now) -> [DayForecast] {
        let grouped = Dictionary(grouping: forecast.hours) { hour in
            goNowCalendar.startOfDay(for: hour.hourUtc)
        }

        return grouped.keys.sorted().map { startOfDay in
            DayForecast(
                startOfDay: startOfDay,
                title: dayTitle(for: startOfDay, now: now),
                hours: grouped[startOfDay, default: []].sorted { $0.hourUtc < $1.hourUtc }
            )
        }
    }

    static func freshnessState(ageMinutes: Int) -> FreshnessState {
        if ageMinutes < 90 { return .fresh }
        if ageMinutes < 180 { return .stale }
        return .veryStale
    }

    static func dayTitle(for day: Date, now: Date = .now) -> String {
        let calendar = goNowCalendar
        if calendar.isDate(day, inSameDayAs: now) { return "Today" }
        if calendar.isDate(day, inSameDayAs: calendar.date(byAdding: .day, value: 1, to: now) ?? now) {
            return "Tomorrow"
        }
        return DateFormatter.goNowDayTitle.string(from: day)
    }
}

enum FreshnessState {
    case fresh
    case stale
    case veryStale
}

extension DateFormatter {
    static let goNowDayTitle: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IL")
        formatter.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        formatter.dateFormat = "EEEE MMM d"
        return formatter
    }()
}
