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
                .padding(.bottom, 28)
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
            AppCard {
                VStack(alignment: .leading, spacing: 14) {
                    Label("System Health", systemImage: "waveform.path.ecg")
                        .font(.system(size: 13, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(2.2)
                        .foregroundStyle(Color.goNowMutedText)

                    Text(health.status.rawValue.capitalized)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(color(for: health.status))

                    HStack(spacing: 14) {
                        statusPill("API \(health.version)", color: Color.score(.good))
                        statusPill(health.scoringVersion, color: Color.goNowAccent)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            AppCard(padding: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    SectionTitle(title: "Forecast Pipeline")
                        .padding(.horizontal, 18)
                        .padding(.vertical, 18)
                    Divider().overlay(Color.goNowDivider)
                    statusRow("Freshness", "\(health.forecast.freshness.rawValue.capitalized) (\(health.forecast.ageMinutes)m ago)", systemImage: "clock")
                    statusRow("Ingest Status", health.forecast.ingestStatus, systemImage: "tray.and.arrow.down")
                    statusRow("Hours Available", "\(health.forecast.hoursCount)", systemImage: "calendar")
                    statusRow("Area", health.forecast.areaId, systemImage: "mappin.and.ellipse")
                    statusRow("Last Updated", health.forecast.updatedAtUtc?.formatted(date: .abbreviated, time: .shortened) ?? "--", systemImage: "arrow.triangle.2.circlepath", showDivider: false)
                }
            }

            AppCard {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Live Data Pipeline", systemImage: "point.3.connected.trianglepath.dotted")
                        .font(.system(size: 13, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(2.2)
                        .foregroundStyle(Color.goNowMutedText)
                    pipelineRow("Open-Meteo + AQICN", "Source data")
                    pipelineRow("Ingest Worker", "Fetch, normalize, load")
                    pipelineRow("Firestore", "Serving cache")
                    pipelineRow("FastAPI", "Scores and health")
                }
            }
        }
    }

    private func statusPill(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption.weight(.bold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(color.opacity(0.13), in: Capsule())
    }

    private func statusRow(_ title: String, _ value: String, systemImage: String, showDivider: Bool = true) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .foregroundStyle(Color.goNowAccent)
                    .frame(width: 22)
                Text(title)
                    .foregroundStyle(Color.goNowMutedText)
                Spacer()
                Text(value)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.goNowSecondaryText)
                    .multilineTextAlignment(.trailing)
            }
            .font(.subheadline)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)

            if showDivider {
                Divider().overlay(Color.goNowDivider)
            }
        }
    }

    private func pipelineRow(_ title: String, _ subtitle: String) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.goNowAccent)
                .frame(width: 8, height: 8)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Text(subtitle)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
            }
            Spacer()
        }
    }

    private func color(for status: SystemHealthStatus) -> Color {
        switch status {
        case .healthy: .goNowAccent
        case .degraded: Color.reason(.warning)
        case .unhealthy: Color.reason(.danger)
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
