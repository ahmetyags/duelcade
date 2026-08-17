import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { audioService } from '@/services/AudioService';
import { triggerHaptic } from '@/services/HapticsService';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows } from '@/theme/tokens';

export type IconButtonTone = 'neutral' | 'primary' | 'accent' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly accessibilityLabel: string;
  readonly icon: React.ReactNode;
  readonly tone?: IconButtonTone;
  readonly size?: IconButtonSize;
  readonly shape?: 'rounded' | 'pill';
  readonly selected?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly onPress?: () => void;
}

const SIZE = { sm: 40, md: 44, lg: 48 } as const;
const TONES: Record<IconButtonTone, { background: string; border: string }> = {
  neutral: { background: 'rgba(255,255,255,0.90)', border: colors.borderSubtle },
  primary: { background: colors.primaryContainer, border: 'rgba(34,200,184,0.48)' },
  accent: { background: colors.secondaryContainer, border: 'rgba(245,166,58,0.50)' },
  danger: { background: '#FFF7F5', border: 'rgba(215,108,92,0.46)' },
};

/** Shared icon-only control for headers, toolbars and compact actions. */
export const IconButton = React.memo<IconButtonProps>(function IconButton({
  accessibilityLabel,
  icon,
  tone = 'neutral',
  size = 'md',
  shape = 'rounded',
  selected = false,
  disabled = false,
  style,
  onPress,
  ...rest
}) {
  const highContrast = useSettingsStore((state) => state.highContrast);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const dimension = SIZE[size];
  const palette = TONES[tone];
  const isDisabled = disabled === true;

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    triggerHaptic('light');
    audioService.playUiTap();
    onPress?.();
  }, [isDisabled, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, selected }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          width: dimension,
          height: dimension,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: shape === 'pill' ? radius.pill : radius.lg,
          borderWidth: highContrast ? 3 : 1,
          borderColor: selected ? colors.primary : palette.border,
          backgroundColor: selected ? colors.primaryContainer : palette.background,
          opacity: isDisabled ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ translateY: !reduceMotion && pressed ? 1 : 0 }],
        },
        shadows.sm,
        style,
      ]}
      {...rest}
    >
      {icon}
    </Pressable>
  );
});
