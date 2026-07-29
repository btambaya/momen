package com.ahmadtambaya.momen.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.SystemClock
import com.ahmadtambaya.momen.core.ClipNaming
import com.ahmadtambaya.momen.core.FrameRate
import java.util.UUID
import kotlin.math.abs

data class Project(
    val id: String,
    val name: String,
    val dateMs: Long,
    val frameRate: FrameRate,
    val clipPrefix: String,
    val createdAtMs: Long,
    val clipCount: Int = 0,
) {
    val hasPrefix: Boolean get() = clipPrefix.isNotEmpty()
}

data class Clip(
    val id: String,
    val projectId: String,
    val name: String,
    val clipNumber: Int,
    val frameRate: FrameRate,
    val syncUptimeMs: Double,
    val syncDateMs: Long,
    val isEnded: Boolean,
    val finalTcMs: Double,
    val createdAtMs: Long,
    val markerCount: Int = 0,
) {
    val isSynced: Boolean get() = syncDateMs > 0

    /**
     * Monotonic reference (elapsedRealtime ms) for the clap moment — exact
     * stored uptime within the same boot, else reconstructed from the wall
     * clock so an active clip survives relaunch/reboot.
     */
    fun syncReferenceMs(): Double? {
        if (syncDateMs <= 0) return null
        val now = SystemClock.elapsedRealtime().toDouble()
        val wallElapsedMs = (System.currentTimeMillis() - syncDateMs).toDouble()
        val consistent = syncUptimeMs > 0 && now >= syncUptimeMs &&
            abs((now - syncUptimeMs) - wallElapsedMs) < 5000
        return if (consistent) syncUptimeMs else now - wallElapsedMs
    }
}

data class Marker(
    val id: String,
    val clipId: String,
    val markerNumber: Int,
    val timecodeMs: Double,
    val timecodeSmpte: String,
    val note: String,
    val isSyncPoint: Boolean,
    val createdAtMs: Long,
)

/** Project → Clips → Markers. New store name so it never collides with the
 *  earlier Session-based beta database. */
class MomenDbHelper(context: Context) : SQLiteOpenHelper(context, "monta.db", null, 1) {

