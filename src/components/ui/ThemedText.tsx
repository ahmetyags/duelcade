/**
 * ThemedText — typography component with design system colors.
 * Supports semantic variants, accessibility scaling, and role tinting.
 */

import React from 'react';
import { StyleSheet, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { FontFamilies, Typography } from '@/theme/typography';
import { colors } from '@/theme/tokens';
import { useSettingsStore } from '@/store/settingsStore';

type TextVariant = keyof typeof Typography;
type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'error' | 'success' | 'rare' | 'operator' | 'explorer' | 'onPrimary';

const COLOR_MAP: Record<TextColor, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.accent,
  error: colors.error,
  success: colors.success,
  rare: colors.rare,
  operator: colors.operator,
  explorer: colors.explorer,
  onPrimary: colors.textOnPrimary,
};

interface ThemedTextProps extends Omit<TextProps, 'style'> {
  readonly variant?: TextVariant;
  readonly color?: TextColor;
  readonly style?: StyleProp<TextStyle>;
}

export const ThemedText = React.memo<ThemedTextProps>(function ThemedText({
  variant = 'body',
  color = 'primary',
  style,
  children,
  ...rest
}) {
  const { largeText, highContrast } = useSettingsStore();

  const baseStyle = Typography[variant];
  const textColor = highContrast
    ? color === 'muted' ? colors.textSecondary : COLOR_MAP[color]
    : COLOR_MAP[color];
  const flattenedStyle = StyleSheet.flatten(style);
  const requestedFontSize = flattenedStyle?.fontSize ?? baseStyle.fontSize;
  const requestedLineHeight = flattenedStyle?.lineHeight ?? baseStyle.lineHeight;
  const fontFamily = baseStyle.fontWeight === '700'
    ? FontFamilies.bold
    : baseStyle.fontWeight === '600'
      ? FontFamilies.semiBold
      : baseStyle.fontWeight === '500'
        ? FontFamilies.medium
        : FontFamilies.regular;

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: baseStyle.fontSize,
          fontWeight: baseStyle.fontWeight,
          lineHeight: baseStyle.lineHeight,
          letterSpacing: (baseStyle as { letterSpacing?: number }).letterSpacing ?? 0,
          color: textColor,
        },
        style,
        largeText && {
          fontSize: requestedFontSize * 1.15,
          lineHeight: requestedLineHeight * 1.15,
        },
        highContrast && color === 'muted' && { color: colors.textSecondary },
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
});
