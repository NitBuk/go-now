import Charts
import SwiftUI

struct DayDetailSheet: View {
    let day: DayForecast
    let forecast: ScoredForecast
    let mode: ActivityMode
    let initialMetric: ForecastMetric
    @State private var selectedMetric: ForecastMetric

    init(day: DayForecast, forecast: ScoredForecast, mode: ActivityMode, initialMetric: ForecastMetric = .score) {
        self.day = day
        self.forecast = forecast
        self.mode = mode
        self.initialMetric = initialMetric
        _selectedMetric = State(initialValue: initialMetric)
    }

    var body: some View {
        NavigationStack {
            GoNowScreenBackground(accentLabel: summary.bestLabel) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        metricMenu
                        metricChart
                        hourlyRows
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 30)
                }
            }
            .navigationTitle(day.title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var summary: DayMetricSummary {
        day.metricSummary(for: selectedMetric, mode: mode)
    }

    private var points: [MetricChartPoint] {
        day.hours.compactMap { hour in
            guard let value = selectedMetric.value(in: hour, mode: mode) else { return nil }
            return MetricChartPoint(hour: hour.hourUtc, value: value, label: hour.scores[mode].label)
        }
    }

    private var sunTimes: DailySunTime? {
        let key = day.startOfDay.goNowAPIDay()
        return forecast.daily.first { $0.date == key }
    }

    private var header: some View {
        AppCard {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(day.startOfDay.goNowLongDay())
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                    if let bestHour = summary.bestHour {
                        Text("Best: \(summary.bestScore) at \(bestHour.hourUtc.goNowHour())")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.goNowMutedText)
                    }
                }
                Spacer()
                ScoreBadge(score: summary.bestHour?.scores[mode] ?? fallbackScore, size: 66)
            }
        }
    }

    private var fallbackScore: ModeScore {
        ModeScore(score: summary.bestScore, label: summary.bestLabel, reasons: [], hardGated: false)
    }

    private var metricMenu: some View {
        Menu {
            ForEach(ForecastMetric.allCases) { metric in
                Button {
                    selectedMetric = metric
                } label: {
                    Label(metric.label, systemImage: metric.symbolName)
                }
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: selectedMetric.symbolName)
                    .foregroundStyle(selectedMetric.color)
                Text(selectedMetric.label)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.goNowMutedText)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.09), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Metric")
        .accessibilityValue(selectedMetric.label)
    }

    @ViewBuilder
    private var metricChart: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: selectedMetric.label, trailing: "\(selectedMetric.formatted(summary.min))-\(selectedMetric.formatted(summary.max))")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                if points.isEmpty {
                    Text("No data available")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.goNowMutedText)
                        .frame(maxWidth: .infinity, minHeight: 220)
                } else {
                    Chart {
                        ForEach(points) { point in
                            AreaMark(
                                x: .value("Hour", point.hour),
                                y: .value(selectedMetric.label, point.value)
                            )
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [selectedMetric.color.opacity(0.28), selectedMetric.color.opacity(0.02)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )

                            LineMark(
                                x: .value("Hour", point.hour),
                                y: .value(selectedMetric.label, point.value)
                            )
                            .foregroundStyle(selectedMetric.color)
                            .lineStyle(.init(lineWidth: 3, lineCap: .round, lineJoin: .round))

                            PointMark(
                                x: .value("Hour", point.hour),
                                y: .value(selectedMetric.label, point.value)
                            )
                            .foregroundStyle(selectedMetric == .score ? Color.score(point.label) : selectedMetric.color)
                        }

                        if let sunTimes {
                            RuleMark(x: .value("Sunrise", sunTimes.sunriseUtc))
                                .foregroundStyle(Color.reason(.warning).opacity(0.55))
                                .lineStyle(.init(lineWidth: 1, dash: [4, 4]))
                                .annotation(position: .top, alignment: .leading) {
                                    sunAnnotation("sunrise", sunTimes.sunriseUtc.goNowHour(), color: Color.reason(.warning))
                                }

                            RuleMark(x: .value("Sunset", sunTimes.sunsetUtc))
                                .foregroundStyle(Color.reason(.danger).opacity(0.5))
                                .lineStyle(.init(lineWidth: 1, dash: [4, 4]))
                                .annotation(position: .top, alignment: .trailing) {
                                    sunAnnotation("sunset", sunTimes.sunsetUtc.goNowHour(), color: Color.reason(.danger))
                                }
                        }
                    }
                    .chartXAxis {
                        AxisMarks(values: .stride(by: .hour, count: 3)) { _ in
                            AxisGridLine().foregroundStyle(Color.white.opacity(0.04))
                            AxisValueLabel(format: .dateTime.hour(.twoDigits(amPM: .omitted)))
                                .foregroundStyle(Color.goNowMutedText)
                        }
                    }
                    .chartYAxis {
                        AxisMarks(position: .trailing) { _ in
                            AxisGridLine().foregroundStyle(Color.white.opacity(0.05))
                            AxisValueLabel()
                                .foregroundStyle(Color.goNowMutedText)
                        }
                    }
                    .frame(height: 230)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 18)
                }
            }
        }
    }

    private func sunAnnotation(_ image: String, _ text: String, color: Color) -> some View {
        Label(text, systemImage: image)
            .font(.caption2.weight(.bold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 4)
            .background(Color.goNowBackground.opacity(0.8), in: Capsule())
    }

    private var hourlyRows: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Hourly Detail", trailing: mode.activityTitle)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ForEach(day.hours) { hour in
                    NavigationLink {
                        HourDetailContent(hour: hour, mode: mode)
                    } label: {
                        DayMetricHourRow(hour: hour, mode: mode, metric: selectedMetric)
                            .padding(.horizontal, 18)
                    }
                    .buttonStyle(.plain)

                    if hour.id != day.hours.last?.id {
                        Divider()
                            .overlay(Color.goNowDivider)
                            .padding(.leading, 74)
                    }
                }
            }
        }
    }
}

struct MetricChartPoint: Identifiable {
    var id: Date { hour }
    let hour: Date
    let value: Double
    let label: ScoreLabel
}

struct DayMetricHourRow: View {
    let hour: ScoredHour
    let mode: ActivityMode
    let metric: ForecastMetric

    var body: some View {
        let score = hour.scores[mode]
        HStack(spacing: 12) {
            ScoreBadge(score: score, size: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text(hour.hourUtc.goNowHour())
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Text(score.reasons.first?.text ?? score.label.rawValue)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(metric.formatted(metric.value(in: hour, mode: mode)))
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(metric == .score ? Color.score(score.label) : metric.color)
                    .monospacedDigit()
                Text(metric.compactLabel)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.goNowMutedText)
            }
        }
        .padding(.vertical, 11)
        .opacity(score.hardGated ? 0.55 : 1)
    }
}
