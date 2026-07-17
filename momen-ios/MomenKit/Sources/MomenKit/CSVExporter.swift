import Foundation

/// CSV export — one row per marker.
/// Columns: Marker Number, Timecode, Duration, Note, Sync Point
public enum CSVExporter {

    public static func generate(markers: [ExportMarker], fps: FrameRate) -> String {
        let header = "Marker Number,Timecode,Duration,Note,Sync Point"
        // 1-second duration uses the same separator convention as the row's timecode.
        let duration = fps.isDropFrame ? "00:00:01;00" : "00:00:01:00"

        let rows = markers.map { marker -> String in
            let note = marker.isSyncPoint
                ? escape(MomenConstants.syncNote)
                : escape(marker.note)
            let syncPoint = marker.isSyncPoint ? "TRUE" : "FALSE"
            return "\(marker.markerNumber),\(marker.timecodeSmpte),\(duration),\(note),\(syncPoint)"
        }

        return ([header] + rows).joined(separator: "\n")
    }

    static func escape(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
    }
}
