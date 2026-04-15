/**
 * Momen — Glassmorphism Design System
 *
 * Dark theme with frosted glass effects, subtle transparency,
 * and vibrant accent colors. Designed for on-set use in dark environments.
 */

import { StyleSheet, Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0A0A0F',        // Deep black-blue
    secondary: '#12121A',      // Slightly lighter
    tertiary: '#1A1A25',       // Card backgrounds
    elevated: '#222230',       // Elevated surfaces
  },

  // Glass effects
  glass: {
    bg: 'rgba(255, 255, 255, 0.05)',
    bgHover: 'rgba(255, 255, 255, 0.08)',
    bgActive: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
    borderActive: 'rgba(255, 255, 255, 0.25)',
  },

  // Text
  text: {
    primary: '#F0EDE6',        // Warm white
    secondary: '#9B97A0',      // Muted lavender-grey
    tertiary: '#5E5A66',       // Very muted
    inverse: '#0A0A0F',
  },

  // Accent — Coral (primary actions)
  coral: {
    main: '#E8613A',
    light: 'rgba(232, 97, 58, 0.15)',
    glow: 'rgba(232, 97, 58, 0.25)',
    text: '#FF8A6A',
    border: 'rgba(232, 97, 58, 0.3)',
  },

  // Accent — Teal (status, success)
  teal: {
    main: '#22C989',
    light: 'rgba(34, 201, 137, 0.15)',
    glow: 'rgba(34, 201, 137, 0.25)',
    text: '#5EEDB5',
    border: 'rgba(34, 201, 137, 0.3)',
  },

  // Accent — Amber (warnings)
  amber: {
    main: '#D4930B',
    light: 'rgba(212, 147, 11, 0.15)',
    text: '#F5C34A',
  },

  // Accent — Purple (info, sync)
  purple: {
    main: '#7B6FF0',
    light: 'rgba(123, 111, 240, 0.15)',
    text: '#A79BF5',
  },

  // System
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
};

// ─── Typography ──────────────────────────────────────────────

export const fonts = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) as string,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 42,
  timecode: 52,    // Running timecode display
  hero: 64,        // Hero numbers
};

// ─── Spacing ─────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ─── Border Radius ───────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  round: 999,
};

// ─── Shadows ─────────────────────────────────────────────────

export const shadows = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  }),
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ─── Glassmorphism Base Styles ────────────────────────────────

export const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardElevated: {
    backgroundColor: colors.glass.bgHover,
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
    borderRadius: radius.lg,
    ...shadows.card,
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.md,
  },
  pill: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.lg,
  },
});

// ─── Common Styles ───────────────────────────────────────────

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  screenPadding: {
    paddingHorizontal: spacing.xl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    marginTop: spacing['2xl'],
  },
  monoText: {
    fontFamily: fonts.mono,
    color: colors.text.primary,
  },
});
