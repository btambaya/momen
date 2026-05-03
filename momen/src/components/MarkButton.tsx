/**
 * MarkButton — The primary one-tap marker logging button
 *
 * Large, centred, with haptic feedback, glow effect, and press animation.
 */

import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';

interface MarkButtonProps {
  onMark: () => void;
  disabled?: boolean;
  markerCount: number;
}

export function MarkButton({ onMark, disabled = false, markerCount }: MarkButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(async () => {
    if (disabled) return;

    // Haptic feedback — fire immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Trigger the mark callback
    onMark();

    // Press animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.88,
          useNativeDriver: true,
          speed: 50,
          bounciness: 0,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [onMark, disabled, scaleAnim, glowAnim]);

  return (
    <View style={styles.wrapper}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
            transform: [{
              scale: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.3],
              }),
            }],
          },
        ]}
      />

      {/* Button */}
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={disabled}
          accessibilityLabel={`Mark timecode, marker number ${markerCount + 1}`}
        >
          {/* Inner gradient overlay */}
          <View style={styles.innerHighlight} />
          <Text style={[styles.text, disabled && styles.textDisabled]}>MARK</Text>
          <Text style={[styles.count, disabled && styles.textDisabled]}>
            #{markerCount + 1}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const BUTTON_SIZE = 120;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: BUTTON_SIZE + 40,
  },
  glowRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 30,
    height: BUTTON_SIZE + 30,
    borderRadius: (BUTTON_SIZE + 30) / 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.coral.main,
    shadowColor: colors.coral.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.coral.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.elevated,
    shadowColor: colors.coral.main,
    overflow: 'hidden',
  },
  buttonDisabled: {
    backgroundColor: colors.bg.elevated,
    shadowColor: 'transparent',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: BUTTON_SIZE / 2,
    borderTopRightRadius: BUTTON_SIZE / 2,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
  },
  textDisabled: {
    color: colors.text.tertiary,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});
