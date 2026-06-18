import SwiftUI

struct ProfileView: View {
    @AppStorage("defaultMode") private var defaultModeRawValue = ActivityMode.swimSolo.rawValue
    @AppStorage("analyticsOptIn") private var analyticsOptIn = true

    var body: some View {
        GoNowScreenBackground(accentLabel: .perfect) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Profile")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "First Release")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            profileRow("Product focus", "Native forecast parity")
                            profileRow("Scoring", "Backend API")
                            profileRow("Account", "Deferred")
                            profileRow("Notifications", "Deferred", showDivider: false)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Preferences")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)

                            Picker("Default mode", selection: $defaultModeRawValue) {
                                ForEach(ActivityMode.allCases) { mode in
                                    Label(mode.title, systemImage: mode.symbolName)
                                        .tag(mode.rawValue)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(.goNowAccent)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 14)

                            Divider().overlay(Color.goNowDivider)

                            Toggle("Help improve GoNow", isOn: $analyticsOptIn)
                                .tint(.goNowAccent)
                                .foregroundStyle(Color.goNowSecondaryText)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 14)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "GoNow")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            navRow("Pipeline Status", subtitle: "API freshness and ingest health", systemImage: "waveform.path.ecg", route: .status)
                            Divider().overlay(Color.goNowDivider)
                            navRow("Formula", subtitle: "Score tiers, gates, and penalties", systemImage: "function", route: .formula)
                            Divider().overlay(Color.goNowDivider)
                            navRow("About", subtitle: "Product notes and data sources", systemImage: "info.circle", route: .about)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Web App")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            profileRow("Status", "Maintained lightly")
                            Link(destination: URL(string: "https://go-now.dev")!) {
                                Label("Open public demo", systemImage: "safari")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(Color.goNowAccent)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 16)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
    }

    private func navRow(_ title: String, subtitle: String, systemImage: String, route: AppRoute) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: 13) {
                Image(systemName: systemImage)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color.goNowAccent)
                    .frame(width: 34, height: 34)
                    .background(Color.goNowAccent.opacity(0.13), in: Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.goNowSecondaryText)
                    Text(subtitle)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.goNowMutedText)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
        }
    }

    private func profileRow(_ title: String, _ value: String, showDivider: Bool = true) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(title)
                    .foregroundStyle(Color.goNowMutedText)
                Spacer()
                Text(value)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.goNowSecondaryText)
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
