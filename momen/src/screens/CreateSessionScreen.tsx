/**
 * CreateSessionScreen — New session setup
 *
 * Name, date, and frame rate selection before proceeding to sync.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { FrameRatePicker } from '../components/FrameRatePicker';
import { FrameRate, RootStackParamList } from '../types';
import { createSession } from '../database/sessionRepository';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'CreateSession'>;

export function CreateSessionScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [frameRate, setFrameRate] = useState<FrameRate>(24);
  const today = new Date().toISOString().split('T')[0];

  const handleContinue = async () => {
    if (!name.trim()) return;

    try {
      const session = await createSession(name.trim(), today, frameRate);
      navigation.replace('Sync', { sessionId: session.id, frameRate });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create session');
      console.error('Create session error:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Session</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.subtitle}>
            Set up the session details before syncing to your camera's timecode.
          </Text>

          {/* Session Name */}
          <Text style={styles.label}>SESSION NAME</Text>
          <GlassCard style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Documentary Shoot Day 1"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
              returnKeyType="next"
              maxLength={50}
              accessibilityLabel="Session name"
            />
          </GlassCard>

          {/* Date display */}
          <Text style={styles.label}>DATE</Text>
          <GlassCard style={styles.inputCard}>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.dateSub}>Today</Text>
            </View>
          </GlassCard>

          {/* Frame Rate */}
          <Text style={styles.label}>FRAME RATE</Text>
          <GlassCard style={styles.fpsCard}>
            <View style={styles.fpsContent}>
              <FrameRatePicker selected={frameRate} onSelect={setFrameRate} />
              <Text style={styles.fpsWarning}>
                ⚠ Must match your camera's recording frame rate. An incorrect setting will cause markers to land on the wrong frame in the editor.
              </Text>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !name.trim() && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueBtnText, !name.trim() && styles.continueBtnTextDisabled]}>
            Continue to Sync
          </Text>
          <Text style={[styles.continueArrow, !name.trim() && styles.continueBtnTextDisabled]}>
            →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(123, 111, 240, 0.04)',
    shadowColor: colors.purple.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 60,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fonts.mono,
    fontSize: 28,
    color: colors.text.primary,
    lineHeight: 32,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 2,
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  inputCard: {
    padding: 0,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  dateText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  dateSub: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.teal.text,
    letterSpacing: 1,
  },
  fpsCard: {
    padding: 0,
  },
  fpsContent: {
    padding: spacing.xl,
  },
  fpsWarning: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.amber.text,
    lineHeight: 18,
    marginTop: spacing.lg,
    opacity: 0.8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: 36,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  continueBtn: {
    backgroundColor: colors.coral.main,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.elevated,
    shadowColor: colors.coral.main,
  },
  continueBtnDisabled: {
    backgroundColor: colors.bg.elevated,
    shadowColor: 'transparent',
  },
  continueBtnText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  continueBtnTextDisabled: {
    color: colors.text.tertiary,
  },
  continueArrow: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
