import SwiftUI
import SwiftData
import MomenKit

@main
struct MomenApp: App {
    @State private var router = Router()

    let container: ModelContainer = {
        let schema = Schema([Project.self, Clip.self, Marker.self])
        // A distinct store file for the new Project→Clip schema, so a tester
        // upgrading from the earlier Session-based beta gets a clean store
        // instead of a migration crash (the old default.store is left untouched).
        let config = ModelConfiguration(
            "Monta",
            schema: schema,
            url: URL.applicationSupportDirectory.appending(path: "Monta.store"))
        do {
            return try ModelContainer(for: schema, configurations: config)
        } catch {
            fatalError("Failed to create model container: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            NavigationStack(path: $router.path) {
                ProjectsListView()
                    .navigationDestination(for: Route.self) { route in
                        switch route {
                        case .createProject:
                            CreateProjectView()
                        case .clipPrefix(let projectID):
                            ClipPrefixView(projectID: projectID)
                        case .projectDetail(let projectID):
                            ProjectDetailView(projectID: projectID)
                        case .clapListen(let clipID):
                            ClapListenView(clipID: clipID)
                        case .logging(let clipID):
                            LoggingView(clipID: clipID)
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
