import SwiftUI

struct AppRootView: View {
    @State private var selectedTab: AppTab = .today
    @State private var todayPath: [AppRoute] = []
    @State private var plannerPath: [AppRoute] = []
    @State private var profilePath: [AppRoute] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $todayPath) {
                TodayView()
                    .navigationDestination(for: AppRoute.self) { routeDestination($0) }
            }
            .tabItem { Label(AppTab.today.title, systemImage: AppTab.today.symbolName) }
            .tag(AppTab.today)

            NavigationStack(path: $plannerPath) {
                PlannerView()
                    .navigationDestination(for: AppRoute.self) { routeDestination($0) }
            }
            .tabItem { Label(AppTab.planner.title, systemImage: AppTab.planner.symbolName) }
            .tag(AppTab.planner)

            NavigationStack(path: $profilePath) {
                ProfileView()
                    .navigationDestination(for: AppRoute.self) { routeDestination($0) }
            }
            .tabItem { Label(AppTab.profile.title, systemImage: AppTab.profile.symbolName) }
            .tag(AppTab.profile)
        }
        .tint(.goNowAccent)
    }

    @ViewBuilder
    private func routeDestination(_ route: AppRoute) -> some View {
        switch route {
        case .hour:
            EmptyView()
        case .status:
            StatusView(client: URLSessionForecastClient.live)
        case .formula:
            FormulaView()
        case .about:
            AboutView()
        }
    }
}
