import SwiftUI
import UIKit

struct ShareItem: Identifiable {
    let id = UUID()
    let urls: [URL]
}

/// UIActivityViewController wrapper — native share sheet for export files.
struct ShareSheet: UIViewControllerRepresentable {
    let urls: [URL]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: urls, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
