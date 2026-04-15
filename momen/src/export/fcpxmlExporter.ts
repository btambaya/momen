/**
 * Momen — FCPXML 1.9 Exporter
 *
 * Generates FCPXML 1.9 compliant XML with chapter markers.
 * Must validate against Apple's FCPXML 1.9 DTD.
 *
 * Key requirements:
 * - Rational time representation (numerator/denominator)
 * - Each marker as a chapter-marker
 * - SYNC marker as first entry with editor instruction
 */

import { Marker, Session } from '../types';
import { msToFrames, framesToRationalTime, getNominalFps, getActualFps } from '../engine/timecode';

const SYNC_NOTE = 'Align this marker to the frame of the clap in your footage to synchronise all subsequent markers.';

export function generateFCPXML(session: Session, markers: Marker[]): string {
  const fps = session.frameRate;
  const nominal = getNominalFps(fps);

  // Calculate the timebase for the format
  const tcFormat = getTcFormat(fps);
  const formatId = `r1`;
  const eventName = escapeXml(session.name);
  const projectName = escapeXml(session.name);

  // Calculate total duration — from first marker to last marker + 1 second, minimum 60 seconds
  const lastMarker = markers[markers.length - 1];
  const firstMarker = markers[0];
  const minDurationMs = 60000;
  const totalDurationMs = lastMarker
    ? Math.max(lastMarker.timecodeMs + 1000, minDurationMs)
    : minDurationMs;
  const totalDurationFrames = msToFrames(totalDurationMs, fps);
  const durationRational = framesToRationalTime(totalDurationFrames, fps);

  // Build the marker elements
  const markerElements = markers.map((marker) => {
    const frameCount = msToFrames(marker.timecodeMs, fps);
    const startRational = framesToRationalTime(frameCount, fps);
    const durationOneFrame = framesToRationalTime(1, fps);
    const name = marker.isSyncPoint
      ? 'SYNC'
      : `Marker ${marker.markerNumber}`;
    const note = marker.isSyncPoint
      ? SYNC_NOTE
      : marker.note || `Marker ${marker.markerNumber}`;

    return `            <chapter-marker start="${startRational}" duration="${durationOneFrame}" value="${escapeXml(name)}" note="${escapeXml(note)}"/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <format id="${formatId}" name="FFVideoFormat${getFormatSuffix(fps)}" frameDuration="${framesToRationalTime(1, fps)}" width="1920" height="1080"/>
    </resources>
    <library>
        <event name="${eventName}">
            <project name="${projectName}">
                <sequence format="${formatId}" duration="${durationRational}" ${tcFormat}>
                    <spine>
                        <gap name="Markers" duration="${durationRational}" start="0/1s">
${markerElements}
                        </gap>
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;
}

function getTcFormat(fps: number): string {
  switch (fps) {
    case 29.97:
      return 'tcStart="0/1s" tcFormat="DF"';
    default:
      return 'tcStart="0/1s" tcFormat="NDF"';
  }
}

function getFormatSuffix(fps: number): string {
  switch (fps) {
    case 23.976: return '1080p2398';
    case 24:     return '1080p24';
    case 25:     return '1080p25';
    case 29.97:  return '1080p2997';
    case 30:     return '1080p30';
    default:     return '1080p24';
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
