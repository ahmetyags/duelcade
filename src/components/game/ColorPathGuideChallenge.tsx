import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RotateCcw, ShieldCheck } from 'lucide-react-native';

import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTranslation } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';
import type {
  ColorPathSubmission,
  GuideChallengeState,
} from '@/types/puzzle';

type ColorPathChallenge = Extract<GuideChallengeState, { kind: 'color_paths' }>;

function adjacent(first: number, second: number, size: number): boolean {
  const firstRow = Math.floor(first / size);
  const firstColumn = first % size;
  const secondRow = Math.floor(second / size);
  const secondColumn = second % size;
  return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn) === 1;
}

export function ColorPathGuideChallenge({
  challenge,
  attemptCount,
  onSubmit,
}: {
  challenge: ColorPathChallenge;
  attemptCount: number;
  onSubmit: (paths: ColorPathSubmission[]) => void;
}) {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<Record<string, number[]>>({});
  const [activePairId, setActivePairId] = useState<string | null>(null);

  const pairByEndpoint = useMemo(() => {
    const entries: [number, ColorPathChallenge['pairs'][number]][] = [];
    challenge.pairs.forEach((pair) => {
      entries.push([pair.start, pair], [pair.end, pair]);
    });
    return new Map(entries);
  }, [challenge.pairs]);

  const occupiedBy = useMemo(() => {
    const result = new Map<number, string>();
    Object.entries(paths).forEach(([pairId, cells]) => {
      cells.forEach((cell) => result.set(cell, pairId));
    });
    return result;
  }, [paths]);

  const completedPairs = challenge.pairs.filter((pair) => {
    const cells = paths[pair.id] ?? [];
    return cells.length >= 2 && (
      (cells[0] === pair.start && cells[cells.length - 1] === pair.end) ||
      (cells[0] === pair.end && cells[cells.length - 1] === pair.start)
    );
  }).length;
  const occupiedCount = occupiedBy.size;
  const totalCells = challenge.gridSize ** 2;
  const ready = completedPairs === challenge.pairs.length && occupiedCount === totalCells;

  const selectCell = (cell: number) => {
    const endpointPair = pairByEndpoint.get(cell);
    if (!activePairId || (endpointPair && endpointPair.id !== activePairId)) {
      if (!endpointPair) return;
      setPaths((current) => ({ ...current, [endpointPair.id]: [cell] }));
      setActivePairId(endpointPair.id);
      return;
    }

    const currentPath = paths[activePairId] ?? [];
    const pair = challenge.pairs.find((item) => item.id === activePairId);
    if (!pair || currentPath.length === 0) return;

    const existingIndex = currentPath.indexOf(cell);
    if (existingIndex >= 0) {
      setPaths((current) => ({
        ...current,
        [activePairId]: currentPath.slice(0, existingIndex + 1),
      }));
      return;
    }

    const last = currentPath[currentPath.length - 1];
    if (!adjacent(last, cell, challenge.gridSize)) return;
    const owner = occupiedBy.get(cell);
    if (owner && owner !== activePairId) return;
    if (endpointPair && endpointPair.id !== activePairId) return;

    const nextPath = [...currentPath, cell];
    setPaths((current) => ({ ...current, [activePairId]: nextPath }));
    const reachedPartner =
      (currentPath[0] === pair.start && cell === pair.end) ||
      (currentPath[0] === pair.end && cell === pair.start);
    if (reachedPartner) setActivePairId(null);
  };

  return (
    <Panel variant="elevated" style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBubble}>
          <ShieldCheck size={25} color={colors.operator} />
        </View>
        <View style={styles.headingCopy}>
          <ThemedText variant="subtitle" color="operator">{t('guide.pathTitle')}</ThemedText>
          <ThemedText variant="caption" color="muted">{t('guide.pathDescription')}</ThemedText>
        </View>
        <View style={styles.progressBubble}>
          <ThemedText variant="label" color="operator">
            {Math.round((occupiedCount / totalCells) * 100)}%
          </ThemedText>
        </View>
      </View>

      <View
        accessibilityRole="summary"
        accessibilityLabel={t('guide.pathProgress', {
          current: completedPairs,
          total: challenge.pairs.length,
        })}
        style={styles.legend}
      >
        {challenge.pairs.map((pair) => (
          <View key={pair.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: pair.color }]} />
            <ThemedText variant="label" style={{ color: pair.color }}>{pair.label}</ThemedText>
          </View>
        ))}
        <ThemedText variant="caption" color="muted">
          {completedPairs}/{challenge.pairs.length}
        </ThemedText>
      </View>

      <View style={styles.board}>
        {Array.from({ length: totalCells }, (_, cell) => {
          const pair = pairByEndpoint.get(cell);
          const ownerId = occupiedBy.get(cell);
          const ownerPair = challenge.pairs.find((item) => item.id === ownerId);
          const path = ownerId ? paths[ownerId] ?? [] : [];
          const pathIndex = path.indexOf(cell);
          const neighbors = pathIndex >= 0
            ? [path[pathIndex - 1], path[pathIndex + 1]].filter(
                (value): value is number => typeof value === 'number',
              )
            : [];
          const routeColor = ownerPair?.color;
          const row = Math.floor(cell / challenge.gridSize) + 1;
          const column = cell % challenge.gridSize + 1;
          return (
            <Pressable
              key={cell}
              accessibilityRole="button"
              accessibilityLabel={t('guide.pathCell', {
                row,
                column,
                endpoint: pair ? `${pair.label} ${pair.id}` : '',
              })}
              onPress={() => selectCell(cell)}
              style={[
                styles.cell,
                { width: `${100 / challenge.gridSize}%` },
                activePairId && ownerId === activePairId && styles.activeCell,
              ]}
            >
              {routeColor && (
                <>
                  <View style={[styles.routeCenter, { backgroundColor: routeColor }]} />
                  {neighbors.map((neighbor) => {
                    const delta = neighbor - cell;
                    return (
                      <View
                        key={neighbor}
                        style={[
                          styles.routeArm,
                          { backgroundColor: routeColor },
                          delta === -challenge.gridSize && styles.armTop,
                          delta === challenge.gridSize && styles.armBottom,
                          delta === -1 && styles.armLeft,
                          delta === 1 && styles.armRight,
                        ]}
                      />
                    );
                  })}
                </>
              )}
              {pair && (
                <View style={[styles.endpoint, { backgroundColor: pair.color }]}>
                  <ThemedText style={styles.endpointLabel}>{pair.label}</ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ThemedText variant="caption" color="secondary" style={styles.tip}>
        {t('guide.pathTip')}
      </ThemedText>

      {attemptCount > 0 && (
        <ThemedText variant="caption" color="error" style={styles.feedback}>
          {t('guide.wrong', {
            count: Math.max(0, challenge.maxAttempts - attemptCount),
          })}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('guide.pathReset')}
          onPress={() => {
            setPaths({});
            setActivePairId(null);
          }}
          style={styles.resetButton}
        >
          <RotateCcw size={18} color={colors.textSecondary} />
          <ThemedText variant="label" color="secondary">{t('guide.pathReset')}</ThemedText>
        </Pressable>
        <View style={styles.submit}>
          <ThemedButton
            label={t('guide.unlock')}
            variant="operator"
            fullWidth
            disabled={!ready}
            onPress={() => onSubmit(
              challenge.pairs.map((pair) => ({
                pairId: pair.id,
                cells: paths[pair.id] ?? [],
              })),
            )}
          />
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderColor: colors.sapphire, borderWidth: 3 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headingCopy: { flex: 1, gap: 2 },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.operatorContainer,
  },
  progressBubble: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.sapphire,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  board: {
    width: '100%',
    maxWidth: 430,
    aspectRatio: 1,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderColor: colors.operator,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  cell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  activeCell: { backgroundColor: colors.operatorContainer },
  routeCenter: {
    position: 'absolute',
    width: '44%',
    height: '44%',
    borderRadius: radius.pill,
  },
  routeArm: { position: 'absolute' },
  armTop: { width: '22%', height: '50%', left: '39%', top: 0 },
  armBottom: { width: '22%', height: '50%', left: '39%', bottom: 0 },
  armLeft: { width: '50%', height: '22%', left: 0, top: '39%' },
  armRight: { width: '50%', height: '22%', right: 0, top: '39%' },
  endpoint: {
    width: '68%',
    height: '68%',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surfaceElevated,
  },
  endpointLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  tip: { textAlign: 'center', marginTop: spacing.md },
  feedback: { textAlign: 'center', marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  resetButton: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submit: { flex: 1 },
});
