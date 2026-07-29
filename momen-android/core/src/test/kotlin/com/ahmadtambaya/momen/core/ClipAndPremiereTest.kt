package com.ahmadtambaya.momen.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ClipNamingTest {

    @Test
    fun `normalizePrefix`() {
        assertEquals("MONTACLIP", ClipNaming.normalizePrefix("MONTACLIP"))
        assertEquals("montaclip1", ClipNaming.normalizePrefix("monta clip 1"))
        assertEquals("A_B-C", ClipNaming.normalizePrefix("A_B-C"))
        assertEquals("clip", ClipNaming.normalizePrefix("clip_"))
        assertEquals("CLIP", ClipNaming.normalizePrefix("  "))
        assertEquals("shot1", ClipNaming.normalizePrefix("shot#1!"))
    }

    @Test
    fun `name`() {
        assertEquals("MONTACLIP_001", ClipNaming.name("MONTACLIP", 1))
        assertEquals("MONTACLIP_002", ClipNaming.name("MONTACLIP", 2))
        assertEquals("X_042", ClipNaming.name("X", 42))
        assertEquals("A_100", ClipNaming.name("A", 100))
    }
}

class PremiereXmlTest {

    private fun session(fps: FrameRate = FrameRate.FPS_24) =
        ExportSessionInfo("MONTACLIP_001", 1970, 1, 1, fps)

    private fun marker(n: Int, ms: Double, note: String = "", sync: Boolean = false) =
        ExportMarker(n, ms, Timecode.msToSmpte(ms, FrameRate.FPS_24), note, sync)

    @Test
    fun `structure and V2 placement`() {
        val xml = PremiereXmlExporter.generate(session(), listOf(marker(1, 5000.0, "focus soft")))
        assertTrue(xml.contains("<!DOCTYPE xmeml>"))
        assertTrue(xml.contains("<xmeml version=\"4\">"))
        assertTrue(xml.contains("<track></track>"))
        assertTrue(xml.contains("<clipitem id=\"clipitem-1\">"))
        // Empty V1 track appears before the clip (which is on V2).
        assertTrue(xml.indexOf("<track></track>") < xml.indexOf("<clipitem"))
    }

    @Test
    fun `note lands in description`() {
        val xml = PremiereXmlExporter.generate(session(), listOf(marker(1, 1000.0, "great take")))
        assertTrue(xml.contains("<description>great take</description>"))
    }

    @Test
    fun `start frame from timecode`() {
        val xml = PremiereXmlExporter.generate(session(), listOf(marker(1, 5000.0, "x")))
        assertTrue(xml.contains("<start>120</start>"))
        assertTrue(xml.contains("<end>144</end>"))
    }

    @Test
    fun `sync marker description`() {
        val xml = PremiereXmlExporter.generate(session(), listOf(marker(1, 0.0, sync = true)))
        assertTrue(xml.contains("<name>SYNC</name>"))
        assertTrue(xml.contains(MomenConstants.SYNC_NOTE))
    }

    @Test
    fun `ntsc and drop-frame flags`() {
        val df = PremiereXmlExporter.generate(
            session(FrameRate.FPS_29_97), listOf(marker(1, 0.0, "x")))
        assertTrue(df.contains("<ntsc>TRUE</ntsc>"))
        assertTrue(df.contains("<displayformat>DF</displayformat>"))
        val ndf = PremiereXmlExporter.generate(
            session(FrameRate.FPS_25), listOf(marker(1, 0.0, "x")))
        assertTrue(ndf.contains("<ntsc>FALSE</ntsc>"))
        assertTrue(ndf.contains("<displayformat>NDF</displayformat>"))
    }

    @Test
    fun `escapes note`() {
        val xml = PremiereXmlExporter.generate(session(), listOf(marker(1, 0.0, "a & b <c>")))
        assertTrue(xml.contains("a &amp; b &lt;c&gt;"))
    }
}
