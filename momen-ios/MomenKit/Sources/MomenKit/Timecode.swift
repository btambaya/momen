import Foundation

/// SMPTE timecode math — ms ↔ SMPTE conversion, drop-frame notation for
/// 29.97fps (Davidson algorithm), and FCPXML rational time. Ported 1:1 from
/// the reference implementation in momen/src/engine/timecode.ts.
public enum Timecode {

    public enum TimecodeError: Error, Equatable {
        case invalidSmpte(String)
    }

    // ─── Milliseconds → SMPTE ───────────────────────────────

    /// Convert milliseconds to total frame count (floor).
    public static func msToFrames(_ ms: Double, fps: FrameRate) -> Int {
        Int((ms / 1000.0 * fps.actualFps).rounded(.down))
    }

    /// Convert total frame count to SMPTE string. Drop-frame rules (29.97):
    /// skip frames ;00 and ;01 at the start of every minute except every 10th.
    public static func framesToSmpte(_ totalFrames: Int, fps: FrameRate) -> String {
        let nominal = fps.nominalFps

        if fps.isDropFrame {
            let dropFrames = 2
            let framesPerMinute = nominal * 60 - dropFrames        // 1798
            let framesPer10Min = framesPerMinute * 10 + dropFrames // 17982

            let d = totalFrames / framesPer10Min
            let m = totalFrames % framesPer10Min

            var adjustedFrames = totalFrames + 18 * d
            if m > 1 {
                adjustedFrames += 2 * ((m - 2) / framesPerMinute)
            }

            let ff = adjustedFrames % nominal
            let ss = (adjustedFrames / nominal) % 60
            let mm = (adjustedFrames / (nominal * 60)) % 60
            let hh = adjustedFrames / (nominal * 60 * 60)

            return "\(pad(hh)):\(pad(mm)):\(pad(ss));\(pad(ff))"
        } else {
            let ff = totalFrames % nominal
            let ss = (totalFrames / nominal) % 60
            let mm = (totalFrames / (nominal * 60)) % 60
            let hh = totalFrames / (nominal * 60 * 60)

            return "\(pad(hh)):\(pad(mm)):\(pad(ss)):\(pad(ff))"
        }
    }

    /// Convert milliseconds to SMPTE string (negative clamps to zero).
    public static func msToSmpte(_ ms: Double, fps: FrameRate) -> String {
        let clamped = max(0, ms)
        return framesToSmpte(msToFrames(clamped, fps: fps), fps: fps)
    }

    // ─── SMPTE → Milliseconds ───────────────────────────────

    /// Parse a SMPTE string ("HH:MM:SS:FF", ';' accepted) to a frame count.
    public static func smpteToFrames(_ smpte: String, fps: FrameRate) throws -> Int {
        let parts = smpte
            .replacingOccurrences(of: ";", with: ":")
            .split(separator: ":", omittingEmptySubsequences: false)
            .map { Int($0) }

        guard parts.count == 4,
              let hh = parts[0], let mm = parts[1], let ss = parts[2], let ff = parts[3]
        else {
            throw TimecodeError.invalidSmpte(smpte)
        }

        let nominal = fps.nominalFps

        if fps.isDropFrame {
            let dropFrames = 2
            let totalMinutes = hh * 60 + mm
            let nonDropMinutes = totalMinutes / 10
            let dropMinutes = totalMinutes - nonDropMinutes

            return (hh * 3600 + mm * 60 + ss) * nominal + ff - dropFrames * dropMinutes
        } else {
            return (hh * 3600 + mm * 60 + ss) * nominal + ff
        }
    }

    /// Convert SMPTE string to milliseconds.
    public static func smpteToMs(_ smpte: String, fps: FrameRate) throws -> Double {
        let frames = try smpteToFrames(smpte, fps: fps)
        return Double(frames) / fps.actualFps * 1000.0
    }

    // ─── Rational Time (FCPXML) ─────────────────────────────

    /// Frame count → FCPXML rational time, e.g. "100/2400s" for frame 1 at 24fps.
    public static func framesToRationalTime(_ frames: Int, fps: FrameRate) -> String {
        switch fps {
        case .fps23_976: return "\(frames * 1001)/24000s"
        case .fps29_97: return "\(frames * 1001)/30000s"
        case .fps24: return "\(frames * 100)/2400s"
        case .fps25: return "\(frames * 100)/2500s"
        case .fps30: return "\(frames * 100)/3000s"
        }
    }

    // ─── Display / EDL helpers ──────────────────────────────

    /// Normalise a SMPTE string for EDL export: ';' before frames for
    /// drop-frame, ':' throughout otherwise.
    public static func formatForEdl(_ smpte: String, fps: FrameRate) -> String {
        if fps.isDropFrame {
            let parts = smpte.replacingOccurrences(of: ";", with: ":").split(separator: ":")
            guard parts.count == 4 else { return smpte }
            return "\(parts[0]):\(parts[1]):\(parts[2]);\(parts[3])"
        }
        return smpte.replacingOccurrences(of: ";", with: ":")
    }

    /// Ms value exactly 1 nominal second (nominal frames) later.
    public static func addOneSecondMs(_ ms: Double, fps: FrameRate) -> Double {
        ms + Double(fps.nominalFps) / fps.actualFps * 1000.0
    }

    /// Current camera-aligned timecode given a sync reference.
    /// Manual sync applies the camera offset; clap sync shows raw elapsed.
    public static func currentTimecode(
        elapsedMs: Double,
        cameraTcMs: Double,
        fps: FrameRate,
        syncMethod: SyncMethod
    ) -> String {
        switch syncMethod {
        case .manual: return msToSmpte(cameraTcMs + elapsedMs, fps: fps)
        case .clap: return msToSmpte(elapsedMs, fps: fps)
        }
    }

    private static func pad(_ n: Int) -> String {
        n < 10 ? "0\(n)" : String(n)
    }
}
