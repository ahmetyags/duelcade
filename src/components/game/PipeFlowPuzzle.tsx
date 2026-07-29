import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Droplets, RotateCw } from 'lucide-react-native';

import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { PipeTileGrid } from '@/components/game/PipeTileGrid';
import { useTranslation } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ClientPuzzleState } from '@/types/puzzle';
import { triggerHaptic } from '@/services/HapticsService';

type PipeKind = 'straight' | 'corner';

export function PipeFlowPuzzle({
  puzzle,
  onSubmit,
}: {
  readonly puzzle: ClientPuzzleState;
  readonly onSubmit: (rotations: number[]) => void;
}) {
  const { t } = useTranslation();
  const config = puzzle.publicState as {
    pipeTiles?: PipeKind[];
    initialRotations?: number[];
    entrySide?: string;
    exitSide?: string;
  };
  const tiles = useMemo(
    () => config.pipeTiles ?? Array.from({ length: 9 }, () => 'straight' as const),
    [config.pipeTiles],
  );
  const initialRotations = useMemo(
    () => config.initialRotations ?? Array.from({ length: 9 }, () => 0),
    [config.initialRotations],
  );
  const [rotationState, setRotationState] = useState({
    puzzleId: puzzle.puzzleId,
    rotations: initialRotations,
  });
  const rotations = rotationState.puzzleId === puzzle.puzzleId
    ? rotationState.rotations
    : initialRotations;

  const rotate = (index: number) => {
    triggerHaptic('light');
    setRotationState((current) => {
      const currentRotations = current.puzzleId === puzzle.puzzleId
        ? current.rotations
        : initialRotations;
      return {
        puzzleId: puzzle.puzzleId,
        rotations: currentRotations.map((rotation, tileIndex) =>
          tileIndex === index ? (rotation + 1) % 4 : rotation,
        ),
      };
    });
  };

  return (
    <Panel variant="elevated" style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBubble}>
          <Droplets size={28} color={colors.explorer} />
        </View>
        <View style={styles.headingCopy}>
          <ThemedText variant="subtitle" color="explorer">{t('puzzle.pipeTitle')}</ThemedText>
          <ThemedText variant="caption" color="muted">{t('puzzle.pipeDescription')}</ThemedText>
        </View>
      </View>

      <View style={styles.flowLabel}>
        <ThemedText variant="label" color="accent">
          {t('puzzle.pipeFlow', {
            entry: String(config.entrySide ?? 'LEFT'),
            exit: String(config.exitSide ?? 'RIGHT'),
          })}
        </ThemedText>
      </View>

      <PipeTileGrid tiles={tiles} rotations={rotations} onRotate={rotate} />

      <View style={styles.tip}>
        <RotateCw size={17} color={colors.operator} />
        <ThemedText variant="caption" color="secondary" style={styles.tipCopy}>
          {t('puzzle.pipeTip')}
        </ThemedText>
      </View>

      <ThemedButton
        label={t('puzzle.pipeSubmit')}
        variant="explorer"
        fullWidth
        onPress={() => onSubmit(rotations)}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingCopy: { flex: 1, gap: 2 },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.explorerContainer,
    borderWidth: 2,
    borderColor: colors.sunlight,
  },
  flowLabel: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  tip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipCopy: { flex: 1 },
});
