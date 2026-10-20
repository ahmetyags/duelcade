import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

interface MagicBackdropProps {
  readonly style?: StyleProp<ViewStyle>;
}

/** Static, low-cost brand atmosphere shared by every non-scene screen. */
export const MagicBackdrop = React.memo<MagicBackdropProps>(function MagicBackdrop({ style }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} />
  );
});

const styles = StyleSheet.create({
  root: {
    pointerEvents: 'none',
    backgroundColor: colors.backgroundDeep,
  },
});
