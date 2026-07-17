import Foundation

/// FCPXML 1.13 export — chapter markers on a gap clip, rational time
/// representation, SYNC marker carries the editor alignment instruction.
public enum FCPXMLExporter {

    public static func generate(session: ExportSessionInfo, markers: [ExportMarker]) -> String {
        let fps = session.frameRate
        let formatId = "r1"
        let eventName = escapeXml(session.name)
        let projectName = escapeXml(session.name)

        // Total duration — last marker + 1 second, minimum 60 seconds.
        let minDurationMs = 60_000.0
        let totalDurationMs = markers.last.map { max($0.timecodeMs + 1000, minDurationMs) } ?? minDurationMs
        let totalDurationFrames = Timecode.msToFrames(totalDurationMs, fps: fps)
        let durationRational = Timecode.framesToRationalTime(totalDurationFrames, fps: fps)

        let markerElements = markers.map { marker -> String in
            let frameCount = Timecode.msToFrames(marker.timecodeMs, fps: fps)
            let startRational = Timecode.framesToRationalTime(frameCount, fps: fps)
            let durationOneFrame = Timecode.framesToRationalTime(1, fps: fps)
            let name = marker.isSyncPoint ? "SYNC" : "Marker \(marker.markerNumber)"
            let note = marker.isSyncPoint
                ? MomenConstants.syncNote
                : (marker.note.isEmpty ? "Marker \(marker.markerNumber)" : marker.note)

            return "            <chapter-marker start=\"\(startRational)\" duration=\"\(durationOneFrame)\" value=\"\(escapeXml(name))\" note=\"\(escapeXml(note))\"/>"
        }.joined(separator: "\n")

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <fcpxml version="1.13">
            <resources>
                <format id="\(formatId)" name="FFVideoFormat\(formatSuffix(fps))" frameDuration="\(Timecode.framesToRationalTime(1, fps: fps))" width="1920" height="1080"/>
            </resources>
            <library>
                <event name="\(eventName)">
                    <project name="\(projectName)">
                        <sequence format="\(formatId)" duration="\(durationRational)" \(tcFormat(fps))>
                            <spine>
                                <gap name="Markers" duration="\(durationRational)" start="0/1s">
        \(markerElements)
                                </gap>
                            </spine>
                        </sequence>
                    </project>
                </event>
            </library>
        </fcpxml>
        """
    }

    static func tcFormat(_ fps: FrameRate) -> String {
        fps.isDropFrame ? "tcStart=\"0/1s\" tcFormat=\"DF\"" : "tcStart=\"0/1s\" tcFormat=\"NDF\""
    }

    static func formatSuffix(_ fps: FrameRate) -> String {
        switch fps {
        case .fps23_976: return "1080p2398"
        case .fps24: return "1080p24"
        case .fps25: return "1080p25"
        case .fps29_97: return "1080p2997"
        case .fps30: return "1080p30"
        }
    }

    static func escapeXml(_ str: String) -> String {
        str.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
