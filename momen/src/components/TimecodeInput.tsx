/**
 * TimecodeInput — Four-segment SMPTE timecode input (HH:MM:SS:FF)
 */

import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { FrameRate, FRAME_RATES } from '../types';
import { getNominalFps } from '../engine/timecode';

interface TimecodeInputProps {
  onTimecodeChange: (smpte: string) => void;
  fps: FrameRate;
  initialValue?: string;
}

export function TimecodeInput({ onTimecodeChange, fps, initialValue }: TimecodeInputProps) {
  const initial = initialValue ? initialValue.replace(/;/g, ':').split(':') : ['', '', '', ''];

  const [hh, setHh] = useState(initial[0] || '');
  const [mm, setMm] = useState(initial[1] || '');
  const [ss, setSs] = useState(initial[2] || '');
  const [ff, setFf] = useState(initial[3] || '');

  const mmRef = useRef<TextInput>(null);
  const ssRef = useRef<TextInput>(null);
  const ffRef = useRef<TextInput>(null);

  const nominal = getNominalFps(fps);

  const handleChange = (
    value: string,
    setter: (v: string) => void,
    maxVal: number,
    nextRef: React.RefObject<TextInput | null> | null,
    segment: 'hh' | 'mm' | 'ss' | 'ff'
  ) => {
    // Only allow digits
    const clean = value.replace(/[^0-9]/g, '').slice(0, 2);
    setter(clean);

    // Build the full timecode
    const parts = { hh, mm, ss, ff };
    parts[segment] = clean;
    const smpte = `${pad(parts.hh)}:${pad(parts.mm)}:${pad(parts.ss)}:${pad(parts.ff)}`;
    onTimecodeChange(smpte);

    // Auto-advance to next field
    if (clean.length === 2 && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentWrapper}>
        <Text style={styles.label}>HH</Text>
        <TextInput
          style={styles.segment}
          value={hh}
          onChangeText={(v) => handleChange(v, setHh, 23, mmRef, 'hh')}
          maxLength={2}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={colors.text.tertiary}
          selectTextOnFocus
        />
      </View>

      <Text style={styles.separator}>:</Text>

      <View style={styles.segmentWrapper}>
        <Text style={styles.label}>MM</Text>
        <TextInput
          ref={mmRef}
          style={styles.segment}
          value={mm}
          onChangeText={(v) => handleChange(v, setMm, 59, ssRef, 'mm')}
          maxLength={2}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={colors.text.tertiary}
          selectTextOnFocus
        />
      </View>

      <Text style={styles.separator}>:</Text>

      <View style={styles.segmentWrapper}>
        <Text style={styles.label}>SS</Text>
        <TextInput
          ref={ssRef}
          style={styles.segment}
          value={ss}
          onChangeText={(v) => handleChange(v, setSs, 59, ffRef, 'ss')}
          maxLength={2}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={colors.text.tertiary}
          selectTextOnFocus
        />
      </View>

      <Text style={styles.separator}>:</Text>

      <View style={styles.segmentWrapper}>
        <Text style={styles.label}>FF</Text>
        <TextInput
          ref={ffRef}
          style={styles.segment}
          value={ff}
          onChangeText={(v) => handleChange(v, setFf, nominal - 1, null, 'ff')}
          maxLength={2}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={colors.text.tertiary}
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

function pad(val: string): string {
  return val.padStart(2, '0');
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  segmentWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  segment: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.glass.bgActive,
    borderWidth: 1,
    borderColor: colors.glass.border,
    fontFamily: fonts.mono,
    fontSize: fontSize['2xl'],
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  separator: {
    fontFamily: fonts.mono,
    fontSize: fontSize['2xl'],
    color: colors.text.tertiary,
    marginTop: 16,
  },
});
