import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Image,
  Path,
  Rect,
  Skia,
  useImage,
} from '@shopify/react-native-skia';

import { gameAssets } from '@/src/assets/gameAssets';
import { colors } from '@/theme/tokens';
import {
  SERVER_ROOM_HOTSPOTS,
  calculateContainRect,
  normalizedToScene,
  type SceneHotspotId,
  type SceneHotspotState,
} from '@/components/game/sceneHotspots';

export interface AdventureMapSceneProps {
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
 * Native 2.5D point-and-click scene. The bitmap and visual interaction layers
 * share the same contain rect so hotspots cannot drift at different ratios.
 */
export const AdventureMapScene = React.memo<AdventureMapSceneProps>(
  function AdventureMapScene({
    width,
    height,
    hotspotStates,
    focusedHotspotId,
    debug = false,
  }) {
    const sceneImage = useImage(gameAssets.scenes.secureServerRoom);
    const imageRect = useMemo(
      () => calculateContainRect(width, height),
      [height, width],
    );
    const paths = useMemo(
      () =>
        SERVER_ROOM_HOTSPOTS.map((hotspot) => {
          const path = Skia.Path.Make();
          hotspot.polygon.forEach((point, index) => {
            const scenePoint = normalizedToScene(point, imageRect);
            if (index === 0) path.moveTo(scenePoint.x, scenePoint.y);
            else path.lineTo(scenePoint.x, scenePoint.y);
          });
          path.close();
          const center = normalizedToScene(hotspot.focus, imageRect);
          return { hotspot, path, center };
        }),
      [imageRect],
    );

    return (
      <Canvas style={{ position: 'absolute', inset: 0, width, height, pointerEvents: 'none' }}>
        <Rect x={0} y={0} width={width} height={height} color={colors.backgroundDeep} />
        <Image
          image={sceneImage}
          fit="fill"
          x={imageRect.x}
          y={imageRect.y}
          width={imageRect.width}
          height={imageRect.height}
        />
        <Rect
          x={imageRect.x}
          y={imageRect.y}
          width={imageRect.width}
          height={imageRect.height}
          color="rgba(2, 8, 7, 0.08)"
        />

        {paths.map(({ hotspot, path, center }) => {
          const state = focusedHotspotId === hotspot.id
            ? 'focused'
            : hotspotStates[hotspot.id];
          const palette = STATE_COLORS[state];
          return (
            <Group key={hotspot.id}>
              <Path path={path} color={palette.fill} />
              <Path
                path={path}
                color={palette.stroke}
                style="stroke"
                strokeWidth={state === 'focused' ? 4 : state === 'available' ? 2.5 : 1.5}
              />
              {(state === 'available' || state === 'focused') && (
                <>
                  <Circle
                    cx={center.x}
                    cy={center.y}
                    r={state === 'focused' ? 18 : 13}
                    color={state === 'focused'
                      ? colors.glowOrange
                      : colors.glow}
                  />
                  <Circle
                    cx={center.x}
                    cy={center.y}
                    r={state === 'focused' ? 7 : 5}
                    color={palette.stroke}
                  />
                </>
              )}
              {state === 'completed' && (
                <Circle cx={center.x} cy={center.y} r={6} color={palette.stroke} />
              )}
              {debug && hotspot.polygon.map((point, index) => {
                const vertex = normalizedToScene(point, imageRect);
                return (
                  <Circle
                    key={`${hotspot.id}_${index}`}
                    cx={vertex.x}
                    cy={vertex.y}
                    r={3}
                    color={colors.error}
                  />
                );
              })}
            </Group>
          );
        })}
      </Canvas>
    );
  },
);
