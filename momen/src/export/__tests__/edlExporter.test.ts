/**
 * Momen — EDL Exporter Tests
 */

import { generateEDL } from '../../export/edlExporter';
import { Session, Marker } from '../../types';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  name: 'Documentary Day 1',
  date: '2026-05-03',
  syncMethod: 'manual',
  offsetMs: 0,
  syncTime: null,
  frameRate: 24,
  cameraTc: null,
  createdAt: '2026-05-03T00:00:00.000Z',
  ...overrides,
});

const makeMarker = (overrides: Partial<Marker> = {}): Marker => ({
  id: 'marker-1',
  sessionId: 'session-1',
  markerNumber: 1,
  timecodeMs: 5000,
  timecodeSmpte: '00:00:05:00',
  note: 'Wide shot',
  isSyncPoint: false,
  createdAt: '2026-05-03T00:00:00.000Z',
  ...overrides,
});

describe('generateEDL', () => {
  test('header contains session name', () => {
    const edl = generateEDL(makeSession(), [makeMarker()]);
    expect(edl).toContain('TITLE: Documentary Day 1');
  });

  test('non-drop-frame header at 24fps', () => {
    const edl = generateEDL(makeSession({ frameRate: 24 }), [makeMarker()]);
    expect(edl).toContain('FCM: NON-DROP FRAME');
  });

  test('drop-frame header at 29.97fps', () => {
    const edl = generateEDL(
      makeSession({ frameRate: 29.97 }),
      [makeMarker({ timecodeSmpte: '00:00:05;00' })]
    );
    expect(edl).toContain('FCM: DROP FRAME');
  });

  test('non-drop-frame at 25fps', () => {
    const edl = generateEDL(makeSession({ frameRate: 25 }), [makeMarker()]);
    expect(edl).toContain('FCM: NON-DROP FRAME');
  });

  test('non-drop-frame at 30fps', () => {
    const edl = generateEDL(makeSession({ frameRate: 30 }), [makeMarker()]);
    expect(edl).toContain('FCM: NON-DROP FRAME');
  });

  test('event number is zero-padded to 3 digits', () => {
    const edl = generateEDL(makeSession(), [makeMarker()]);
    expect(edl).toContain('001  AX');
  });

  test('second marker has event number 002', () => {
    const markers = [
      makeMarker({ id: '1', markerNumber: 1 }),
      makeMarker({ id: '2', markerNumber: 2, timecodeMs: 10000, timecodeSmpte: '00:00:10:00' }),
    ];
    const edl = generateEDL(makeSession(), markers);
    expect(edl).toContain('002  AX');
  });

  test('FROM CLIP NAME is present', () => {
    const edl = generateEDL(makeSession(), [makeMarker()]);
    expect(edl).toContain('* FROM CLIP NAME: Marker 1');
  });

  test('sync point FROM CLIP NAME is SYNC', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const edl = generateEDL(makeSession(), [marker]);
    expect(edl).toContain('* FROM CLIP NAME: SYNC');
  });

  test('sync point COMMENT contains NLE instruction', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const edl = generateEDL(makeSession(), [marker]);
    expect(edl).toContain('synchronise all subsequent markers');
  });

  test('regular marker COMMENT contains the note', () => {
    const edl = generateEDL(makeSession(), [makeMarker({ note: 'Camera A wide' })]);
    expect(edl).toContain('* COMMENT: Camera A wide');
  });

  test('timecode uses colons for non-drop fps (24)', () => {
    const edl = generateEDL(makeSession({ frameRate: 24 }), [makeMarker()]);
    // Source-in timecode should use colons
    expect(edl).toMatch(/\d{2}:\d{2}:\d{2}:\d{2}/);
  });

  test('timecode uses semicolons for drop-frame fps (29.97)', () => {
    const marker = makeMarker({ timecodeMs: 5000, timecodeSmpte: '00:00:05;00' });
    const edl = generateEDL(makeSession({ frameRate: 29.97 }), [marker]);
    // Source-in timecode should use semicolons in EDL
    expect(edl).toMatch(/\d{2}:\d{2}:\d{2};\d{2}/);
  });

  test('record in equals source in in the event line', () => {
    const edl = generateEDL(makeSession(), [makeMarker()]);
    const eventLine = edl.split('\n').find(l => l.startsWith('001  AX'));
    expect(eventLine).toBeDefined();
    // EDL line: "001  AX       V     C        SRC_IN SRC_OUT REC_IN REC_OUT"
    // Split on 2+ spaces to separate the TC fields
    const tcSection = eventLine!.replace(/^001\s+AX\s+V\s+C\s+/, '');
    const tcs = tcSection.trim().split(/\s+/);
    // tcs[0]=SRC_IN, tcs[1]=SRC_OUT, tcs[2]=REC_IN, tcs[3]=REC_OUT
    expect(tcs[0]).toBe(tcs[2]); // SRC_IN === REC_IN
  });

  test('empty markers produces just the header', () => {
    const edl = generateEDL(makeSession(), []);
    expect(edl).toContain('TITLE:');
    expect(edl).toContain('FCM:');
    expect(edl).not.toContain('AX');
  });
});
