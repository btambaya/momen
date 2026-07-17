package com.ahmadtambaya.momen.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.SystemClock
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.core.SyncMethod
import java.util.UUID
import kotlin.math.abs

data class Session(
    val id: String,
    val name: String,
    val dateMs: Long,
    val syncMethod: SyncMethod,
    val syncTimeMs: Long?,
    val frameRate: FrameRate,
    val cameraTc: String?,
    val syncUptimeMs: Double,
    val syncDateMs: Long,
    val cameraTcMs: Double,
    val isEnded: Boolean,
    val finalTcMs: Double,
    val createdAtMs: Long,
    val markerCount: Int = 0,
) {
    val isSynced: Boolean get() = syncDateMs > 0

    /**
     * Monotonic reference (elapsedRealtime ms) for the sync moment. Uses the
     * exact stored uptime when still in the same boot, otherwise reconstructs
     * from the wall clock so sessions survive relaunches and reboots.
     */
    fun syncReferenceMs(): Double? {
        if (syncDateMs <= 0) return null
        val now = SystemClock.elapsedRealtime().toDouble()
        val wallElapsedMs = (System.currentTimeMillis() - syncDateMs).toDouble()
        val uptimeConsistent = syncUptimeMs > 0
            && now >= syncUptimeMs
            && abs((now - syncUptimeMs) - wallElapsedMs) < 5000
        return if (uptimeConsistent) syncUptimeMs else now - wallElapsedMs
    }
}

data class Marker(
    val id: String,
    val sessionId: String,
    val markerNumber: Int,
    val timecodeMs: Double,
    val timecodeSmpte: String,
    val note: String,
    val isSyncPoint: Boolean,
    val createdAtMs: Long,
)

/** Same schema as the RN app's expo-sqlite database. */
class MomenDbHelper(context: Context) : SQLiteOpenHelper(context, "momen.db", null, 1) {

