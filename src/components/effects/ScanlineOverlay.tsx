/**
 * ScanlineOverlay — React Native Skia CRT/scanline effect.
 * Per Art Direction Bible: scanline effect, CRT monitor noise,
 * alarm flash, and subtle particles. Applied as an overlay on game screens.
 */

import React, { useMemo } from 'react';
import { Canvas, Line, Rect, Skia } from '@shopify/react-native-skia';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/tokens';

interface ScanlineOverlayProps {
  readonly width: number;
  readonly height: number;
  readonly alarmActive?: boolean;
  readonly intensity?: number;
}

export const ScanlineOverlay = React.memo<ScanlineOverlayProps>(
  function ScanlineOverlay({ width, height, alarmActive = false, intensity = 1 }) {
    const { reduceMotion } = useSettingsStore();

    const scanlineColor = useMemo(() => {
      const baseColor = alarmActive ? colors.error : colors.primary;
      const alpha = alarmActive ? 0.06 : 0.025 * intensity;
      // Parse hex to rgba
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }, [alarmActive, intensity]);

    const lines = useMemo(() => {
      const result: { y: number; opacity: number }[] = [];
      const spacing = 3;
      for (let y = 0; y < height; y += spacing) {
        const variance = Math.sin(y * 0.1) * 0.3 + 0.7;
        result.push({ y, opacity: variance });
      }
      return result;
    }, [height]);

    if (reduceMotion) return null;

    return (
      <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}>
        {/* Scanlines */}
        {lines.map((line, i) => {
          const paint = Skia.Paint();
          paint.setColor(Skia.Color(scanlineColor));
          paint.setAlphaf(line.opacity);
          return (
            <Line
              key={`scan_${i}`}
              p1={Skia.Point(0, line.y)}
              p2={Skia.Point(width, line.y)}
              paint={paint}
            />
          );
        })}
        {/* Vignette — darker edges */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          color="rgba(2, 8, 7, 0.12)"
        />
      </Canvas>
    );
  },
);
