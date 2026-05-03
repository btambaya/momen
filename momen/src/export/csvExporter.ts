/**
 * Momen — CSV Exporter
 *
 * Generates a standard CSV file with one row per marker.
 * Columns: Marker Number, Timecode, Duration, Note, Sync Point
 */

import { Marker, FrameRate } from '../types';
import { SYNC_NOTE } from '../constants';

export function generateCSV(markers: Marker[], fps: FrameRate): string {
  const header = 'Marker Number,Timecode,Duration,Note,Sync Point';

  const rows = markers.map((marker) => {
    const duration = '00:00:01:00'; // Conventional 1-second SMPTE duration
    const note = marker.isSyncPoint
      ? escapeCSV(SYNC_NOTE)
      : escapeCSV(marker.note);
    const syncPoint = marker.isSyncPoint ? 'TRUE' : 'FALSE';

    return `${marker.markerNumber},${marker.timecodeSmpte},${duration},${note},${syncPoint}`;
  });

  return [header, ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
