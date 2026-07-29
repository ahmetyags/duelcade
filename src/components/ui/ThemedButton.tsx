/** Shared mechanical action control for terminal and facility screens. */

import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, shadows } from '@/theme/tokens';
import { triggerHaptic } from '@/services/HapticsService';
import { audioService } from '@/services/AudioService';
import { ThemedText } from './ThemedText';
import { useSettingsStore } from '@/store/settingsStore';

type ButtonVariant = 'primary' | 'secondary' | 'wood' | 'danger' | 'ghost' | 'operator' | 'explorer';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ThemedButtonProps extends Omit<PressableProps, 'style'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly icon?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly labelStyle?: StyleProp<TextStyle>;
  readonly onPress?: () => void;
}

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; border: string; base: string; text: string }> = {
  primary: { bg: colors.primary, border: colors.primary, base: colors.primary, text: colors.textOnPrimary },
  secondary: { bg: colors.surface, border: colors.border, base: colors.border, text: colors.textPrimary },
  wood: { bg: colors.primaryContainer, border: colors.actionCyan, base: colors.primaryDark, text: colors.actionCyan },
  danger: { bg: colors.surfaceDark, border: colors.error, base: colors.borderDark, text: colors.error },
  ghost: { bg: 'transparent', border: 'transparent', base: 'transparent', text: colors.actionCyan },
  operator: { bg: colors.primaryContainer, border: colors.actionCyan, base: colors.primaryDark, text: colors.actionCyan },
  explorer: { bg: colors.secondaryContainer, border: colors.actionAmber, base: colors.secondaryDark, text: colors.actionAmber },
};

const SIZE_STYLES: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; fontWeight: string }> = {
  sm: { paddingV: spacing.sm, paddingH: spacing.md, fontSize: 13, fontWeight: '700' },
  md: { paddingV: 12, paddingH: spacing.lg, fontSize: 15, fontWeight: '700' },
  lg: { paddingV: 13, paddingH: spacing.xl, fontSize: 13, fontWeight: '700' },
};

export const ThemedButton = React.memo<ThemedButtonProps>(function ThemedButton({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  labelStyle,
  onPress,
  ...rest
}) {
  const variantColors = VARIANT_COLORS[variant];
  const sizeStyles = SIZE_STYLES[size];
  const { highContrast, reduceMotion } = useSettingsStore();
  const flatAction = variant === 'primary' || variant === 'secondary';

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    triggerHaptic('light');
    audioService.playUiTap();
    onPress?.();
  }, [disabled, loading, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: sizeStyles.paddingV,
          paddingHorizontal: sizeStyles.paddingH,
          backgroundColor: variantColors.bg,
          borderRadius: flatAction ? radius.lg : radius.md,
          borderWidth: variant === 'ghost' ? 0 : highContrast ? 3 : flatAction ? 1 : 2,
          borderTopWidth: variant === 'ghost' ? 0 : highContrast ? 3 : flatAction ? 1 : 3,
          borderBottomWidth: variant === 'ghost' ? 0 : highContrast ? 3 : flatAction ? 1 : 4,
          borderColor: variantColors.border,
          borderBottomColor: variantColors.base,
          minHeight: size === 'lg' ? 52 : size === 'md' ? 48 : 44,
          opacity: disabled ? 0.45 : 1,
          transform: [
            { translateY: !reduceMotion && pressed && variant !== 'ghost' ? 2 : 0 },
            { scale: !reduceMotion && pressed ? 0.99 : 1 },
          ],
        },
        variant !== 'ghost' && !flatAction && shadows.sm,
        fullWidth && ({ alignSelf: 'stretch' } as ViewStyle),
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={variantColors.text} />}
      {!loading && icon}
      <ThemedText
        style={[
          {
            color: variantColors.text,
            textAlign: 'center',
            fontSize: sizeStyles.fontSize,
            fontWeight: sizeStyles.fontWeight as '400' | '500' | '600' | '700',
          },
          labelStyle,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
});
