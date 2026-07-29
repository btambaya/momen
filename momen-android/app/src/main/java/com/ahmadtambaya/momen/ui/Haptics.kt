package com.ahmadtambaya.momen.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** Haptic feedback that's stronger and more deliberate than Compose's
 *  performHapticFeedback — a crisp double pulse when a mark is logged. */
object Haptics {

    private fun vibrator(context: Context): Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    /** Definite "logged" pulse: sharp hit, short gap, firm confirm. */
    fun mark(context: Context) {
        val v = vibrator(context) ?: return
        if (!v.hasVibrator()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // timings: wait, on(sharp), off, on(confirm); amplitudes 0..255.
            val timings = longArrayOf(0, 18, 40, 28)
            val amplitudes = intArrayOf(0, 255, 0, 200)
            v.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(longArrayOf(0, 18, 40, 28), -1)
        }
    }

    /** Short single tick for secondary confirmations (delete, cut). */
    fun tick(context: Context) {
        val v = vibrator(context) ?: return
        if (!v.hasVibrator()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(20, 180))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(20)
        }
    }
}
