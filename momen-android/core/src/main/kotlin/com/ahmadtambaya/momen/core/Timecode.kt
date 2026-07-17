package com.ahmadtambaya.momen.core

import kotlin.math.floor
import kotlin.math.max

/**
 * SMPTE timecode math — ms ↔ SMPTE conversion, drop-frame notation for
 * 29.97fps (Davidson algorithm), and FCPXML rational time. Ported 1:1 from
 * the reference implementation in momen/src/engine/timecode.ts, and kept in
 * lockstep with momen-ios/MomenKit/Sources/MomenKit/Timecode.swift.
 */
object Timecode {

    // ─── Milliseconds → SMPTE ───────────────────────────────

    /** Convert milliseconds to total frame count (floor). */
    fun msToFrames(ms: Double, fps: FrameRate): Int =
        floor(ms / 1000.0 * fps.actualFps).toInt()

    /**
     * Convert total frame count to SMPTE string. Drop-frame rules (29.97):
     * skip frames ;00 and ;01 at the start of every minute except every 10th.
     */
    fun framesToSmpte(totalFrames: Int, fps: FrameRate): String {
        val nominal = fps.nominalFps

        return if (fps.isDropFrame) {
            val dropFrames = 2
            val framesPerMinute = nominal * 60 - dropFrames        // 1798
            val framesPer10Min = framesPerMinute * 10 + dropFrames // 17982

            val d = totalFrames / framesPer10Min
            val m = totalFrames % framesPer10Min

            var adjustedFrames = totalFrames + 18 * d
            if (m > 1) {
                adjustedFrames += 2 * ((m - 2) / framesPerMinute)
            }

            val ff = adjustedFrames % nominal
            val ss = (adjustedFrames / nominal) % 60
            val mm = (adjustedFrames / (nominal * 60)) % 60
            val hh = adjustedFrames / (nominal * 60 * 60)

            "%02d:%02d:%02d;%02d".format(java.util.Locale.ROOT, hh, mm, ss, ff)
        } else {
            val ff = totalFrames % nominal
            val ss = (totalFrames / nominal) % 60
            val mm = (totalFrames / (nominal * 60)) % 60
            val hh = totalFrames / (nominal * 60 * 60)

            "%02d:%02d:%02d:%02d".format(java.util.Locale.ROOT, hh, mm, ss, ff)
        }
    }

    /** Convert milliseconds to SMPTE string (negative clamps to zero). */
    fun msToSmpte(ms: Double, fps: FrameRate): String =
        framesToSmpte(msToFrames(max(0.0, ms), fps), fps)

    // ─── SMPTE → Milliseconds ───────────────────────────────

    /** Parse a SMPTE string ("HH:MM:SS:FF", ';' accepted) to a frame count. */
    fun smpteToFrames(smpte: String, fps: FrameRate): Int {
        val parts = smpte.replace(";", ":").split(":").map { it.toIntOrNull() }
        require(parts.size == 4 && parts.all { it != null }) { "Invalid SMPTE timecode: $smpte" }

        val (hh, mm, ss, ff) = parts.map { it!! }
        val nominal = fps.nominalFps

        return if (fps.isDropFrame) {
            val dropFrames = 2
            val totalMinutes = hh * 60 + mm
            val nonDropMinutes = totalMinutes / 10
            val dropMinutes = totalMinutes - nonDropMinutes

            (hh * 3600 + mm * 60 + ss) * nominal + ff - dropFrames * dropMinutes
        } else {
            (hh * 3600 + mm * 60 + ss) * nominal + ff
        }
    }

    /** Convert SMPTE string to milliseconds. */
    fun smpteToMs(smpte: String, fps: FrameRate): Double =
        smpteToFrames(smpte, fps) / fps.actualFps * 1000.0

    // ─── Rational Time (FCPXML) ─────────────────────────────

    /** Frame count → FCPXML rational time, e.g. "100/2400s" for frame 1 at 24fps. */
    fun framesToRationalTime(frames: Int, fps: FrameRate): String = when (fps) {
        FrameRate.FPS_23_976 -> "${frames * 1001}/24000s"
        FrameRate.FPS_29_97 -> "${frames * 1001}/30000s"
        FrameRate.FPS_24 -> "${frames * 100}/2400s"
        FrameRate.FPS_25 -> "${frames * 100}/2500s"
        FrameRate.FPS_30 -> "${frames * 100}/3000s"
    }

    // ─── Display / EDL helpers ──────────────────────────────

    /**
     * Normalise a SMPTE string for EDL export: ';' before frames for
     * drop-frame, ':' throughout otherwise.
     */
    fun formatForEdl(smpte: String, fps: FrameRate): String {
        if (fps.isDropFrame) {
            val parts = smpte.replace(";", ":").split(":")
            if (parts.size != 4) return smpte
            return "${parts[0]}:${parts[1]}:${parts[2]};${parts[3]}"
        }
        return smpte.replace(";", ":")
    }

    /** Ms value exactly 1 nominal second (nominal frames) later. */
    fun addOneSecondMs(ms: Double, fps: FrameRate): Double =
        ms + fps.nominalFps / fps.actualFps * 1000.0

    /**
     * Current camera-aligned timecode given a sync reference.
     * Manual sync applies the camera offset; clap sync shows raw elapsed.
     */
    fun currentTimecode(
        elapsedMs: Double,
        cameraTcMs: Double,
        fps: FrameRate,
        syncMethod: SyncMethod,
    ): String = when (syncMethod) {
        SyncMethod.MANUAL -> msToSmpte(cameraTcMs + elapsedMs, fps)
        SyncMethod.CLAP -> msToSmpte(elapsedMs, fps)
    }
}
