package com.ahmadtambaya.momen.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/**
 * Ported from momen/src/engine/__tests__/timecode.test.ts — the parity spec.
 * Expected values are identical across the RN, iOS, and Android engines.
 */
class TimecodeTest {

    private val allRates = FrameRate.entries

    @Test
    fun `isDropFrame true only for 29_97`() {
        assertTrue(FrameRate.FPS_29_97.isDropFrame)
        assertFalse(FrameRate.FPS_23_976.isDropFrame)
        assertFalse(FrameRate.FPS_24.isDropFrame)
        assertFalse(FrameRate.FPS_25.isDropFrame)
        assertFalse(FrameRate.FPS_30.isDropFrame)
    }

    @Test
    fun `actualFps values`() {
        assertEquals(24000.0 / 1001.0, FrameRate.FPS_23_976.actualFps, 1e-10)
        assertEquals(30000.0 / 1001.0, FrameRate.FPS_29_97.actualFps, 1e-10)
        assertEquals(24.0, FrameRate.FPS_24.actualFps, 0.0)
        assertEquals(25.0, FrameRate.FPS_25.actualFps, 0.0)
        assertEquals(30.0, FrameRate.FPS_30.actualFps, 0.0)
    }

    @Test
    fun `nominalFps values`() {
        assertEquals(24, FrameRate.FPS_23_976.nominalFps)
        assertEquals(30, FrameRate.FPS_29_97.nominalFps)
        assertEquals(24, FrameRate.FPS_24.nominalFps)
        assertEquals(25, FrameRate.FPS_25.nominalFps)
        assertEquals(30, FrameRate.FPS_30.nominalFps)
    }

    @Test
    fun `zero ms is zero frames at all rates`() {
        allRates.forEach { assertEquals(0, Timecode.msToFrames(0.0, it)) }
    }

    @Test
    fun `one second frame counts`() {
        assertEquals(24, Timecode.msToFrames(1000.0, FrameRate.FPS_24))
        assertEquals(25, Timecode.msToFrames(1000.0, FrameRate.FPS_25))
        assertEquals(30, Timecode.msToFrames(1000.0, FrameRate.FPS_30))
        assertEquals(23, Timecode.msToFrames(1000.0, FrameRate.FPS_23_976))
        assertEquals(29, Timecode.msToFrames(1000.0, FrameRate.FPS_29_97))
    }

    @Test
    fun `msToSmpte non-drop`() {
        assertEquals("00:00:00:00", Timecode.msToSmpte(0.0, FrameRate.FPS_24))
        assertEquals("00:00:00:00", Timecode.msToSmpte(-500.0, FrameRate.FPS_24)) // clamps
        assertEquals("00:00:01:00", Timecode.msToSmpte(1000.0, FrameRate.FPS_24))
        assertEquals("00:00:01:00", Timecode.msToSmpte(1000.0, FrameRate.FPS_25))
        assertEquals("00:00:01:00", Timecode.msToSmpte(1000.0, FrameRate.FPS_30))
        assertEquals("00:01:00:00", Timecode.msToSmpte(60_000.0, FrameRate.FPS_24))
        assertEquals("01:00:00:00", Timecode.msToSmpte(3_600_000.0, FrameRate.FPS_24))
        assertEquals("01:00:00:00", Timecode.msToSmpte(3_600_000.0, FrameRate.FPS_25))
        assertEquals("01:00:00:00", Timecode.msToSmpte(3_600_000.0, FrameRate.FPS_30))
        assertEquals("00:00:00:23", Timecode.msToSmpte(23.0 / 24.0 * 1000, FrameRate.FPS_24))
        assertEquals("00:00:00:23", Timecode.msToSmpte(1000.0, FrameRate.FPS_23_976))
    }

    @Test
    fun `drop-frame basics and Davidson minute boundaries`() {
        assertEquals("00:00:00;00", Timecode.msToSmpte(0.0, FrameRate.FPS_29_97))
        assertEquals("00:00:00;00", Timecode.framesToSmpte(0, FrameRate.FPS_29_97))
        assertEquals("00:00:00;01", Timecode.framesToSmpte(1, FrameRate.FPS_29_97))
        assertEquals("00:00:59;29", Timecode.framesToSmpte(1799, FrameRate.FPS_29_97))
        assertEquals("00:01:00;02", Timecode.framesToSmpte(1800, FrameRate.FPS_29_97))
        assertEquals("00:01:00;03", Timecode.framesToSmpte(1801, FrameRate.FPS_29_97))
        assertEquals("00:10:00;00", Timecode.framesToSmpte(17982, FrameRate.FPS_29_97))
        assertEquals("00:20:00;00", Timecode.framesToSmpte(35964, FrameRate.FPS_29_97))
        assertEquals("01:00:00;00", Timecode.framesToSmpte(107892, FrameRate.FPS_29_97))
        assertEquals("01:00:00;00", Timecode.msToSmpte(3_600_000.0, FrameRate.FPS_29_97))
    }

