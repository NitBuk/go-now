import SwiftUI

struct FormulaView: View {
    var body: some View {
        GoNowScreenBackground(accentLabel: .good) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Scoring Formula")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    FormulaOverviewCard()
                    ScoreTiersCard()
                    HardGatesCard()
                    DogAdjustmentsCard()
                    PenaltyTableCard(
                        title: "Swim Penalties",
                        symbolName: "water.waves",
                        accent: Color.score(.good),
                        rules: FormulaContent.swimPenalties
                    )
                    PenaltyTableCard(
                        title: "Run Penalties",
                        symbolName: "figure.run",
                        accent: Color.reason(.warning),
                        rules: FormulaContent.runPenalties
                    )
                    FormulaExampleCard()
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct FormulaOverviewCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("How Scores Work", systemImage: "function")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                Text("Score = 100 - sum of penalties")
                    .font(.system(size: 23, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.75)
                    .lineLimit(1)

                Text("Penalties scale linearly between a comfortable value and a bad value.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.goNowSecondaryText)

                VStack(alignment: .leading, spacing: 8) {
                    FormulaScaleRow(label: "Below comfort", value: "0 penalty", color: Color.score(.perfect))
                    FormulaScaleRow(label: "Between", value: "Proportional", color: Color.score(.good))
                    FormulaScaleRow(label: "At or above bad", value: "Maximum penalty", color: Color.reason(.danger))
                }

                Label(
                    "Scores are computed by the backend. This app displays the scored public API response and never changes the formula locally.",
                    systemImage: "server.rack"
                )
                .font(.caption.weight(.medium))
                .foregroundStyle(Color.goNowMutedText)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FormulaScaleRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
            Text(label)
                .foregroundStyle(Color.goNowMutedText)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .foregroundStyle(color)
        }
        .font(.caption)
    }
}

private struct ScoreTiersCard: View {
    var body: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SectionTitle(title: "Score Tiers")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                ForEach(FormulaContent.scoreTiers) { tier in
                    HStack(alignment: .top, spacing: 12) {
                        Text(tier.range)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.score(tier.label))
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(Color.score(tier.label).opacity(0.13), in: Capsule())
                            .frame(width: 72)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(tier.label.rawValue)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.goNowSecondaryText)
                            Text(tier.detail)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(Color.goNowMutedText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)

                    if tier.id != FormulaContent.scoreTiers.last?.id {
                        Divider().overlay(Color.goNowDivider)
                    }
                }
            }
        }
    }
}

private struct HardGatesCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Hard Gates", systemImage: "exclamationmark.shield.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .textCase(.uppercase)
                        .foregroundStyle(Color.goNowMutedText)
                    Spacer()
                    Text("Score forced to 0")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.reason(.danger))
                }

                ForEach(FormulaContent.gates) { gate in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: gate.symbolName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(gate.color)
                            .frame(width: 32, height: 32)
                            .background(gate.color.opacity(0.13), in: Circle())

                        VStack(alignment: .leading, spacing: 4) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(gate.title)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color.goNowSecondaryText)
                                Spacer()
                                Text(gate.scope)
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(Color.reason(.danger))
                            }
                            Text(gate.rule)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.goNowSecondaryText)
                            Text(gate.reason)
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(Color.goNowMutedText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
    }
}

private struct DogAdjustmentsCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("Dog Mode Adjustments", systemImage: "pawprint.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                FormulaDetailBlock(
                    title: "1.2x penalty multiplier",
                    detail: "Heat, UV, and AQI penalties are multiplied by 1.2 in Run + Dog. Dogs cool through panting, making heat and poor air quality more dangerous.",
                    color: Color.reason(.danger)
                )
                FormulaDetailBlock(
                    title: "Stricter swim thresholds",
                    detail: "Swim + Dog reaches its maximum wave penalty at 1.0 m instead of 1.5 m, with a maximum penalty of -80 instead of -70.",
                    color: Color.reason(.warning)
                )
            }
        }
    }
}

private struct FormulaDetailBlock: View {
    let title: String
    let detail: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Text(detail)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct PenaltyTableCard: View {
    let title: String
    let symbolName: String
    let accent: Color
    let rules: [PenaltyRule]

    var body: some View {
        AppCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Label(title, systemImage: symbolName)
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 18)
                Divider().overlay(Color.goNowDivider)

                HStack {
                    Text("Factor")
                    Spacer()
                    Text("Comfort to bad")
                    Text("Max")
                        .frame(width: 42, alignment: .trailing)
                }
                .font(.caption2.weight(.bold))
                .foregroundStyle(Color.goNowMutedText)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)

                ForEach(rules) { rule in
                    HStack(spacing: 10) {
                        Image(systemName: rule.symbolName)
                            .foregroundStyle(accent)
                            .frame(width: 20)
                        Text(rule.factor)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.goNowSecondaryText)
                        Spacer(minLength: 6)
                        Text("\(rule.comfort) to \(rule.bad)")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(Color.goNowMutedText)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                        Text(rule.maxPenalty)
                            .font(.caption.weight(.bold).monospacedDigit())
                            .foregroundStyle(accent)
                            .frame(width: 42, alignment: .trailing)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 11)

                    if rule.id != rules.last?.id {
                        Divider()
                            .overlay(Color.goNowDivider)
                            .padding(.leading, 48)
                    }
                }
            }
        }
    }
}

