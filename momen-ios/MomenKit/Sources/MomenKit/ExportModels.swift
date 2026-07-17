import Foundation

/// Storage-agnostic marker snapshot consumed by the exporters.
/// The app layer maps its SwiftData models into these values.
public struct ExportMarker: Sendable, Equatable {
    public let markerNumber: Int
    public let timecodeMs: Double
    public let timecodeSmpte: String
    public let note: String
    public let isSyncPoint: Bool

    public init(markerNumber: Int, timecodeMs: Double, timecodeSmpte: String, note: String, isSyncPoint: Bool) {
        self.markerNumber = markerNumber
        self.timecodeMs = timecodeMs
        self.timecodeSmpte = timecodeSmpte
        self.note = note
        self.isSyncPoint = isSyncPoint
    }
}

/// Session metadata needed by the exporters and filename builder.
public struct ExportSessionInfo: Sendable, Equatable {
    public let name: String
    public let date: Date
    public let frameRate: FrameRate

    public init(name: String, date: Date, frameRate: FrameRate) {
        self.name = name
        self.date = date
        self.frameRate = frameRate
    }

    /// "{SafeName}_{YYYYMMDD}_{fps}fps_markers" — matches the RN app.
    public var exportBaseName: String {
        let safeName = name.map { ch -> Character in
            (ch.isLetter && ch.isASCII) || (ch.isNumber && ch.isASCII) || ch == "_" || ch == "-" ? ch : "_"
        }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        let dateStr = String(format: "%04d%02d%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
        return "\(String(safeName))_\(dateStr)_\(frameRate.filenamePart)_markers"
    }
}
