/**
 * GlassCard — Glassmorphism card component with frosted glass effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadows } from '../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  accent?: 'coral' | 'teal' | 'amber' | 'purple' | null;
  onPress?: () => void;
}

export function GlassCard({ children, style, elevated = false, accent = null }: GlassCardProps) {
  const accentBorder = accent ? getAccentBorder(accent) : colors.glass.border;

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { borderColor: accentBorder },
        accent && { backgroundColor: getAccentBg(accent) },
        style,
      ]}
    >
      {/* Top shine line */}
      <View style={[styles.shine, accent && { backgroundColor: getAccentShine(accent) }]} />
      {children}
    </View>
  );
}

function getAccentBorder(accent: string): string {
  switch (accent) {
    case 'coral':  return colors.coral.border;
    case 'teal':   return colors.teal.border;
    case 'amber':  return 'rgba(212, 147, 11, 0.3)';
    case 'purple': return 'rgba(123, 111, 240, 0.3)';
    default:       return colors.glass.border;
  }
}

function getAccentBg(accent: string): string {
  switch (accent) {
    case 'coral':  return colors.coral.light;
    case 'teal':   return colors.teal.light;
    case 'amber':  return colors.amber.light;
    case 'purple': return colors.purple.light;
    default:       return colors.glass.bg;
  }
}

function getAccentShine(accent: string): string {
  switch (accent) {
    case 'coral':  return 'rgba(232, 97, 58, 0.2)';
    case 'teal':   return 'rgba(34, 201, 137, 0.2)';
    case 'amber':  return 'rgba(212, 147, 11, 0.2)';
    case 'purple': return 'rgba(123, 111, 240, 0.2)';
    default:       return 'rgba(255, 255, 255, 0.06)';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.glass.bgHover,
    borderColor: colors.glass.borderLight,
    ...shadows.card,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
