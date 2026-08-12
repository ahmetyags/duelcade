import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { triggerHaptic } from '@/services/HapticsService';
import { colors, radius, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';
import { TURN_DURATION } from '@/src/i18n/turnGames';

interface DurationSliderProps {
  readonly value: number;
  readonly onChange: (minutes: number) => void;
  readonly min?: number;
  readonly max?: number;
}

export function DurationSlider({
  value,
  onChange,
  min = 2,
  max = 20,
}: DurationSliderProps) {
  const { language } = useTranslation();
  const copy = TURN_DURATION[language];
  const [trackWidth, setTrackWidth] = useState(0);

  const clamp = (minutes: number) => Math.max(min, Math.min(max, Math.round(minutes)));
  const updateFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const next = clamp(min + (Math.max(0, Math.min(trackWidth, x)) / trackWidth) * (max - min));
    if (next === value) return;
    onChange(next);
    triggerHaptic('light');
  };

  const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.wrapper}>
      <View style={styles.valueRow}>
        <ThemedText variant="monoLarge" style={styles.value}>{value}</ThemedText>
        <ThemedText variant="label" color="muted">{copy.minutes}</ThemedText>
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={copy.playerTime}
        accessibilityValue={{ min, max, now: value, text: copy.value(value) }}
        accessibilityActions={[
          { name: 'increment', label: copy.increase },
          { name: 'decrement', label: copy.decrease },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => updateFromX(event.nativeEvent.locationX)}
        onResponderMove={(event) => updateFromX(event.nativeEvent.locationX)}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
          onChange(clamp(value + delta));
        }}
        onLayout={onLayout}
        style={styles.touchArea}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
          <View style={[styles.thumb, { left: `${percentage}%` }]}>
            <View style={styles.thumbCore} />
          </View>
        </View>
      </View>
      <View style={styles.rangeRow}>
        <ThemedText variant="caption" color="muted">{copy.short(min)}</ThemedText>
        <ThemedText variant="caption" color="muted">{copy.short(max)}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  value: {
    color: colors.primaryDark,
  },
  touchArea: {
    minHeight: 52,
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.metalDark,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: -1,
    bottom: -1,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: -11,
    width: 32,
    height: 32,
    marginLeft: -16,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCore: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