    override fun onConfigure(db: SQLiteDatabase) {
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                date INTEGER NOT NULL,
                frame_rate REAL NOT NULL DEFAULT 24,
                clip_prefix TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL
            )""")
        db.execSQL(
            """CREATE TABLE clips (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                clip_number INTEGER NOT NULL,
                frame_rate REAL NOT NULL DEFAULT 24,
                sync_uptime_ms REAL DEFAULT 0,
                sync_date_ms INTEGER DEFAULT 0,
                is_ended INTEGER DEFAULT 0,
                final_tc_ms REAL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )""")
        db.execSQL(
            """CREATE TABLE markers (
                id TEXT PRIMARY KEY,
                clip_id TEXT NOT NULL,
                marker_number INTEGER NOT NULL,
                timecode_ms REAL NOT NULL,
                timecode_smpte TEXT NOT NULL,
                note TEXT DEFAULT '',
                is_sync_point INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE
            )""")
        db.execSQL("CREATE INDEX idx_clips_project ON clips(project_id)")
        db.execSQL("CREATE INDEX idx_markers_clip ON markers(clip_id)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
}

class Repository(context: Context) {

    private val helper = MomenDbHelper(context.applicationContext)

    // ─── Projects ───────────────────────────────────────────

    fun createProject(name: String, frameRate: FrameRate): Project {
        val now = System.currentTimeMillis()
        val project = Project(UUID.randomUUID().toString(), name, now, frameRate, "", now)
        helper.writableDatabase.insert("projects", null, ContentValues().apply {
            put("id", project.id); put("name", project.name); put("date", project.dateMs)
            put("frame_rate", frameRate.raw); put("clip_prefix", ""); put("created_at", now)
        })
        return project
    }

    fun allProjects(): List<Project> =
        helper.readableDatabase.rawQuery(
            """SELECT p.*, COUNT(c.id) AS clip_count
               FROM projects p LEFT JOIN clips c ON c.project_id = p.id
               GROUP BY p.id ORDER BY p.created_at DESC""", null)
            .use { c -> generateSequence { if (c.moveToNext()) c.toProject() else null }.toList() }

    fun getProject(id: String): Project? =
        helper.readableDatabase.rawQuery(
            """SELECT p.*, COUNT(c.id) AS clip_count
               FROM projects p LEFT JOIN clips c ON c.project_id = p.id
               WHERE p.id = ? GROUP BY p.id""", arrayOf(id))
            .use { c -> if (c.moveToFirst()) c.toProject() else null }

    fun setClipPrefix(projectId: String, prefix: String) {
        helper.writableDatabase.update("projects", ContentValues().apply {
            put("clip_prefix", prefix)
        }, "id = ?", arrayOf(projectId))
    }

    fun deleteProject(id: String) {
        val db = helper.writableDatabase
        db.execSQL("DELETE FROM markers WHERE clip_id IN (SELECT id FROM clips WHERE project_id = ?)", arrayOf(id))
        db.delete("clips", "project_id = ?", arrayOf(id))
        db.delete("projects", "id = ?", arrayOf(id))
    }

    // ─── Clips ──────────────────────────────────────────────

    /** Create the next auto-numbered clip for a project (clap-synced). */
    fun addClip(projectId: String): Clip {
        val db = helper.writableDatabase
        val project = getProject(projectId) ?: error("project not found")
        val nextNumber = db.rawQuery(
            "SELECT COALESCE(MAX(clip_number), 0) FROM clips WHERE project_id = ?", arrayOf(projectId))
            .use { if (it.moveToFirst()) it.getInt(0) + 1 else 1 }
        val now = System.currentTimeMillis()
        val clip = Clip(
            id = UUID.randomUUID().toString(), projectId = projectId,
            name = ClipNaming.name(project.clipPrefix, nextNumber), clipNumber = nextNumber,
            frameRate = project.frameRate, syncUptimeMs = 0.0, syncDateMs = 0,
            isEnded = false, finalTcMs = 0.0, createdAtMs = now)
        db.insert("clips", null, ContentValues().apply {
            put("id", clip.id); put("project_id", projectId); put("name", clip.name)
            put("clip_number", nextNumber); put("frame_rate", project.frameRate.raw)
            put("created_at", now)
        })
        return clip
    }

    fun getClip(id: String): Clip? =
        helper.readableDatabase.rawQuery(
            """SELECT c.*, COUNT(m.id) AS marker_count
               FROM clips c LEFT JOIN markers m ON m.clip_id = c.id
               WHERE c.id = ? GROUP BY c.id""", arrayOf(id))
            .use { cur -> if (cur.moveToFirst()) cur.toClip() else null }

    fun clipsForProject(projectId: String): List<Clip> =
        helper.readableDatabase.rawQuery(
            """SELECT c.*, COUNT(m.id) AS marker_count
               FROM clips c LEFT JOIN markers m ON m.clip_id = c.id
               WHERE c.project_id = ? GROUP BY c.id ORDER BY c.clip_number ASC""", arrayOf(projectId))
            .use { cur -> generateSequence { if (cur.moveToNext()) cur.toClip() else null }.toList() }

    fun recordClipSync(clipId: String, syncUptimeMs: Double) {
        val now = System.currentTimeMillis()
        val elapsedSinceSync = SystemClock.elapsedRealtime() - syncUptimeMs
        helper.writableDatabase.update("clips", ContentValues().apply {
            put("sync_uptime_ms", syncUptimeMs)
            put("sync_date_ms", now - elapsedSinceSync.toLong())
        }, "id = ?", arrayOf(clipId))
    }

    fun endClip(clipId: String, finalTcMs: Double) {
        helper.writableDatabase.update("clips", ContentValues().apply {
            put("is_ended", 1); put("final_tc_ms", finalTcMs)
        }, "id = ?", arrayOf(clipId))
    }

    fun deleteClip(id: String) {
        val db = helper.writableDatabase
        db.delete("markers", "clip_id = ?", arrayOf(id))
        db.delete("clips", "id = ?", arrayOf(id))
    }

    // ─── Markers ────────────────────────────────────────────

    fun markers(clipId: String): List<Marker> =
        helper.readableDatabase.rawQuery(
            "SELECT * FROM markers WHERE clip_id = ? ORDER BY marker_number ASC", arrayOf(clipId))
            .use { c -> generateSequence { if (c.moveToNext()) c.toMarker() else null }.toList() }

    fun addMarker(
        clipId: String, timecodeMs: Double, timecodeSmpte: String,
        note: String = "", isSyncPoint: Boolean = false,
    ): Marker {
        val db = helper.writableDatabase
        var markerNumber = 1
        val marker: Marker
        db.beginTransaction()
        try {
            db.rawQuery("SELECT COUNT(*) FROM markers WHERE clip_id = ?", arrayOf(clipId))
                .use { if (it.moveToFirst()) markerNumber = it.getInt(0) + 1 }
            marker = Marker(
                UUID.randomUUID().toString(), clipId, markerNumber,
                timecodeMs, timecodeSmpte, note, isSyncPoint, System.currentTimeMillis())
            db.insert("markers", null, ContentValues().apply {
                put("id", marker.id); put("clip_id", clipId); put("marker_number", markerNumber)
                put("timecode_ms", timecodeMs); put("timecode_smpte", timecodeSmpte)
                put("note", note); put("is_sync_point", if (isSyncPoint) 1 else 0)
                put("created_at", marker.createdAtMs)
            })
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return marker
    }

    fun updateMarkerNote(markerId: String, note: String) {
        helper.writableDatabase.update("markers", ContentValues().apply { put("note", note) },
            "id = ?", arrayOf(markerId))
    }

    fun deleteMarker(markerId: String) {
        val db = helper.writableDatabase
        db.beginTransaction()
        try {
            var clipId: String? = null
            var number = 0
            db.rawQuery("SELECT clip_id, marker_number FROM markers WHERE id = ?", arrayOf(markerId))
                .use { if (it.moveToFirst()) { clipId = it.getString(0); number = it.getInt(1) } }
            if (clipId != null) {
                db.delete("markers", "id = ?", arrayOf(markerId))
                db.execSQL(
                    "UPDATE markers SET marker_number = marker_number - 1 WHERE clip_id = ? AND marker_number > ?",
                    arrayOf(clipId, number))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    // ─── Row mapping ────────────────────────────────────────

    private fun Cursor.toProject() = Project(
        id = getString(getColumnIndexOrThrow("id")),
        name = getString(getColumnIndexOrThrow("name")),
        dateMs = getLong(getColumnIndexOrThrow("date")),
        frameRate = FrameRate.fromDouble(getDouble(getColumnIndexOrThrow("frame_rate"))) ?: FrameRate.FPS_24,
        clipPrefix = getString(getColumnIndexOrThrow("clip_prefix")) ?: "",
        createdAtMs = getLong(getColumnIndexOrThrow("created_at")),
        clipCount = getColumnIndex("clip_count").let { if (it >= 0) getInt(it) else 0 })

    private fun Cursor.toClip() = Clip(
        id = getString(getColumnIndexOrThrow("id")),
        projectId = getString(getColumnIndexOrThrow("project_id")),
        name = getString(getColumnIndexOrThrow("name")),
        clipNumber = getInt(getColumnIndexOrThrow("clip_number")),
        frameRate = FrameRate.fromDouble(getDouble(getColumnIndexOrThrow("frame_rate"))) ?: FrameRate.FPS_24,
        syncUptimeMs = getDouble(getColumnIndexOrThrow("sync_uptime_ms")),
        syncDateMs = getLong(getColumnIndexOrThrow("sync_date_ms")),
        isEnded = getInt(getColumnIndexOrThrow("is_ended")) == 1,
        finalTcMs = getDouble(getColumnIndexOrThrow("final_tc_ms")),
        createdAtMs = getLong(getColumnIndexOrThrow("created_at")),
        markerCount = getColumnIndex("marker_count").let { if (it >= 0) getInt(it) else 0 })

    private fun Cursor.toMarker() = Marker(
        id = getString(getColumnIndexOrThrow("id")),
        clipId = getString(getColumnIndexOrThrow("clip_id")),
        markerNumber = getInt(getColumnIndexOrThrow("marker_number")),
        timecodeMs = getDouble(getColumnIndexOrThrow("timecode_ms")),
        timecodeSmpte = getString(getColumnIndexOrThrow("timecode_smpte")),
        note = getString(getColumnIndexOrThrow("note")) ?: "",
        isSyncPoint = getInt(getColumnIndexOrThrow("is_sync_point")) == 1,
        createdAtMs = getLong(getColumnIndexOrThrow("created_at")))
}
