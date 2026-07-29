import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { gameAssets } from '@/src/assets/gameAssets';
import { useTranslation } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';
import { ThemedText } from '@/components/ui/ThemedText';

type PipeKind = 'straight' | 'corner';

interface PipeTileGridProps {
  readonly tiles: PipeKind[];
  readonly rotations: number[];
  readonly onRotate?: (index: number) => void;
  readonly compact?: boolean;
}

export const PipeTileGrid = React.memo<PipeTileGridProps>(function PipeTileGrid({
  tiles,
  rotations,
  onRotate,
  compact = false,
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.grid, compact && styles.gridCompact]}>
      {tiles.map((tile, index) => {
        const accessibilityLabel = t('puzzle.pipeTile', {
          number: index + 1,
          kind: t(tile === 'corner' ? 'puzzle.pipeCorner' : 'puzzle.pipeStraight'),
          rotation: rotations[index] ?? 0,
        });
        const content = (
          <>
            <Image
              source={tile === 'corner' ? gameAssets.puzzle.pipeCorner : gameAssets.puzzle.pipeStraight}
              resizeMode="contain"
              style={[
                styles.pipe,
                compact && styles.pipeCompact,
                { transform: [{ rotate: `${(rotations[index] ?? 0) * 90}deg` }] },
              ]}
            />
            <View style={styles.indexBadge}>
              <ThemedText variant="label" style={styles.indexText}>{index + 1}</ThemedText>
            </View>
          </>
        );

        if (!onRotate) {
          return (
            <View
              key={`pipe_${index}`}
              accessible
              accessibilityLabel={accessibilityLabel}
              style={[styles.cell, compact && styles.cellCompact]}
            >
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={`pipe_${index}`}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={t('puzzle.pipeRotateHint')}
            onPress={() => onRotate(index)}
            style={({ pressed }) => [
              styles.cell,
              compact && styles.cellCompact,
              pressed && styles.cellPressed,
            ]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    maxWidth: 330,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.metalDark,
    borderWidth: 4,
    borderTopColor: colors.metalLight,
    borderRightColor: colors.borderDark,
    borderBottomColor: colors.borderDark,
    borderLeftColor: colors.metal,
    overflow: 'hidden',
  },
  gridCompact: { maxWidth: 252, padding: 5, borderWidth: 4 },
  cell: {
    width: '33.333%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  cellCompact: { aspectRatio: 1 },
  cellPressed: {
    backgroundColor: colors.metal,
    transform: [{ scale: 0.96 }],
  },
  pipe: { width: '84%', height: '84%' },
  pipeCompact: { width: '82%', height: '82%' },
  indexBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.backgroundDeep,
  },
  indexText: { color: colors.textOnPrimary, fontSize: 9, lineHeight: 12 },
});
