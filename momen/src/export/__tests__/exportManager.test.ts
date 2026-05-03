/**
 * Momen — Export Manager Tests
 *
 * Focuses on filename generation (fps suffix) since file I/O is mocked.
 */

import { fpsToFilenamePart } from '../../export/exportManager';
import { FrameRate } from '../../types';

describe('fpsToFilenamePart', () => {
  test('24fps → "24fps"', () => {
    expect(fpsToFilenamePart(24)).toBe('24fps');
  });

  test('25fps → "25fps"', () => {
    expect(fpsToFilenamePart(25)).toBe('25fps');
  });

  test('30fps → "30fps"', () => {
    expect(fpsToFilenamePart(30)).toBe('30fps');
  });

  test('23.976fps → "23976fps" (dot removed)', () => {
    expect(fpsToFilenamePart(23.976)).toBe('23976fps');
  });

  test('29.97fps → "2997fps" (dot removed)', () => {
    expect(fpsToFilenamePart(29.97)).toBe('2997fps');
  });

  test('all results contain "fps" suffix', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30];
    rates.forEach((fps) => {
      expect(fpsToFilenamePart(fps).endsWith('fps')).toBe(true);
    });
  });

  test('no dots in any result (filename-safe)', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30];
    rates.forEach((fps) => {
      expect(fpsToFilenamePart(fps)).not.toContain('.');
    });
  });
});
