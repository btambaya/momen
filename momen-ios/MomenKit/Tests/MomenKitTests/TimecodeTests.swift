import XCTest
@testable import MomenKit

/// Ported from momen/src/engine/__tests__/timecode.test.ts — the parity spec.
/// Every expected value here matches the React Native reference implementation.
final class TimecodeTests: XCTestCase {

    let allRates: [FrameRate] = [.fps23_976, .fps24, .fps25, .fps29_97, .fps30]

    // ─── isDropFrame ────────────────────────────────────────

    func testIsDropFrameTrueOnlyFor2997() {
        XCTAssertTrue(FrameRate.fps29_97.isDropFrame)
        XCTAssertFalse(FrameRate.fps23_976.isDropFrame)
        XCTAssertFalse(FrameRate.fps24.isDropFrame)
        XCTAssertFalse(FrameRate.fps25.isDropFrame)
        XCTAssertFalse(FrameRate.fps30.isDropFrame)
    }

    // ─── actualFps ──────────────────────────────────────────

    func testActualFps() {
        XCTAssertEqual(FrameRate.fps23_976.actualFps, 24000.0 / 1001.0, accuracy: 1e-10)
        XCTAssertEqual(FrameRate.fps29_97.actualFps, 30000.0 / 1001.0, accuracy: 1e-10)
        XCTAssertEqual(FrameRate.fps24.actualFps, 24)
        XCTAssertEqual(FrameRate.fps25.actualFps, 25)
        XCTAssertEqual(FrameRate.fps30.actualFps, 30)
    }

    // ─── nominalFps ─────────────────────────────────────────

    func testNominalFps() {
        XCTAssertEqual(FrameRate.fps23_976.nominalFps, 24)
        XCTAssertEqual(FrameRate.fps29_97.nominalFps, 30)
        XCTAssertEqual(FrameRate.fps24.nominalFps, 24)
        XCTAssertEqual(FrameRate.fps25.nominalFps, 25)
        XCTAssertEqual(FrameRate.fps30.nominalFps, 30)
    }

    // ─── msToFrames ─────────────────────────────────────────

    func testZeroMsIsZeroFramesAtAllRates() {
        for fps in allRates {
            XCTAssertEqual(Timecode.msToFrames(0, fps: fps), 0)
        }
    }

    func testOneSecondNominalFramesAtIntegerRates() {
        XCTAssertEqual(Timecode.msToFrames(1000, fps: .fps24), 24)
        XCTAssertEqual(Timecode.msToFrames(1000, fps: .fps25), 25)
        XCTAssertEqual(Timecode.msToFrames(1000, fps: .fps30), 30)
    }

    func testOneSecondFloorsAtFractionalRates() {
        XCTAssertEqual(Timecode.msToFrames(1000, fps: .fps23_976), 23)
        XCTAssertEqual(Timecode.msToFrames(1000, fps: .fps29_97), 29)
    }

    // ─── msToSmpte — non-drop ───────────────────────────────

    func testMsToSmpteNonDrop() {
        XCTAssertEqual(Timecode.msToSmpte(0, fps: .fps24), "00:00:00:00")
        XCTAssertEqual(Timecode.msToSmpte(-500, fps: .fps24), "00:00:00:00") // clamps
        XCTAssertEqual(Timecode.msToSmpte(1000, fps: .fps24), "00:00:01:00")
        XCTAssertEqual(Timecode.msToSmpte(1000, fps: .fps25), "00:00:01:00")
        XCTAssertEqual(Timecode.msToSmpte(1000, fps: .fps30), "00:00:01:00")
        XCTAssertEqual(Timecode.msToSmpte(60_000, fps: .fps24), "00:01:00:00")
        XCTAssertEqual(Timecode.msToSmpte(3_600_000, fps: .fps24), "01:00:00:00")
        XCTAssertEqual(Timecode.msToSmpte(3_600_000, fps: .fps25), "01:00:00:00")
        XCTAssertEqual(Timecode.msToSmpte(3_600_000, fps: .fps30), "01:00:00:00")
    }

