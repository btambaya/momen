/**
 * ClapListenScreen — Microphone-based clap sync detection
 *
 * Listens for a sharp transient (clap) using expo-av audio metering.
 * On detection: captures syncPerformanceTime, writes sync to DB,
 * auto-creates a SYNC marker at t=0, and navigates to LoggingScreen.
 *
 * Manual fallback button always visible for noisy environments.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types';
import { updateSessionSync } from '../database/sessionRepository';
import { addMarker } from '../database/markerRepository';

const SYNC_NOTE =
  'Align this marker to the frame of the clap in your footage to synchronise all subsequent markers.';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ClapListen'>;
type RoutePropType = RouteProp<RootStackParamList, 'ClapListen'>;

// ─── Detection tuning ────────────────────────────────────────
const POLL_INTERVAL_MS = 50;
const HISTORY_SIZE = 10; // ~500ms of history at 50ms
const SPIKE_THRESHOLD_DB = 40; // dB above noise floor — very aggressive
const ABSOLUTE_MIN_DB = -8; // must be near-clipping (claps hit -5 to 0 dBFS close to mic)
const COOLDOWN_MS = 1500; // ignore sounds after detection
const AUTO_NAV_DELAY_MS = 700; // pause before navigating
const DECAY_CHECK_COUNT = 2; // wait 2 polls (100ms) to confirm decay
const DECAY_DROP_DB = 15; // level must drop 15+ dB after spike (claps decay fast)

export function ClapListenScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { sessionId, frameRate } = route.params;

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [detected, setDetected] = useState(false);
  const [meterLevel, setMeterLevel] = useState(-60);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastDetectionRef = useRef(0);
  const detectedRef = useRef(false);

  // Two-phase detection state
  const candidateRef = useRef<{
    peakDb: number;
    peakTime: number;
    pollsSincePeak: number;
  } | null>(null);

  // Animations
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.3)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulsing idle animation
  useEffect(() => {
    if (detected) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [detected]);

  // Animate ring with meter level
  useEffect(() => {
    if (detected) return;
    // Map dBFS (-60..0) to scale (1..1.8)
    const normalized = Math.max(0, Math.min(1, (meterLevel + 60) / 60));
    const targetScale = 1 + normalized * 0.8;

    Animated.spring(ringScale, {
      toValue: targetScale,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();

    Animated.timing(ringOpacity, {
      toValue: 0.2 + normalized * 0.6,
      duration: 60,
      useNativeDriver: true,
    }).start();
  }, [meterLevel, detected]);

  // ─── Audio setup ─────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionGranted(false);
        Alert.alert(
          'Microphone Required',
          'Momen needs microphone access to detect claps. You can sync manually instead.',
          [{ text: 'OK' }]
        );
        return false;
      }
      setPermissionGranted(true);
      return true;
    } catch (e) {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recording.setProgressUpdateInterval(POLL_INTERVAL_MS);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          handleMeterReading(status.metering);
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsListening(true);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Audio Error', 'Failed to access microphone.');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        // We don't need the audio file — delete it
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    setIsListening(false);
  }, []);

  // Mount: request permission → start listening
  useEffect(() => {
    let mounted = true;
    (async () => {
      const granted = await requestPermission();
      if (granted && mounted) {
        await startListening();
      }
    })();
    return () => {
      mounted = false;
      stopListening();
    };
  }, []);

  // ─── Two-phase clap detection algorithm ────────────────────
  //
  // Phase 1: Detect a loud spike (above noise floor + threshold + absolute min)
  //          → record it as a "candidate" with peak dB and timestamp
  // Phase 2: Wait DECAY_CHECK_COUNT polls (~100ms), then check if the level
  //          dropped by DECAY_DROP_DB. Claps decay instantly → confirmed.
  //          Thuds/bumps sustain → rejected.

  const handleMeterReading = useCallback(
    (dBFS: number) => {
      if (detectedRef.current) return;

      setMeterLevel(dBFS);

      const now = performance.now();

      // Cooldown check
      if (now - lastDetectionRef.current < COOLDOWN_MS) return;

      const candidate = candidateRef.current;

      // ── Phase 2: Confirm decay of an existing candidate ──
      if (candidate) {
        candidate.pollsSincePeak++;

        if (candidate.pollsSincePeak >= DECAY_CHECK_COUNT) {
          const drop = candidate.peakDb - dBFS;

          if (drop >= DECAY_DROP_DB) {
            // ✅ Confirmed clap — sharp transient that decayed fast
            lastDetectionRef.current = now;
            detectedRef.current = true;
            candidateRef.current = null;

            // Use the original spike time, compensated
            const compensatedTime = candidate.peakTime - POLL_INTERVAL_MS / 2;
            onClapDetected(compensatedTime);
          } else {
            // ❌ Sustained sound (bump/thud/voice) — reject candidate
            candidateRef.current = null;
          }
          return;
        }
        // Still waiting for enough polls — don't do anything else
        return;
      }

      // ── Phase 1: Look for a spike ──
      const history = historyRef.current;
      const noiseFloor =
        history.length > 0
          ? history.reduce((a, b) => a + b, 0) / history.length
          : -60;

      const spikeAboveNoise = dBFS - noiseFloor;

      if (spikeAboveNoise > SPIKE_THRESHOLD_DB && dBFS > ABSOLUTE_MIN_DB) {
        // Candidate spike — start decay confirmation
        candidateRef.current = {
          peakDb: dBFS,
          peakTime: now,
          pollsSincePeak: 0,
        };
        return;
      }

      // Update rolling noise floor history (only with quiet readings)
      history.push(dBFS);
      if (history.length > HISTORY_SIZE) {
        history.shift();
      }
    },
    []
  );

  // ─── Clap handler ────────────────────────────────────────

  const onClapDetected = async (clapPerfTime: number) => {
    setDetected(true);

    // Haptic + flash
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Freeze ring at max
    Animated.spring(ringScale, {
      toValue: 1.8,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();

    // Stop recording
    await stopListening();

    // Write sync to DB
    const syncDeviceTime = Date.now();
    await updateSessionSync(
      sessionId,
      'clap',
      0,
      null,
      clapPerfTime,
      syncDeviceTime,
      0
    );

    // Auto-create SYNC marker at t=0
    await addMarker(sessionId, 0, '00:00:00:00', SYNC_NOTE, true);

    // Navigate after a brief pause
    setTimeout(() => {
      navigation.replace('Logging', { sessionId });
    }, AUTO_NAV_DELAY_MS);
  };

  // ─── Manual fallback ─────────────────────────────────────

  const handleManualSync = async () => {
    if (detectedRef.current) return;
    detectedRef.current = true;

    const syncPerfTime = performance.now();
    onClapDetected(syncPerfTime);
  };

  // ─── Render ───────────────────────────────────────────────

  const pulseRingScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const pulseRingOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  if (permissionGranted === false) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.bgGlowCoral} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.centreContent}>
          <Text style={styles.statusLabel}>MICROPHONE ACCESS DENIED</Text>
          <Text style={styles.instruction}>
            Grant microphone access in Settings,{'\n'}or use Manual sync instead.
          </Text>
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.manualBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.2],
            }),
          },
        ]}
        pointerEvents="none"
      />

      {/* Background glows */}
      <View style={styles.bgGlowCoral} />
      <View style={styles.bgGlowTeal} />

      {/* Back button */}
      {!detected && (
        <TouchableOpacity
          onPress={() => {
            stopListening();
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      )}

      {/* Centre content */}
      <View style={styles.centreContent}>
        <Text style={styles.statusLabel}>
          {detected ? 'CLAP DETECTED' : 'LISTENING'}
        </Text>

        {/* Audio ring visualization */}
        <View style={styles.ringWrapper}>
          {/* Idle pulse ring (hidden when detected) */}
          {!detected && (
            <Animated.View
              style={[
                styles.outerPulseRing,
                {
                  transform: [{ scale: pulseRingScale }],
                  opacity: pulseRingOpacity,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Reactive meter ring */}
          <Animated.View
            style={[
              styles.meterRing,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
                borderColor: detected
                  ? colors.teal.main
                  : colors.coral.main,
              },
            ]}
            pointerEvents="none"
          />

          {/* Centre icon */}
          <View
            style={[
              styles.centreCircle,
              detected && styles.centreCircleDetected,
            ]}
          >
            <Text style={[styles.centreIcon, detected && styles.centreIconDetected]}>
              {detected ? '✓' : '🎤'}
            </Text>
          </View>
        </View>

        <Text style={styles.instruction}>
          {detected
            ? 'Sync captured — starting session…'
            : 'Clap near the microphone'}
        </Text>

        {/* dBFS debug / level indicator */}
        {!detected && isListening && (
          <View style={styles.levelRow}>
            <View style={styles.levelBarBg}>
              <View
                style={[
                  styles.levelBarFill,
                  {
                    width: `${Math.max(0, Math.min(100, ((meterLevel + 60) / 60) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.levelText}>
              {Math.round(meterLevel)} dB
            </Text>
          </View>
        )}
      </View>

      {/* Manual fallback */}
      {!detected && (
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={handleManualSync}
            activeOpacity={0.7}
          >
            <Text style={styles.manualBtnText}>Tap to sync manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FPS badge */}
      <View style={styles.fpsTag}>
        <Text style={styles.fpsTagText}>{frameRate} fps</Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const RING_SIZE = 180;
const CENTRE_SIZE = 100;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 100,
  },
  bgGlowCoral: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(232, 97, 58, 0.05)',
  },
  bgGlowTeal: {
    position: 'absolute',
    bottom: -80,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(34, 201, 137, 0.04)',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backText: {
    fontFamily: fonts.mono,
    fontSize: 28,
    color: colors.text.primary,
    lineHeight: 32,
  },
  centreContent: {
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: spacing['3xl'],
  },
  ringWrapper: {
    width: RING_SIZE + 60,
    height: RING_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerPulseRing: {
    position: 'absolute',
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    borderRadius: (RING_SIZE + 40) / 2,
    borderWidth: 1,
    borderColor: 'rgba(232, 97, 58, 0.2)',
  },
  meterRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.coral.main,
  },
  centreCircle: {
    width: CENTRE_SIZE,
    height: CENTRE_SIZE,
    borderRadius: CENTRE_SIZE / 2,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreCircleDetected: {
    backgroundColor: colors.teal.light,
    borderColor: colors.teal.border,
  },
  centreIcon: {
    fontSize: 36,
  },
  centreIconDetected: {
    fontSize: 40,
    color: colors.teal.main,
  },
  instruction: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing['3xl'],
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  levelBarBg: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glass.bg,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.coral.main,
  },
  levelText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    minWidth: 50,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  manualBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: radius.round,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  manualBtnText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  fpsTag: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  fpsTagText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
});
