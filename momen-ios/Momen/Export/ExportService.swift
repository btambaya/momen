import Foundation
import MomenKit

/// A single export format, so both the per-clip share and the project-level
/// bundle can be driven from one place.
enum ExportFormat: String, CaseIterable, Identifiable {
    case premiereXML, fcpxml, edl, csv
    var id: String { rawValue }

    var label: String {
        switch self {
        case .premiereXML: return "Premiere XML  —  notes on V2"
        case .fcpxml: return "FCPXML  —  Final Cut / Resolve"
        case .edl: return "EDL  —  Premiere / Resolve"
        case .csv: return "CSV  —  Universal"
        }
    }

    /// File name for a clip's export in this format (used inside a project folder).
    func fileName(clipName: String) -> String {
        switch self {
        case .premiereXML: return "\(clipName)_premiere.xml"
        case .fcpxml: return "\(clipName).fcpxml"
        case .edl: return "\(clipName).edl"
        case .csv: return "\(clipName).csv"
        }
    }

    func content(info: ExportSessionInfo, markers: [ExportMarker]) -> String {
        switch self {
        case .premiereXML: return PremiereXMLExporter.generate(session: info, markers: markers)
        case .fcpxml: return FCPXMLExporter.generate(session: info, markers: markers)
        case .edl: return EDLExporter.generate(session: info, markers: markers)
        case .csv: return CSVExporter.generate(markers: markers, fps: info.frameRate)
        }
    }
}

enum ExportService {

    enum ExportError: Error { case noMarkers, zipFailed }

    // ─── Per-clip export (Logging screen) ───────────────────

    struct Result {
        let premiereXML: URL
        let fcpxml: URL
        let edl: URL
        let csv: URL

        var all: [URL] { [premiereXML, fcpxml, edl, csv] }
    }

    static func generateFiles(for clip: Clip) throws -> Result {
        let info = clip.exportInfo
        let markers = clip.sortedMarkers.map(\.exportMarker)
        let baseName = info.exportBaseName

        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("monta_exports", isDirectory: true)
        try? FileManager.default.removeItem(at: dir)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let premiereURL = dir.appendingPathComponent("\(baseName)_premiere.xml")
        let fcpxmlURL = dir.appendingPathComponent("\(baseName).fcpxml")
        let edlURL = dir.appendingPathComponent("\(baseName).edl")
        let csvURL = dir.appendingPathComponent("\(baseName).csv")

        try PremiereXMLExporter.generate(session: info, markers: markers)
            .write(to: premiereURL, atomically: true, encoding: .utf8)
        try FCPXMLExporter.generate(session: info, markers: markers)
            .write(to: fcpxmlURL, atomically: true, encoding: .utf8)
        try EDLExporter.generate(session: info, markers: markers)
            .write(to: edlURL, atomically: true, encoding: .utf8)
        try CSVExporter.generate(markers: markers, fps: info.frameRate)
            .write(to: csvURL, atomically: true, encoding: .utf8)

        return Result(premiereXML: premiereURL, fcpxml: fcpxmlURL, edl: edlURL, csv: csvURL)
    }

    // ─── Whole-project export (Project screen) ──────────────

    /// Export every clip in the project as its own file(s), grouped in a folder
    /// named after the project, and zip it for sharing. Clips with no markers
    /// are skipped. `formats` = which formats to write per clip.
    static func generateProjectZip(for project: Project, formats: [ExportFormat]) throws -> URL {
        let safeProject = sanitize(project.name)

        let base = FileManager.default.temporaryDirectory
            .appendingPathComponent("monta_project_export", isDirectory: true)
        try? FileManager.default.removeItem(at: base)
        let root = base.appendingPathComponent(safeProject, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)

        var wroteAny = false
        for clip in project.sortedClips {
            let markers = clip.sortedMarkers.map(\.exportMarker)
            guard !markers.isEmpty else { continue }
            let info = clip.exportInfo
            let clipName = sanitize(clip.name)
            for fmt in formats {
                let url = root.appendingPathComponent(fmt.fileName(clipName: clipName))
                try fmt.content(info: info, markers: markers)
                    .write(to: url, atomically: true, encoding: .utf8)
            }
            wroteAny = true
        }
        guard wroteAny else { throw ExportError.noMarkers }

        return try zipFolder(root)
    }

    /// Zip a folder using NSFileCoordinator's `.forUploading` option (no third-
    /// party zip lib). The archive's root entry is the folder itself, so the
    /// editor unzips straight into a project-named folder.
    private static func zipFolder(_ folderURL: URL) throws -> URL {
        var zipURL: URL?
        var coordError: NSError?
        NSFileCoordinator().coordinate(
            readingItemAt: folderURL, options: [.forUploading], error: &coordError
        ) { tempURL in
            let dest = folderURL.deletingLastPathComponent()
                .appendingPathComponent(folderURL.lastPathComponent + ".zip")
            try? FileManager.default.removeItem(at: dest)
            do {
                try FileManager.default.copyItem(at: tempURL, to: dest)
                zipURL = dest
            } catch {
                zipURL = nil
            }
        }
        if let coordError { throw coordError }
        guard let zipURL else { throw ExportError.zipFailed }
        return zipURL
    }

    private static func sanitize(_ name: String) -> String {
        let cleaned = name.map { ch -> Character in
            (ch.isLetter && ch.isASCII) || (ch.isNumber && ch.isASCII) || ch == "_" || ch == "-" ? ch : "_"
        }
        let s = String(cleaned).trimmingCharacters(in: CharacterSet(charactersIn: "_"))
        return s.isEmpty ? "Project" : s
    }
}
