import SwiftUI

struct FormulaView: View {
    var body: some View {
        GoNowScreenBackground(accentLabel: .good) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Formula")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionTitle(title: "How Scores Work")
                            Text("Score = 100 - penalties")
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text("The iOS app reads backend-computed scores from the public API. It does not recompute scoring locally in this release.")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.goNowMutedText)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Score Tiers")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            ForEach(scoreTiers) { tier in
                                formulaRow(tier.range, title: tier.label.rawValue, detail: tier.detail, color: Color.score(tier.label))
                            }
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Hard Gates")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            formulaRow("Rain", title: "Heavy rain or high rain probability", detail: "All modes can be forced to Nope.", color: Color.reason(.danger))
                            formulaRow("Wind", title: "Very gusty run conditions", detail: "Run modes are gated when gusts are too high.", color: Color.reason(.warning))
                            formulaRow("Darkness", title: "No night swimming", detail: "Swim scores ramp down after sunset and then gate.", color: Color.score(.good))
                            formulaRow("Dog Heat", title: "Unsafe dog run heat", detail: "Run + Dog can be forced to Nope when heat or heat plus UV is unsafe.", color: Color.reason(.danger), showDivider: false)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Mode Logic")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            formulaRow("Swim", title: "Waves, rain, UV, AQI, wind, temperature", detail: "Dog swim is stricter on waves.", color: Color.score(.good))
                            formulaRow("Run", title: "Feels-like temperature, UV, AQI, gusts, rain", detail: "Dog run is stricter for heat, UV, and air quality.", color: Color.reason(.warning))
                            formulaRow("Dog", title: "1.2x penalty multiplier", detail: "Heat, UV, and AQI penalties are amplified for dog modes.", color: Color.reason(.danger), showDivider: false)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var scoreTiers: [ScoreTier] {
        [
            .init(range: "85-100", label: .perfect, detail: "Ideal conditions. Go now."),
            .init(range: "70-84", label: .good, detail: "Good conditions with minor trade-offs."),
            .init(range: "45-69", label: .meh, detail: "Mixed conditions. Check details."),
            .init(range: "20-44", label: .bad, detail: "Uncomfortable or potentially unsafe."),
            .init(range: "0-19", label: .nope, detail: "Not recommended.")
        ]
    }

    private func formulaRow(_ leading: String, title: String, detail: String, color: Color, showDivider: Bool = true) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                Text(leading)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                    .frame(width: 72, alignment: .leading)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.goNowSecondaryText)
                    Text(detail)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.goNowMutedText)
                }
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)

            if showDivider {
                Divider().overlay(Color.goNowDivider)
            }
        }
    }
}

struct ScoreTier: Identifiable {
    var id: String { range }
    let range: String
    let label: ScoreLabel
    let detail: String
}
