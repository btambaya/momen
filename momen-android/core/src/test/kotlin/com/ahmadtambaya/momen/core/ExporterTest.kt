package com.ahmadtambaya.momen.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExporterTest {

    private fun marker(
        number: Int, ms: Double, smpte: String, note: String = "", sync: Boolean = false,
    ) = ExportMarker(number, ms, smpte, note, sync)

    private fun session(name: String = "Test Shoot", fps: FrameRate = FrameRate.FPS_24) =
        ExportSessionInfo(name, 2025, 5, 15, fps)

    // ─── CSV ────────────────────────────────────────────────

    @Test
    fun `csv header and row`() {
        val csv = CsvExporter.generate(
            listOf(marker(1, 1000.0, "00:00:01:00", "Great take")), FrameRate.FPS_24)
        val lines = csv.split("\n")
        assertEquals("Marker Number,Timecode,Duration,Note,Sync Point", lines[0])
        assertEquals("1,00:00:01:00,00:00:01:00,Great take,FALSE", lines[1])
    }

    @Test
    fun `csv sync marker uses sync note and TRUE`() {
        val csv = CsvExporter.generate(
            listOf(marker(1, 0.0, "00:00:00:00", sync = true)), FrameRate.FPS_24)
        assertTrue(csv.contains(MomenConstants.SYNC_NOTE))
        assertTrue(csv.endsWith("TRUE"))
    }

    @Test
    fun `csv escapes commas and quotes`() {
        val csv = CsvExporter.generate(
            listOf(marker(1, 0.0, "00:00:00:00", "hello, \"world\"")), FrameRate.FPS_24)
        assertTrue(csv.contains("\"hello, \"\"world\"\"\""))
    }

    @Test
    fun `csv drop-frame duration uses semicolon`() {
        val csv = CsvExporter.generate(
            listOf(marker(1, 0.0, "00:00:00;00")), FrameRate.FPS_29_97)
        assertTrue(csv.contains(",00:00:01;00,"))
    }

    // ─── FCPXML ─────────────────────────────────────────────

    @Test
    fun `fcpxml structure at 24fps`() {
        val xml = FcpxmlExporter.generate(
            session(), listOf(marker(1, 1000.0, "00:00:01:00", "Take 1")))
        assertTrue(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))
        assertTrue(xml.contains("<fcpxml version=\"1.13\">"))
        assertTrue(xml.contains("name=\"FFVideoFormat1080p24\""))
        assertTrue(xml.contains("frameDuration=\"100/2400s\""))
        assertTrue(xml.contains("tcStart=\"0/1s\" tcFormat=\"NDF\""))
        assertTrue(xml.contains(
            "<chapter-marker start=\"2400/2400s\" duration=\"100/2400s\" value=\"Marker 1\" note=\"Take 1\"/>"))
        assertTrue(xml.contains("duration=\"144000/2400s\"")) // min 60s = 1440 frames
    }

    @Test
    fun `fcpxml drop-frame format`() {
        val xml = FcpxmlExporter.generate(
            session(fps = FrameRate.FPS_29_97),
            listOf(marker(1, 0.0, "00:00:00;00", sync = true)))
        assertTrue(xml.contains("tcFormat=\"DF\""))
        assertTrue(xml.contains("name=\"FFVideoFormat1080p2997\""))
        assertTrue(xml.contains("frameDuration=\"1001/30000s\""))
        assertTrue(xml.contains("value=\"SYNC\""))
    }

    @Test
    fun `fcpxml escapes session name`() {
        val xml = FcpxmlExporter.generate(session(name = "Doc & <Shoot>"), emptyList())
        assertTrue(xml.contains("Doc &amp; &lt;Shoot&gt;"))
        assertFalse(xml.contains("Doc & <Shoot>"))
    }

    // ─── EDL ────────────────────────────────────────────────

    @Test
    fun `edl header and event`() {
        val edl = EdlExporter.generate(
            session(name = "My Shoot"),
            listOf(marker(1, 1000.0, "00:00:01:00", "Take 1")))
        assertTrue(edl.startsWith("TITLE: My Shoot\nFCM: NON-DROP FRAME\n"))
        assertTrue(edl.contains(
            "001  AX       V     C        00:00:01:00 00:00:02:00 00:00:01:00 00:00:02:00"))
        assertTrue(edl.contains("* FROM CLIP NAME: Marker 1"))
        assertTrue(edl.contains("* LOC: 00:00:01:00 BLUE     Take 1"))
    }

    @Test
    fun `edl drop-frame`() {
        val edl = EdlExporter.generate(
            session(fps = FrameRate.FPS_29_97),
            listOf(marker(1, 0.0, "00:00:00;00", sync = true)))
        assertTrue(edl.contains("FCM: DROP FRAME"))
        assertTrue(edl.contains("* FROM CLIP NAME: SYNC"))
        assertTrue(edl.contains(" RED     "))
        assertTrue(edl.contains("00:00:00;00 00:00:01;00"))
    }

    @Test
    fun `edl sanitizes notes`() {
        val edl = EdlExporter.generate(
            session(), listOf(marker(1, 0.0, "00:00:00:00", "** evil\nnote")))
        assertTrue(edl.contains("* LOC: 00:00:00:00 BLUE     evil note"))
    }

    // ─── Filename ───────────────────────────────────────────

    @Test
    fun `export base name`() {
        val info = ExportSessionInfo("Doc Shoot: Day 1!", 2025, 5, 15, FrameRate.FPS_23_976)
        assertEquals("Doc_Shoot__Day_1__20250515_23976fps_markers", info.exportBaseName)
    }

    @Test
    fun `filename parts for all rates`() {
        assertEquals("23976fps", FrameRate.FPS_23_976.filenamePart)
        assertEquals("24fps", FrameRate.FPS_24.filenamePart)
        assertEquals("25fps", FrameRate.FPS_25.filenamePart)
        assertEquals("2997fps", FrameRate.FPS_29_97.filenamePart)
        assertEquals("30fps", FrameRate.FPS_30.filenamePart)
    }
}
