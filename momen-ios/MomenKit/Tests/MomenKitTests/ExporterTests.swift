import XCTest
@testable import MomenKit

final class ExporterTests: XCTestCase {

    func makeMarker(
        number: Int, ms: Double, smpte: String, note: String = "", sync: Bool = false
    ) -> ExportMarker {
        ExportMarker(
            markerNumber: number, timecodeMs: ms, timecodeSmpte: smpte,
            note: note, isSyncPoint: sync)
    }

    func makeSession(name: String = "Test Shoot", fps: FrameRate = .fps24) -> ExportSessionInfo {
        ExportSessionInfo(
            name: name,
            date: Date(timeIntervalSince1970: 1_747_267_200), // 2025-05-15 UTC
            frameRate: fps)
    }

    // ─── CSV ────────────────────────────────────────────────

    func testCSVHeaderAndRow() {
        let csv = CSVExporter.generate(
            markers: [makeMarker(number: 1, ms: 1000, smpte: "00:00:01:00", note: "Great take")],
            fps: .fps24)
        let lines = csv.split(separator: "\n", omittingEmptySubsequences: false)
        XCTAssertEqual(lines[0], "Marker Number,Timecode,Duration,Note,Sync Point")
        XCTAssertEqual(lines[1], "1,00:00:01:00,00:00:01:00,Great take,FALSE")
    }

    func testCSVSyncMarkerUsesSyncNoteAndTrue() {
        let csv = CSVExporter.generate(
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00:00", sync: true)],
            fps: .fps24)
        XCTAssertTrue(csv.contains(MomenConstants.syncNote))
        XCTAssertTrue(csv.hasSuffix("TRUE"))
    }

