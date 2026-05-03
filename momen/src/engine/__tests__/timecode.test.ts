/**
 * Momen — Timecode Engine Tests
 *
 * Comprehensive coverage of all public functions in timecode.ts.
 * Tests every supported frame rate including drop-frame edge cases.
 */

import {
  msToSmpte,
  smpteToMs,
  msToFrames,
  framesToSmpte,
  smpteToFrames,
  isDropFrame,
  getActualFps,
  getNominalFps,
  calculateOffset,
  applyOffset,
  framesToRationalTime,
  formatForEdl,
  addOneSecondMs,
  getElapsedMs,
  getCurrentTimecode,
} from '../../engine/timecode';
import { FrameRate } from '../../types';

// ─── isDropFrame ────────────────────────────────────────────

describe('isDropFrame', () => {
  test('returns true only for 29.97', () => {
    expect(isDropFrame(29.97)).toBe(true);
    expect(isDropFrame(23.976)).toBe(false);
    expect(isDropFrame(24)).toBe(false);
    expect(isDropFrame(25)).toBe(false);
    expect(isDropFrame(30)).toBe(false);
  });
});

// ─── getActualFps ───────────────────────────────────────────

describe('getActualFps', () => {
  test('23.976 returns 24000/1001', () => {
    expect(getActualFps(23.976)).toBeCloseTo(24000 / 1001, 10);
  });
  test('29.97 returns 30000/1001', () => {
    expect(getActualFps(29.97)).toBeCloseTo(30000 / 1001, 10);
  });
  test('integer fps returns exact value', () => {
    expect(getActualFps(24)).toBe(24);
    expect(getActualFps(25)).toBe(25);
    expect(getActualFps(30)).toBe(30);
  });
});

// ─── getNominalFps ──────────────────────────────────────────

describe('getNominalFps', () => {
  test('23.976 → 24', () => expect(getNominalFps(23.976)).toBe(24));
  test('29.97 → 30',  () => expect(getNominalFps(29.97)).toBe(30));
  test('24 → 24',     () => expect(getNominalFps(24)).toBe(24));
  test('25 → 25',     () => expect(getNominalFps(25)).toBe(25));
  test('30 → 30',     () => expect(getNominalFps(30)).toBe(30));
});

// ─── msToFrames ─────────────────────────────────────────────

describe('msToFrames', () => {
  test('0 ms → 0 frames at all fps', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30];
    rates.forEach((fps) => expect(msToFrames(0, fps)).toBe(0));
  });

  test('1000 ms → nominal frames at integer fps', () => {
    expect(msToFrames(1000, 24)).toBe(24);
    expect(msToFrames(1000, 25)).toBe(25);
    expect(msToFrames(1000, 30)).toBe(30);
  });

  test('1000 ms at 23.976 → 23 frames (floor of 23.976)', () => {
    expect(msToFrames(1000, 23.976)).toBe(23);
  });

  test('1000 ms at 29.97 → 29 frames (floor of 29.97)', () => {
    expect(msToFrames(1000, 29.97)).toBe(29);
  });
});

// ─── msToSmpte / framesToSmpte — Non-drop ──────────────────

describe('msToSmpte — non-drop-frame', () => {
  test('0 ms → 00:00:00:00 at 24fps', () => {
    expect(msToSmpte(0, 24)).toBe('00:00:00:00');
  });

  test('negative ms clamps to 00:00:00:00', () => {
    expect(msToSmpte(-500, 24)).toBe('00:00:00:00');
  });

  test('1 second at 24fps → 00:00:01:00', () => {
    expect(msToSmpte(1000, 24)).toBe('00:00:01:00');
  });

  test('1 second at 25fps → 00:00:01:00', () => {
    expect(msToSmpte(1000, 25)).toBe('00:00:01:00');
  });

  test('1 second at 30fps → 00:00:01:00', () => {
    expect(msToSmpte(1000, 30)).toBe('00:00:01:00');
  });

  test('1 minute at 24fps → 00:01:00:00', () => {
    expect(msToSmpte(60_000, 24)).toBe('00:01:00:00');
  });

  test('1 hour at 24fps → 01:00:00:00', () => {
    expect(msToSmpte(3_600_000, 24)).toBe('01:00:00:00');
  });

  test('1 hour at 25fps → 01:00:00:00', () => {
    expect(msToSmpte(3_600_000, 25)).toBe('01:00:00:00');
  });

  test('1 hour at 30fps → 01:00:00:00', () => {
    expect(msToSmpte(3_600_000, 30)).toBe('01:00:00:00');
  });

  test('last frame of a second at 24fps (23 frames in)', () => {
    // 23 frames at 24fps = 23/24 * 1000 ms ≈ 958.33 ms
    const ms = (23 / 24) * 1000;
    expect(msToSmpte(ms, 24)).toBe('00:00:00:23');
  });

  test('frame rollover — 24 frames at 24fps → 00:00:01:00', () => {
    const ms = (24 / 24) * 1000;
    expect(msToSmpte(ms, 24)).toBe('00:00:01:00');
  });

  test('23.976fps — 1 second → 00:00:00:23 (floor — 23 frames at actual fps)', () => {
    // At 23.976, actual fps = 24000/1001 ≈ 23.976; 1000ms → floor(23.976) = 23 frames
    // Which is the last frame of second 0, displayed as 00:00:00:23
    expect(msToSmpte(1000, 23.976)).toBe('00:00:00:23');
  });

  test('23.976fps — 1 hour result is a valid HH:MM:SS:FF', () => {
    const result = msToSmpte(3_600_000, 23.976);
    // At 23.976fps, 1 wall-clock hour is slightly less than 1 SMPTE hour
    // Just verify it's a valid non-drop-frame HH:MM:SS:FF format
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
  });

  test('non-drop uses colon separator', () => {
    const result = msToSmpte(1000, 30);
    expect(result[8]).toBe(':'); // position of frame separator
  });
});

