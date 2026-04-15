/**
 * Momen — Marker Repository
 */

import { generateId } from '../utils/generateId';
import { getDatabase } from './db';
import { Marker } from '../types';

export async function addMarker(
  sessionId: string,
  timecodeMs: number,
  timecodeSmpte: string,
  note: string = '',
  isSyncPoint: boolean = false
): Promise<Marker> {
  const db = await getDatabase();
  const id = generateId();
  const createdAt = new Date().toISOString();

  // Get next marker number
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM markers WHERE session_id = ?',
    [sessionId]
  );
  const markerNumber = (countRow?.count || 0) + 1;

  await db.runAsync(
    `INSERT INTO markers (id, session_id, marker_number, timecode_ms, timecode_smpte, note, is_sync_point, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, markerNumber, timecodeMs, timecodeSmpte, note, isSyncPoint ? 1 : 0, createdAt]
  );

  return {
    id,
    sessionId,
    markerNumber,
    timecodeMs,
    timecodeSmpte,
    note,
    isSyncPoint,
    createdAt,
  };
}

export async function getMarkers(sessionId: string): Promise<Marker[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM markers WHERE session_id = ? ORDER BY marker_number ASC',
    [sessionId]
  );

  return rows.map(mapRowToMarker);
}

export async function getNextMarkerNumber(sessionId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM markers WHERE session_id = ?',
    [sessionId]
  );
  return (row?.count || 0) + 1;
}

export async function updateMarkerNote(markerId: string, note: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE markers SET note = ? WHERE id = ?', [note, markerId]);
}

export async function deleteMarker(markerId: string): Promise<void> {
  const db = await getDatabase();

  // Get the marker to be deleted
  const marker = await db.getFirstAsync<any>(
    'SELECT * FROM markers WHERE id = ?',
    [markerId]
  );

  if (!marker) return;

  // Delete the marker
  await db.runAsync('DELETE FROM markers WHERE id = ?', [markerId]);

  // Renumber subsequent markers
  await db.runAsync(
    `UPDATE markers
     SET marker_number = marker_number - 1
     WHERE session_id = ? AND marker_number > ?`,
    [marker.session_id, marker.marker_number]
  );
}

export async function getMarkerCount(sessionId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM markers WHERE session_id = ?',
    [sessionId]
  );
  return row?.count || 0;
}

function mapRowToMarker(row: any): Marker {
  return {
    id: row.id,
    sessionId: row.session_id,
    markerNumber: row.marker_number,
    timecodeMs: row.timecode_ms,
    timecodeSmpte: row.timecode_smpte,
    note: row.note || '',
    isSyncPoint: row.is_sync_point === 1,
    createdAt: row.created_at,
  };
}
