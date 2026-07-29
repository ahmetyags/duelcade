import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Bot,
  Cat,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Rocket,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { colors } from '@/theme/tokens';
import type { PlayerAvatarId } from '@/types/profile';

const ICONS: Record<PlayerAvatarId, LucideIcon> = {
  bolt: Zap,
  bot: Bot,
  cat: Cat,
  crown: Crown,
  flame: Flame,
  gamepad: Gamepad2,
  gem: Gem,
  rocket: Rocket,
  shield: Shield,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
};

interface PlayerAvatarProps {
  readonly avatarId?: PlayerAvatarId;
  readonly size?: number;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly borderColor?: string;
}

export function PlayerAvatar({
  avatarId,
  size = 44,
  color = colors.primaryDark,
  backgroundColor = colors.primaryContainer,
  borderColor = colors.primary,
}: PlayerAvatarProps) {
  const Icon = avatarId ? ICONS[avatarId] : UserRound;
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
