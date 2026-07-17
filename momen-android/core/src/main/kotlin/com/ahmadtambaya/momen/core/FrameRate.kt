package com.ahmadtambaya.momen.core

import kotlin.math.abs

/**
 * Supported SMPTE frame rates. [raw] is the nominal marketing rate; use
 * [actualFps] for math (23.976 and 29.97 are 1000/1001 rates).
 */
enum class FrameRate(val raw: Double, val displayName: String, val nominalFps: Int) {
    FPS_23_976(23.976, "23.976", 24),
    FPS_24(24.0, "24", 24),
    FPS_25(25.0, "25", 25),
    FPS_29_97(29.97, "29.97", 30),
    FPS_30(30.0, "30", 30);

    /** Only 29.97 uses drop-frame notation. */
    val isDropFrame: Boolean get() = this == FPS_29_97

    /** The precise frames-per-second value (30000/1001 for 29.97 etc). */
    val actualFps: Double
        get() = when (this) {
            FPS_23_976 -> 24000.0 / 1001.0
            FPS_29_97 -> 30000.0 / 1001.0
            else -> raw
        }

    /** SMPTE frame separator — ';' for drop-frame, ':' otherwise. */
    val frameSeparator: String get() = if (isDropFrame) ";" else ":"

    /** Filename-safe part, e.g. "23976fps", "24fps". */
    val filenamePart: String get() = displayName.replace(".", "") + "fps"

    companion object {
        fun fromDouble(value: Double): FrameRate? =
            entries.firstOrNull { abs(it.raw - value) < 0.001 }
    }
}

enum class SyncMethod(val raw: String) {
    MANUAL("manual"),
    CLAP("clap");

    companion object {
        fun fromRaw(raw: String): SyncMethod = entries.firstOrNull { it.raw == raw } ?: MANUAL
    }
}

object MomenConstants {
    /** Sync marker note shown in exports — tells the editor how to align. */
    const val SYNC_NOTE =
        "Align this marker to the frame of the clap in your footage to synchronise all subsequent markers."

    const val MAX_SESSION_NAME_LENGTH = 50
}
