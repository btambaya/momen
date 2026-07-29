import SwiftUI
import MomenKit

/// Navigation routes. Flow: Projects → New Project → Clip prefix →
/// Clap sync → Logging; and Project detail → New Clip → Clap sync → Logging.
enum Route: Hashable {
    case createProject
    case clipPrefix(projectID: String)   // set prefix + create first clip
    case projectDetail(projectID: String)
    case clapListen(clipID: String)
    case logging(clipID: String)
}

@Observable
final class Router {
    var path: [Route] = []

    func push(_ route: Route) { path.append(route) }

    /// Swap the top of the stack — equivalent of RN navigation.replace().
    func replace(with route: Route) {
        if path.isEmpty { path = [route] } else { path[path.count - 1] = route }
    }

    func pop() {
        if !path.isEmpty { path.removeLast() }
    }

    func popToRoot() { path.removeAll() }

    /// Pop back to a specific project's detail screen (used after CUT).
    func popTo(projectID: String) {
        if let idx = path.lastIndex(of: .projectDetail(projectID: projectID)) {
            path.removeSubrange((idx + 1)...)
        } else {
            path = [.projectDetail(projectID: projectID)]
        }
    }
}
