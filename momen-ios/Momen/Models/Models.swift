import Foundation
import SwiftData
import MomenKit

/// A shoot. Holds the shared frame rate + clip-naming prefix, and many clips.
@Model
final class Project {
    @Attribute(.unique) var id: String
    var name: String
    var date: Date
    var frameRateRaw: Double
    /// Set once (on the first clip) and reused to auto-number later clips.
    var clipPrefix: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \Clip.project)
    var clips: [Clip] = []

    init(name: String, date: Date = Date(), frameRate: FrameRate, clipPrefix: String = "") {
        self.id = UUID().uuidString
        self.name = name
        self.date = date
        self.frameRateRaw = frameRate.rawValue
        self.clipPrefix = clipPrefix
        self.createdAt = Date()
    }

    var frameRate: FrameRate {
        get { FrameRate(anyDouble: frameRateRaw) ?? .fps24 }
        set { frameRateRaw = newValue.rawValue }
    }

    var sortedClips: [Clip] {
        clips.sorted { $0.clipNumber < $1.clipNumber }
    }

    var hasPrefix: Bool { !clipPrefix.isEmpty }

    /// Create the next auto-numbered clip in this project (clap-synced).
    @discardableResult
    func addClip() -> Clip {
        let number = (clips.map(\.clipNumber).max() ?? 0) + 1
        let clip = Clip(
            name: ClipNaming.name(prefix: clipPrefix, number: number),
            clipNumber: number)
        clips.append(clip)
        return clip
    }
}

/// One take within a project — its own clap sync, markers, and export.
@Model
final class Clip {
    @Attribute(.unique) var id: String
    var name: String
    var clipNumber: Int
    /// Monotonic uptime (ms) captured at the clap; exact within a boot.
    var syncUptimeMs: Double
    /// Wall-clock time of the clap — restores timing across relaunch/reboot.
    var syncDate: Date?
    var isEnded: Bool
    var finalTcMs: Double
    var createdAt: Date
    var project: Project?

    @Relationship(deleteRule: .cascade, inverse: \Marker.clip)
    var markers: [Marker] = []

    init(name: String, clipNumber: Int) {
        self.id = UUID().uuidString
        self.name = name
        self.clipNumber = clipNumber
        self.syncUptimeMs = 0
        self.syncDate = nil
        self.isEnded = false
        self.finalTcMs = 0
        self.createdAt = Date()
    }

    var frameRate: FrameRate { project?.frameRate ?? .fps24 }
    var isSynced: Bool { syncDate != nil }

    var sortedMarkers: [Marker] {
        markers.sorted { $0.markerNumber < $1.markerNumber }
    }

    /// Monotonic reference (in TimeSource.nowMs terms) for the clap moment.
    /// Exact stored uptime within the same boot, else reconstructed from the
    /// wall clock so an active clip survives relaunch/reboot.
    var syncReferenceMs: Double? {
        guard let syncDate else { return nil }
        let now = TimeSource.nowMs
        let wallElapsedMs = Date().timeIntervalSince(syncDate) * 1000.0
        let uptimeConsistent = syncUptimeMs > 0
            && now >= syncUptimeMs
            && abs((now - syncUptimeMs) - wallElapsedMs) < 5000
        return uptimeConsistent ? syncUptimeMs : now - wallElapsedMs
    }

    func recordSync(syncUptimeMs: Double) {
        self.syncUptimeMs = syncUptimeMs
        self.syncDate = Date(timeIntervalSinceNow: -(TimeSource.nowMs - syncUptimeMs) / 1000.0)
    }

    func end(finalTcMs: Double) {
        isEnded = true
        self.finalTcMs = finalTcMs
    }

    /// Append a marker with the next sequential number.
    @discardableResult
    func addMarker(
        timecodeMs: Double, timecodeSmpte: String,
        note: String = "", isSyncPoint: Bool = false
    ) -> Marker {
        let marker = Marker(
            markerNumber: markers.count + 1,
            timecodeMs: timecodeMs, timecodeSmpte: timecodeSmpte,
            note: note, isSyncPoint: isSyncPoint)
        markers.append(marker)
        return marker
    }

    /// Delete a marker and close the numbering gap.
    func deleteMarker(_ marker: Marker, context: ModelContext) {
        let removedNumber = marker.markerNumber
        markers.removeAll { $0.id == marker.id }
        context.delete(marker)
        for m in markers where m.markerNumber > removedNumber {
            m.markerNumber -= 1
        }
    }

    var exportInfo: ExportSessionInfo {
        ExportSessionInfo(name: name, date: project?.date ?? createdAt, frameRate: frameRate)
    }
}

@Model
final class Marker {
    @Attribute(.unique) var id: String
    var markerNumber: Int
    var timecodeMs: Double
    var timecodeSmpte: String
    var note: String
    var isSyncPoint: Bool
    var createdAt: Date
    var clip: Clip?

    init(markerNumber: Int, timecodeMs: Double, timecodeSmpte: String,
         note: String = "", isSyncPoint: Bool = false) {
        self.id = UUID().uuidString
        self.markerNumber = markerNumber
        self.timecodeMs = timecodeMs
        self.timecodeSmpte = timecodeSmpte
        self.note = note
        self.isSyncPoint = isSyncPoint
        self.createdAt = Date()
    }

    var exportMarker: ExportMarker {
        ExportMarker(
            markerNumber: markerNumber, timecodeMs: timecodeMs,
            timecodeSmpte: timecodeSmpte, note: note, isSyncPoint: isSyncPoint)
    }
}
