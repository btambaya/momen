package com.ahmadtambaya.momen.core

/**
 * Final Cut Pro 7 XML (xmeml) export tuned for Premiere Pro. Each marker
 * imports as an offline clip placed on **video track 2 (V2)** (an empty V1
 * sits below), with the note in the clip's **Description** field
 * (FCP7 `<logginginfo><description>`). Mirrors the iOS PremiereXMLExporter.
 */
object PremiereXmlExporter {

    fun generate(session: ExportSessionInfo, markers: List<ExportMarker>): String {
        val fps = session.frameRate
        val timebase = fps.nominalFps
        val ntsc = if (fps == FrameRate.FPS_23_976 || fps == FrameRate.FPS_29_97) "TRUE" else "FALSE"
        val df = if (fps.isDropFrame) "DF" else "NDF"
        val sep = if (fps.isDropFrame) ";" else ":"
        val clipFrames = timebase                        // ~1 second per clip
        val seqName = escape(session.name)

        val lastFrame = markers.lastOrNull()?.let { Timecode.msToFrames(it.timecodeMs, fps) } ?: 0
        val seqDuration = maxOf(lastFrame + clipFrames, 60 * timebase)

        val clipItems = markers.mapIndexed { index, marker ->
            val startFrame = Timecode.msToFrames(marker.timecodeMs, fps)
            val name = if (marker.isSyncPoint) "SYNC" else "Marker ${marker.markerNumber}"
            val description = if (marker.isSyncPoint) MomenConstants.SYNC_NOTE else marker.note

            """
                    <clipitem id="clipitem-${index + 1}">
                      <name>${escape(name)}</name>
                      <enabled>TRUE</enabled>
                      <duration>$clipFrames</duration>
                      <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
                      <start>$startFrame</start>
                      <end>${startFrame + clipFrames}</end>
                      <in>0</in>
                      <out>$clipFrames</out>
                      <file id="file-${index + 1}">
                        <name>${escape(name)}</name>
                        <pathurl></pathurl>
                        <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
                        <duration>$clipFrames</duration>
                        <media><video><samplecharacteristics><width>1920</width><height>1080</height></samplecharacteristics></video></media>
                        <timecode>
                          <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
                          <string>00:00:00${sep}00</string>
                          <frame>0</frame>
                          <displayformat>$df</displayformat>
                          <reel><name>AX</name></reel>
                        </timecode>
                      </file>
                      <logginginfo>
                        <description>${escape(description)}</description>
                        <scene></scene>
                        <shottake></shottake>
                        <lognote></lognote>
                      </logginginfo>
                    </clipitem>
            """.trimEnd()
        }.joinToString("\n")

        return """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>$seqName</name>
    <duration>$seqDuration</duration>
    <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
    <timecode>
      <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
      <string>00:00:00${sep}00</string>
      <frame>0</frame>
      <displayformat>$df</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate><timebase>$timebase</timebase><ntsc>$ntsc</ntsc></rate>
            <width>1920</width><height>1080</height>
          </samplecharacteristics>
        </format>
        <track></track>
        <track>
$clipItems
        </track>
      </video>
    </media>
  </sequence>
</xmeml>"""
    }

    internal fun escape(str: String): String = str
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")
}