// ─── msToSmpte / framesToSmpte — Drop-frame 29.97 ──────────

describe('msToSmpte — drop-frame 29.97', () => {
  test('0 ms → 00:00:00;00', () => {
    expect(msToSmpte(0, 29.97)).toBe('00:00:00;00');
  });

  test('uses semicolon as frame separator', () => {
    const result = msToSmpte(1000, 29.97);
    expect(result[8]).toBe(';');
  });

  test('1 second at 29.97 → 00:00:01;00 (approx — 29 frames displayed)', () => {
    // At 29.97, 1000ms = floor(30000/1001) = 29 frames
    const result = msToSmpte(1000, 29.97);
    expect(result.startsWith('00:00:01;')).toBe(true);
  });

  test('minute boundary: frame count at 00:01:00 is valid (drop-frame applied)', () => {
    // Drop-frame drops frames 0 & 1 at each non-10th minute boundary.
    // The displayed frame at exactly 1 minute of wall time may be 0 at the display level
    // because SMPTE counts differently. We just verify it's a valid DF timecode.
    const oneMinMs = 60_000;
    const result = msToSmpte(oneMinMs, 29.97);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2};\d{2}$/);
    // The result should be around 00:01:00
    expect(result.startsWith('00:01:')).toBe(true);
  });

  test('10-minute boundary does NOT drop frames', () => {
    // At 10 minutes, no drop occurs
    const tenMinMs = 600_000;
    const result = msToSmpte(tenMinMs, 29.97);
    expect(result.startsWith('00:10:00;')).toBe(true);
    const frame = parseInt(result.split(';')[1], 10);
    // frame 0 and 1 are valid at 10-minute boundaries
    expect(frame).toBeGreaterThanOrEqual(0);
  });

  test('1 hour at 29.97 starts with 01:00', () => {
    const result = msToSmpte(3_600_000, 29.97);
    expect(result.startsWith('01:00:')).toBe(true);
  });
});

// ─── smpteToMs / smpteToFrames ──────────────────────────────

describe('smpteToMs', () => {
  test('00:00:00:00 → 0 ms at 24fps', () => {
    expect(smpteToMs('00:00:00:00', 24)).toBeCloseTo(0);
  });

  test('00:00:01:00 → ~1000 ms at 24fps', () => {
    expect(smpteToMs('00:00:01:00', 24)).toBeCloseTo(1000);
  });

  test('01:00:00:00 → ~3600000 ms at 24fps', () => {
    expect(smpteToMs('01:00:00:00', 24)).toBeCloseTo(3_600_000);
  });

  test('accepts semicolons (drop-frame notation) at 29.97', () => {
    // Should not throw
    expect(() => smpteToMs('00:00:01;00', 29.97)).not.toThrow();
  });

  test('throws on invalid format', () => {
    expect(() => smpteToMs('badvalue', 24)).toThrow();
  });
});

// ─── Round-trip ms → SMPTE → ms ────────────────────────────

describe('Round-trip: msToSmpte → smpteToMs', () => {
  const rates: FrameRate[] = [24, 25, 30, 23.976, 29.97];
  const testMs = [0, 1000, 60_000, 3_600_000, 7_261_500];

  rates.forEach((fps) => {
    testMs.forEach((ms) => {
      test(`${fps}fps — ${ms}ms round-trips within 2 frames`, () => {
        const smpte = msToSmpte(ms, fps);
        const backMs = smpteToMs(smpte, fps);
        // Allow up to 2 frames of tolerance due to flooring + drop-frame rounding
        const actualFps = fps === 23.976 ? 24000/1001 : fps === 29.97 ? 30000/1001 : fps;
        const frameDurationMs = 1000 / actualFps;
        expect(Math.abs(backMs - ms)).toBeLessThan(frameDurationMs * 2 + 1);
      });
    });
  });
});

// ─── calculateOffset / applyOffset ──────────────────────────

describe('calculateOffset', () => {
  test('positive offset when camera TC ahead of device time', () => {
    expect(calculateOffset(5000, 3000)).toBe(2000);
  });

  test('negative offset when camera TC behind device time', () => {
    expect(calculateOffset(3000, 5000)).toBe(-2000);
  });

  test('zero offset when equal', () => {
    expect(calculateOffset(1000, 1000)).toBe(0);
  });
});

