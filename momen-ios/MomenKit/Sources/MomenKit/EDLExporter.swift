import Foundation

/// CMX 3600 EDL export — single-frame edit event per marker, drop-frame
/// notation for 29.97fps, SYNC marker carries the alignment instruction.
public enum EDLExporter {

    public static func generate(session: ExportSessionInfo, markers: [ExportMarker]) -> String {
        let fps = session.frameRate
        let fcm = fps.isDropFrame ? "DROP FRAME" : "NON-DROP FRAME"

        let header = "TITLE: \(session.name)\nFCM: \(fcm)\n"

        let events = markers.enumerated().map { index, marker -> String in
            let eventNum = String(format: "%03d", index + 1)
            let sourceIn = Timecode.formatForEdl(marker.timecodeSmpte, fps: fps)

            let outMs = Timecode.addOneSecondMs(marker.timecodeMs, fps: fps)
            let sourceOut = Timecode.formatForEdl(Timecode.msToSmpte(outMs, fps: fps), fps: fps)

            let recordIn = sourceIn
            let recordOut = sourceOut

            let markerName = marker.isSyncPoint ? "SYNC" : "Marker \(marker.markerNumber)"
            let rawNote = marker.isSyncPoint
                ? MomenConstants.syncNote
                : (marker.note.isEmpty ? "Marker \(marker.markerNumber)" : marker.note)
            let note = sanitizeComment(rawNote)

            let color = marker.isSyncPoint ? "RED" : "BLUE"

            var lines = [
                "\(eventNum)  AX       V     C        \(sourceIn) \(sourceOut) \(recordIn) \(recordOut)",
                "* FROM CLIP NAME: \(sanitizeComment(markerName))",
            ]
            if !note.isEmpty {
                lines.append("* LOC: \(recordIn) \(color)     \(note)")
            }
            return lines.joined(separator: "\n")
        }

        return header + "\n" + events.joined(separator: "\n\n") + "\n"
    }

    /// EDL comment lines start with '*' — collapse newlines and strip leading
    /// asterisks so user notes can't break the parser.
    static func sanitizeComment(_ text: String) -> String {
        var result = text.replacingOccurrences(
            of: "[\\r\\n]+", with: " ", options: .regularExpression)
        result = result.replacingOccurrences(
            of: "^\\*+\\s*", with: "", options: .regularExpression)
        return result.trimmingCharacters(in: .whitespaces)
    }
}
