/**
 * Momen — Database Setup
 *
 * SQLite database using expo-sqlite with sessions and markers tables.
 * All data stored locally — no cloud dependency.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'momen.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better performance
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  // Enable foreign keys
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await dbInstance.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      sync_method TEXT NOT NULL DEFAULT 'manual',
      offset_ms REAL DEFAULT 0,
      sync_time TEXT,
      frame_rate REAL NOT NULL DEFAULT 24,
      camera_tc TEXT,
      sync_performance_time REAL DEFAULT 0,
      sync_device_time REAL DEFAULT 0,
      camera_tc_ms REAL DEFAULT 0,
      is_ended INTEGER DEFAULT 0,
      final_tc_ms REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS markers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      marker_number INTEGER NOT NULL,
      timecode_ms REAL NOT NULL,
      timecode_smpte TEXT NOT NULL,
      note TEXT DEFAULT '',
      is_sync_point INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_markers_session ON markers(session_id);
  `);

  // Migration: add columns for existing databases
  try {
    await dbInstance.execAsync('ALTER TABLE sessions ADD COLUMN is_ended INTEGER DEFAULT 0;');
  } catch (e) {}
  try {
    await dbInstance.execAsync('ALTER TABLE sessions ADD COLUMN final_tc_ms REAL DEFAULT 0;');
  } catch (e) {}

  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
