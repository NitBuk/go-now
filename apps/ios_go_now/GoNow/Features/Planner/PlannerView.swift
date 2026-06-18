import SwiftUI

struct PlannerView: View {
    @EnvironmentObject private var store: ForecastStore
    @AppStorage("defaultMode") private var defaultModeRawValue = ActivityMode.swimSolo.rawValue
    @State private var selectedMode: ActivityMode = .swimSolo
    @State private var selectedHour: ScoredHour?
    @State private var selectedDay: DayForecast?
    @State private var expandedDays: Set<Date> = []

    var body: some View {
        GoNowScreenBackground(accentLabel: accentLabel) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    ModePicker(selection: $selectedMode)
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
                DayDetailSheet(day: day, forecast: forecast, mode: selectedMode, initialMetric: .score)
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
            Text("Planner")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
            Spacer()
            if let forecast = store.forecast {
                FreshnessBadge(ageMinutes: forecast.forecastAgeMinutes)
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.state {
        case .idle, .loading:
            LoadingRowsView()
        case .loaded(let forecast), .refreshing(let forecast):
            forecastSections(forecast)
        case .failed(let message, let cached):
            if let cached {
                warningBanner("Offline. Showing last known forecast. \(message)")
                forecastSections(cached)
            } else {
                EmptyStateView(title: "Could not load forecast", message: message, systemImage: "wifi.exclamationmark")
            }
        }
    }

    private func forecastSections(_ forecast: ScoredForecast) -> some View {
        let days = ForecastAnalytics.days(in: forecast)
        return AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "7-Day Forecast", trailing: selectedMode.activityTitle)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ForEach(days) { day in
                    VStack(spacing: 0) {
                        HStack(spacing: 10) {
                            Button {
                                toggle(day)
                            } label: {
                                DayPlannerHeader(day: day, mode: selectedMode, isExpanded: shouldExpand(day: day, allDays: days))
                            }
                            .buttonStyle(.plain)

                            Button {
                                selectedDay = day
                            } label: {
                                Image(systemName: "chart.xyaxis.line")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(Color.goNowAccent)
                                    .frame(width: 38, height: 38)
                                    .background(Color.goNowAccent.opacity(0.13), in: Circle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Open \(day.title) detail")
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)

                        if shouldExpand(day: day, allDays: days) {
                            VStack(spacing: 0) {
                                ForEach(day.hours) { hour in
                                    HourSummaryRow(hour: hour, mode: selectedMode)
                                        .padding(.horizontal, 18)
                                        .contentShape(Rectangle())
                                        .onTapGesture { selectedHour = hour }
                                    if hour.id != day.hours.last?.id {
                                        Divider()
                                            .overlay(Color.goNowDivider)
                                            .padding(.leading, 74)
                                    }
                                }
                            }
                            .padding(.bottom, 8)
                        }

                        if day.id != days.last?.id {
                            Divider().overlay(Color.goNowDivider)
                        }
                    }
                }
            }
        }
    }

    private func shouldExpand(day: DayForecast, allDays: [DayForecast]) -> Bool {
        expandedDays.contains(day.startOfDay) || allDays.prefix(2).contains(day)
    }

    private func toggle(_ day: DayForecast) {
        if expandedDays.contains(day.startOfDay) {
            expandedDays.remove(day.startOfDay)
        } else {
            expandedDays.insert(day.startOfDay)
        }
    }

    private func warningBanner(_ message: String) -> some View {
        Label(message, systemImage: "wifi.slash")
            .font(.footnote)
            .foregroundStyle(Color.reason(.warning))
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.reason(.warning).opacity(0.13), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct HourDetailSheet: View {
    let hour: ScoredHour
    let mode: ActivityMode

    var body: some View {
        NavigationStack {
            HourDetailContent(hour: hour, mode: mode)
        }
    }
}

struct HourDetailContent: View {
    let hour: ScoredHour
    let mode: ActivityMode

    var body: some View {
        let score = hour.scores[mode]
        GoNowScreenBackground(accentLabel: score.label) {
            ScrollView {
                VStack(spacing: 20) {
                    HeroScoreView(score: score, mode: mode)
                        .padding(.top, 10)

                    ConditionsStrip(hour: hour)
                        .padding(.horizontal)

                    FlowLayout(spacing: 8) {
                        ForEach(score.reasons.prefix(6)) { chip in
                            ReasonChipView(chip: chip)
                        }
                    }
                    .padding(.horizontal)

                    AppCard {
                        VStack(spacing: 0) {
                            rawRow("Wave height", hour.waveHeightM.formattedMetric(" m"))
                            rawRow("Wind gusts", hour.gustMs.formattedMetric(" m/s"))
                            rawRow("Feels like", hour.feelslikeC.formattedMetric(" C", digits: 0))
                            rawRow("UV index", hour.uvIndex.formattedMetric("", digits: 0))
                            rawRow("Air quality", hour.euAqi.formattedMetric(""))
                            rawRow("Rain probability", hour.precipProbPct.formattedMetric("%"))
                            rawRow("Rain amount", hour.precipMm.formattedMetric(" mm"))
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 28)
            }
        }
        .navigationTitle("\(mode.title) at \(hour.hourUtc.goNowHour())")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func rawRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(Color.goNowMutedText)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .monospacedDigit()
                .foregroundStyle(Color.goNowSecondaryText)
        }
        .font(.subheadline)
        .padding(.vertical, 10)
    }
}

struct DayPlannerHeader: View {
    let day: DayForecast
    let mode: ActivityMode
    let isExpanded: Bool

    var body: some View {
        let bestHour = day.bestHour(for: mode)
        let bestScore = day.bestScore(for: mode)
        let label = bestScore?.label ?? .meh

        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(day.title)
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(Color.goNowSecondaryText)
                if let bestHour, let bestScore {
                    Text("Best: \(bestScore.score) at \(bestHour.hourUtc.goNowHour())")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.goNowMutedText)
                }
            }

            Spacer()

            if let bestScore {
                Text("\(bestScore.score)")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.score(label))
                    .monospacedDigit()
            }

            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.goNowMutedText)
        }
    }
}
