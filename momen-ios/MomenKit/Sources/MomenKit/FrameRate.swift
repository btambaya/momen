import Foundation

/// Supported SMPTE frame rates. Raw value is the nominal marketing rate;
/// use `actualFps` for math (23.976 and 29.97 are 1000/1001 rates).
public enum FrameRate: Double, CaseIterable, Codable, Sendable {
    case fps23_976 = 23.976
    case fps24 = 24
    case fps25 = 25
    case fps29_97 = 29.97
    case fps30 = 30

    /// Display string matching the RN app ("23.976", "24", …).
    public var displayName: String {
        switch self {
        case .fps23_976: return "23.976"
        case .fps24: return "24"
        case .fps25: return "25"
        case .fps29_97: return "29.97"
        case .fps30: return "30"
        }
    }

    /// Only 29.97 uses drop-frame notation.
    public var isDropFrame: Bool { self == .fps29_97 }

    /// The precise frames-per-second value (30000/1001 for 29.97 etc).
    public var actualFps: Double {
        switch self {
        case .fps23_976: return 24000.0 / 1001.0
        case .fps29_97: return 30000.0 / 1001.0
        default: return rawValue
        }
    }

    /// Integer frame count used for SMPTE display (frames run 0..<nominal).
    public var nominalFps: Int {
        switch self {
        case .fps23_976: return 24
        case .fps29_97: return 30
        case .fps24: return 24
        case .fps25: return 25
        case .fps30: return 30
        }
    }

    /// SMPTE frame separator — ';' for drop-frame, ':' otherwise.
    public var frameSeparator: String { isDropFrame ? ";" : ":" }

    /// Filename-safe part, e.g. "23976fps", "24fps".
    public var filenamePart: String {
        displayName.replacingOccurrences(of: ".", with: "") + "fps"
    }

    public init?(anyDouble value: Double) {
        // Tolerant match for values coming from storage.
        for rate in FrameRate.allCases where abs(rate.rawValue - value) < 0.001 {
            self = rate
            return
        }
        return nil
    }
}

public enum SyncMethod: String, Codable, Sendable {
    case manual
    case clap
}
