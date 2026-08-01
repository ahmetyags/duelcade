import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type PipeDirectionGlyphProps = {
  kind: 'straight' | 'corner';
  rotation: number;
  size: number;
  color: string;
  strokeWidth?: number;
};

export function PipeDirectionGlyph({
  kind,
  rotation,
  size,
  color,
  strokeWidth = 2.5,
}: PipeDirectionGlyphProps) {
  const path = kind === 'corner'
    ? 'M6 3v9a6 6 0 0 0 6 6h7m-4-4 4 4-4 4'
    : 'M3 12h16m-4-4 4 4-4 4';

  return (
    <View
      style={{
        width: size,
        height: size,
        transform: [{ rotate: `${rotation * 90}deg` }],
        pointerEvents: 'none',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