    func testCSVEscapesCommasAndQuotes() {
        let csv = CSVExporter.generate(
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00:00", note: "hello, \"world\"")],
            fps: .fps24)
        XCTAssertTrue(csv.contains("\"hello, \"\"world\"\"\""))
    }

    func testCSVDropFrameDurationUsesSemicolon() {
        let csv = CSVExporter.generate(
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00;00")],
            fps: .fps29_97)
        XCTAssertTrue(csv.contains(",00:00:01;00,"))
    }

    // ─── FCPXML ─────────────────────────────────────────────

    func testFCPXMLStructure24fps() {
        let xml = FCPXMLExporter.generate(
            session: makeSession(),
            markers: [makeMarker(number: 1, ms: 1000, smpte: "00:00:01:00", note: "Take 1")])
        XCTAssertTrue(xml.hasPrefix("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))
        XCTAssertTrue(xml.contains("<fcpxml version=\"1.13\">"))
        XCTAssertTrue(xml.contains("name=\"FFVideoFormat1080p24\""))
        XCTAssertTrue(xml.contains("frameDuration=\"100/2400s\""))
        XCTAssertTrue(xml.contains("tcStart=\"0/1s\" tcFormat=\"NDF\""))
        // 1000ms at 24fps = frame 24 → 2400/2400s
        XCTAssertTrue(xml.contains("<chapter-marker start=\"2400/2400s\" duration=\"100/2400s\" value=\"Marker 1\" note=\"Take 1\"/>"))
        // Min duration 60s = 1440 frames at 24fps
        XCTAssertTrue(xml.contains("duration=\"144000/2400s\""))
    }

    func testFCPXMLDropFrameFormat() {
        let xml = FCPXMLExporter.generate(
            session: makeSession(fps: .fps29_97),
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00;00", sync: true)])
        XCTAssertTrue(xml.contains("tcFormat=\"DF\""))
        XCTAssertTrue(xml.contains("name=\"FFVideoFormat1080p2997\""))
        XCTAssertTrue(xml.contains("frameDuration=\"1001/30000s\""))
        XCTAssertTrue(xml.contains("value=\"SYNC\""))
    }

    func testFCPXMLEscapesSessionName() {
        let xml = FCPXMLExporter.generate(
            session: ExportSessionInfo(
                name: "Doc & <Shoot>", date: Date(timeIntervalSince1970: 0), frameRate: .fps24),
            markers: [])
        XCTAssertTrue(xml.contains("Doc &amp; &lt;Shoot&gt;"))
        XCTAssertFalse(xml.contains("Doc & <Shoot>"))
    }

    func testFCPXMLEmptyNoteFallsBackToMarkerName() {
        let xml = FCPXMLExporter.generate(
            session: makeSession(),
            markers: [makeMarker(number: 3, ms: 0, smpte: "00:00:00:00")])
        XCTAssertTrue(xml.contains("note=\"Marker 3\""))
    }

    // ─── EDL ────────────────────────────────────────────────

    func testEDLHeaderAndEvent() {
        let edl = EDLExporter.generate(
            session: makeSession(name: "My Shoot"),
            markers: [makeMarker(number: 1, ms: 1000, smpte: "00:00:01:00", note: "Take 1")])
        XCTAssertTrue(edl.hasPrefix("TITLE: My Shoot\nFCM: NON-DROP FRAME\n"))
        XCTAssertTrue(edl.contains("001  AX       V     C        00:00:01:00 00:00:02:00 00:00:01:00 00:00:02:00"))
        XCTAssertTrue(edl.contains("* FROM CLIP NAME: Marker 1"))
        XCTAssertTrue(edl.contains("* LOC: 00:00:01:00 BLUE     Take 1"))
    }

    func testEDLDropFrame() {
        let edl = EDLExporter.generate(
            session: makeSession(fps: .fps29_97),
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00;00", sync: true)])
        XCTAssertTrue(edl.contains("FCM: DROP FRAME"))
        XCTAssertTrue(edl.contains("* FROM CLIP NAME: SYNC"))
        XCTAssertTrue(edl.contains(" RED     "))
        // Source out is 1 nominal second later, semicolon notation.
        XCTAssertTrue(edl.contains("00:00:00;00 00:00:01;00"))
    }

    func testEDLSanitizesNotes() {
        let edl = EDLExporter.generate(
            session: makeSession(),
            markers: [makeMarker(number: 1, ms: 0, smpte: "00:00:00:00", note: "** evil\nnote")])
        XCTAssertTrue(edl.contains("* LOC: 00:00:00:00 BLUE     evil note"))
    }

    func testEDLEventNumbersIncrement() {
        let edl = EDLExporter.generate(
            session: makeSession(),
            markers: [
                makeMarker(number: 1, ms: 0, smpte: "00:00:00:00"),
                makeMarker(number: 2, ms: 1000, smpte: "00:00:01:00"),
            ])
        XCTAssertTrue(edl.contains("001  AX"))
        XCTAssertTrue(edl.contains("002  AX"))
    }

    // ─── Export filename ────────────────────────────────────

    func testExportBaseName() {
        let session = ExportSessionInfo(
            name: "Doc Shoot: Day 1!",
            date: Date(timeIntervalSince1970: 1_747_267_200), // 2025-05-15 UTC
            frameRate: .fps23_976)
        // Unsafe chars (space, colon, bang) become underscores.
        XCTAssertTrue(session.exportBaseName.hasPrefix("Doc_Shoot__Day_1_"))
        XCTAssertTrue(session.exportBaseName.hasSuffix("_23976fps_markers"))
    }

    func testFilenamePartsForAllRates() {
        XCTAssertEqual(FrameRate.fps23_976.filenamePart, "23976fps")
        XCTAssertEqual(FrameRate.fps24.filenamePart, "24fps")
        XCTAssertEqual(FrameRate.fps25.filenamePart, "25fps")
        XCTAssertEqual(FrameRate.fps29_97.filenamePart, "2997fps")
        XCTAssertEqual(FrameRate.fps30.filenamePart, "30fps")
    }
}
