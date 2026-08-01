import SwiftUI

struct StatusView: View {
    let client: any HealthFetching
    @State private var state: HealthLoadState = .idle

    var body: some View {
        GoNowScreenBackground(accentLabel: accentLabel) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Pipeline Status")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    content
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadIfNeeded() }
        .refreshable { await load() }
    }

    private var accentLabel: ScoreLabel? {
        switch state.health?.status {
        case .healthy: .perfect
        case .degraded: .meh
        case .unhealthy: .nope
        case nil: nil
        }
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .idle, .loading:
            LoadingRowsView()
        case .loaded(let health):
            statusContent(health)
        case .failed(let message):
            AppCard {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Could not load status", systemImage: "wifi.exclamationmark")
                        .font(.headline)
                        .foregroundStyle(Color.reason(.danger))
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(Color.goNowMutedText)
                    Button("Try Again") {
                        Task { await load() }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.goNowAccent)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func statusContent(_ health: HealthResponse) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            SystemHealthCard(health: health)
            ForecastPipelineCard(health: health)
            LivePipelineCard(hoursCount: health.forecast.hoursCount)
        }
    }

    private func loadIfNeeded() async {
        guard case .idle = state else { return }
        await load()
    }

    private func load() async {
        state = .loading
        do {
            state = .loaded(try await client.fetchHealth())
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}

private struct SystemHealthCard: View {
    let health: HealthResponse

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("System Health", systemImage: "waveform.path.ecg")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                HStack(alignment: .center, spacing: 12) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)
                        .shadow(color: statusColor.opacity(0.7), radius: 8)
                    Text(health.status.rawValue.capitalized)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(statusColor)
                }

                if let diagnosticMessage {
                    Label(diagnosticMessage.text, systemImage: diagnosticMessage.symbolName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(diagnosticMessage.color)
                        .fixedSize(horizontal: false, vertical: true)
                }

                FlowLayout(spacing: 8) {
                    StatusPill(text: "API \(health.version)", color: Color.score(.good))
                    StatusPill(text: health.scoringVersion, color: Color.goNowAccent)
                    StatusPill(
                        text: "Checked \(health.timestampUtc.formatted(date: .omitted, time: .shortened))",
                        color: Color.goNowMutedText
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var statusColor: Color {
        switch health.status {
        case .healthy: .goNowAccent
        case .degraded: Color.reason(.warning)
        case .unhealthy: Color.reason(.danger)
        }
    }

    private var diagnosticMessage: (text: String, symbolName: String, color: Color)? {
        switch health.status {
        case .healthy:
            nil
        case .degraded:
            (
                "Forecast data is \(health.forecast.freshness.rawValue) and was updated \(health.forecast.ageMinutes) minutes ago.",
                "exclamationmark.triangle.fill",
                Color.reason(.warning)
            )
        case .unhealthy:
            (
                "The latest ingest status is \(health.forecast.ingestStatus). Forecast availability may be affected.",
                "xmark.octagon.fill",
                Color.reason(.danger)
            )
        }
    }
}

private struct StatusPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.bold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(color.opacity(0.13), in: Capsule())
    }
}

private struct ForecastPipelineCard: View {
    let health: HealthResponse

    var body: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Forecast Pipeline")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)
                StatusValueRow(
                    title: "Freshness",
                    value: "\(health.forecast.freshness.rawValue.capitalized) (\(health.forecast.ageMinutes)m ago)",
                    symbolName: "clock",
                    valueColor: freshnessColor
                )
                StatusValueRow(title: "Ingest Status", value: health.forecast.ingestStatus, symbolName: "tray.and.arrow.down")
                StatusValueRow(title: "Hours Available", value: "\(health.forecast.hoursCount)", symbolName: "calendar")
                StatusValueRow(title: "Area", value: health.forecast.areaId, symbolName: "mappin.and.ellipse")
                StatusValueRow(
                    title: "Last Updated",
                    value: health.forecast.updatedAtUtc?.formatted(date: .abbreviated, time: .shortened) ?? "--",
                    symbolName: "arrow.triangle.2.circlepath",
                    showDivider: false
                )
            }
        }
    }

    private var freshnessColor: Color {
        switch health.forecast.freshness {
        case .fresh: .goNowAccent
        case .stale: Color.reason(.warning)
        }
    }
}

