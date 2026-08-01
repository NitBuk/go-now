import SwiftUI

extension Color {
    static let goNowAccent = Color(red: 0.13, green: 0.85, blue: 0.66)
    static let goNowBackground = Color(red: 0.04, green: 0.06, blue: 0.11)
    static let goNowBackgroundDeep = Color(red: 0.03, green: 0.04, blue: 0.08)
    static let goNowCard = Color.white.opacity(0.065)
    static let goNowCardBorder = Color.white.opacity(0.11)
    static let goNowMutedText = Color(red: 0.57, green: 0.63, blue: 0.74)
    static let goNowSecondaryText = Color(red: 0.76, green: 0.80, blue: 0.88)
    static let goNowDivider = Color.white.opacity(0.07)

    static func score(_ label: ScoreLabel) -> Color {
        switch label {
        case .perfect: .goNowAccent
        case .good: Color(red: 0.38, green: 0.65, blue: 0.98)
        case .meh: Color(red: 0.98, green: 0.75, blue: 0.14)
        case .bad: Color(red: 0.98, green: 0.57, blue: 0.24)
        case .nope: Color(red: 0.97, green: 0.44, blue: 0.44)
        }
    }

    static func scoreAccent(_ label: ScoreLabel) -> Color {
        switch label {
        case .perfect: Color(red: 0.27, green: 0.91, blue: 0.74)
        case .good: Color(red: 0.35, green: 0.82, blue: 0.96)
        case .meh: Color(red: 1.00, green: 0.87, blue: 0.30)
        case .bad: Color(red: 1.00, green: 0.70, blue: 0.34)
        case .nope: Color(red: 0.98, green: 0.56, blue: 0.62)
        }
    }

    static func reason(_ severity: ReasonSeverity) -> Color {
        switch severity {
        case .check: .goNowAccent
        case .warning: Color(red: 0.98, green: 0.75, blue: 0.14)
        case .danger: Color(red: 0.97, green: 0.44, blue: 0.44)
        case .info: .goNowMutedText
        }
    }
}

extension LinearGradient {
    static func score(_ label: ScoreLabel) -> LinearGradient {
        LinearGradient(
            colors: [.score(label), .scoreAccent(label)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static let goNowBackground = LinearGradient(
        colors: [.goNowBackgroundDeep, .goNowBackground, Color(red: 0.06, green: 0.10, blue: 0.15)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Date {
    func goNowHour() -> String {
        DateFormatter.goNowHour.string(from: self)
    }

    func goNowDay() -> String {
        DateFormatter.goNowShortDay.string(from: self)
    }

    func goNowLongDay() -> String {
        DateFormatter.goNowLongDay.string(from: self)
    }

    func goNowAPIDay() -> String {
        DateFormatter.goNowAPIDay.string(from: self)
    }
}

extension DateFormatter {
    static let goNowHour: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IL")
        formatter.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    static let goNowShortDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IL")
        formatter.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        formatter.dateFormat = "EEE d"
        return formatter
    }()

    static let goNowLongDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IL")
        formatter.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        formatter.dateFormat = "EEEE, MMM d"
        return formatter
    }()

    static let goNowAPIDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

extension Optional where Wrapped == Double {
    func formattedMetric(_ suffix: String, digits: Int = 1) -> String {
        guard let value = self else { return "--" }
        return value.formatted(.number.precision(.fractionLength(digits))) + suffix
    }
}

extension Optional where Wrapped == Int {
    func formattedMetric(_ suffix: String) -> String {
        guard let value = self else { return "--" }
        return "\(value)\(suffix)"
    }
}

extension ActivityMode {
    var activityTitle: String {
        switch self {
        case .swimSolo, .swimDog: "Swim"
        case .runSolo, .runDog: "Run"
        }
    }

    var isSwim: Bool {
        switch self {
        case .swimSolo, .swimDog: true
        case .runSolo, .runDog: false
        }
    }

    var includesDog: Bool {
        switch self {
        case .swimDog, .runDog: true
        case .swimSolo, .runSolo: false
        }
    }

    static func composed(activityIsSwim: Bool, includesDog: Bool) -> ActivityMode {
        switch (activityIsSwim, includesDog) {
        case (true, true): .swimDog
        case (true, false): .swimSolo
        case (false, true): .runDog
        case (false, false): .runSolo
        }
    }
}

extension ScoreLabel {
    var tintOpacity: Double {
        switch self {
        case .perfect, .good: 0.18
        case .meh, .bad, .nope: 0.13
        }
    }
}
