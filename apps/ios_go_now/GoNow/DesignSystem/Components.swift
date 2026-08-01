import SwiftUI

struct AppCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = 16

    init(padding: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .background(Color.goNowCard, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(Color.goNowCardBorder, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.18), radius: 20, y: 12)
    }
}

struct GoNowScreenBackground<Content: View>: View {
    var accentLabel: ScoreLabel?
    let content: Content

    init(accentLabel: ScoreLabel? = nil, @ViewBuilder content: () -> Content) {
        self.accentLabel = accentLabel
        self.content = content()
    }

    var body: some View {
        ZStack {
            LinearGradient.goNowBackground
                .ignoresSafeArea()

            if let accentLabel {
                RadialGradient(
                    colors: [Color.score(accentLabel).opacity(accentLabel.tintOpacity), .clear],
                    center: .top,
                    startRadius: 20,
                    endRadius: 420
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)
            }

            content
        }
        .preferredColorScheme(.dark)
    }
}

struct SectionTitle: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.goNowMutedText)
                .textCase(.uppercase)
                .tracking(3.2)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.goNowMutedText)
            }
        }
    }
}

struct ModePicker: View {
    @Binding var selection: ActivityMode

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 0) {
                modeButton(title: "Swim", systemImage: "water.waves", isActive: selection.isSwim) {
                    selection = ActivityMode.composed(activityIsSwim: true, includesDog: selection.includesDog)
                }

                modeButton(title: "Run", systemImage: "figure.run", isActive: !selection.isSwim) {
                    selection = ActivityMode.composed(activityIsSwim: false, includesDog: selection.includesDog)
                }
            }
            .padding(4)
            .background(Color.white.opacity(0.06), in: Capsule())
            .overlay {
                Capsule().stroke(Color.white.opacity(0.08), lineWidth: 1)
            }

            Button {
                selection = ActivityMode.composed(activityIsSwim: selection.isSwim, includesDog: !selection.includesDog)
            } label: {
                Label("With Dog", systemImage: "pawprint")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(selection.includesDog ? .white : Color.goNowMutedText)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(selection.includesDog ? Color.white.opacity(0.12) : Color.white.opacity(0.035), in: Capsule())
                    .overlay {
                        Capsule().stroke(Color.white.opacity(selection.includesDog ? 0.16 : 0.08), lineWidth: 1)
                    }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("With dog")
            .accessibilityValue(selection.includesDog ? "On" : "Off")
        }
        .accessibilityLabel("Activity mode")
    }

    private func modeButton(title: String, systemImage: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(isActive ? .white : Color.goNowMutedText)
                .frame(width: 104, height: 46)
                .background(isActive ? Color.white.opacity(0.14) : .clear, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }
}

struct ScoreBadge: View {
    let score: ModeScore
    var size: CGFloat = 72

    var body: some View {
        Text(score.score.formatted())
            .font(.system(size: size * 0.34, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(LinearGradient.score(score.label))
                    .shadow(color: Color.score(score.label).opacity(0.34), radius: 18, y: 8)
            )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(score.score), \(score.label.accessibilitySummary)")
    }
}

struct HeroScoreView: View {
    let score: ModeScore
    let mode: ActivityMode

    var body: some View {
        VStack(spacing: 8) {
            HStack(alignment: .center, spacing: 24) {
                ActivityGlyphs(mode: mode)

                Text(score.score.formatted())
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.65)
                    .lineLimit(1)
                    .monospacedDigit()
                    .foregroundStyle(Color.score(score.label))
                    .shadow(color: Color.score(score.label).opacity(0.42), radius: 32)
                    .accessibilityLabel("\(score.score)")
            }
            .frame(maxWidth: .infinity)

            Text(score.label.rawValue)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color.score(score.label))

            Text(score.hardGated ? "Nope. \(score.reasons.first?.text ?? "Conditions are gated.")" : vibeLine(for: score.label))
                .font(.system(size: 17, weight: .medium))
                .italic()
                .foregroundStyle(Color.goNowMutedText)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 18)
        }
        .padding(.top, 10)
        .padding(.bottom, 6)
    }

    private func vibeLine(for label: ScoreLabel) -> String {
        switch label {
        case .perfect: "Sea glass smooth. You know what to do."
        case .good: "Pretty good out there. A few things to know."
        case .meh: "Could go either way. Your call."
        case .bad: "The coast says not today. Trust it."
        case .nope: "Somewhere between no and absolutely not."
        }
    }
}

struct ActivityGlyphs: View {
    let mode: ActivityMode

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if mode.includesDog {
                Image(systemName: "dog.fill")
                    .font(.system(size: 38, weight: .semibold))
                    .offset(y: 6)
            }
            Image(systemName: mode.isSwim ? "figure.pool.swim" : "figure.run")
                .font(.system(size: 62, weight: .semibold))
        }
        .symbolRenderingMode(.hierarchical)
        .foregroundStyle(Color.score(.perfect))
        .frame(width: 112, alignment: .trailing)
        .accessibilityHidden(true)
    }
}

