import SwiftUI

struct AboutView: View {
    var body: some View {
        GoNowScreenBackground(accentLabel: .perfect) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("About")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)

                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("One answer for the Tel Aviv coast.")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundStyle(.white)
                            Text("GoNow combines waves, weather, UV, rain, wind, and air quality into hourly swim and run scores for solo outings or dog-friendly plans.")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.goNowMutedText)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "Data Sources")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            aboutRow("Open-Meteo", "Marine, weather, UV, rain, wind, and temperature forecasts.")
                            aboutRow("AQICN", "Ground air-quality readings for the Tel Aviv area.")
                            aboutRow("GoNow API", "Backend scoring and public forecast contract.", showDivider: false)
                        }
                    }

                    AppCard(padding: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionTitle(title: "First iOS Release")
                                .padding(.horizontal, 18)
                                .padding(.vertical, 18)
                            Divider().overlay(Color.goNowDivider)
                            aboutRow("Native first", "The iOS app is now the primary product experience.")
                            aboutRow("Backend scoring", "Scoring remains API-owned for maintainability.")
                            aboutRow("Web app", "Kept working as a public demo and status surface.", showDivider: false)
                        }
                    }

                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Link(destination: URL(string: "https://go-now.dev")!) {
                                Label("Open go-now.dev", systemImage: "safari")
                            }
                            Link(destination: URL(string: "https://github.com/NitBuk/go-now")!) {
                                Label("View on GitHub", systemImage: "chevron.left.forwardslash.chevron.right")
                            }
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.goNowAccent)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func aboutRow(_ title: String, _ detail: String, showDivider: Bool = true) -> some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goNowSecondaryText)
                Text(detail)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.goNowMutedText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)

            if showDivider {
                Divider().overlay(Color.goNowDivider)
            }
        }
    }
}
