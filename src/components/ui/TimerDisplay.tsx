/**
 * TimerDisplay — countdown timer for the game HUD.
 * Per design bible: server-authoritative time, client displays remaining.
 * Color changes: green > orange (under 5 min) > red (under 1 min).
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { colors, spacing } from '@/theme/tokens';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '@/engine/ScoreCalculator';
import { Clock } from 'lucide-react-native';

interface TimerDisplayProps {
  readonly style?: StyleProp<ViewStyle>;
  readonly compact?: boolean;
}

export const TimerDisplay = React.memo<TimerDisplayProps>(function TimerDisplay({
  style,
  compact = false,
}) {
  const remainingTimeMs = useGameStore((s) => s.remainingTimeMs);

  const minutes = remainingTimeMs / 60000;
  const color = minutes <= 1 ? colors.error : minutes <= 5 ? colors.accent : colors.success;
  const isUrgent = minutes <= 1;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, style]}>
      <Clock size={compact ? 14 : 18} color={color} strokeWidth={2} />
      <ThemedText
        variant={compact ? 'caption' : 'mono'}
        style={{
          color,
          fontVariant: ['tabular-nums' as never],
          fontWeight: isUrgent ? '700' : '600',
        }}
      >
        {formatTime(remainingTimeMs)}
      </ThemedText>
    </View>
  );
});
