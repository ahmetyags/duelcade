import React from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { colors } from '@/theme/tokens';

interface DevicePuzzleBackdropProps {
  readonly source: number;
  readonly width: number;
  readonly height: number;
}

/** Static-export friendly counterpart of the native Skia image layer. */
export const DevicePuzzleBackdrop = React.memo<DevicePuzzleBackdropProps>(
  function DevicePuzzleBackdrop({ source, width, height }) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background]}>
        <Image
          source={source}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width,
            height,
          }}
        />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.backgroundDeep,
  },
  scrim: {
    backgroundColor: 'rgba(2, 8, 7, 0.18)',
  },
});
