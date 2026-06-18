import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var store: ForecastStore
    @AppStorage("defaultMode") private var defaultModeRawValue = ActivityMode.swimSolo.rawValue
    @State private var selectedMode: ActivityMode = .swimSolo
    @State private var selectedHour: ScoredHour?
    @State private var selectedDay: DayForecast?
    @State private var selectedMetric: ForecastMetric = .score

    var body: some View {
        GoNowScreenBackground(accentLabel: accentLabel) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    content
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await store.refresh() }
        .task {
            selectedMode = ActivityMode(rawValue: defaultModeRawValue) ?? .swimSolo
            await store.loadIfNeeded()
        }
        .sheet(item: $selectedHour) { hour in
            HourDetailSheet(hour: hour, mode: selectedMode)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $selectedDay) { day in
            if let forecast = store.forecast {
                DayDetailSheet(day: day, forecast: forecast, mode: selectedMode, initialMetric: selectedMetric)
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var accentLabel: ScoreLabel? {
        guard let forecast = store.forecast,
              let currentHour = ForecastAnalytics.currentHour(in: forecast) else { return nil }
        return currentHour.scores[selectedMode].label
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Tel Aviv Coast")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
            Spacer(minLength: 12)
            if let forecast = store.forecast {
                FreshnessBadge(ageMinutes: forecast.forecastAgeMinutes)
            }
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    private var content: some View {
        switch store.state {
        case .idle, .loading:
            LoadingRowsView()
        case .loaded(let forecast), .refreshing(let forecast):
            forecastContent(forecast)
        case .failed(let message, let cached):
            if let cached {
                warningBanner("Offline. Showing last known forecast. \(message)")
                forecastContent(cached)
            } else {
                EmptyStateView(title: "Could not load forecast", message: message, systemImage: "wifi.exclamationmark")
            }
        }
    }

    private func forecastContent(_ forecast: ScoredForecast) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            ModePicker(selection: $selectedMode)

            if ForecastAnalytics.freshnessState(ageMinutes: forecast.forecastAgeMinutes) == .veryStale {
                warningBanner("Last update was a while ago. Conditions may be off.")
            }

            if let currentHour = ForecastAnalytics.currentHour(in: forecast) {
                nowCard(hour: currentHour)
            }

            upcomingHours(forecast)
            bestWindowCards(forecast)
            sevenDayForecast(forecast)
        }
    }

    private func nowCard(hour: ScoredHour) -> some View {
        let score = hour.scores[selectedMode]
        return VStack(spacing: 18) {
            HeroScoreView(score: score, mode: selectedMode)
            ConditionsStrip(hour: hour)

            if !score.reasons.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(score.reasons.prefix(6)) { chip in
                        ReasonChipView(chip: chip)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .padding(.vertical, 8)
    }

    private func bestWindowCards(_ forecast: ScoredForecast) -> some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Next Best Window")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)
                BestWindowCard(window: ForecastAnalytics.bestWindow(in: forecast, mode: selectedMode), mode: selectedMode)
                    .padding(18)
            }
        }
    }

    private func upcomingHours(_ forecast: ScoredForecast) -> some View {
        let upcoming = ForecastAnalytics.upcomingHours(in: forecast).prefix(9)
        return AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Hourly Forecast")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        ForEach(Array(upcoming)) { hour in
                            HourlyForecastTile(hour: hour, mode: selectedMode)
                                .frame(width: 92)
                                .contentShape(Rectangle())
                                .onTapGesture { selectedHour = hour }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 16)
                }
            }
        }
    }

    private func sevenDayForecast(_ forecast: ScoredForecast) -> some View {
        let days = ForecastAnalytics.days(in: forecast)
        return AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    SectionTitle(title: "7-Day Forecast")
                    metricMenu
                }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ForEach(Array(days.prefix(7))) { day in
                    Button {
                        selectedDay = day
                    } label: {
                        DayForecastSummaryRow(day: day, mode: selectedMode, metric: selectedMetric)
                    }
                    .buttonStyle(.plain)
                    if day.id != Array(days.prefix(7)).last?.id {
                        Divider().overlay(Color.goNowDivider)
                    }
                }
            }
        }
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
            HStack(spacing: 6) {
                Image(systemName: selectedMetric.symbolName)
                    .foregroundStyle(selectedMetric.color)
                Text(selectedMetric.compactLabel)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Image(systemName: "chevron.down")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color.goNowMutedText)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.07), in: Capsule())
            .overlay {
                Capsule().stroke(Color.white.opacity(0.09), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private func warningBanner(_ message: String) -> some View {
        Label(message, systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(Color.reason(.warning))
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.reason(.warning).opacity(0.13), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct BestWindowCard: View {
    let window: BestWindow?
    let mode: ActivityMode

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 27, weight: .semibold))
                .foregroundStyle(Color.score(window?.label ?? .meh))
                .frame(width: 44)
            VStack(alignment: .leading, spacing: 6) {
                if let window {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("\(window.startHour.hourUtc.goNowDay()) \(window.startHour.hourUtc.goNowHour())-\(window.endHour.hourUtc.goNowHour())")
                            .font(.system(size: 19, weight: .bold))
                            .foregroundStyle(Color.goNowSecondaryText)
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                        Text(window.averageScore.formatted())
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.score(window.label))
                    }
                    Text("\(window.lengthHours)h · \(window.label.rawValue)")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.score(window.label))
                } else {
                    Text("No good windows today")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Color.goNowSecondaryText)
                    Text(mode.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.goNowMutedText)
                }
            }
            Spacer()
            Circle()
                .fill(Color.score(window?.label ?? .meh))
                .frame(width: 12, height: 12)
        }
    }
}

