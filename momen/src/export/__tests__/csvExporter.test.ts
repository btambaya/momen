/**
 * Momen — CSV Exporter Tests
 */

import { generateCSV } from '../../export/csvExporter';
import { Marker } from '../../types';

const makeMarker = (overrides: Partial<Marker> = {}): Marker => ({
  id: 'test-id-1',
  sessionId: 'session-1',
  markerNumber: 1,
  timecodeMs: 5000,
  timecodeSmpte: '00:00:05:00',
  note: '',
  isSyncPoint: false,
  createdAt: '2026-05-03T00:00:00.000Z',
  ...overrides,
});

describe('generateCSV', () => {
  test('empty markers returns only header row', () => {
    const csv = generateCSV([], 24);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('Marker Number,Timecode,Duration,Note,Sync Point');
  });

  test('single non-sync marker has 5 columns', () => {
    const marker = makeMarker({ note: 'Camera A wide', markerNumber: 1 });
    const csv = generateCSV([marker], 24);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    const cols = lines[1].split(',');
    expect(cols.length).toBe(5);
  });

  test('marker number is correct', () => {
    const marker = makeMarker({ markerNumber: 7 });
    const csv = generateCSV([marker], 24);
    expect(csv.split('\n')[1].startsWith('7,')).toBe(true);
  });

  test('timecode SMPTE is in output', () => {
    const marker = makeMarker({ timecodeSmpte: '01:02:03:04' });
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('01:02:03:04');
  });

  test('sync point column is FALSE for regular marker', () => {
    const marker = makeMarker({ isSyncPoint: false });
    const csv = generateCSV([marker], 24);
    expect(csv.split('\n')[1].endsWith('FALSE')).toBe(true);
  });

  test('sync point column is TRUE for sync marker', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const csv = generateCSV([marker], 24);
    expect(csv.split('\n')[1].endsWith('TRUE')).toBe(true);
  });

  test('sync marker note contains the NLE instruction', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('synchronise all subsequent markers');
  });

  test('note with commas is quoted', () => {
    const marker = makeMarker({ note: 'Camera, wide' });
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('"Camera, wide"');
  });

  test('note with double quotes is escaped', () => {
    const marker = makeMarker({ note: 'Say "action"' });
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('"Say ""action"""');
  });

  test('note with newlines is quoted', () => {
    const marker = makeMarker({ note: 'Line1\nLine2' });
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('"Line1\nLine2"');
  });

  test('duration column is 1-second SMPTE at 24fps → 00:00:01:00', () => {
    const marker = makeMarker();
    const csv = generateCSV([marker], 24);
    expect(csv).toContain('00:00:01:00');
  });

  test('duration column at 25fps → 00:00:01:00', () => {
    const marker = makeMarker();
    const csv = generateCSV([marker], 25);
    // Duration of 1 second at 25fps still formats as 00:00:01:00
    expect(csv).toContain('00:00:01:00');
  });

  test('multiple markers produces correct row count', () => {
    const markers = [
      makeMarker({ id: '1', markerNumber: 1 }),
      makeMarker({ id: '2', markerNumber: 2 }),
      makeMarker({ id: '3', markerNumber: 3 }),
    ];
    const csv = generateCSV(markers, 24);
    const lines = csv.split('\n');
    expect(lines.length).toBe(4); // 1 header + 3 data rows
  });

  test('header row is exactly correct', () => {
    const csv = generateCSV([], 24);
    expect(csv).toBe('Marker Number,Timecode,Duration,Note,Sync Point');
  });
});
