/** Shared layered surface. Accent glow is opt-in for meaningful focus states. */

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
          borderRadius: radius.xl,
          padding: spacing[padding],
          borderWidth: variant === 'transparent' ? 0 : highContrast ? 3 : 1,
          borderColor: highContrast ? colors.textPrimary : glowColor ?? colors.borderSubtle,
        },
        glowColor
          ? { boxShadow: `0 0 18px ${glowColor}38`, elevation: 2 }
          : shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
});
