import SwiftUI
import SwiftData
import MomenKit

@main
struct MomenApp: App {
    @State private var router = Router()

    let container: ModelContainer = {
        do {
            return try ModelContainer(for: Session.self, Marker.self)
        } catch {
            fatalError("Failed to create model container: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            NavigationStack(path: $router.path) {
                SessionsListView()
                    .navigationDestination(for: Route.self) { route in
                        switch route {
                        case .createSession:
                            CreateSessionView()
                        case .sync(let sessionID, let frameRate):
                            SyncView(sessionID: sessionID, frameRate: frameRate)
                        case .roll(let sessionID, let frameRate, let cameraTc, let cameraTcMs):
                            RollView(
                                sessionID: sessionID, frameRate: frameRate,
                                cameraTc: cameraTc, cameraTcMs: cameraTcMs)
                        case .clapListen(let sessionID, let frameRate):
                            ClapListenView(sessionID: sessionID, frameRate: frameRate)
                        case .logging(let sessionID):
                            LoggingView(sessionID: sessionID)
                        }
                    }
            }
            .environment(router)
            .preferredColorScheme(.dark)
            .tint(Theme.coralText)
        }
        .modelContainer(container)
    }
}
