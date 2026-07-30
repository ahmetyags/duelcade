import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { useSettingsStore } from '@/store/settingsStore';

interface MagicBackdropProps {
  readonly style?: StyleProp<ViewStyle>;
}

/** Shared low-contrast facility wall used behind every non-scene screen. */
export const MagicBackdrop = React.memo<MagicBackdropProps>(function MagicBackdrop({ style }) {
  const highContrast = useSettingsStore((state) => state.highContrast);
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]}>
      {!highContrast && (
        <>
          <View style={styles.horizontalSeam} />
          <View style={styles.lowerSeam} />
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    pointerEvents: 'none',
    backgroundColor: colors.backgroundDeep,
  },
  horizontalSeam: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderSubtle,
    opacity: 0.34,
  },
  lowerSeam: {
    position: 'absolute',
    top: '72%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderSubtle,
    opacity: 0.28,
  },
});