struct ConditionsStrip: View {
    let hour: ScoredHour

    var body: some View {
        HStack(spacing: 0) {
            ConditionMetric(systemImage: "thermometer.medium", label: "Feels", value: hour.feelslikeC.formattedMetric("°", digits: 0), severity: severity(feelsLike: hour.feelslikeC))
            ConditionMetric(systemImage: "water.waves", label: "Waves", value: hour.waveHeightM.formattedMetric("m"), severity: severity(waves: hour.waveHeightM))
            ConditionMetric(systemImage: "wind", label: "Wind", value: hour.windMs.formattedMetric("m/s", digits: 0), severity: severity(wind: hour.windMs))
            ConditionMetric(systemImage: "sun.max", label: "UV", value: hour.uvIndex.formattedMetric("", digits: 0), severity: severity(uv: hour.uvIndex))
            ConditionMetric(systemImage: "aqi.medium", label: "AQI", value: hour.euAqi.formattedMetric(""), severity: severity(aqi: hour.euAqi))
            ConditionMetric(systemImage: "cloud.rain", label: "Rain", value: hour.precipProbPct.formattedMetric("%"), severity: severity(rain: hour.precipProbPct))
        }
        .frame(maxWidth: .infinity)
    }

    private func severity(feelsLike value: Double?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 30 || value <= 8 { return .danger }
        if value >= 26 || value <= 13 { return .warning }
        return .check
    }

    private func severity(waves value: Double?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 1.2 { return .danger }
        if value >= 0.7 { return .warning }
        return .check
    }

    private func severity(wind value: Double?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 10 { return .danger }
        if value >= 6 { return .warning }
        return .check
    }

    private func severity(uv value: Double?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 8 { return .danger }
        if value >= 5 { return .warning }
        return .check
    }

    private func severity(aqi value: Int?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 150 { return .danger }
        if value >= 80 { return .warning }
        return .check
    }

    private func severity(rain value: Int?) -> ReasonSeverity {
        guard let value else { return .info }
        if value >= 70 { return .danger }
        if value >= 30 { return .warning }
        return .check
    }
}

struct ConditionMetric: View {
    let systemImage: String
    let label: String
    let value: String
    let severity: ReasonSeverity

    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: systemImage)
                .font(.system(size: 18, weight: .semibold))
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.4)
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .monospacedDigit()
        }
        .foregroundStyle(Color.reason(severity))
        .frame(maxWidth: .infinity)
        .minimumScaleFactor(0.72)
    }
}

struct ReasonChipView: View {
    let chip: ReasonChip

    var body: some View {
        Label(chip.text, systemImage: symbolName)
            .font(.system(size: 12, weight: .semibold))
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .foregroundStyle(Color.reason(chip.emoji))
            .background(Color.reason(chip.emoji).opacity(0.13), in: Capsule())
    }

    private var symbolName: String {
        switch chip.emoji {
        case .check: "checkmark.circle.fill"
        case .warning: "exclamationmark.triangle.fill"
        case .danger: "xmark.octagon.fill"
        case .info: "info.circle.fill"
        }
    }
}

struct FreshnessBadge: View {
    let ageMinutes: Int

    var body: some View {
        let state = ForecastAnalytics.freshnessState(ageMinutes: ageMinutes)
        HStack(spacing: 8) {
            Circle()
                .fill(color(for: state))
                .frame(width: 8, height: 8)
            Image(systemName: "clock")
                .font(.system(size: 14, weight: .semibold))
            Text(label)
        }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(color(for: state))
            .accessibilityLabel("Updated \(label)")
    }

    private var label: String {
        if ageMinutes < 60 { return "\(ageMinutes)m ago" }
        return "\(Int(round(Double(ageMinutes) / 60.0)))h ago"
    }

    private func color(for state: FreshnessState) -> Color {
        switch state {
        case .fresh: .goNowAccent
        case .stale: Color.reason(.warning)
        case .veryStale: Color.reason(.danger)
        }
    }
}

struct LoadingRowsView: View {
    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 72)
                    .redacted(reason: .placeholder)
            }
        }
        .accessibilityLabel("Loading forecast")
    }
}

struct EmptyStateView: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        ContentUnavailableView(title, systemImage: systemImage, description: Text(message))
            .foregroundStyle(.white, Color.goNowMutedText)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var point = CGPoint.zero
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if point.x > 0, point.x + size.width > width {
                point.x = 0
                point.y += rowHeight + spacing
                rowHeight = 0
            }
            rowHeight = max(rowHeight, size.height)
            point.x += size.width + spacing
        }
        return CGSize(width: width, height: point.y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var point = bounds.origin
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if point.x > bounds.minX, point.x + size.width > bounds.maxX {
                point.x = bounds.minX
                point.y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: point, proposal: ProposedViewSize(size))
            rowHeight = max(rowHeight, size.height)
            point.x += size.width + spacing
        }
    }
}
