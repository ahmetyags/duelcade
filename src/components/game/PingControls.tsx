/**
 * PingControls — quick communication buttons for non-verbal pings.
 * Per Bölüm 11: ping types are "look_here", "im_ready", "stop", "repeat".
 * 2-second cooldown, max 3 active pings on screen.
 */

import React, { useCallback } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { colors, spacing, radius } from '@/theme/tokens';
import { useGameStore } from '@/store/gameStore';
import { sendPing } from '@/services/NetworkBridge';
import { triggerHaptic } from '@/services/HapticsService';
import { Eye, Check, X, RotateCw } from 'lucide-react-native';
import type { PingType } from '@/types/game';
import { useTranslation, type TranslationKey } from '@/src/i18n';

const PING_CONFIG: Record<PingType, { icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; label: TranslationKey; color: string }> = {
  look_here: { icon: Eye, label: 'ping.look', color: colors.primary },
  im_ready: { icon: Check, label: 'ping.ready', color: colors.success },
  stop: { icon: X, label: 'ping.stop', color: colors.error },
  repeat: { icon: RotateCw, label: 'ping.repeat', color: colors.accent },
};

interface PingControlsProps {
  readonly style?: StyleProp<ViewStyle>;
}

export const PingControls = React.memo<PingControlsProps>(function PingControls({ style }) {
  const pingCooldownUntil = useGameStore((s) => s.pingCooldownUntil);
  const { t } = useTranslation();
  const setPingCooldown = useGameStore((s) => s.setPingCooldown);

  const handlePing = useCallback((type: PingType) => {
    const now = Date.now();
    if (now < pingCooldownUntil) return;

    triggerHaptic('light');

    const position = useGameStore.getState().world?.playerPosition ?? null;
    sendPing(type, position ? { x: position.x, y: position.y } : null);
    setPingCooldown(now + 2000);
    setTimeout(() => setPingCooldown(0), 2000);
  }, [pingCooldownUntil, setPingCooldown]);

  const now = Date.now();
  const onCooldown = now < pingCooldownUntil;

  return (
    <View style={[{ flexDirection: 'row', gap: spacing.xs }, style]}>
      {(Object.keys(PING_CONFIG) as PingType[]).map((type) => {
        const config = PING_CONFIG[type];
        const Icon = config.icon;

        return (
          <Pressable
            key={`ping_${type}`}
            accessibilityRole="button"
            accessibilityLabel={t(config.label)}
            accessibilityState={{ disabled: onCooldown }}
            onPress={() => handlePing(type)}
            disabled={onCooldown}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: onCooldown ? colors.surfaceMuted : `${config.color}15`,
              borderWidth: 1,
              borderColor: onCooldown ? colors.borderSubtle : `${config.color}40`,
              opacity: onCooldown ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Icon size={14} color={config.color} strokeWidth={2.5} />
            <ThemedText variant="label" style={{ color: config.color, fontSize: 11 }}>
              {t(config.label)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
});