    func testLastFrameOfSecondAndRollover() {
        XCTAssertEqual(Timecode.msToSmpte(23.0 / 24.0 * 1000, fps: .fps24), "00:00:00:23")
        XCTAssertEqual(Timecode.msToSmpte(1000, fps: .fps24), "00:00:01:00")
    }

    func test23976OneSecondIsFrame23() {
        XCTAssertEqual(Timecode.msToSmpte(1000, fps: .fps23_976), "00:00:00:23")
    }

    func testNonDropUsesColonSeparator() {
        let result = Timecode.msToSmpte(1000, fps: .fps30)
        XCTAssertEqual(Array(result)[8], ":")
    }

    // ─── Drop-frame 29.97 (Davidson algorithm) ──────────────

    func testDropFrameBasics() {
        XCTAssertEqual(Timecode.msToSmpte(0, fps: .fps29_97), "00:00:00;00")
        XCTAssertEqual(Array(Timecode.msToSmpte(1000, fps: .fps29_97))[8], ";")
        XCTAssertEqual(Timecode.framesToSmpte(0, fps: .fps29_97), "00:00:00;00")
        XCTAssertEqual(Timecode.framesToSmpte(1, fps: .fps29_97), "00:00:00;01")
    }

    func testDropFrameMinuteBoundaries() {
        XCTAssertEqual(Timecode.framesToSmpte(1799, fps: .fps29_97), "00:00:59;29")
        XCTAssertEqual(Timecode.framesToSmpte(1800, fps: .fps29_97), "00:01:00;02")
        XCTAssertEqual(Timecode.framesToSmpte(1801, fps: .fps29_97), "00:01:00;03")
        XCTAssertEqual(Timecode.framesToSmpte(17982, fps: .fps29_97), "00:10:00;00")
        XCTAssertEqual(Timecode.framesToSmpte(35964, fps: .fps29_97), "00:20:00;00")
        XCTAssertEqual(Timecode.framesToSmpte(107892, fps: .fps29_97), "01:00:00;00")
    }

    func testDropFrameEveryMinuteBoundarySweep() {
        // Frame index at the start of TC minute m:
        //   decade = m / 10; within = m % 10
        //   N = decade*17982 + (within > 0 ? 1800 + (within-1)*1798 : 0)
        for m in 0..<60 {
            let decade = m / 10
            let within = m % 10
            let n = decade * 17982 + (within > 0 ? 1800 + (within - 1) * 1798 : 0)
            let tc = Timecode.framesToSmpte(n, fps: .fps29_97)
            let expectedFrame = within == 0 ? "00" : "02"
            XCTAssertEqual(tc, String(format: "00:%02d:00;%@", m, expectedFrame))
        }
    }

    func testDropFrameOneHourWallClock() {
        XCTAssertEqual(Timecode.msToSmpte(3_600_000, fps: .fps29_97), "01:00:00;00")
    }

    // ─── smpteToMs ──────────────────────────────────────────

    func testSmpteToMs() throws {
        XCTAssertEqual(try Timecode.smpteToMs("00:00:00:00", fps: .fps24), 0, accuracy: 0.01)
        XCTAssertEqual(try Timecode.smpteToMs("00:00:01:00", fps: .fps24), 1000, accuracy: 0.01)
        XCTAssertEqual(try Timecode.smpteToMs("01:00:00:00", fps: .fps24), 3_600_000, accuracy: 0.01)
        XCTAssertNoThrow(try Timecode.smpteToMs("00:00:01;00", fps: .fps29_97))
        XCTAssertThrowsError(try Timecode.smpteToMs("badvalue", fps: .fps24))
    }

    // ─── Round-trip ─────────────────────────────────────────

