import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

interface MagicBackdropProps {
  readonly style?: StyleProp<ViewStyle>;
}

/** Shared low-contrast facility wall used behind every non-scene screen. */
export const MagicBackdrop = React.memo<MagicBackdropProps>(function MagicBackdrop({ style }) {
  return <View style={[StyleSheet.absoluteFill, styles.root, style]} />;
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    pointerEvents: 'none',
    backgroundColor: colors.backgroundDeep,
  },
});
