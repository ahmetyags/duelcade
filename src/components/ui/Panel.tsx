/** Mounted terminal panel with a dark shell and a restrained top light. */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme/tokens';
import { useSettingsStore } from '@/store/settingsStore';

type PanelVariant = 'surface' | 'elevated' | 'muted' | 'transparent';

interface PanelProps {
  readonly variant?: PanelVariant;
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly padding?: keyof typeof spacing;
  readonly glowColor?: string;
}

const VARIANT_BG: Record<PanelVariant, string> = {
  surface: colors.surface,
  elevated: colors.surfaceElevated,
  muted: colors.surfaceDark,
  transparent: 'transparent',
};

export const Panel = React.memo<PanelProps>(function Panel({
  variant = 'surface',
  children,
  style,
  padding = 'md',
  glowColor,
}) {
  const highContrast = useSettingsStore((state) => state.highContrast);
  return (
    <View
      style={[
        {
          backgroundColor: VARIANT_BG[variant],
          borderRadius: radius.lg,
          padding: spacing[padding],
          borderWidth: variant === 'transparent' ? 0 : highContrast ? 3 : 2,
          borderTopColor: highContrast ? colors.textPrimary : glowColor ?? colors.metalLight,
          borderRightColor: highContrast ? colors.textPrimary : colors.border,
          borderBottomColor: highContrast ? colors.textPrimary : colors.borderDark,
          borderLeftColor: highContrast ? colors.textPrimary : colors.border,
        },
        glowColor
          ? { boxShadow: `0 0 12px ${glowColor}2A`, elevation: 0 }
          : shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
});
