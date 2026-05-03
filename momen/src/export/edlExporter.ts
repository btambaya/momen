/**
 * Momen — EDL Exporter (CMX 3600)
 *
 * Generates a CMX 3600 Edit Decision List with:
 * - Single-frame edit event per marker
 * - Drop-frame notation (;) for 29.97fps
 * - Non-drop-frame (:) for all other rates
 * - SYNC marker as first event with instruction in comment
 */

import { Marker, Session } from '../types';
import { msToSmpte, formatForEdl, isDropFrame, addOneSecondMs } from '../engine/timecode';
import { SYNC_NOTE } from '../constants';

export function generateEDL(session: Session, markers: Marker[]): string {
  const fps = session.frameRate;
  const fcm = isDropFrame(fps) ? 'DROP FRAME' : 'NON-DROP FRAME';

  const header = `TITLE: ${session.name}\nFCM: ${fcm}\n`;

  const events = markers.map((marker, index) => {
    const eventNum = String(index + 1).padStart(3, '0');
    const sourceIn = formatForEdl(marker.timecodeSmpte, fps);

    // Calculate source out (1 second later)
    const outMs = addOneSecondMs(marker.timecodeMs, fps);
    const sourceOut = formatForEdl(msToSmpte(outMs, fps), fps);

    // Record in/out match source in/out
    const recordIn = sourceIn;
    const recordOut = sourceOut;

    const markerName = marker.isSyncPoint
      ? 'SYNC'
      : `Marker ${marker.markerNumber}`;
    const note = marker.isSyncPoint
      ? SYNC_NOTE
      : (marker.note || `Marker ${marker.markerNumber}`);

    const color = marker.isSyncPoint ? 'RED' : 'BLUE';

    return [
      `${eventNum}  AX       V     C        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`,
      `* FROM CLIP NAME: ${markerName}`,
      note ? `* LOC: ${recordIn} ${color}     ${note}` : '',
    ].filter(Boolean).join('\n');
  });

  return header + '\n' + events.join('\n\n') + '\n';
}
