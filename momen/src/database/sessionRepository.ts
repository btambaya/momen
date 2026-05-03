/**
 * Momen — Session Repository
 */

import { generateId } from '../utils/generateId';
import { getDatabase } from './db';
import { Session, FrameRate, SyncMethod } from '../types';

export async function createSession(
  name: string,
  date: string,
  frameRate: FrameRate
): Promise<Session> {
  const db = await getDatabase();
  const id = generateId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sessions (id, name, date, sync_method, offset_ms, frame_rate, created_at)
     VALUES (?, ?, ?, 'manual', 0, ?, ?)`,
    [id, name, date, frameRate, createdAt]
  );

  return {
    id,
    name,
    date,
    syncMethod: 'manual',
    offsetMs: 0,
    syncTime: null,
    frameRate,
    cameraTc: null,
    createdAt,
  };
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<any>(
    `SELECT s.*, COUNT(m.id) as marker_count
     FROM sessions s
     LEFT JOIN markers m ON m.session_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  );

  return rows.map(mapRowToSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<any>(
    `SELECT s.*, COUNT(m.id) as marker_count
     FROM sessions s
     LEFT JOIN markers m ON m.session_id = s.id
     WHERE s.id = ?
     GROUP BY s.id`,
    [id]
  );

  return row ? mapRowToSession(row) : null;
}

export async function updateSessionSync(
  id: string,
  method: SyncMethod,
  offsetMs: number,
  cameraTc: string | null,
  syncPerformanceTime: number,
  syncDeviceTime: number,
  cameraTcMs: number
): Promise<void> {
  const db = await getDatabase();
  const syncTime = new Date().toISOString();

  await db.runAsync(
    `UPDATE sessions
     SET sync_method = ?, offset_ms = ?, camera_tc = ?, sync_time = ?,
         sync_performance_time = ?, sync_device_time = ?, camera_tc_ms = ?
     WHERE id = ?`,
    [method, offsetMs, cameraTc, syncTime, syncPerformanceTime, syncDeviceTime, cameraTcMs, id]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  // Explicit cascade — delete markers first in case FK pragma isn't active
  await db.runAsync('DELETE FROM markers WHERE session_id = ?', [id]);
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

export async function endSession(id: string, finalTcMs: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE sessions SET is_ended = 1, final_tc_ms = ? WHERE id = ?', [finalTcMs, id]);
}

export async function getSessionSyncData(id: string): Promise<{
  syncPerformanceTime: number;
  syncDeviceTime: number;
  cameraTcMs: number;
} | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT sync_performance_time, sync_device_time, camera_tc_ms FROM sessions WHERE id = ?',
    [id]
  );

  if (!row) return null;

  return {
    syncPerformanceTime: row.sync_performance_time || 0,
    syncDeviceTime: row.sync_device_time || 0,
    cameraTcMs: row.camera_tc_ms || 0,
  };
}

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    syncMethod: row.sync_method as SyncMethod,
    offsetMs: row.offset_ms || 0,
    syncTime: row.sync_time,
    frameRate: row.frame_rate as FrameRate,
    cameraTc: row.camera_tc,
    createdAt: row.created_at,
    markerCount: row.marker_count || 0,
    isEnded: row.is_ended === 1,
    finalTcMs: row.final_tc_ms || 0,
  };
}
