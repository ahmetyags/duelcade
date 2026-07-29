/**
 * ConnectionIndicator — displays network quality.
 * Shows ping value and color-coded status dot.
 * Per design bible: >250ms warning, >800ms critical.
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { colors, spacing } from '@/theme/tokens';
import { useGameStore } from '@/store/gameStore';
import type { ConnectionQuality } from '@/types/game';
import { useTranslation, type TranslationKey } from '@/src/i18n';

const QUALITY_COLORS: Record<ConnectionQuality, string> = {
  good: colors.success,
  warning: colors.accent,
  critical: colors.error,
  disconnected: colors.textMuted,
};

const QUALITY_LABELS: Record<ConnectionQuality, TranslationKey> = {
  good: 'connection.good',
  warning: 'connection.warning',
  critical: 'connection.critical',
  disconnected: 'connection.disconnected',
};

interface ConnectionIndicatorProps {
  readonly style?: StyleProp<ViewStyle>;
  readonly showLabel?: boolean;
}

export const ConnectionIndicator = React.memo<ConnectionIndicatorProps>(
  function ConnectionIndicator({ style, showLabel = false }) {
    const connectionInfo = useGameStore((s) => s.connectionInfo);
    const { t } = useTranslation();
    const color = QUALITY_COLORS[connectionInfo.quality];

    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, style]}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: colors.borderDark,
            boxShadow: `0 0 5px ${color}70`,
          }}
        />
        {showLabel && (
          <ThemedText variant="label" color="secondary">
            {connectionInfo.pingMs > 0 ? `${Math.round(connectionInfo.pingMs)}ms` : t(QUALITY_LABELS[connectionInfo.quality])}
          </ThemedText>
        )}
      </View>
    );
  },
);
