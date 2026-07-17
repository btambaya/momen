package com.ahmadtambaya.momen.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import kotlin.concurrent.thread
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.max

/**
 * Microphone clap detection via AudioRecord peak metering.
 *
 * Two-phase algorithm shared with the iOS ClapDetector:
 *  Phase 1 — a spike far above the rolling noise floor AND loud in absolute
 *            terms becomes a candidate.
 *  Phase 2 — after ~2 buffers the level must have dropped sharply
 *            (claps decay instantly; thuds and speech sustain → rejected).
 *
 * RECORD_AUDIO permission must be granted before calling [start].
 */
class ClapDetector(
    private val onLevel: (Double) -> Unit,
    private val onClap: (Double) -> Unit, // compensated elapsedRealtime ms
) {
    companion object {
        private const val SAMPLE_RATE = 44100
        private const val BUFFER_FRAMES = 2048
        private const val HISTORY_SIZE = 10
        private const val SPIKE_THRESHOLD_DB = 25.0 // dB above noise floor
        private const val ABSOLUTE_MIN_DB = -12.0   // loud in absolute terms
        private const val COOLDOWN_MS = 1500.0
        private const val DECAY_CHECK_COUNT = 2     // buffers before confirming decay
        private const val DECAY_DROP_DB = 18.0      // level must fall sharply after spike
    }

    @Volatile private var running = false
    @Volatile private var detected = false
    private val mainHandler = Handler(Looper.getMainLooper())

    @SuppressLint("MissingPermission")
    fun start() {
        if (running) return
        running = true
        detected = false

        thread(name = "momen-clap-detector") {
            val minBuf = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val record = AudioRecord(
                MediaRecorder.AudioSource.MIC, SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
                max(minBuf, BUFFER_FRAMES * 4))

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                running = false
                return@thread
            }

            record.startRecording()
            val buffer = ShortArray(BUFFER_FRAMES)
            val bufferIntervalMs = BUFFER_FRAMES.toDouble() / SAMPLE_RATE * 1000.0

            val history = ArrayDeque<Double>()
            var candidatePeakDb = 0.0
            var candidatePeakTimeMs = 0.0
            var candidateBuffers = -1 // -1 = no candidate
            var lastDetectionMs = 0.0

            while (running) {
                val read = record.read(buffer, 0, buffer.size)
                if (read <= 0) continue

                var peak = 0
                for (i in 0 until read) {
                    val sample = abs(buffer[i].toInt())
                    if (sample > peak) peak = sample
                }
                val db = if (peak == 0) -160.0
                    else max(-160.0, 20 * log10(peak / 32768.0))
                val now = SystemClock.elapsedRealtime().toDouble()

                if (detected) continue
                mainHandler.post { onLevel(db) }

                if (now - lastDetectionMs < COOLDOWN_MS) continue

                if (candidateBuffers >= 0) {
                    // Phase 2 — confirm decay of the candidate.
                    candidateBuffers++
                    if (candidateBuffers >= DECAY_CHECK_COUNT) {
                        val drop = candidatePeakDb - db
                        candidateBuffers = -1
                        if (drop >= DECAY_DROP_DB) {
                            lastDetectionMs = now
                            detected = true
                            // The spike landed within the peak buffer;
                            // compensate by half the buffer interval.
                            val compensated = candidatePeakTimeMs - bufferIntervalMs / 2
                            mainHandler.post { onClap(compensated) }
                        }
                    }
                    continue
                }

                // Phase 1 — look for a spike above the rolling noise floor.
                val noiseFloor = if (history.isEmpty()) -60.0 else history.average()
                if (db - noiseFloor > SPIKE_THRESHOLD_DB && db > ABSOLUTE_MIN_DB) {
                    candidatePeakDb = db
                    candidatePeakTimeMs = now
                    candidateBuffers = 0
                    continue
                }

                history.addLast(db)
                if (history.size > HISTORY_SIZE) history.removeFirst()
            }

            record.stop()
            record.release()
        }
    }

    fun stop() {
        running = false
    }

    /** Manual fallback — treat "now" as the sync moment. */
    fun triggerManually() {
        if (detected) return
        detected = true
        onClap(SystemClock.elapsedRealtime().toDouble())
    }
}
