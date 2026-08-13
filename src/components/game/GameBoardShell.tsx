import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme/tokens';

interface GameBoardShellProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/** Shared board focus surface; game dimensions and interactions remain owned by each board. */
export const GameBoardShell = React.memo<GameBoardShellProps>(function GameBoardShell({ children, style }) {
  return (
    <View style={[styles.shell, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: 560,
    minHeight: 300,
    maxHeight: 560,
    aspectRatio: 1,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
});