    func testRoundTripWithinOneFrame() throws {
        let testMs: [Double] = [0, 1000, 60_000, 3_600_000, 7_261_500]
        for fps in allRates {
            for ms in testMs {
                let smpte = Timecode.msToSmpte(ms, fps: fps)
                let backMs = try Timecode.smpteToMs(smpte, fps: fps)
                let frameDurationMs = 1000.0 / fps.actualFps
                XCTAssertLessThan(
                    abs(backMs - ms), frameDurationMs + 0.001,
                    "\(fps.displayName)fps — \(ms)ms → \(smpte) → \(backMs)ms")
            }
        }
    }

    // ─── framesToRationalTime ───────────────────────────────

    func testRationalTime() {
        XCTAssertEqual(Timecode.framesToRationalTime(0, fps: .fps24), "0/2400s")
        XCTAssertEqual(Timecode.framesToRationalTime(1, fps: .fps24), "100/2400s")
        XCTAssertEqual(Timecode.framesToRationalTime(1, fps: .fps25), "100/2500s")
        XCTAssertEqual(Timecode.framesToRationalTime(1, fps: .fps30), "100/3000s")
        XCTAssertEqual(Timecode.framesToRationalTime(1, fps: .fps23_976), "1001/24000s")
        XCTAssertEqual(Timecode.framesToRationalTime(1, fps: .fps29_97), "1001/30000s")
        XCTAssertEqual(Timecode.framesToRationalTime(100, fps: .fps24), "10000/2400s")
        for fps in allRates {
            XCTAssertTrue(Timecode.framesToRationalTime(1, fps: fps).hasSuffix("s"))
        }
    }

    // ─── formatForEdl ───────────────────────────────────────

    func testFormatForEdl() {
        XCTAssertEqual(Timecode.formatForEdl("01:00:05:12", fps: .fps24), "01:00:05:12")
        XCTAssertEqual(Timecode.formatForEdl("01:00:05:12", fps: .fps25), "01:00:05:12")
        XCTAssertEqual(Timecode.formatForEdl("01:00:05:12", fps: .fps30), "01:00:05:12")
        XCTAssertEqual(Timecode.formatForEdl("01:00:05:12", fps: .fps29_97), "01:00:05;12")
        XCTAssertEqual(Timecode.formatForEdl("01:00:05;12", fps: .fps29_97), "01:00:05;12")
        XCTAssertEqual(Timecode.formatForEdl("01:00:05:12", fps: .fps23_976), "01:00:05:12")
    }

    // ─── addOneSecondMs ─────────────────────────────────────

    func testAddOneSecondMs() {
        XCTAssertEqual(Timecode.addOneSecondMs(0, fps: .fps24), 1000, accuracy: 0.01)
        XCTAssertEqual(Timecode.addOneSecondMs(5000, fps: .fps24), 6000, accuracy: 0.01)
        XCTAssertEqual(Timecode.addOneSecondMs(0, fps: .fps25), 1000, accuracy: 0.01)
        XCTAssertEqual(Timecode.addOneSecondMs(0, fps: .fps30), 1000, accuracy: 0.01)
        XCTAssertEqual(
            Timecode.addOneSecondMs(0, fps: .fps29_97),
            30.0 / (30000.0 / 1001.0) * 1000, accuracy: 0.001)
        XCTAssertEqual(
            Timecode.addOneSecondMs(0, fps: .fps23_976),
            24.0 / (24000.0 / 1001.0) * 1000, accuracy: 0.001)
    }

    // ─── currentTimecode ────────────────────────────────────

    func testCurrentTimecodeManualIncludesCameraOffset() {
        let result = Timecode.currentTimecode(
            elapsedMs: 10, cameraTcMs: 3_600_000, fps: .fps24, syncMethod: .manual)
        XCTAssertTrue(result.hasPrefix("01:00:00"))
    }

    func testCurrentTimecodeClapShowsElapsedOnly() {
        let result = Timecode.currentTimecode(
            elapsedMs: 10, cameraTcMs: 3_600_000, fps: .fps24, syncMethod: .clap)
        XCTAssertTrue(result.hasPrefix("00:00:00"))
    }
}
