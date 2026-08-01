import SwiftUI

@main
struct GoNowApp: App {
    @StateObject private var forecastStore = ForecastStore(client: URLSessionForecastClient.live)

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(forecastStore)
        }
    }
}
