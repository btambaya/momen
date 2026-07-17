import SwiftUI
import MomenKit

/// Navigation routes — mirrors the RN RootStackParamList.
enum Route: Hashable {
    case createSession
    case sync(sessionID: String, frameRate: FrameRate)
    case roll(sessionID: String, frameRate: FrameRate, cameraTc: String, cameraTcMs: Double)
    case clapListen(sessionID: String, frameRate: FrameRate)
    case logging(sessionID: String)
}

@Observable
final class Router {
    var path: [Route] = []

    func push(_ route: Route) {
        path.append(route)
    }

    /// Swap the top of the stack — equivalent of RN navigation.replace().
    func replace(with route: Route) {
        if path.isEmpty {
            path = [route]
        } else {
            path[path.count - 1] = route
        }
    }

    func pop() {
        if !path.isEmpty { path.removeLast() }
    }

    func popToRoot() {
        path.removeAll()
    }
}
