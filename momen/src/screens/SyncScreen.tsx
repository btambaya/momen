/**
 * SyncScreen — Timecode sync setup
 *
 * Two methods: Manual Offset and Clap Sync.
 * Manual: enter camera timecode → tap Sync → offset calculated.
 * Clap: start session → first marker is flagged as SYNC.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { TimecodeInput } from '../components/TimecodeInput';
import { RootStackParamList, SyncMethod } from '../types';
import { smpteToMs } from '../engine/timecode';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Sync'>;
type RoutePropType = RouteProp<RootStackParamList, 'Sync'>;

export function SyncScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { sessionId, frameRate } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<SyncMethod | null>(null);
  const [cameraTc, setCameraTc] = useState('00:00:00:00');

  const handleManualSync = async () => {
    try {
      const cameraTcMs = smpteToMs(cameraTc, frameRate);
      // Navigate to RollScreen — syncPerformanceTime is captured on ROLL tap
      navigation.navigate('Roll', {
        sessionId,
        frameRate,
        syncMethod: 'manual',
        cameraTc,
        cameraTcMs,
      });
    } catch (error: any) {
      Alert.alert('Sync Error', error.message || 'Failed to parse timecode.');
    }
  };

  const handleClapSync = () => {
    // Navigate to ClapListenScreen — sync happens when clap is detected
    navigation.navigate('ClapListen', { sessionId, frameRate });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlow} />
      <View style={styles.bgGlow2} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Timecode Sync</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Warning callout */}
        <GlassCard accent="coral" style={styles.warningCard}>
          <View style={styles.warningContent}>
            <Text style={styles.warningLabel}>CRITICAL</Text>
            <Text style={styles.warningText}>
              Without a reliable timecode reference, exported markers will not align to footage in the NLE. Choose a sync method below.
            </Text>
          </View>
        </GlassCard>

        {/* Method A — Manual Offset */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedMethod('manual')}
        >
          <GlassCard
            elevated={selectedMethod === 'manual'}
            accent={selectedMethod === 'manual' ? 'coral' : null}
            style={styles.methodCard}
          >
            <View style={styles.methodContent}>
              <View style={styles.methodHeader}>
                <View style={[styles.methodIcon, styles.methodIconManual]}>
                  <Text style={styles.methodIconText}>A</Text>
                </View>
                <View style={styles.methodTitleGroup}>
                  <Text style={styles.methodTitle}>Manual Offset Sync</Text>
                  <Text style={styles.methodSubtitle}>
                    Enter the timecode shown on your camera
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMethod === 'manual' && styles.radioSelected,
                  ]}
                >
                  {selectedMethod === 'manual' && <View style={styles.radioDot} />}
                </View>
              </View>

              {selectedMethod === 'manual' && (
                <View style={styles.methodBody}>
                  <View style={styles.divider} />
                  <Text style={styles.methodInstruction}>
                    Read the timecode from your camera's display and enter it below. The moment you tap Sync, the offset will be calculated.
                  </Text>

                  <View style={styles.tcInputWrapper}>
                    <TimecodeInput
                      fps={frameRate}
                      onTimecodeChange={setCameraTc}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.syncBtn}
                    onPress={handleManualSync}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.syncBtnText}>Sync Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Method B — Clap Sync */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedMethod('clap')}
        >
          <GlassCard
            elevated={selectedMethod === 'clap'}
            accent={selectedMethod === 'clap' ? 'teal' : null}
            style={styles.methodCard}
          >
            <View style={styles.methodContent}>
              <View style={styles.methodHeader}>
                <View style={[styles.methodIcon, styles.methodIconClap]}>
                  <Text style={styles.methodIconText}>B</Text>
                </View>
                <View style={styles.methodTitleGroup}>
                  <Text style={styles.methodTitle}>Clap Sync</Text>
                  <Text style={styles.methodSubtitle}>
                    Clap in front of camera while tapping mark
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMethod === 'clap' && styles.radioSelectedTeal,
                  ]}
                >
                  {selectedMethod === 'clap' && <View style={styles.radioDotTeal} />}
                </View>
              </View>

              {selectedMethod === 'clap' && (
                <View style={styles.methodBody}>
                  <View style={styles.divider} />
                  <Text style={styles.methodInstruction}>
                    When you start the session, your first marker will be labelled SYNC. Clap in front of the camera at the same moment you tap the button.
                  </Text>
                  <Text style={styles.methodInstruction}>
                    Your editor will align the SYNC marker to the frame of the clap in your footage to synchronise all subsequent markers.
                  </Text>

                  <TouchableOpacity
                    style={[styles.syncBtn, styles.clapBtn]}
                    onPress={handleClapSync}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.syncBtnText}>Start Session</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </GlassCard>
        </TouchableOpacity>
      </ScrollView>
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
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(232, 97, 58, 0.04)',
  },
  bgGlow2: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34, 201, 137, 0.03)',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
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
  warningCard: {
    marginBottom: spacing.xl,
  },
  warningContent: {
    padding: spacing.xl,
  },
  warningLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.coral.text,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  methodCard: {
    marginBottom: spacing.lg,
  },
  methodContent: {
    padding: spacing.xl,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconManual: {
    backgroundColor: colors.coral.light,
    borderWidth: 1,
    borderColor: colors.coral.border,
  },
  methodIconClap: {
    backgroundColor: colors.teal.light,
    borderWidth: 1,
    borderColor: colors.teal.border,
  },
  methodIconText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text.primary,
  },
  methodTitleGroup: {
    flex: 1,
  },
  methodTitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  methodSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.glass.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.coral.main,
  },
  radioSelectedTeal: {
    borderColor: colors.teal.main,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral.main,
  },
  radioDotTeal: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal.main,
  },
  methodBody: {
    marginTop: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginBottom: spacing.lg,
  },
  methodInstruction: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  tcInputWrapper: {
    marginVertical: spacing.xl,
  },
  syncBtn: {
    backgroundColor: colors.coral.main,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.elevated,
    shadowColor: colors.coral.main,
  },
  clapBtn: {
    backgroundColor: colors.teal.main,
    shadowColor: colors.teal.main,
  },
  syncBtnText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
});
