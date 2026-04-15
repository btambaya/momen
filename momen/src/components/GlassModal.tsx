/**
 * GlassModal — Glassmorphism-styled modal dialog
 *
 * Replaces native Alert.alert() with a dark, frosted glass modal
 * that matches the app's aesthetic. Supports title, message,
 * and configurable action buttons.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';

export interface GlassModalAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
}

interface GlassModalProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: GlassModalAction[];
  onClose: () => void;
  accent?: 'coral' | 'teal' | 'amber';
}

export function GlassModal({
  visible,
  title,
  message,
  actions,
  onClose,
  accent = 'coral',
}: GlassModalProps) {
  const accentColor =
    accent === 'coral'
      ? colors.coral.main
      : accent === 'teal'
      ? colors.teal.main
      : colors.amber.main;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Accent line */}
          <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {actions.map((action, index) => {
              const isCancel = action.style === 'cancel';
              const isDestructive = action.style === 'destructive';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isCancel && styles.cancelButton,
                    isDestructive && [styles.destructiveButton, { backgroundColor: accentColor }],
                    !isCancel && !isDestructive && [styles.primaryButton, { backgroundColor: accentColor }],
                    index > 0 && { marginTop: spacing.sm },
                  ]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                      (isDestructive || (!isCancel && !isDestructive)) && styles.actionButtonText,
                    ]}
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(22, 22, 30, 0.95)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
    overflow: 'hidden',
    ...shadows.elevated,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    ...shadows.card,
  },
  destructiveButton: {
    ...shadows.card,
  },
  cancelButton: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  buttonText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  actionButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
});
