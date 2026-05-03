/**
 * Momen — FCPXML Exporter Tests
 */

import { generateFCPXML } from '../../export/fcpxmlExporter';
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

describe('generateFCPXML', () => {
  test('output starts with XML declaration', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
  });

  test('output contains fcpxml version 1.9', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toContain('<fcpxml version="1.9">');
  });

  test('output contains session name as event name', () => {
    const xml = generateFCPXML(makeSession({ name: 'My Test Session' }), [makeMarker()]);
    expect(xml).toContain('name="My Test Session"');
  });

  test('output contains chapter-marker element', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toContain('<chapter-marker');
  });

  test('chapter-marker has start attribute', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toMatch(/chapter-marker start="[^"]+"/);
  });

  test('chapter-marker has duration attribute', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toMatch(/chapter-marker[^>]*duration="[^"]+"/);
  });

  test('chapter-marker has value attribute (marker name)', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toContain('value="Marker 1"');
  });

  test('sync point marker has value="SYNC"', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const xml = generateFCPXML(makeSession(), [marker]);
    expect(xml).toContain('value="SYNC"');
  });

  test('sync point note contains NLE instruction', () => {
    const marker = makeMarker({ isSyncPoint: true });
    const xml = generateFCPXML(makeSession(), [marker]);
    expect(xml).toContain('synchronise all subsequent markers');
  });

  test('rational time at 24fps uses /2400s denominator for frame 1', () => {
    // Frame at 5000ms, 24fps = 120 frames → 120 * 100 / 2400 = "12000/2400s"
    const marker = makeMarker({ timecodeMs: 5000 }); // 5 seconds = 120 frames at 24fps
    const xml = generateFCPXML(makeSession({ frameRate: 24 }), [marker]);
    expect(xml).toContain('12000/2400s');
  });

  test('rational time at 29.97fps uses 1001 numerator factor', () => {
    const marker = makeMarker({ timecodeMs: 5000 });
    const xml = generateFCPXML(makeSession({ frameRate: 29.97 }), [marker]);
    // At 29.97fps, frames = floor(5000/1000 * 30000/1001) = 149 frames
    // start = 149*1001/30000s
    expect(xml).toContain('/30000s');
  });

  test('rational time at 25fps uses /2500s denominator', () => {
    const marker = makeMarker({ timecodeMs: 1000 }); // 25 frames at 25fps
    const xml = generateFCPXML(makeSession({ frameRate: 25 }), [marker]);
    expect(xml).toContain('/2500s');
  });

  test('drop-frame fps uses tcFormat="DF"', () => {
    const xml = generateFCPXML(makeSession({ frameRate: 29.97 }), [makeMarker()]);
    expect(xml).toContain('tcFormat="DF"');
  });

  test('non-drop fps uses tcFormat="NDF"', () => {
    const xml = generateFCPXML(makeSession({ frameRate: 24 }), [makeMarker()]);
    expect(xml).toContain('tcFormat="NDF"');
  });

  test('special XML characters in session name are escaped', () => {
    const xml = generateFCPXML(makeSession({ name: 'Test & <shoot>' }), [makeMarker()]);
    expect(xml).toContain('Test &amp; &lt;shoot&gt;');
    expect(xml).not.toContain('Test & <shoot>');
  });

  test('multiple markers all appear in output', () => {
    const markers = [
      makeMarker({ id: '1', markerNumber: 1 }),
      makeMarker({ id: '2', markerNumber: 2, timecodeMs: 10000 }),
      makeMarker({ id: '3', markerNumber: 3, timecodeMs: 15000 }),
    ];
    const xml = generateFCPXML(makeSession(), markers);
    expect(xml).toContain('value="Marker 1"');
    expect(xml).toContain('value="Marker 2"');
    expect(xml).toContain('value="Marker 3"');
  });

  test('output contains resources and format elements', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toContain('<resources>');
    expect(xml).toContain('<format ');
  });

  test('output contains library, event, project, sequence, spine structure', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml).toContain('<library>');
    expect(xml).toContain('<event ');
    expect(xml).toContain('<project ');
    expect(xml).toContain('<sequence ');
    expect(xml).toContain('<spine>');
  });

  test('output is closed properly (ends with </fcpxml>)', () => {
    const xml = generateFCPXML(makeSession(), [makeMarker()]);
    expect(xml.trimEnd().endsWith('</fcpxml>')).toBe(true);
  });
});
