import XCTest
@testable import MomenKit

final class ClipNamingTests: XCTestCase {

    func testNormalizePrefix() {
        XCTAssertEqual(ClipNaming.normalizePrefix("MONTACLIP"), "MONTACLIP")
        XCTAssertEqual(ClipNaming.normalizePrefix("monta clip 1"), "montaclip1") // spaces dropped
        XCTAssertEqual(ClipNaming.normalizePrefix("A_B-C"), "A_B-C")
        XCTAssertEqual(ClipNaming.normalizePrefix("clip_"), "clip")               // trailing sep stripped
        XCTAssertEqual(ClipNaming.normalizePrefix("  "), "CLIP")                  // empty fallback
        XCTAssertEqual(ClipNaming.normalizePrefix("shot#1!"), "shot1")            // punctuation dropped
    }

    func testName() {
        XCTAssertEqual(ClipNaming.name(prefix: "MONTACLIP", number: 1), "MONTACLIP_001")
        XCTAssertEqual(ClipNaming.name(prefix: "MONTACLIP", number: 2), "MONTACLIP_002")
        XCTAssertEqual(ClipNaming.name(prefix: "X", number: 42), "X_042")
        XCTAssertEqual(ClipNaming.name(prefix: "A", number: 100), "A_100")
    }
}

final class PremiereXMLTests: XCTestCase {

    func makeSession(fps: FrameRate = .fps24) -> ExportSessionInfo {
        ExportSessionInfo(name: "MONTACLIP_001", date: Date(timeIntervalSince1970: 0), frameRate: fps)
    }

    func marker(_ n: Int, ms: Double, note: String = "", sync: Bool = false) -> ExportMarker {
        ExportMarker(markerNumber: n, timecodeMs: ms,
                     timecodeSmpte: Timecode.msToSmpte(ms, fps: .fps24),
                     note: note, isSyncPoint: sync)
    }

    func testStructureAndV2Placement() {
        let xml = PremiereXMLExporter.generate(
            session: makeSession(),
            markers: [marker(1, ms: 5000, note: "focus soft")])
        XCTAssertTrue(xml.contains("<!DOCTYPE xmeml>"))
        XCTAssertTrue(xml.contains("<xmeml version=\"4\">"))
        // Two video tracks: an empty V1 then V2 carrying the clip.
        XCTAssertTrue(xml.contains("<track></track>"))
        XCTAssertTrue(xml.contains("<clipitem id=\"clipitem-1\">"))
        // The empty V1 track must appear before the clip (clip is on V2).
        let emptyTrack = xml.range(of: "<track></track>")!
        let clip = xml.range(of: "<clipitem")!
        XCTAssertTrue(emptyTrack.lowerBound < clip.lowerBound)
    }

    func testNoteLandsInDescription() {
        let xml = PremiereXMLExporter.generate(
            session: makeSession(),
            markers: [marker(1, ms: 1000, note: "great take")])
        XCTAssertTrue(xml.contains("<description>great take</description>"))
    }

    func testStartFrameFromTimecode() {
        // 5s at 24fps = frame 120.
        let xml = PremiereXMLExporter.generate(
            session: makeSession(), markers: [marker(1, ms: 5000, note: "x")])
        XCTAssertTrue(xml.contains("<start>120</start>"))
        XCTAssertTrue(xml.contains("<end>144</end>")) // + 24 frames (1s)
    }

    func testSyncMarkerDescription() {
        let xml = PremiereXMLExporter.generate(
            session: makeSession(),
            markers: [marker(1, ms: 0, sync: true)])
        XCTAssertTrue(xml.contains("<name>SYNC</name>"))
        XCTAssertTrue(xml.contains(MomenConstants.syncNote))
    }

    func testNtscAndDropFrameFlags() {
        let df = PremiereXMLExporter.generate(
            session: makeSession(fps: .fps29_97), markers: [marker(1, ms: 0, note: "x")])
        XCTAssertTrue(df.contains("<ntsc>TRUE</ntsc>"))
        XCTAssertTrue(df.contains("<displayformat>DF</displayformat>"))

        let ndf = PremiereXMLExporter.generate(
            session: makeSession(fps: .fps25), markers: [marker(1, ms: 0, note: "x")])
        XCTAssertTrue(ndf.contains("<ntsc>FALSE</ntsc>"))
        XCTAssertTrue(ndf.contains("<displayformat>NDF</displayformat>"))
    }

    func testEscapesNoteAndName() {
        let xml = PremiereXMLExporter.generate(
            session: makeSession(),
            markers: [marker(1, ms: 0, note: "a & b <c>")])
        XCTAssertTrue(xml.contains("a &amp; b &lt;c&gt;"))
    }
}
