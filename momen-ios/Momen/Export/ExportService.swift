import Foundation
import MomenKit

/// Generates all three export formats into a temp directory and returns the
/// file URLs for the share sheet.
enum ExportService {

    struct Result {
        let csv: URL
        let fcpxml: URL
        let edl: URL
    }

    static func generateFiles(for session: Session) throws -> Result {
        let info = session.exportInfo
        let markers = session.sortedMarkers.map(\.exportMarker)
        let baseName = info.exportBaseName

        // Clean old exports to prevent stale file accumulation.
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("momen_exports", isDirectory: true)
        try? FileManager.default.removeItem(at: dir)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let csvURL = dir.appendingPathComponent("\(baseName).csv")
        let fcpxmlURL = dir.appendingPathComponent("\(baseName).fcpxml")
        let edlURL = dir.appendingPathComponent("\(baseName).edl")

        try CSVExporter.generate(markers: markers, fps: info.frameRate)
            .write(to: csvURL, atomically: true, encoding: .utf8)
        try FCPXMLExporter.generate(session: info, markers: markers)
            .write(to: fcpxmlURL, atomically: true, encoding: .utf8)
        try EDLExporter.generate(session: info, markers: markers)
            .write(to: edlURL, atomically: true, encoding: .utf8)

        return Result(csv: csvURL, fcpxml: fcpxmlURL, edl: edlURL)
    }
}