    override fun onConfigure(db: SQLiteDatabase) {
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                date INTEGER,
                sync_method TEXT NOT NULL DEFAULT 'manual',
                sync_time INTEGER,
                frame_rate REAL NOT NULL DEFAULT 24,
                camera_tc TEXT,
                sync_uptime_ms REAL DEFAULT 0,
                sync_date_ms INTEGER DEFAULT 0,
                camera_tc_ms REAL DEFAULT 0,
                is_ended INTEGER DEFAULT 0,
                final_tc_ms REAL DEFAULT 0,
                created_at INTEGER NOT NULL
            )""")
        db.execSQL(
            """CREATE TABLE markers (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                marker_number INTEGER NOT NULL,
                timecode_ms REAL NOT NULL,
                timecode_smpte TEXT NOT NULL,
                note TEXT DEFAULT '',
                is_sync_point INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )""")
        db.execSQL("CREATE INDEX idx_markers_session ON markers(session_id)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
}

class Repository(context: Context) {

    private val helper = MomenDbHelper(context.applicationContext)

    // ─── Sessions ───────────────────────────────────────────

    fun createSession(name: String, frameRate: FrameRate): Session {
        val now = System.currentTimeMillis()
        val session = Session(
            id = UUID.randomUUID().toString(), name = name, dateMs = now,
            syncMethod = SyncMethod.MANUAL, syncTimeMs = null, frameRate = frameRate,
            cameraTc = null, syncUptimeMs = 0.0, syncDateMs = 0, cameraTcMs = 0.0,
            isEnded = false, finalTcMs = 0.0, createdAtMs = now)
        helper.writableDatabase.insert("sessions", null, ContentValues().apply {
            put("id", session.id)
            put("name", session.name)
            put("date", session.dateMs)
            put("sync_method", session.syncMethod.raw)
            put("frame_rate", session.frameRate.raw)
            put("created_at", session.createdAtMs)
        })
        return session
    }

    fun allSessions(): List<Session> =
        helper.readableDatabase.rawQuery(
            """SELECT s.*, COUNT(m.id) AS marker_count
               FROM sessions s LEFT JOIN markers m ON m.session_id = s.id
               GROUP BY s.id ORDER BY s.created_at DESC""", null)
            .use { c -> generateSequence { if (c.moveToNext()) c.toSession() else null }.toList() }

    fun getSession(id: String): Session? =
        helper.readableDatabase.rawQuery(
            """SELECT s.*, COUNT(m.id) AS marker_count
               FROM sessions s LEFT JOIN markers m ON m.session_id = s.id
               WHERE s.id = ? GROUP BY s.id""", arrayOf(id))
            .use { c -> if (c.moveToFirst()) c.toSession() else null }

    fun recordSync(
        id: String, method: SyncMethod, cameraTc: String?,
        cameraTcMs: Double, syncUptimeMs: Double,
    ) {
        val now = System.currentTimeMillis()
        val elapsedSinceSync = SystemClock.elapsedRealtime() - syncUptimeMs
        helper.writableDatabase.update("sessions", ContentValues().apply {
            put("sync_method", method.raw)
            put("camera_tc", cameraTc)
            put("sync_time", now)
            put("sync_uptime_ms", syncUptimeMs)
            put("sync_date_ms", now - elapsedSinceSync.toLong())
            put("camera_tc_ms", cameraTcMs)
        }, "id = ?", arrayOf(id))
    }

    fun endSession(id: String, finalTcMs: Double) {
        helper.writableDatabase.update("sessions", ContentValues().apply {
            put("is_ended", 1)
            put("final_tc_ms", finalTcMs)
        }, "id = ?", arrayOf(id))
    }

    fun deleteSession(id: String) {
        val db = helper.writableDatabase
        db.delete("markers", "session_id = ?", arrayOf(id))
        db.delete("sessions", "id = ?", arrayOf(id))
    }

    // ─── Markers ────────────────────────────────────────────

    fun markers(sessionId: String): List<Marker> =
        helper.readableDatabase.rawQuery(
            "SELECT * FROM markers WHERE session_id = ? ORDER BY marker_number ASC",
            arrayOf(sessionId))
            .use { c -> generateSequence { if (c.moveToNext()) c.toMarker() else null }.toList() }

    fun addMarker(
        sessionId: String, timecodeMs: Double, timecodeSmpte: String,
        note: String = "", isSyncPoint: Boolean = false,
    ): Marker {
        val db = helper.writableDatabase
        var markerNumber = 1
        val marker: Marker
        db.beginTransaction()
        try {
            db.rawQuery(
                "SELECT COUNT(*) FROM markers WHERE session_id = ?", arrayOf(sessionId))
                .use { c -> if (c.moveToFirst()) markerNumber = c.getInt(0) + 1 }
            marker = Marker(
                id = UUID.randomUUID().toString(), sessionId = sessionId,
                markerNumber = markerNumber, timecodeMs = timecodeMs,
                timecodeSmpte = timecodeSmpte, note = note,
                isSyncPoint = isSyncPoint, createdAtMs = System.currentTimeMillis())
            db.insert("markers", null, ContentValues().apply {
                put("id", marker.id)
                put("session_id", marker.sessionId)
                put("marker_number", marker.markerNumber)
                put("timecode_ms", marker.timecodeMs)
                put("timecode_smpte", marker.timecodeSmpte)
                put("note", marker.note)
                put("is_sync_point", if (marker.isSyncPoint) 1 else 0)
                put("created_at", marker.createdAtMs)
            })
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return marker
    }

    fun updateMarkerNote(markerId: String, note: String) {
        helper.writableDatabase.update("markers", ContentValues().apply {
            put("note", note)
        }, "id = ?", arrayOf(markerId))
    }

    /** Delete a marker and close the numbering gap, matching the RN behaviour. */
    fun deleteMarker(markerId: String) {
        val db = helper.writableDatabase
        db.beginTransaction()
        try {
            var sessionId: String? = null
            var number = 0
            db.rawQuery(
                "SELECT session_id, marker_number FROM markers WHERE id = ?", arrayOf(markerId))
                .use { c ->
                    if (c.moveToFirst()) {
                        sessionId = c.getString(0)
                        number = c.getInt(1)
                    }
                }
            if (sessionId != null) {
                db.delete("markers", "id = ?", arrayOf(markerId))
                db.execSQL(
                    "UPDATE markers SET marker_number = marker_number - 1 WHERE session_id = ? AND marker_number > ?",
                    arrayOf(sessionId, number))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    // ─── Row mapping ────────────────────────────────────────

    private fun Cursor.toSession() = Session(
        id = getString(getColumnIndexOrThrow("id")),
        name = getString(getColumnIndexOrThrow("name")),
        dateMs = getLong(getColumnIndexOrThrow("date")),
        syncMethod = SyncMethod.fromRaw(getString(getColumnIndexOrThrow("sync_method"))),
        syncTimeMs = getColumnIndexOrThrow("sync_time").let { if (isNull(it)) null else getLong(it) },
        frameRate = FrameRate.fromDouble(getDouble(getColumnIndexOrThrow("frame_rate")))
            ?: FrameRate.FPS_24,
        cameraTc = getColumnIndexOrThrow("camera_tc").let { if (isNull(it)) null else getString(it) },
        syncUptimeMs = getDouble(getColumnIndexOrThrow("sync_uptime_ms")),
        syncDateMs = getLong(getColumnIndexOrThrow("sync_date_ms")),
        cameraTcMs = getDouble(getColumnIndexOrThrow("camera_tc_ms")),
        isEnded = getInt(getColumnIndexOrThrow("is_ended")) == 1,
        finalTcMs = getDouble(getColumnIndexOrThrow("final_tc_ms")),
        createdAtMs = getLong(getColumnIndexOrThrow("created_at")),
        markerCount = getInt(getColumnIndexOrThrow("marker_count")))

    private fun Cursor.toMarker() = Marker(
        id = getString(getColumnIndexOrThrow("id")),
        sessionId = getString(getColumnIndexOrThrow("session_id")),
        markerNumber = getInt(getColumnIndexOrThrow("marker_number")),
        timecodeMs = getDouble(getColumnIndexOrThrow("timecode_ms")),
        timecodeSmpte = getString(getColumnIndexOrThrow("timecode_smpte")),
        note = getString(getColumnIndexOrThrow("note")) ?: "",
        isSyncPoint = getInt(getColumnIndexOrThrow("is_sync_point")) == 1,
        createdAtMs = getLong(getColumnIndexOrThrow("created_at")))
}
