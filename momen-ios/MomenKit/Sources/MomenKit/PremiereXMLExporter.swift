import Foundation

/// Final Cut Pro 7 XML (xmeml) export tuned for Premiere Pro.
///
/// Premiere imports each marker as an *offline clip*. This exporter places
/// those clips on **video track 2 (V2)** — an empty V1 track sits below them —
/// and puts each marker's note into the clip's **Description** field (FCP7
/// `<logginginfo><description>`), which is what the DOP's offline-file dialog
/// exposes. Scene / Shot-Take / Log Note are left open for future mapping.
public enum PremiereXMLExporter {

    /// Each marker clip is one nominal second long, matching the EDL events.
    public static func generate(session: ExportSessionInfo, markers: [ExportMarker]) -> String {
        let fps = session.frameRate
        let timebase = fps.nominalFps
        let ntsc = (fps == .fps23_976 || fps == .fps29_97) ? "TRUE" : "FALSE"
        let df = fps.isDropFrame ? "DF" : "NDF"
        let clipFrames = timebase                    // ~1 second per clip
        let seqName = escape(session.name)

        let lastFrame = markers.last.map { Timecode.msToFrames($0.timecodeMs, fps: fps) } ?? 0
        let minFrames = 60 * timebase                // 60-second minimum
        let seqDuration = max(lastFrame + clipFrames, minFrames)

        let clipItems = markers.enumerated().map { index, marker -> String in
            let startFrame = Timecode.msToFrames(marker.timecodeMs, fps: fps)
            let name = marker.isSyncPoint ? "SYNC" : "Marker \(marker.markerNumber)"
            // The note is what the DOP wants in Description; SYNC carries the
            // alignment instruction.
            let description = marker.isSyncPoint ? MomenConstants.syncNote : marker.note

            return """
                    <clipitem id="clipitem-\(index + 1)">
                      <name>\(escape(name))</name>
                      <enabled>TRUE</enabled>
                      <duration>\(clipFrames)</duration>
                      <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
                      <start>\(startFrame)</start>
                      <end>\(startFrame + clipFrames)</end>
                      <in>0</in>
                      <out>\(clipFrames)</out>
                      <file id="file-\(index + 1)">
                        <name>\(escape(name))</name>
                        <pathurl></pathurl>
                        <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
                        <duration>\(clipFrames)</duration>
                        <media><video><samplecharacteristics><width>1920</width><height>1080</height></samplecharacteristics></video></media>
                        <timecode>
                          <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
                          <string>00:00:00\(fps.isDropFrame ? ";" : ":")00</string>
                          <frame>0</frame>
                          <displayformat>\(df)</displayformat>
                          <reel><name>AX</name></reel>
                        </timecode>
                      </file>
                      <logginginfo>
                        <description>\(escape(description))</description>
                        <scene></scene>
                        <shottake></shottake>
                        <lognote></lognote>
                      </logginginfo>
                    </clipitem>
            """
        }.joined(separator: "\n")

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE xmeml>
        <xmeml version="4">
          <sequence id="sequence-1">
            <name>\(seqName)</name>
            <duration>\(seqDuration)</duration>
            <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
            <timecode>
              <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
              <string>00:00:00\(fps.isDropFrame ? ";" : ":")00</string>
              <frame>0</frame>
              <displayformat>\(df)</displayformat>
            </timecode>
            <media>
              <video>
                <format>
                  <samplecharacteristics>
                    <rate><timebase>\(timebase)</timebase><ntsc>\(ntsc)</ntsc></rate>
                    <width>1920</width><height>1080</height>
                  </samplecharacteristics>
                </format>
                <track></track>
                <track>
        \(clipItems)
                </track>
              </video>
            </media>
          </sequence>
        </xmeml>
        """
    }

    static func escape(_ str: String) -> String {
        str.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
