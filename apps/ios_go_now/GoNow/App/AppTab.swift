import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case today
    case planner
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: "Today"
        case .planner: "Planner"
        case .profile: "Profile"
        }
    }

    var symbolName: String {
        switch self {
        case .today: "sun.max.fill"
        case .planner: "calendar"
        case .profile: "person.crop.circle"
        }
    }
}

enum AppRoute: Hashable {
    case hour(Date)
    case status
    case formula
    case about
}
