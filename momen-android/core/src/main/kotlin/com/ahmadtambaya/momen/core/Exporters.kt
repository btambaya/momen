package com.ahmadtambaya.momen.core

/** Storage-agnostic marker snapshot consumed by the exporters. */
data class ExportMarker(
    val markerNumber: Int,
    val timecodeMs: Double,
    val timecodeSmpte: String,
    val note: String,
    val isSyncPoint: Boolean,
)

/** Session metadata needed by the exporters and filename builder. */
data class ExportSessionInfo(
    val name: String,
    /** Local date parts for the filename. */
    val year: Int,
    val month: Int,
    val day: Int,
    val frameRate: FrameRate,
) {
    /** "{SafeName}_{YYYYMMDD}_{fps}fps_markers" — matches the reference app. */
    val exportBaseName: String
        get() {
            val safeName = name.map { ch ->
                if (ch.isLetterOrDigit() && ch.code < 128 || ch == '_' || ch == '-') ch else '_'
            }.joinToString("")
            return "%s_%04d%02d%02d_%s_markers".format(java.util.Locale.ROOT, safeName, year, month, day, frameRate.filenamePart)
        }
}

/**
 * CSV export — one row per marker.
 * Columns: Marker Number, Timecode, Duration, Note, Sync Point
 */
object CsvExporter {

    fun generate(markers: List<ExportMarker>, fps: FrameRate): String {
        val header = "Marker Number,Timecode,Duration,Note,Sync Point"
        // 1-second duration uses the same separator convention as the row's timecode.
        val duration = if (fps.isDropFrame) "00:00:01;00" else "00:00:01:00"

        val rows = markers.map { marker ->
            val note = if (marker.isSyncPoint) escape(MomenConstants.SYNC_NOTE) else escape(marker.note)
            val syncPoint = if (marker.isSyncPoint) "TRUE" else "FALSE"
            "${marker.markerNumber},${marker.timecodeSmpte},$duration,$note,$syncPoint"
        }

        return (listOf(header) + rows).joinToString("\n")
    }

    internal fun escape(value: String): String =
        if (value.contains(',') || value.contains('"') || value.contains('\n')) {
            "\"${value.replace("\"", "\"\"")}\""
        } else {
            value
        }
}

/**
 * FCPXML 1.13 export — chapter markers on a gap clip, rational time
 * representation, SYNC marker carries the editor alignment instruction.
 */
object FcpxmlExporter {

    fun generate(session: ExportSessionInfo, markers: List<ExportMarker>): String {
        val fps = session.frameRate
        val eventName = escapeXml(session.name)

        // Total duration — last marker + 1 second, minimum 60 seconds.
        val minDurationMs = 60_000.0
        val totalDurationMs = markers.lastOrNull()
            ?.let { maxOf(it.timecodeMs + 1000, minDurationMs) } ?: minDurationMs
        val totalDurationFrames = Timecode.msToFrames(totalDurationMs, fps)
        val durationRational = Timecode.framesToRationalTime(totalDurationFrames, fps)

        val markerElements = markers.joinToString("\n") { marker ->
            val frameCount = Timecode.msToFrames(marker.timecodeMs, fps)
            val startRational = Timecode.framesToRationalTime(frameCount, fps)
            val durationOneFrame = Timecode.framesToRationalTime(1, fps)
            val name = if (marker.isSyncPoint) "SYNC" else "Marker ${marker.markerNumber}"
            val note = when {
                marker.isSyncPoint -> MomenConstants.SYNC_NOTE
                marker.note.isEmpty() -> "Marker ${marker.markerNumber}"
                else -> marker.note
            }
            "            <chapter-marker start=\"$startRational\" duration=\"$durationOneFrame\" value=\"${escapeXml(name)}\" note=\"${escapeXml(note)}\"/>"
        }

        val tcFormat = if (fps.isDropFrame) "tcStart=\"0/1s\" tcFormat=\"DF\"" else "tcStart=\"0/1s\" tcFormat=\"NDF\""
        val frameDuration = Timecode.framesToRationalTime(1, fps)

        return """<?xml version="1.0" encoding="UTF-8"?>
<fcpxml version="1.13">
    <resources>
        <format id="r1" name="FFVideoFormat${formatSuffix(fps)}" frameDuration="$frameDuration" width="1920" height="1080"/>
    </resources>
    <library>
        <event name="$eventName">
            <project name="$eventName">
                <sequence format="r1" duration="$durationRational" $tcFormat>
                    <spine>
                        <gap name="Markers" duration="$durationRational" start="0/1s">
$markerElements
                        </gap>
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>"""
    }

    internal fun formatSuffix(fps: FrameRate): String = when (fps) {
        FrameRate.FPS_23_976 -> "1080p2398"
        FrameRate.FPS_24 -> "1080p24"
        FrameRate.FPS_25 -> "1080p25"
        FrameRate.FPS_29_97 -> "1080p2997"
        FrameRate.FPS_30 -> "1080p30"
    }

    internal fun escapeXml(str: String): String = str
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")
}

/**
 * CMX 3600 EDL export — single-frame edit event per marker, drop-frame
 * notation for 29.97fps, SYNC marker carries the alignment instruction.
 */
object EdlExporter {

    fun generate(session: ExportSessionInfo, markers: List<ExportMarker>): String {
        val fps = session.frameRate
        val fcm = if (fps.isDropFrame) "DROP FRAME" else "NON-DROP FRAME"

        val header = "TITLE: ${session.name}\nFCM: $fcm\n"

        val events = markers.mapIndexed { index, marker ->
            val eventNum = "%03d".format(java.util.Locale.ROOT, index + 1)
            val sourceIn = Timecode.formatForEdl(marker.timecodeSmpte, fps)

            val outMs = Timecode.addOneSecondMs(marker.timecodeMs, fps)
            val sourceOut = Timecode.formatForEdl(Timecode.msToSmpte(outMs, fps), fps)

            val markerName = if (marker.isSyncPoint) "SYNC" else "Marker ${marker.markerNumber}"
            val rawNote = when {
                marker.isSyncPoint -> MomenConstants.SYNC_NOTE
                marker.note.isEmpty() -> "Marker ${marker.markerNumber}"
                else -> marker.note
            }
            val note = sanitizeComment(rawNote)
            val color = if (marker.isSyncPoint) "RED" else "BLUE"

            buildList {
                add("$eventNum  AX       V     C        $sourceIn $sourceOut $sourceIn $sourceOut")
                add("* FROM CLIP NAME: ${sanitizeComment(markerName)}")
                if (note.isNotEmpty()) add("* LOC: $sourceIn $color     $note")
            }.joinToString("\n")
        }

        return header + "\n" + events.joinToString("\n\n") + "\n"
    }

    /**
     * EDL comment lines start with '*' — collapse newlines and strip leading
     * asterisks so user notes can't break the parser.
     */
    internal fun sanitizeComment(text: String): String = text
        .replace(Regex("[\\r\\n]+"), " ")
        .replace(Regex("^\\*+\\s*"), "")
        .trim()
}