    @Test
    fun `drop-frame every minute boundary sweep`() {
        for (m in 0 until 60) {
            val decade = m / 10
            val within = m % 10
            val n = decade * 17982 + if (within > 0) 1800 + (within - 1) * 1798 else 0
            val expectedFrame = if (within == 0) "00" else "02"
            assertEquals(
                "00:%02d:00;%s".format(java.util.Locale.ROOT, m, expectedFrame),
                Timecode.framesToSmpte(n, FrameRate.FPS_29_97))
        }
    }

    @Test
    fun `smpteToMs values and errors`() {
        assertEquals(0.0, Timecode.smpteToMs("00:00:00:00", FrameRate.FPS_24), 0.01)
        assertEquals(1000.0, Timecode.smpteToMs("00:00:01:00", FrameRate.FPS_24), 0.01)
        assertEquals(3_600_000.0, Timecode.smpteToMs("01:00:00:00", FrameRate.FPS_24), 0.01)
        Timecode.smpteToMs("00:00:01;00", FrameRate.FPS_29_97) // must not throw
        assertThrows(IllegalArgumentException::class.java) {
            Timecode.smpteToMs("badvalue", FrameRate.FPS_24)
        }
    }

    @Test
    fun `round-trip within one frame`() {
        val testMs = listOf(0.0, 1000.0, 60_000.0, 3_600_000.0, 7_261_500.0)
        for (fps in allRates) {
            for (ms in testMs) {
                val smpte = Timecode.msToSmpte(ms, fps)
                val backMs = Timecode.smpteToMs(smpte, fps)
                val frameDurationMs = 1000.0 / fps.actualFps
                assertTrue(
                    "${fps.displayName}fps — ${ms}ms → $smpte → ${backMs}ms",
                    abs(backMs - ms) < frameDurationMs + 0.001)
            }
        }
    }

    @Test
    fun `rational time`() {
        assertEquals("0/2400s", Timecode.framesToRationalTime(0, FrameRate.FPS_24))
        assertEquals("100/2400s", Timecode.framesToRationalTime(1, FrameRate.FPS_24))
        assertEquals("100/2500s", Timecode.framesToRationalTime(1, FrameRate.FPS_25))
        assertEquals("100/3000s", Timecode.framesToRationalTime(1, FrameRate.FPS_30))
        assertEquals("1001/24000s", Timecode.framesToRationalTime(1, FrameRate.FPS_23_976))
        assertEquals("1001/30000s", Timecode.framesToRationalTime(1, FrameRate.FPS_29_97))
        assertEquals("10000/2400s", Timecode.framesToRationalTime(100, FrameRate.FPS_24))
    }

    @Test
    fun `formatForEdl separators`() {
        assertEquals("01:00:05:12", Timecode.formatForEdl("01:00:05:12", FrameRate.FPS_24))
        assertEquals("01:00:05:12", Timecode.formatForEdl("01:00:05:12", FrameRate.FPS_25))
        assertEquals("01:00:05:12", Timecode.formatForEdl("01:00:05:12", FrameRate.FPS_30))
        assertEquals("01:00:05;12", Timecode.formatForEdl("01:00:05:12", FrameRate.FPS_29_97))
        assertEquals("01:00:05;12", Timecode.formatForEdl("01:00:05;12", FrameRate.FPS_29_97))
        assertEquals("01:00:05:12", Timecode.formatForEdl("01:00:05:12", FrameRate.FPS_23_976))
    }

    @Test
    fun `addOneSecondMs accounts for actual fps`() {
        assertEquals(1000.0, Timecode.addOneSecondMs(0.0, FrameRate.FPS_24), 0.01)
        assertEquals(6000.0, Timecode.addOneSecondMs(5000.0, FrameRate.FPS_24), 0.01)
        assertEquals(1000.0, Timecode.addOneSecondMs(0.0, FrameRate.FPS_25), 0.01)
        assertEquals(1000.0, Timecode.addOneSecondMs(0.0, FrameRate.FPS_30), 0.01)
        assertEquals(
            30.0 / (30000.0 / 1001.0) * 1000, Timecode.addOneSecondMs(0.0, FrameRate.FPS_29_97), 0.001)
        assertEquals(
            24.0 / (24000.0 / 1001.0) * 1000, Timecode.addOneSecondMs(0.0, FrameRate.FPS_23_976), 0.001)
    }

    @Test
    fun `currentTimecode manual vs clap`() {
        assertTrue(
            Timecode.currentTimecode(10.0, 3_600_000.0, FrameRate.FPS_24, SyncMethod.MANUAL)
                .startsWith("01:00:00"))
        assertTrue(
            Timecode.currentTimecode(10.0, 3_600_000.0, FrameRate.FPS_24, SyncMethod.CLAP)
                .startsWith("00:00:00"))
    }
}
