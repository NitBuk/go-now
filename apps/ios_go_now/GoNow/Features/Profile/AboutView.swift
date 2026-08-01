import SwiftUI

struct AboutView: View {
    var body: some View {
        GoNowScreenBackground(accentLabel: .perfect) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("About")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    AboutStoryCard()
                    DogLayerCard()
                    FourModesCard()
                    HowItScoresCard()
                    DataTrustCard()
                    ProductStrategyCard()
                    OpenSourceCard()
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct AboutStoryCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Built By One Person")
                Text("Four apps, one decision. Every time.")
                    .font(.system(size: 23, weight: .bold))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Every morning before heading to the beach, I would open four apps: waves, weather, UV, and air quality. Then I would mentally combine them into a single answer.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.goNowSecondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                Text("There is no reason a human should have to do that math. So I built GoNow.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goNowMutedText)
                    .fixedSize(horizontal: false, vertical: true)

                AppCombinerView()
            }
        }
    }
}

private struct AppCombinerView: View {
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        VStack(spacing: 10) {
            Text("Every morning")
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Color.goNowMutedText)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: columns, spacing: 8) {
                AboutMetricTile(title: "Waves", symbolName: "water.waves", color: Color.score(.good))
                AboutMetricTile(title: "Weather", symbolName: "thermometer.medium", color: Color.reason(.warning))
                AboutMetricTile(title: "UV", symbolName: "sun.max.fill", color: Color.score(.meh))
                AboutMetricTile(title: "Air Quality", symbolName: "aqi.medium", color: Color.goNowAccent)
            }

            Image(systemName: "arrow.down")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.goNowMutedText)
                .accessibilityHidden(true)

            HStack(spacing: 12) {
                ScoreBadge(
                    score: ModeScore(score: 87, label: .perfect, reasons: [], hardGated: false),
                    size: 50
                )
                VStack(alignment: .leading, spacing: 2) {
                    Text("One answer")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.goNowSecondaryText)
                    Text("Go now, or wait for a better window.")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.goNowMutedText)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(12)
        .background(Color.white.opacity(0.035), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        }
    }
}

private struct AboutMetricTile: View {
    let title: String
    let symbolName: String
    let color: Color

    var body: some View {
        Label(title, systemImage: symbolName)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, minHeight: 38)
            .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct DogLayerCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("The Dog Layer", systemImage: "pawprint.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                Text("Bringing my dog made the same scattered data higher stakes.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.goNowSecondaryText)
                    .fixedSize(horizontal: false, vertical: true)

                ForEach(AboutContent.dogReasons) { reason in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(reason.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.goNowSecondaryText)
                            Spacer()
                            Text(reason.level)
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(reason.color)
                        }
                        ProgressView(value: reason.severity, total: 100)
                            .tint(reason.color)
                            .accessibilityLabel(reason.title)
                            .accessibilityValue(reason.level)
                    }
                }

                Text("Dog modes use stricter limits because dogs overheat faster, are more sensitive to air quality, and cannot tell us when they have had enough.")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FourModesCard: View {
    var body: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 5) {
                    SectionTitle(title: "Four Modes")
                    Text("The same hour can produce a different answer for each activity.")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.goNowMutedText)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ForEach(AboutContent.modeExamples) { example in
                    HStack(spacing: 12) {
                        Image(systemName: example.symbolName)
                            .foregroundStyle(Color.goNowMutedText)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(example.title)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color.goNowSecondaryText)
                                Spacer()
                                Text("\(example.score)")
                                    .font(.caption.weight(.bold).monospacedDigit())
                                    .foregroundStyle(Color.score(example.label))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    .background(Color.score(example.label).opacity(0.13), in: Capsule())
                            }
                            ProgressView(value: Double(example.score), total: 100)
                                .tint(Color.score(example.label))
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)

                    if example.id != AboutContent.modeExamples.last?.id {
                        Divider()
                            .overlay(Color.goNowDivider)
                            .padding(.leading, 54)
                    }
                }
            }
        }
    }
}

