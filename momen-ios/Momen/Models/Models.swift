import Foundation
import SwiftData
import MomenKit

@Model
final class Session {
    @Attribute(.unique) var id: String
    var name: String
    var date: Date
    var syncMethodRaw: String
    var syncTime: Date?
    var frameRateRaw: Double
    var cameraTc: String?
    /// Monotonic uptime (ms) captured at the sync moment — exact within a boot.
    var syncUptimeMs: Double
    /// Wall-clock time of the sync moment — restores timing across relaunch/reboot.
    var syncDate: Date?
    var cameraTcMs: Double
    var isEnded: Bool
    var finalTcMs: Double
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \Marker.session)
    var markers: [Marker] = []

    init(name: String, date: Date = Date(), frameRate: FrameRate) {
        self.id = UUID().uuidString
        self.name = name
        self.date = date
        self.syncMethodRaw = SyncMethod.manual.rawValue
        self.syncTime = nil
        self.frameRateRaw = frameRate.rawValue
        self.cameraTc = nil
        self.syncUptimeMs = 0
        self.syncDate = nil
        self.cameraTcMs = 0
        self.isEnded = false
        self.finalTcMs = 0
        self.createdAt = Date()
    }

    var frameRate: FrameRate {
        get { FrameRate(anyDouble: frameRateRaw) ?? .fps24 }
        set { frameRateRaw = newValue.rawValue }
    }

    var syncMethod: SyncMethod {
        get { SyncMethod(rawValue: syncMethodRaw) ?? .manual }
        set { syncMethodRaw = newValue.rawValue }
    }

    var sortedMarkers: [Marker] {
        markers.sorted { $0.markerNumber < $1.markerNumber }
    }

    var isSynced: Bool { syncDate != nil }

    /// Monotonic reference (in TimeSource.nowMs terms) for the sync moment.
    /// Uses the exact stored uptime when still in the same boot session,
    /// otherwise reconstructs from the wall clock so sessions survive
    /// relaunches and reboots (an improvement over the RN app).
    var syncReferenceMs: Double? {
        guard let syncDate else { return nil }
        let now = TimeSource.nowMs
        let wallElapsedMs = Date().timeIntervalSince(syncDate) * 1000.0
        let uptimeConsistent = syncUptimeMs > 0
            && now >= syncUptimeMs
            && abs((now - syncUptimeMs) - wallElapsedMs) < 5000
        return uptimeConsistent ? syncUptimeMs : now - wallElapsedMs
    }

    func recordSync(
        method: SyncMethod, cameraTc: String?, cameraTcMs: Double, syncUptimeMs: Double
    ) {
        self.syncMethod = method
        self.cameraTc = cameraTc
        self.cameraTcMs = cameraTcMs
        self.syncUptimeMs = syncUptimeMs
        self.syncDate = Date(timeIntervalSinceNow: -(TimeSource.nowMs - syncUptimeMs) / 1000.0)
        self.syncTime = Date()
    }

    func end(finalTcMs: Double) {
        isEnded = true
        self.finalTcMs = finalTcMs
    }

    var exportInfo: ExportSessionInfo {
        ExportSessionInfo(name: name, date: date, frameRate: frameRate)
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
    var session: Session?

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

// ─── Session operations ──────────────────────────────────────

extension Session {
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

    /// Delete a marker and close the numbering gap, matching the RN behaviour.
    func deleteMarker(_ marker: Marker, context: ModelContext) {
        let removedNumber = marker.markerNumber
        markers.removeAll { $0.id == marker.id }
        context.delete(marker)
        for m in markers where m.markerNumber > removedNumber {
            m.markerNumber -= 1
        }
    }
}
