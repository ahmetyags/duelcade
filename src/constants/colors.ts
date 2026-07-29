/**
 * Legacy Expo theme adapter.
 * New UI code imports the canonical industrial palette from theme/tokens.
 */
import { colors } from '@/theme/tokens';

const facilityTheme = {
  text: colors.textPrimary,
  background: colors.background,
  tint: colors.cyan,
  tabIconDefault: colors.textMuted,
  tabIconSelected: colors.cyan,
} as const;

export default {
  light: facilityTheme,
  dark: facilityTheme,
};
