import Foundation
import MomenKit

/// Generates all three export formats into a temp directory and returns the
/// file URLs for the share sheet.
enum ExportService {

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

        // Clean old exports to prevent stale file accumulation.
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("monta_exports", isDirectory: true)
        try? FileManager.default.removeItem(at: dir)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        // "_premiere.xml" so it never collides with the FCPXML on case-
        // insensitive file systems and reads clearly in the share sheet.
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
}
