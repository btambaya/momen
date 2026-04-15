/**
 * FrameRatePicker — Horizontal pill buttons for frame rate selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { FrameRate, FRAME_RATES } from '../types';

interface FrameRatePickerProps {
  selected: FrameRate;
  onSelect: (fps: FrameRate) => void;
}

export function FrameRatePicker({ selected, onSelect }: FrameRatePickerProps) {
  return (
    <View style={styles.container}>
      {FRAME_RATES.map((fps) => (
        <TouchableOpacity
          key={fps}
          style={[
            styles.pill,
            selected === fps && styles.pillSelected,
          ]}
          onPress={() => onSelect(fps)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              selected === fps && styles.pillTextSelected,
            ]}
          >
            {fps}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  pillSelected: {
    backgroundColor: colors.coral.light,
    borderColor: colors.coral.border,
    shadowColor: colors.coral.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  pillText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.coral.text,
  },
});