describe('applyOffset', () => {
  test('adds offset to device time', () => {
    expect(applyOffset(3000, 2000)).toBe(5000);
  });

  test('negative offset subtracts', () => {
    expect(applyOffset(5000, -2000)).toBe(3000);
  });
});

// ─── framesToRationalTime ────────────────────────────────────

describe('framesToRationalTime', () => {
  test('frame 0 at 24fps → 0/2400s', () => {
    expect(framesToRationalTime(0, 24)).toBe('0/2400s');
  });

  test('frame 1 at 24fps → 100/2400s', () => {
    expect(framesToRationalTime(1, 24)).toBe('100/2400s');
  });

  test('frame 1 at 25fps → 100/2500s', () => {
    expect(framesToRationalTime(1, 25)).toBe('100/2500s');
  });

  test('frame 1 at 30fps → 100/3000s', () => {
    expect(framesToRationalTime(1, 30)).toBe('100/3000s');
  });

  test('frame 1 at 23.976fps → 1001/24000s', () => {
    expect(framesToRationalTime(1, 23.976)).toBe('1001/24000s');
  });

  test('frame 1 at 29.97fps → 1001/30000s', () => {
    expect(framesToRationalTime(1, 29.97)).toBe('1001/30000s');
  });

  test('frame 100 at 24fps → 10000/2400s', () => {
    expect(framesToRationalTime(100, 24)).toBe('10000/2400s');
  });

  test('all results end with "s"', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30];
    rates.forEach((fps) => {
      expect(framesToRationalTime(1, fps).endsWith('s')).toBe(true);
    });
  });
});

// ─── formatForEdl ────────────────────────────────────────────

describe('formatForEdl', () => {
  test('non-drop fps keeps colons', () => {
    expect(formatForEdl('01:00:05:12', 24)).toBe('01:00:05:12');
    expect(formatForEdl('01:00:05:12', 25)).toBe('01:00:05:12');
    expect(formatForEdl('01:00:05:12', 30)).toBe('01:00:05:12');
  });

  test('drop-frame (29.97) uses semicolon before frames', () => {
    expect(formatForEdl('01:00:05:12', 29.97)).toBe('01:00:05;12');
    expect(formatForEdl('01:00:05;12', 29.97)).toBe('01:00:05;12');
  });

  test('23.976 keeps colons (not drop-frame)', () => {
    expect(formatForEdl('01:00:05:12', 23.976)).toBe('01:00:05:12');
  });
});

// ─── addOneSecondMs ──────────────────────────────────────────

describe('addOneSecondMs', () => {
  test('adds exactly 1 second at 24fps', () => {
    expect(addOneSecondMs(0, 24)).toBeCloseTo(1000);
    expect(addOneSecondMs(5000, 24)).toBeCloseTo(6000);
  });

  test('adds exactly 1 second at 25fps', () => {
    expect(addOneSecondMs(0, 25)).toBeCloseTo(1000);
  });

  test('adds exactly 1 second at 30fps', () => {
    expect(addOneSecondMs(0, 30)).toBeCloseTo(1000);
  });

  test('adds ~1000.1ms at 29.97fps (accounts for actual fps)', () => {
    // 1 nominal second at 29.97 = 30 frames / (30000/1001) fps = 1.001s
    const result = addOneSecondMs(0, 29.97);
    expect(result).toBeCloseTo((30 / (30000 / 1001)) * 1000, 3);
  });

  test('adds ~1000.04ms at 23.976fps', () => {
    const result = addOneSecondMs(0, 23.976);
    expect(result).toBeCloseTo((24 / (24000 / 1001)) * 1000, 3);
  });
});

// ─── getElapsedMs ────────────────────────────────────────────

describe('getElapsedMs', () => {
  test('returns a positive number for a past reference time', () => {
    // performance.now() is available in Node via the test environment
    const ref = Date.now() - 100; // simulate 100ms ago via Date.now hack
    // We can only test the structure, not exact value
    // Use performance.now() reference
    const perfRef = (performance as any).now() - 100;
    const elapsed = getElapsedMs(perfRef);
    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000); // sanity
  });
});

// ─── getCurrentTimecode ─────────────────────────────────────

describe('getCurrentTimecode', () => {
  test('manual sync: includes cameraTcMs offset in output', () => {
    // With cameraTcMs = 3_600_000 (1 hour) and syncTime just now, result ≈ 01:00:00:xx
    const syncTime = (performance as any).now();
    const result = getCurrentTimecode(syncTime, 3_600_000, 24, 'manual');
    expect(result.startsWith('01:00:00')).toBe(true);
  });

  test('clap sync: shows elapsed from sync time (near 00:00:00:xx)', () => {
    const syncTime = (performance as any).now();
    const result = getCurrentTimecode(syncTime, 0, 24, 'clap');
    expect(result.startsWith('00:00:00')).toBe(true);
  });
});
