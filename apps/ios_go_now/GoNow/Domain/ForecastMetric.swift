import SwiftUI

enum ForecastMetric: String, CaseIterable, Identifiable {
    case score
    case temperature
    case uv
    case wind
    case waves
    case rain
    case aqi

    var id: String { rawValue }

    var label: String {
        switch self {
        case .score: "Score"
        case .temperature: "Temperature"
        case .uv: "UV Index"
        case .wind: "Wind"
        case .waves: "Waves"
        case .rain: "Rain"
        case .aqi: "Air Quality"
        }
    }

    var compactLabel: String {
        switch self {
        case .temperature: "Temp"
        case .uv: "UV"
        case .aqi: "AQI"
        default: label
        }
    }

    var unit: String {
        switch self {
        case .score, .uv, .aqi: ""
        case .temperature: "°"
        case .wind: "m/s"
        case .waves: "m"
        case .rain: "%"
        }
    }

    var symbolName: String {
        switch self {
        case .score: "waveform.path.ecg"
        case .temperature: "thermometer.medium"
        case .uv: "sun.max"
        case .wind: "wind"
        case .waves: "water.waves"
        case .rain: "cloud.rain"
        case .aqi: "aqi.medium"
        }
    }

    var color: Color {
        switch self {
        case .score: .score(.good)
        case .temperature: Color.reason(.danger)
        case .uv: Color.reason(.warning)
        case .wind: .goNowAccent
        case .waves: .score(.good)
        case .rain: Color(red: 0.65, green: 0.55, blue: 0.98)
        case .aqi: Color(red: 0.97, green: 0.44, blue: 0.44)
        }
    }

    func value(in hour: ScoredHour, mode: ActivityMode) -> Double? {
        switch self {
        case .score: Double(hour.scores[mode].score)
        case .temperature: hour.feelslikeC
        case .uv: hour.uvIndex
        case .wind: hour.windMs
        case .waves: hour.waveHeightM
        case .rain: hour.precipProbPct.map(Double.init)
        case .aqi: hour.euAqi.map(Double.init)
        }
    }

    func formatted(_ value: Double?) -> String {
        guard let value else { return "--" }
        switch self {
        case .waves:
            return value.formatted(.number.precision(.fractionLength(1))) + unit
        default:
            return Int(value.rounded()).formatted() + unit
        }
    }
}

struct DayMetricSummary: Hashable {
    let min: Double
    let max: Double
    let bestScore: Int
    let bestLabel: ScoreLabel
    let bestHour: ScoredHour?
}

extension DayForecast {
    func metricSummary(for metric: ForecastMetric, mode: ActivityMode) -> DayMetricSummary {
        let values = hours.compactMap { metric.value(in: $0, mode: mode) }
        let scores = hours.map { $0.scores[mode].score }
        let bestHour = self.bestHour(for: mode)
        let bestScore = scores.max() ?? 0

        return DayMetricSummary(
            min: values.min() ?? 0,
            max: values.max() ?? 0,
            bestScore: bestScore,
            bestLabel: ScoreLabel.label(for: bestScore),
            bestHour: bestHour
        )
    }
}
