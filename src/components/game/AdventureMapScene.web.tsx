import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { gameAssets } from '@/src/assets/gameAssets';
import { colors } from '@/theme/tokens';
import {
  SERVER_ROOM_HOTSPOTS,
  calculateContainRect,
  normalizedToScene,
  type SceneHotspotId,
  type SceneHotspotState,
} from '@/components/game/sceneHotspots';

interface AdventureMapSceneProps {
  readonly width: number;
  readonly height: number;
  readonly hotspotStates: Readonly<Record<SceneHotspotId, SceneHotspotState>>;
  readonly focusedHotspotId: SceneHotspotId | null;
  readonly debug?: boolean;
}

const STATE_COLORS: Record<SceneHotspotState, { fill: string; stroke: string }> = {
  available: { fill: 'rgba(54, 214, 200, 0.09)', stroke: colors.cyan },
  focused: { fill: 'rgba(240, 164, 58, 0.18)', stroke: colors.amberStrong },
  completed: { fill: 'rgba(56, 201, 135, 0.10)', stroke: colors.success },
  locked: { fill: 'rgba(70, 80, 75, 0.05)', stroke: colors.disabled },
};

/**
 * Web renderer mirrors the native Skia composition without requiring
 * CanvasKit/WASM in static exports.
 */
export const AdventureMapScene = React.memo<AdventureMapSceneProps>(
  function AdventureMapScene({
    width,
    height,
    hotspotStates,
    focusedHotspotId,
    debug = false,
  }) {
    const imageRect = useMemo(
      () => calculateContainRect(width, height),
      [height, width],
    );

    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background]}>
        <Image
          source={gameAssets.scenes.secureServerRoom}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            left: imageRect.x,
            top: imageRect.y,
            width: imageRect.width,
            height: imageRect.height,
          }}
        />
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {SERVER_ROOM_HOTSPOTS.map((hotspot) => {
            const state: SceneHotspotState = focusedHotspotId === hotspot.id
              ? 'focused'
              : hotspotStates[hotspot.id];
            const palette = STATE_COLORS[state];
            const points = hotspot.polygon
              .map((point) => normalizedToScene(point, imageRect))
              .map((point) => `${point.x},${point.y}`)
              .join(' ');
            const center = normalizedToScene(hotspot.focus, imageRect);
            return (
              <React.Fragment key={hotspot.id}>
                <Polygon
                  points={points}
                  fill={palette.fill}
                  stroke={palette.stroke}
                  strokeWidth={state === 'focused' ? 4 : state === 'available' ? 2.5 : 1.5}
                />
                {(state === 'available' || state === 'focused') && (
                  <>
                    <Circle
                      cx={center.x}
                      cy={center.y}
                      r={state === 'focused' ? 18 : 13}
                      fill={state === 'focused'
                        ? colors.glowOrange
                        : colors.glow}
                    />
                    <Circle
                      cx={center.x}
                      cy={center.y}
                      r={state === 'focused' ? 7 : 5}
                      fill={palette.stroke}
                    />
                  </>
                )}
                {state === 'completed' && (
                  <Circle cx={center.x} cy={center.y} r={6} fill={palette.stroke} />
                )}
                {debug && hotspot.polygon.map((point, index) => {
                  const vertex = normalizedToScene(point, imageRect);
                  return (
                    <Circle
                      key={`${hotspot.id}_${index}`}
                      cx={vertex.x}
                      cy={vertex.y}
                      r={3}
                      fill={colors.error}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    overflow: 'hidden',
    backgroundColor: colors.backgroundDeep,
  },
});
