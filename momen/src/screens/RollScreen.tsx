/**
 * RollScreen — "Stand by" gate between sync and logging.
 *
 * The ROLL button tap is the precise sync moment:
 * syncPerformanceTime is captured here, then updateSessionSync is called
 * before navigating to LoggingScreen.
 *
 * Only used for Manual Offset sync — clap sync flows directly to Logging.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, spacing } from '../theme';
import { RootStackParamList, SyncMethod } from '../types';
import { updateSessionSync } from '../database/sessionRepository';
import * as Haptics from 'expo-haptics';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Roll'>;
type RoutePropType = RouteProp<RootStackParamList, 'Roll'>;

export function RollScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { sessionId, frameRate, syncMethod, cameraTc, cameraTcMs = 0 } = route.params;

  // Pulsing ring animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
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
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleRoll = async () => {
    // Fire haptic immediately — this is the critical sync moment
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const syncPerformanceTime = performance.now();
    const syncDeviceTime = Date.now();

    let offsetMs = 0;
    let resolvedCameraTc: string | null = cameraTc ?? null;
    let resolvedCameraTcMs = cameraTcMs;

    if (syncMethod === 'manual') {
      // Offset = how far camera TC is ahead of device wall clock at this moment
      offsetMs = cameraTcMs - syncDeviceTime;
    }

    await updateSessionSync(
      sessionId,
      syncMethod as SyncMethod,
      offsetMs,
      resolvedCameraTc,
      syncPerformanceTime,
      syncDeviceTime,
      resolvedCameraTcMs
    );

    navigation.replace('Logging', { sessionId });
  };

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.65],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Subtle background glow */}
      <View style={styles.bgGlowCoral} />
      <View style={styles.bgGlowTeal} />

      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      {/* Centre content */}
      <View style={styles.centreContent}>
        <Text style={styles.standbyLabel}>STAND BY</Text>

        {/* Big roll button with pulsing ring */}
        <View style={styles.buttonWrapper}>
          {/* Outer pulsing ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: ringScale }],
                opacity: opacityAnim,
              },
            ]}
            pointerEvents="none"
          />

          {/* The ROLL button */}
          <TouchableOpacity
            onPress={handleRoll}
            style={styles.rollButton}
            activeOpacity={0.75}
          >
            <Text style={styles.rollText}>ROLL</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Tap the moment your{'\n'}camera starts rolling
        </Text>
      </View>

      {/* Frame rate badge */}
      <View style={styles.fpsTag}>
        <Text style={styles.fpsTagText}>{frameRate} fps</Text>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 220;
const RING_SIZE = BUTTON_SIZE + 40;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  standbyLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: spacing['3xl'],
  },
  buttonWrapper: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 97, 58, 0.35)',
  },
  rollButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.coral.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 106, 0.4)',
    shadowColor: colors.coral.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  rollText: {
    fontFamily: fonts.mono,
    fontSize: fontSize['3xl'],
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 10,
  },
  instruction: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing['3xl'],
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
