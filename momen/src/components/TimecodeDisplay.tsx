/**
 * TimecodeDisplay — Large running timecode counter
 *
 * Updates at frame-rate frequency via requestAnimationFrame.
 * Shows offset-adjusted time for manual sync, raw elapsed for clap sync.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { getCurrentTimecode, msToSmpte, isDropFrame } from '../engine/timecode';
import { FrameRate, SyncMethod } from '../types';

interface TimecodeDisplayProps {
  syncPerformanceTime: number;
  cameraTcMs: number;
  fps: FrameRate;
  syncMethod: SyncMethod;
  isRunning: boolean;
  frozenTimecode?: string | null;
}

export function TimecodeDisplay({
  syncPerformanceTime,
  cameraTcMs,
  fps,
  syncMethod,
  isRunning,
  frozenTimecode,
}: TimecodeDisplayProps) {
  const [timecode, setTimecode] = useState(frozenTimecode || '00:00:00:00');
  const rafRef = useRef<number | null>(null);
  const lastTcRef = useRef(timecode); // avoid redundant re-renders

  const updateTimecode = useCallback(() => {
    if (!isRunning) return;

    const tc = getCurrentTimecode(syncPerformanceTime, cameraTcMs, fps, syncMethod);
    // Only re-render if the displayed value actually changed
    if (tc !== lastTcRef.current) {
      lastTcRef.current = tc;
      setTimecode(tc);
    }

    rafRef.current = requestAnimationFrame(updateTimecode);
  }, [syncPerformanceTime, cameraTcMs, fps, syncMethod, isRunning]);

  useEffect(() => {
    if (isRunning) {
      rafRef.current = requestAnimationFrame(updateTimecode);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateTimecode, isRunning]);

  // Split timecode for styled rendering
  const separator = isDropFrame(fps) ? ';' : ':';
  const parts = timecode.replace(/;/g, ':').split(':');

  return (
    <View style={styles.container}>
      {/* Glow effect behind timecode */}
      <View style={styles.glow} />

      <View style={styles.timecodeRow}>
        <Text style={styles.digit}>{parts[0] || '00'}</Text>
        <Text style={styles.separator}>:</Text>
        <Text style={styles.digit}>{parts[1] || '00'}</Text>
        <Text style={styles.separator}>:</Text>
        <Text style={styles.digit}>{parts[2] || '00'}</Text>
        <Text style={[styles.separator, styles.frameSeparator]}>
          {separator}
        </Text>
        <Text style={[styles.digit, styles.frameDigit]}>
          {parts[3] || '00'}
        </Text>
      </View>

      <View style={styles.fpsRow}>
        <View style={styles.fpsPill}>
          <Text style={styles.fpsText}>{fps} fps</Text>
        </View>
        {!isRunning && frozenTimecode ? (
          <View style={[styles.fpsPill, styles.endedPill]}>
            <Text style={[styles.fpsText, { color: colors.coral.text }]}>ENDED</Text>
          </View>
        ) : syncMethod === 'manual' ? (
          <View style={[styles.fpsPill, styles.syncPill]}>
            <View style={styles.syncDot} />
            <Text style={[styles.fpsText, { color: colors.teal.text }]}>SYNCED</Text>
          </View>
        ) : syncMethod === 'clap' ? (
          <View style={[styles.fpsPill, styles.clapPill]}>
            <Text style={[styles.fpsText, { color: colors.amber.text }]}>CLAP SYNC</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: 60,
    backgroundColor: 'rgba(232, 97, 58, 0.06)',
    borderRadius: 100,
    // Blur via shadow
    shadowColor: colors.coral.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  timecodeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  digit: {
    fontFamily: fonts.mono,
    fontSize: fontSize.timecode,
    fontWeight: '300',
    color: colors.text.primary,
    letterSpacing: 2,
    minWidth: 58,
    textAlign: 'center',
  },
  separator: {
    fontFamily: fonts.mono,
    fontSize: fontSize.timecode,
    fontWeight: '200',
    color: colors.text.tertiary,
    marginHorizontal: 2,
  },
  frameSeparator: {
    color: colors.coral.text,
  },
  frameDigit: {
    color: colors.coral.text,
  },
  fpsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fpsPill: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncPill: {
    borderColor: colors.teal.border,
    backgroundColor: colors.teal.light,
  },
  clapPill: {
    borderColor: 'rgba(212, 147, 11, 0.3)',
    backgroundColor: colors.amber.light,
  },
  endedPill: {
    borderColor: colors.coral.border,
    backgroundColor: colors.coral.light,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal.main,
  },
  fpsText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