private struct FormulaExampleCard: View {
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("Example Calculation", systemImage: "equal.circle.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(Color.goNowMutedText)

                Text("32 C run score")
                    .font(.headline)
                    .foregroundStyle(Color.goNowSecondaryText)

                FormulaStep(number: "1", text: "32 C is halfway through the 26-38 C heat ramp.")
                FormulaStep(number: "2", text: "50% of the -60 maximum heat penalty is -30.")
                FormulaStep(number: "3", text: "100 - 30 = 70, which is Good.")

                Divider().overlay(Color.goNowDivider)

                Label(
                    "Missing values never create a penalty or a hard gate. An informational reason chip is shown instead.",
                    systemImage: "info.circle.fill"
                )
                .font(.caption.weight(.medium))
                .foregroundStyle(Color.goNowMutedText)
                .fixedSize(horizontal: false, vertical: true)

                Label(
                    "AQI uses the US EPA scale from the AQICN Tel Aviv ground sensor: Good <= 50, Moderate <= 100, Unhealthy >= 150, Very Unhealthy >= 200, Hazardous >= 300.",
                    systemImage: "aqi.medium"
                )
                .font(.caption.weight(.medium))
                .foregroundStyle(Color.goNowMutedText)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FormulaStep: View {
    let number: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(number)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.goNowBackground)
                .frame(width: 24, height: 24)
                .background(Color.goNowAccent, in: Circle())
            Text(text)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.goNowMutedText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private enum FormulaContent {
    static let scoreTiers: [ScoreTier] = [
        .init(range: "85-100", label: .perfect, detail: "Ideal conditions. Get out there."),
        .init(range: "70-84", label: .good, detail: "Minor drawbacks, still enjoyable."),
        .init(range: "45-69", label: .meh, detail: "Noticeable discomfort. Check the details."),
        .init(range: "20-44", label: .bad, detail: "Uncomfortable or potentially unsafe."),
        .init(range: "0-19", label: .nope, detail: "Dangerous or completely unsuitable.")
    ]

    static let gates: [FormulaGate] = [
        .init(
            title: "Heavy rain",
            scope: "All modes",
            rule: ">= 3 mm or >= 80% probability",
            reason: "Unsafe footing, poor visibility, and hypothermia risk in coastal conditions.",
            symbolName: "cloud.heavyrain.fill",
            color: Color.reason(.danger)
        ),
        .init(
            title: "Extreme wind",
            scope: "Run only",
            rule: "Gusts >= 14 m/s",
            reason: "Sand blasting and balance hazards on the promenade.",
            symbolName: "wind",
            color: Color.reason(.warning)
        ),
        .init(
            title: "Dog heat",
            scope: "Run + Dog",
            rule: ">= 29 C, or >= 26 C with UV >= 8",
            reason: "Paw burns and heatstroke risk for dogs on hot asphalt.",
            symbolName: "pawprint.fill",
            color: Color.reason(.danger)
        ),
        .init(
            title: "Darkness",
            scope: "Swim only",
            rule: "Ramps to 0 during the 30 minutes after sunset",
            reason: "After the ramp, swimming is hard-gated to 0. No night swimming.",
            symbolName: "sunset.fill",
            color: Color.score(.good)
        )
    ]

    static let swimPenalties: [PenaltyRule] = [
        .init(factor: "Waves", comfort: "0.3 m", bad: "1.5 m", maxPenalty: "-70", symbolName: "water.waves"),
        .init(factor: "Wind gusts", comfort: "7 m/s", bad: "14 m/s", maxPenalty: "-15", symbolName: "wind"),
        .init(factor: "AQI (US)", comfort: "50", bad: "300", maxPenalty: "-50", symbolName: "aqi.medium"),
        .init(factor: "Heat", comfort: "28 C", bad: "40 C", maxPenalty: "-10", symbolName: "thermometer.high"),
        .init(factor: "Cold", comfort: "18 C", bad: "10 C", maxPenalty: "-15", symbolName: "thermometer.low")
    ]

    static let runPenalties: [PenaltyRule] = [
        .init(factor: "Heat", comfort: "26 C", bad: "38 C", maxPenalty: "-60", symbolName: "thermometer.high"),
        .init(factor: "UV index", comfort: "4", bad: "10", maxPenalty: "-25", symbolName: "sun.max.fill"),
        .init(factor: "AQI (US)", comfort: "50", bad: "300", maxPenalty: "-80", symbolName: "aqi.medium"),
        .init(factor: "Wind gusts", comfort: "7 m/s", bad: "14 m/s", maxPenalty: "-12", symbolName: "wind"),
        .init(factor: "Rain probability", comfort: "30%", bad: "79%", maxPenalty: "-10", symbolName: "cloud.rain.fill")
    ]
}

private struct ScoreTier: Identifiable {
    var id: String { range }
    let range: String
    let label: ScoreLabel
    let detail: String
}

private struct FormulaGate: Identifiable {
    var id: String { title }
    let title: String
    let scope: String
    let rule: String
    let reason: String
    let symbolName: String
    let color: Color
}

private struct PenaltyRule: Identifiable {
    var id: String { factor }
    let factor: String
    let comfort: String
    let bad: String
    let maxPenalty: String
    let symbolName: String
}
