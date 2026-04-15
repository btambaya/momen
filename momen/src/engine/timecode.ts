/**
 * Momen — Timecode Engine
 *
 * Handles all SMPTE timecode math including:
 * - Milliseconds ↔ SMPTE conversion
 * - Drop-frame notation for 29.97fps
 * - Offset calculation & application
 * - Frame-accurate timing
 */

import { FrameRate } from '../types';

// ─── Constants ───────────────────────────────────────────────

const DROP_FRAME_RATES = [29.97];

// ─── Core Helpers ────────────────────────────────────────────

/**
 * Check if a frame rate requires drop-frame notation.
 */
export function isDropFrame(fps: FrameRate): boolean {
  return DROP_FRAME_RATES.includes(fps);
}

/**
 * Get the actual precise frames-per-second value.
 * 29.97 is actually 30000/1001, 23.976 is 24000/1001.
 */
export function getActualFps(fps: FrameRate): number {
  switch (fps) {
    case 23.976: return 24000 / 1001;
    case 29.97:  return 30000 / 1001;
    default:     return fps;
  }
}

/**
 * Get the nominal (integer) frame count for a given frame rate.
 * Used for SMPTE display where frames range from 0 to (nominal-1).
 */
export function getNominalFps(fps: FrameRate): number {
  switch (fps) {
    case 23.976: return 24;
    case 29.97:  return 30;
    default:     return fps;
  }
}

// ─── Milliseconds → SMPTE ───────────────────────────────────

/**
 * Convert milliseconds to total frame count.
 */
export function msToFrames(ms: number, fps: FrameRate): number {
  const actualFps = getActualFps(fps);
  return Math.floor(ms / 1000 * actualFps);
}

/**
 * Convert total frame count to SMPTE timecode string.
 * Handles drop-frame notation for 29.97fps.
 *
 * Drop-frame rules (29.97fps):
 * - Skip frames 0 and 1 at the start of every minute
 * - EXCEPT every 10th minute (0, 10, 20, 30, 40, 50)
 */
export function framesToSmpte(totalFrames: number, fps: FrameRate): string {
  const nominal = getNominalFps(fps);

  if (isDropFrame(fps)) {
    // Drop-frame calculation for 29.97fps
    const dropFrames = 2; // frames to drop
    const framesPerMinute = nominal * 60 - dropFrames; // 1798
    const framesPer10Min = framesPerMinute * 10 + dropFrames * 10; // 17982

    const d = Math.floor(totalFrames / framesPer10Min);
    const m = totalFrames % framesPer10Min;

    let adjustedFrames = totalFrames;

    if (m >= dropFrames) {
      adjustedFrames += dropFrames * (Math.floor((m - dropFrames) / framesPerMinute) + 1) + dropFrames * 9 * d;
    } else {
      adjustedFrames += dropFrames * 9 * d;
    }

    const ff = adjustedFrames % nominal;
    const ss = Math.floor(adjustedFrames / nominal) % 60;
    const mm = Math.floor(adjustedFrames / (nominal * 60)) % 60;
    const hh = Math.floor(adjustedFrames / (nominal * 60 * 60));

    // Drop-frame uses semicolons for the frame separator
    return `${pad(hh)}:${pad(mm)}:${pad(ss)};${pad(ff)}`;
  } else {
    // Non-drop-frame: straightforward division
    const ff = totalFrames % nominal;
    const ss = Math.floor(totalFrames / nominal) % 60;
    const mm = Math.floor(totalFrames / (nominal * 60)) % 60;
    const hh = Math.floor(totalFrames / (nominal * 60 * 60));

    return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
  }
}

/**
 * Convert milliseconds to SMPTE timecode string.
 */
export function msToSmpte(ms: number, fps: FrameRate): string {
  if (ms < 0) ms = 0;
  const frames = msToFrames(ms, fps);
  return framesToSmpte(frames, fps);
}

// ─── SMPTE → Milliseconds ───────────────────────────────────

/**
 * Parse a SMPTE timecode string to total frame count.
 * Accepts both ':' and ';' as separators.
 */
export function smpteToFrames(smpte: string, fps: FrameRate): number {
  const parts = smpte.replace(/;/g, ':').split(':').map(Number);
  if (parts.length !== 4) {
    throw new Error(`Invalid SMPTE timecode: ${smpte}`);
  }

  const [hh, mm, ss, ff] = parts;
  const nominal = getNominalFps(fps);

  if (isDropFrame(fps)) {
    const dropFrames = 2;
    const totalMinutes = hh * 60 + mm;
    const nonDropMinutes = Math.floor(totalMinutes / 10);
    const dropMinutes = totalMinutes - nonDropMinutes;

    return (hh * 3600 + mm * 60 + ss) * nominal + ff
      - dropFrames * dropMinutes;
  } else {
    return (hh * 3600 + mm * 60 + ss) * nominal + ff;
  }
}

