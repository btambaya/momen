/**
 * Momen — CSV Exporter
 *
 * Generates a standard CSV file with one row per marker.
 * Columns: Marker Number, Timecode, Duration, Note, Sync Point
 */

import { Marker, FrameRate } from '../types';
import { msToSmpte, addOneSecondMs } from '../engine/timecode';

const SYNC_NOTE = 'Align this marker to the frame of the clap in your footage to synchronise all subsequent markers.';

export function generateCSV(markers: Marker[], fps: FrameRate): string {
  const header = 'Marker Number,Timecode,Duration,Note,Sync Point';

  const rows = markers.map((marker) => {
    const duration = msToSmpte(1000, fps); // 1 second duration
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