private struct StatusValueRow: View {
    let title: String
    let value: String
    let symbolName: String
    var valueColor: Color = .goNowSecondaryText
    var showDivider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: symbolName)
                    .foregroundStyle(Color.goNowAccent)
                    .frame(width: 22)
                Text(title)
                    .foregroundStyle(Color.goNowMutedText)
                Spacer(minLength: 10)
                Text(value)
                    .fontWeight(.semibold)
                    .foregroundStyle(valueColor)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .font(.subheadline)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)

            if showDivider {
                Divider().overlay(Color.goNowDivider)
            }
        }
    }
}

private struct LivePipelineCard: View {
    let hoursCount: Int

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Data Pipeline", systemImage: "point.3.connected.trianglepath.dotted")
                        .font(.system(size: 13, weight: .semibold))
                        .textCase(.uppercase)
                        .foregroundStyle(Color.goNowMutedText)
                    Spacer()
                    Label("Live", systemImage: "circle.fill")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.goNowAccent)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 6)
                        .background(Color.goNowAccent.opacity(0.13), in: Capsule())
                }

                Text("Forecast data moves through the same backend for the iOS and web clients.")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                    .fixedSize(horizontal: false, vertical: true)

                ForEach(Array(PipelineContent.stages.enumerated()), id: \.element.id) { index, stage in
                    PipelineStageView(stage: stage)

                    if index < PipelineContent.stages.count - 1 {
                        Image(systemName: "arrow.down")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.goNowMutedText)
                            .frame(maxWidth: .infinity)
                            .accessibilityHidden(true)
                    }
                }

                Label("\(hoursCount) hourly forecasts currently available", systemImage: "clock.badge.checkmark")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.goNowAccent)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 2)
            }
        }
    }
}

private struct PipelineStageView: View {
    let stage: PipelineStage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: stage.symbolName)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(stage.color)
                .frame(width: 38, height: 38)
                .background(stage.color.opacity(0.13), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 7) {
                Text(stage.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Text(stage.subtitle)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                FlowLayout(spacing: 6) {
                    ForEach(stage.items, id: \.self) { item in
                        Text(item)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(stage.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(stage.color.opacity(0.1), in: Capsule())
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Color.white.opacity(0.035), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        }
    }
}

private enum PipelineContent {
    static let stages: [PipelineStage] = [
        .init(
            title: "Sources",
            subtitle: "Marine, weather, UV, rain, and ground air quality",
            symbolName: "antenna.radiowaves.left.and.right",
            color: Color.score(.good),
            items: ["Open-Meteo", "AQICN"]
        ),
        .init(
            title: "Ingest",
            subtitle: "Cloud Run fetches, normalizes, validates, and loads each cycle",
            symbolName: "arrow.down.doc.fill",
            color: Color.goNowAccent,
            items: ["Cloud Scheduler", "Cloud Run"]
        ),
        .init(
            title: "Storage",
            subtitle: "Raw history, curated analytics, and low-latency serving data",
            symbolName: "externaldrive.fill",
            color: Color.reason(.warning),
            items: ["GCS Raw", "BigQuery", "Firestore"]
        ),
        .init(
            title: "Scoring and API",
            subtitle: "FastAPI applies the versioned linear scoring model",
            symbolName: "function",
            color: Color.reason(.danger),
            items: ["Scoring v2", "FastAPI"]
        ),
        .init(
            title: "Clients",
            subtitle: "Both products consume the same scored response contract",
            symbolName: "iphone.and.arrow.forward",
            color: Color.goNowAccent,
            items: ["iOS", "Web"]
        )
    ]
}

private struct PipelineStage: Identifiable {
    var id: String { title }
    let title: String
    let subtitle: String
    let symbolName: String
    let color: Color
    let items: [String]
}

enum HealthLoadState {
    case idle
    case loading
    case loaded(HealthResponse)
    case failed(String)

    var health: HealthResponse? {
        if case .loaded(let health) = self { return health }
        return nil
    }
}
