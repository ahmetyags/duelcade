import React from 'react';
import {
  Canvas,
  Image,
  Rect,
  useImage,
} from '@shopify/react-native-skia';

import { colors } from '@/theme/tokens';

interface DevicePuzzleBackdropProps {
  readonly source: number;
  readonly width: number;
  readonly height: number;
}

/** Native Skia image layer shared by all close-up device puzzles. */
export const DevicePuzzleBackdrop = React.memo<DevicePuzzleBackdropProps>(
  function DevicePuzzleBackdrop({ source, width, height }) {
    const image = useImage(source);

    return (
      <Canvas style={{ position: 'absolute', inset: 0, width, height, pointerEvents: 'none' }}>
        <Rect x={0} y={0} width={width} height={height} color={colors.backgroundDeep} />
        <Image
          image={image}
          fit="fill"
          x={0}
          y={0}
          width={width}
          height={height}
        />
        <Rect x={0} y={0} width={width} height={height} color="rgba(2, 8, 7, 0.18)" />
      </Canvas>
    );
  },
);
