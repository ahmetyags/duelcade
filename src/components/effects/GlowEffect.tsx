/**
 * GlowEffect — reusable Skia glow/bloom effect wrapper.
 * Per Art Direction Bible: glow, bloom-like light bloom on interactive elements.
 */

import React from 'react';
import { Canvas, RadialGradient, Rect } from '@shopify/react-native-skia';
import { colors } from '@/theme/tokens';
import { useSettingsStore } from '@/store/settingsStore';

interface GlowEffectProps {
  readonly width: number;
  readonly height: number;
  readonly color?: string;
  readonly intensity?: number;
  readonly position?: { x: number; y: number };
  readonly radius?: number;
}

export const GlowEffect = React.memo<GlowEffectProps>(function GlowEffect({
  width,
  height,
  color = colors.glow,
  intensity = 1,
  position = { x: width / 2, y: height / 2 },
  radius = 100,
}) {
  const { reduceMotion } = useSettingsStore();
  if (reduceMotion) return null;

  const glowRadius = radius * intensity;

  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={position}
          r={glowRadius}
          positions={[0, 0.5, 1]}
          colors={[color, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']}
          mode="clamp"
        />
      </Rect>
    </Canvas>
  );
});