/**
 * Convert SMPTE timecode string to milliseconds.
 */
export function smpteToMs(smpte: string, fps: FrameRate): number {
  const frames = smpteToFrames(smpte, fps);
  const actualFps = getActualFps(fps);
  return (frames / actualFps) * 1000;
}

// ─── Offset Calculation ─────────────────────────────────────

/**
 * Calculate the offset between camera timecode and device time.
 * Offset = cameraTcMs - deviceTimeMs
 *
 * When applied: markerTc = deviceTimeAtTap + offset
 */
export function calculateOffset(cameraTcMs: number, deviceTimeMs: number): number {
  return cameraTcMs - deviceTimeMs;
}

/**
 * Apply the offset to a device timestamp.
 */
export function applyOffset(deviceTimeMs: number, offsetMs: number): number {
  return deviceTimeMs + offsetMs;
}

// ─── Rational Time (for FCPXML) ──────────────────────────────

/**
 * Convert a frame count to rational time string for FCPXML.
 * Returns format like "100/2400s" for frame 1 at 24fps.
 */
export function framesToRationalTime(frames: number, fps: FrameRate): string {
  // Use the timebase appropriate for the frame rate
  switch (fps) {
    case 23.976: {
      // 24000/1001 fps → each frame = 1001/24000 seconds
      const numerator = frames * 1001;
      const denominator = 24000;
      return `${numerator}/${denominator}s`;
    }
    case 29.97: {
      // 30000/1001 fps → each frame = 1001/30000 seconds
      const numerator = frames * 1001;
      const denominator = 30000;
      return `${numerator}/${denominator}s`;
    }
    case 24: {
      return `${frames * 100}/${24 * 100}s`;
    }
    case 25: {
      return `${frames * 100}/${25 * 100}s`;
    }
    case 30: {
      return `${frames * 100}/${30 * 100}s`;
    }
    default:
      return `${frames}/1s`;
  }
}

/**
 * Get the FCPXML duration string for 1 second at the given frame rate.
 */
export function getOneSecondRational(fps: FrameRate): string {
  const nominal = getNominalFps(fps);
  return framesToRationalTime(nominal, fps);
}

/**
 * Get the FCPXML duration string for a single frame at the given frame rate.
 */
export function getOneFrameRational(fps: FrameRate): string {
  return framesToRationalTime(1, fps);
}

// ─── Display Helpers ─────────────────────────────────────────

/**
 * Get the SMPTE separator for a given frame rate.
 * Drop-frame uses ';', non-drop uses ':'.
 */
export function getFrameSeparator(fps: FrameRate): string {
  return isDropFrame(fps) ? ';' : ':';
}

/**
 * Get the current elapsed milliseconds since a reference time.
 * Uses performance.now() for monotonic accuracy.
 */
export function getElapsedMs(referencePerformanceTime: number): number {
  return performance.now() - referencePerformanceTime;
}

/**
 * Convert current time to a timecode display value.
 * For manual sync: applies offset to get camera-aligned timecode.
 * For clap sync: returns raw device clock timecode.
 */
export function getCurrentTimecode(
  syncPerformanceTime: number,
  cameraTcMs: number,
  fps: FrameRate,
  syncMethod: 'manual' | 'clap'
): string {
  const elapsed = getElapsedMs(syncPerformanceTime);

  if (syncMethod === 'manual') {
    // Camera timecode at sync + elapsed time = current camera timecode
    return msToSmpte(cameraTcMs + elapsed, fps);
  } else {
    // Clap sync: just show elapsed since session start
    return msToSmpte(elapsed, fps);
  }
}

// ─── Utilities ───────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Format a SMPTE string for EDL export.
 * Ensures drop-frame uses ';' and non-drop uses ':'.
 */
export function formatForEdl(smpte: string, fps: FrameRate): string {
  if (isDropFrame(fps)) {
    // Ensure semicolon before frames
    const parts = smpte.replace(/;/g, ':').split(':');
    return `${parts[0]}:${parts[1]}:${parts[2]};${parts[3]}`;
  }
  return smpte.replace(/;/g, ':');
}

/**
 * Calculate the "end" timecode that is exactly 1 second after the given ms.
 */
export function addOneSecondMs(ms: number, fps: FrameRate): number {
  const actualFps = getActualFps(fps);
  const nominal = getNominalFps(fps);
  return ms + (nominal / actualFps) * 1000;
}