struct HourSummaryRow: View {
    let hour: ScoredHour
    let mode: ActivityMode

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
            Text(score.label.rawValue)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.score(score.label))
        }
        .padding(.vertical, 10)
        .opacity(score.hardGated ? 0.55 : 1)
    }
}

struct HourlyForecastTile: View {
    let hour: ScoredHour
    let mode: ActivityMode

    var body: some View {
        let score = hour.scores[mode]
        VStack(spacing: 11) {
            Text(hour.hourUtc.goNowHour())
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Color.goNowMutedText)
                .monospacedDigit()
            ScoreBadge(score: score, size: 56)
            Text(hour.feelslikeC.formattedMetric("°", digits: 0))
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Color.goNowMutedText)
        }
        .padding(.vertical, 2)
        .opacity(score.hardGated ? 0.55 : 1)
    }
}

struct DayForecastSummaryRow: View {
    let day: DayForecast
    let mode: ActivityMode
    let metric: ForecastMetric

    var body: some View {
        let summary = day.metricSummary(for: metric, mode: mode)
        let label = summary.bestLabel

        HStack(spacing: 14) {
            Text(day.title)
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(Color.goNowSecondaryText)
                .frame(width: 104, alignment: .leading)
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            Text(metric.formatted(summary.min))
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(metric == .score ? Color.score(ScoreLabel.label(for: Int(summary.min))) : metric.color)
                .frame(width: 46, alignment: .trailing)
                .monospacedDigit()

            MetricRangeBar(metric: metric, minValue: summary.min, maxValue: summary.max)

            Text(metric.formatted(summary.max))
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(metric == .score ? Color.score(ScoreLabel.label(for: Int(summary.max))) : metric.color)
                .frame(width: 48, alignment: .leading)
                .monospacedDigit()

            Text(label.rawValue)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.score(label))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.score(label).opacity(0.13), in: Capsule())
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.goNowMutedText)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 17)
    }
}

struct MetricRangeBar: View {
    let metric: ForecastMetric
    let minValue: Double
    let maxValue: Double

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let denominator = metric == .score ? 100 : max(maxValue, 1)
            let start = metric == .score ? width * CGFloat(min(max(minValue / denominator, 0), 1)) : 0
            let end = metric == .score ? width * CGFloat(min(max(maxValue / denominator, 0), 1)) : width

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 6)
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: metric == .score
                                ? [Color.score(ScoreLabel.label(for: Int(minValue))), Color.score(ScoreLabel.label(for: Int(maxValue)))]
                                : [metric.color.opacity(0.55), metric.color],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: max(end - start, 6), height: 6)
                    .offset(x: start)
            }
        }
        .frame(height: 6)
    }
}
