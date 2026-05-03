// ─── Data Models ─────────────────────────────────────────────

export type SyncMethod = 'manual' | 'clap';

export type FrameRate = 23.976 | 24 | 25 | 29.97 | 30;

export const FRAME_RATES: FrameRate[] = [23.976, 24, 25, 29.97, 30];

export interface Session {
  id: string;
  name: string;
  date: string; // ISO 8601
  syncMethod: SyncMethod;
  offsetMs: number; // milliseconds (manual sync only)
  syncTime: string | null; // ISO timestamp of when sync was performed
  frameRate: FrameRate;
  cameraTc: string | null; // camera timecode entered (manual sync)
  createdAt: string;
  markerCount?: number; // computed for list display
  isEnded?: boolean;    // true when session has been ended
  finalTcMs?: number;   // frozen counter value when session ended
}

export interface Marker {
  id: string;
  sessionId: string;
  markerNumber: number;
  timecodeMs: number; // stored as milliseconds
  timecodeSmpte: string; // pre-formatted HH:MM:SS:FF
  note: string;
  isSyncPoint: boolean;
  createdAt: string;
}

// ─── Sync State ──────────────────────────────────────────────

export interface SyncState {
  method: SyncMethod;
  offsetMs: number;
  syncPerformanceTime: number; // performance.now() at sync moment
  syncDeviceTime: number; // Date.now() at sync moment
  cameraTcMs: number; // camera timecode in ms (manual only)
  isActive: boolean;
}

// ─── Navigation ──────────────────────────────────────────────

export type RootStackParamList = {
  SessionsList: undefined;
  CreateSession: undefined;
  Sync: { sessionId: string; frameRate: FrameRate };
  Roll: {
    sessionId: string;
    frameRate: FrameRate;
    syncMethod: SyncMethod;
    cameraTc?: string;
    cameraTcMs?: number;
  };
  Logging: { sessionId: string };
};