private struct HowItScoresCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("How It Scores", systemImage: "bolt.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                FlowLayout(spacing: 7) {
                    ForEach(AboutContent.scoreInputs) { input in
                        Label(input.title, systemImage: input.symbolName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.goNowMutedText)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.05), in: Capsule())
                    }

                    Label("0-100", systemImage: "arrow.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.goNowAccent)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 6)
                        .background(Color.goNowAccent.opacity(0.1), in: Capsule())
                }

                FlowLayout(spacing: 7) {
                    ForEach(ScoreLabel.allCases, id: \.rawValue) { label in
                        Text(tierText(label))
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.score(label))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.score(label).opacity(0.12), in: Capsule())
                    }
                }

                NavigationLink(value: AppRoute.formula) {
                    Label("View the full formula", systemImage: "chevron.right")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.goNowAccent)
                }
            }
        }
    }

    private func tierText(_ label: ScoreLabel) -> String {
        switch label {
        case .perfect: "Perfect 85+"
        case .good: "Good 70+"
        case .meh: "Meh 45+"
        case .bad: "Bad 20+"
        case .nope: "Nope 0+"
        }
    }
}

private struct DataTrustCard: View {
    var body: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Data And Trust")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)
                AboutDetailRow(
                    title: "Open-Meteo",
                    detail: "Marine, weather, temperature, wind, UV, and rain forecasts.",
                    symbolName: "cloud.sun.fill"
                )
                AboutDetailRow(
                    title: "AQICN",
                    detail: "US AQI readings from the Tel Aviv ground sensor, not a forecast model.",
                    symbolName: "aqi.medium"
                )
                AboutDetailRow(
                    title: "Versioned scoring",
                    detail: "The backend owns scoring so iOS and web receive the same answer from one public contract.",
                    symbolName: "checkmark.seal.fill",
                    showDivider: false
                )
            }
        }
    }
}

private struct ProductStrategyCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                Label("One Product, Shared Backend", systemImage: "arrow.triangle.branch")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                Text("The native iOS app is the primary product experience. The web app remains working as a public demo and operational surface.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.goNowSecondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Both clients stay maintainable because API contracts and scoring logic are shared instead of duplicated.")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct OpenSourceCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("Open Source", systemImage: "chevron.left.forwardslash.chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                FlowLayout(spacing: 7) {
                    ForEach(AboutContent.techStack, id: \.self) { technology in
                        Text(technology)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.goNowSecondaryText)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.055), in: Capsule())
                    }
                }

                Link(destination: URL(string: "https://github.com/NitBuk/go-now")!) {
                    Label("View on GitHub", systemImage: "arrow.up.right.square")
                }
                Link(destination: URL(string: "https://go-now.dev")!) {
                    Label("Open the web app", systemImage: "safari")
                }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Color.goNowAccent)
        }
    }
}

private struct AboutDetailRow: View {
    let title: String
    let detail: String
    let symbolName: String
    var showDivider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: symbolName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.goNowAccent)
                    .frame(width: 30, height: 30)
                    .background(Color.goNowAccent.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.goNowSecondaryText)
                    Text(detail)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.goNowMutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)

            if showDivider {
                Divider()
                    .overlay(Color.goNowDivider)
                    .padding(.leading, 60)
            }
        }
    }
}

private enum AboutContent {
    static let dogReasons: [DogReason] = [
        .init(title: "Overheats faster than humans", severity: 85, level: "High", color: Color.reason(.danger)),
        .init(title: "More sensitive to air quality", severity: 70, level: "Elevated", color: Color.reason(.warning)),
        .init(title: "Cannot tell you when it is enough", severity: 92, level: "Critical", color: Color.score(.bad))
    ]

    static let modeExamples: [ModeExample] = [
        .init(title: "Swim solo", score: 87, label: .perfect, symbolName: "figure.pool.swim"),
        .init(title: "Swim + Dog", score: 74, label: .good, symbolName: "pawprint.fill"),
        .init(title: "Run solo", score: 91, label: .perfect, symbolName: "figure.run"),
        .init(title: "Run + Dog", score: 65, label: .meh, symbolName: "figure.walk.motion")
    ]

    static let scoreInputs: [ScoreInput] = [
        .init(title: "Waves", symbolName: "water.waves"),
        .init(title: "Temperature", symbolName: "thermometer.medium"),
        .init(title: "UV", symbolName: "sun.max.fill"),
        .init(title: "AQI", symbolName: "aqi.medium"),
        .init(title: "Wind", symbolName: "wind"),
        .init(title: "Rain", symbolName: "cloud.rain.fill")
    ]

    static let techStack = ["SwiftUI", "Next.js", "FastAPI", "Python", "GCP"]
}

private struct DogReason: Identifiable {
    var id: String { title }
    let title: String
    let severity: Double
    let level: String
    let color: Color
}

private struct ModeExample: Identifiable {
    var id: String { title }
    let title: String
    let score: Int
    let label: ScoreLabel
    let symbolName: String
}

private struct ScoreInput: Identifiable {
    var id: String { title }
    let title: String
    let symbolName: String
}
