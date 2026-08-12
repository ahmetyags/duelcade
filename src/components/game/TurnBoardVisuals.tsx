import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/tokens';

export const TURN_PLAYER_COLORS = [colors.actionCyan, colors.actionAmber] as const;

export const TURN_CIPHER_COLORS = [
  '#F0647C',
  '#7C61FF',
  '#F7C948',
  '#26D49A',
  '#35AEEA',
  '#FF974D',
  '#C471E8',
  '#536B78',
] as const;

const useNativeDriver = Platform.OS !== 'web';

export function useTurnBoardReducedMotion(): boolean {
  const userReducedMotion = useSettingsStore((state) => state.reduceMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setSystemReducedMotion(media.matches);
      update();
      media.addEventListener?.('change', update);
      return () => media.removeEventListener?.('change', update);
    }

    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    return () => subscription.remove();
  }, []);

  return userReducedMotion || systemReducedMotion;
}

export function turnPieceGlow(color: string, strength: 'soft' | 'strong' = 'soft'): ViewStyle {
  const radius = strength === 'strong' ? 12 : 7;
  if (Platform.OS === 'web') {
    return { boxShadow: `0 0 ${radius}px ${color}66` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOpacity: strength === 'strong' ? 0.42 : 0.28,
    shadowRadius: radius / 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: strength === 'strong' ? 3 : 2,
  };
}

export function TurnBoardTransition({
  roundId,
  reduceMotion,
  children,
}: {
  roundId: string;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    opacity.setValue(0.35);
    scale.setValue(0.985);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver }),
      Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver }),
    ]).start();
  }, [opacity, reduceMotion, roundId, scale]);

  return (
    <Animated.View style={[styles.fill, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export function AnimatedTurnPiece({
  identity,
  color,
  glow = false,
  completed = false,
  reduceMotion,
  style,
  children,
}: {
  identity: string | number;
  color: string;
  glow?: boolean;
  completed?: boolean;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    opacity.setValue(0.38);
    scale.setValue(0.82);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver }),
      Animated.spring(scale, {
        toValue: completed ? 1.04 : 1,
        damping: 13,
        stiffness: 230,
        mass: 0.55,
        useNativeDriver,
      }),
    ]).start();
  }, [completed, identity, opacity, reduceMotion, scale]);

  return (
    <Animated.View
      style={[
        styles.piece,
        glow && turnPieceGlow(color, completed ? 'strong' : 'soft'),
        style,
        { opacity, transform: [{ scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function BoardStateFlash({
  signal,
  color,
  reduceMotion,
}: {
  signal: string | number;
  color: string;
  reduceMotion: boolean;
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;
    opacity.setValue(0.16);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 240,
      useNativeDriver,
    }).start();
  }, [opacity, reduceMotion, signal]);

  if (reduceMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flash, { backgroundColor: color, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  piece: { alignItems: 'center', justifyContent: 'center' },
  flash: {
    position: 'absolute',
    inset: 0,
    zIndex: 7,
    borderRadius: 16,
  },
});
