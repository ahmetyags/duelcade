import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Check,
  Delete,
  Footprints,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react-native';

import { encodeCipherGuess } from '@/engine/TurnGameEngine';
import { ThemedText } from '@/components/ui/ThemedText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { TurnMatchState } from '@/types/turnGame';

const PLAYER_COLORS = [colors.cyan, colors.amber] as const;
const CIPHER_COLORS = [
  '#E85D75',
  '#6C4EF6',
  '#F5C542',
  '#29C98B',
  '#2D9CDB',
  '#F28C38',
  '#B567D9',
  '#425466',
] as const;

interface BoardProps {
  match: TurnMatchState;
  disabled: boolean;
  onMove: (cell: number) => void;
}

export function CipherClashBoard({ match, disabled, onMove }: BoardProps) {
  const length = match.cipherCodeLength ?? 4;
  const symbolCount = match.cipherSymbolCount ?? 6;
  const [draft, setDraft] = useState<number[]>([]);

  return (
    <View style={styles.cipherBoard}>
      <View style={styles.cipherHistory}>
        {(match.cipherHistory ?? []).slice(-4).map((entry, index) => (
          <View key={`${entry.playerIndex}_${index}`} style={styles.historyRow}>
            <View style={[styles.historyPlayer, { backgroundColor: PLAYER_COLORS[entry.playerIndex] }]} />
            <View style={styles.historyGuess}>
              {entry.guess.map((symbol, symbolIndex) => (
                <View
                  key={symbolIndex}
                  style={[styles.historyDot, { backgroundColor: CIPHER_COLORS[symbol] }]}
                />
              ))}
            </View>
            <ThemedText variant="caption" style={styles.feedbackExact}>
              {entry.exact} TAM
            </ThemedText>
            <ThemedText variant="caption" color="muted">
              {entry.misplaced} YER
            </ThemedText>
          </View>
        ))}
        {(match.cipherHistory?.length ?? 0) === 0 && (
          <View style={styles.cipherEmpty}>
            <Sparkles size={22} color={colors.amber} />
            <ThemedText variant="caption" color="muted">
              Gizli diziyi ilk tahmininle taramaya başla.
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.draftRow}>
        {Array.from({ length }, (_, index) => {
          const symbol = draft[index];
          return (
            <View
              key={index}
              style={[
                styles.draftSlot,
                symbol !== undefined && {
                  backgroundColor: CIPHER_COLORS[symbol],
                  borderColor: CIPHER_COLORS[symbol],
                },
              ]}
            >
              <ThemedText style={styles.draftNumber}>
                {symbol === undefined ? '·' : symbol + 1}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.symbolRow}>
        {Array.from({ length: symbolCount }, (_, symbol) => (
          <Pressable
            key={symbol}
            accessibilityLabel={`Rün ${symbol + 1}`}
            disabled={disabled || draft.length >= length}
            onPress={() => setDraft((current) => [...current, symbol])}
            style={({ pressed }) => [
              styles.symbolButton,
              { backgroundColor: CIPHER_COLORS[symbol] },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.symbolNumber}>{symbol + 1}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.cipherActions}>
        <Pressable
          accessibilityLabel="Son rünü sil"
          disabled={disabled || draft.length === 0}
          onPress={() => setDraft((current) => current.slice(0, -1))}
          style={[styles.cipherAction, (disabled || draft.length === 0) && styles.disabled]}
        >
          <Delete size={19} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Şifre tahminini gönder"
          disabled={disabled || draft.length !== length}
          onPress={() => {
            const encoded = encodeCipherGuess(draft, symbolCount);
            setDraft([]);
            onMove(encoded);
          }}
          style={[
            styles.cipherSubmit,
            (disabled || draft.length !== length) && styles.disabled,
          ]}
        >
          <Check size={19} color={colors.textOnPrimary} />
          <ThemedText variant="label" color="onPrimary">TAHMİNİ GÖNDER</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function circuitBoxEdges(rows: number, columns: number, box: number): number[] {
  const row = Math.floor(box / columns);
  const column = box % columns;
  const horizontalCount = (rows + 1) * columns;
  return [
    row * columns + column,
    (row + 1) * columns + column,
    horizontalCount + row * (columns + 1) + column,
    horizontalCount + row * (columns + 1) + column + 1,
  ];
}

export function CircuitClaimBoard({ match, disabled, onMove }: BoardProps) {
  const width = `${100 / match.boardColumns}%` as `${number}%`;
  return (
    <View style={styles.circuitBoard}>
      {match.cellOwners.map((owner, box) => {
        const edges = circuitBoxEdges(match.boardRows, match.boardColumns, box);
        const edgeStyles = [
          styles.edgeTop,
          styles.edgeBottom,
          styles.edgeLeft,
          styles.edgeRight,
        ];
        return (
          <View
            key={box}
            style={[
              styles.circuitBox,
              { width },
              owner !== null && {
                backgroundColor: `${PLAYER_COLORS[owner]}33`,
              },
              match.status === 'round_complete'
                && owner !== null
                && owner === match.winnerIndex
                && styles.capturedWinner,
            ]}
          >
            {owner !== null && (
              <ThemedText style={{ color: PLAYER_COLORS[owner], fontSize: 18 }}>
                {owner === 0 ? '○' : '×'}
              </ThemedText>
            )}
            {edges.map((edge, edgeIndex) => {
              const edgeOwner = match.cells[edge];
              return (
                <Pressable
                  key={edgeIndex}
                  accessibilityLabel={`Devre hattı ${edge + 1}`}
                  hitSlop={5}
                  disabled={disabled || edgeOwner !== null}
                  onPress={() => onMove(edge)}
                  style={[
                    styles.circuitEdge,
                    edgeStyles[edgeIndex],
                    edgeOwner !== null && {
                      backgroundColor: PLAYER_COLORS[edgeOwner],
                    },
                  ]}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function neighbors(index: number, rows: number, columns: number): number[] {
  const row = Math.floor(index / columns);
  const column = index % columns;
  return [
    row > 0 ? index - columns : -1,
    row + 1 < rows ? index + columns : -1,
    column > 0 ? index - 1 : -1,
    column + 1 < columns ? index + 1 : -1,
  ].filter((value) => value >= 0);
}

export function NeonTrailBoard({ match, disabled, onMove }: BoardProps) {
  const width = `${100 / match.boardColumns}%` as `${number}%`;
  const activePosition = match.playerPositions?.[match.activePlayerIndex] ?? -1;
  const legal = new Set(neighbors(activePosition, match.boardRows, match.boardColumns));
  return (
    <View style={styles.gridBoard}>
      {match.cells.map((owner, index) => {
        const head = match.playerPositions?.includes(index);
        return (
          <Pressable
            key={index}
            accessibilityLabel={`Neon hücresi ${index + 1}`}
            disabled={disabled || owner !== null || !legal.has(index)}
            onPress={() => onMove(index)}
            style={[
              styles.gridCell,
              { width },
              owner !== null && {
                backgroundColor: `${PLAYER_COLORS[owner]}2B`,
                borderColor: PLAYER_COLORS[owner],
              },
              legal.has(index) && owner === null && styles.legalCell,
              head && styles.headCell,
            ]}
          >
            {head && <Zap size={20} color={PLAYER_COLORS[owner!]} fill={PLAYER_COLORS[owner!]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export function GatewayRaceBoard({ match, disabled, onMove }: BoardProps) {
  const [placingBarrier, setPlacingBarrier] = useState(false);
  const width = `${100 / match.boardColumns}%` as `${number}%`;
  const cellCount = match.boardRows * match.boardColumns;
  const active = match.activePlayerIndex;
  const activePosition = match.playerPositions?.[active] ?? -1;
  const legalSteps = useMemo(
    () => new Set(neighbors(activePosition, match.boardRows, match.boardColumns)),
    [activePosition, match.boardColumns, match.boardRows],
  );
  const barriersLeft = match.wallsRemaining?.[active] ?? 0;
  const barrierMode = placingBarrier && barriersLeft > 0;

  return (
    <View style={styles.gatewayWrap}>
      <View style={styles.gatewayTools}>
        <Pressable
          accessibilityLabel="İlerleme modunu seç"
          onPress={() => setPlacingBarrier(false)}
          style={[styles.gatewayTool, !barrierMode && styles.gatewayToolActive]}
        >
          <Footprints size={17} color={!barrierMode ? colors.primaryDark : colors.textMuted} />
          <ThemedText variant="caption">İLERLE</ThemedText>
        </Pressable>
        <Pressable
          accessibilityLabel="Bariyer modunu seç"
          disabled={barriersLeft <= 0}
          onPress={() => setPlacingBarrier(true)}
          style={[
            styles.gatewayTool,
            barrierMode && styles.gatewayToolActive,
            barriersLeft <= 0 && styles.disabled,
          ]}
        >
          <Shield size={17} color={barrierMode ? colors.amberMuted : colors.textMuted} />
          <ThemedText variant="caption">BARİYER {barriersLeft}</ThemedText>
        </Pressable>
      </View>
      <View style={styles.gridBoard}>
        {match.cells.map((value, index) => {
          const player = match.playerPositions?.indexOf(index) ?? -1;
          const blocked = value === 2;
          const canStep = legalSteps.has(index) && !blocked && player < 0;
          const canBlock = value === null && player < 0 && barriersLeft > 0;
          return (
            <Pressable
              key={index}
              accessibilityLabel={`Geçit hücresi ${index + 1}`}
              disabled={disabled || (barrierMode ? !canBlock : !canStep)}
              onPress={() => onMove(barrierMode ? cellCount + index : index)}
              style={[
                styles.gridCell,
                { width },
                index < match.boardColumns && styles.goalTop,
                index >= cellCount - match.boardColumns && styles.goalBottom,
                canStep && !barrierMode && styles.legalCell,
                canBlock && barrierMode && styles.barrierCandidate,
                blocked && styles.barrierCell,
              ]}
            >
              {player >= 0 && (
                <View style={[styles.runner, { backgroundColor: PLAYER_COLORS[player] }]}>
                  <ThemedText style={styles.runnerText}>{player === 0 ? '○' : '×'}</ThemedText>
                </View>
              )}
              {blocked && <View style={styles.barrierMark} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function polarityFlips(match: TurnMatchState, cell: number, player: 0 | 1): number[] {
  if (match.cells[cell] !== null) return [];
  const row = Math.floor(cell / match.boardColumns);
  const column = cell % match.boardColumns;
  const opponent = 1 - player;
  const flips: number[] = [];
  for (const [dr, dc] of [
    [-1, -1], [-1, 0], [-1, 1], [0, -1],
    [0, 1], [1, -1], [1, 0], [1, 1],
  ]) {
    const line: number[] = [];
    let r = row + dr;
    let c = column + dc;
    while (r >= 0 && r < match.boardRows && c >= 0 && c < match.boardColumns) {
      const index = r * match.boardColumns + c;
      if (match.cells[index] === opponent) line.push(index);
      else {
        if (match.cells[index] === player && line.length > 0) flips.push(...line);
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return flips;
}

export function PolarityWarBoard({ match, disabled, onMove }: BoardProps) {
  const width = `${100 / match.boardColumns}%` as `${number}%`;
  return (
    <View style={styles.polarityBoard}>
      {match.cells.map((owner, index) => {
        const legal = polarityFlips(match, index, match.activePlayerIndex).length > 0;
        return (
          <Pressable
            key={index}
            accessibilityLabel={`Polarite hücresi ${index + 1}`}
            disabled={disabled || !legal}
            onPress={() => onMove(index)}
            style={[styles.polarityCell, { width }, legal && styles.legalPolarity]}
          >
            {owner !== null && (
              <View
                style={[
                  styles.polarityOrb,
                  {
                    backgroundColor: PLAYER_COLORS[owner],
                    borderColor: PLAYER_COLORS[owner],
                  },
                  match.status === 'round_complete'
                    && owner === match.winnerIndex
                    && styles.winnerOrb,
                ]}
              />
            )}
            {owner === null && legal && <View style={styles.legalDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cipherBoard: { flex: 1, justifyContent: 'center', gap: spacing.md },
  cipherHistory: {
    minHeight: 120,
    padding: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    gap: spacing.xs,
  },
  historyRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  historyPlayer: { width: 7, height: 18, borderRadius: radius.pill },
  historyGuess: { flex: 1, flexDirection: 'row', gap: 4 },
  historyDot: { width: 15, height: 15, borderRadius: radius.pill },
  feedbackExact: { color: colors.primaryDark, fontWeight: '700' },
  cipherEmpty: {
    flex: 1,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  draftRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  draftSlot: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftNumber: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  symbolRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  symbolButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  symbolNumber: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cipherActions: { flexDirection: 'row', gap: spacing.sm },
  cipherAction: {
    width: 52,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cipherSubmit: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  circuitBoard: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
  },
  circuitBox: {
    aspectRatio: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  circuitEdge: { position: 'absolute', zIndex: 2, backgroundColor: colors.border },
  edgeTop: { top: -5, left: 4, right: 4, height: 10, borderRadius: radius.pill },
  edgeBottom: { bottom: -5, left: 4, right: 4, height: 10, borderRadius: radius.pill },
  edgeLeft: { left: -5, top: 4, bottom: 4, width: 10, borderRadius: radius.pill },
  edgeRight: { right: -5, top: 4, bottom: 4, width: 10, borderRadius: radius.pill },
  capturedWinner: { borderWidth: 2, borderColor: colors.success },
  gridBoard: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
  },
  gridCell: {
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalCell: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  headCell: { borderWidth: 3 },
  gatewayWrap: { flex: 1, gap: spacing.sm },
  gatewayTools: { flexDirection: 'row', gap: spacing.sm },
  gatewayTool: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  gatewayToolActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  goalTop: { borderTopColor: colors.amber, borderTopWidth: 2 },
  goalBottom: { borderBottomColor: colors.cyan, borderBottomWidth: 2 },
  barrierCandidate: { backgroundColor: colors.secondaryContainer, borderColor: colors.amber },
  barrierCell: { backgroundColor: colors.textSecondary, borderColor: colors.textPrimary },
  barrierMark: { width: '70%', height: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  runner: {
    width: '72%',
    height: '72%',
    maxWidth: 34,
    maxHeight: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerText: { color: '#FFFFFF', fontWeight: '700' },
  polarityBoard: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDark,
  },
  polarityCell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  legalPolarity: { backgroundColor: 'rgba(255,255,255,0.08)' },
  polarityOrb: {
    width: '72%',
    height: '72%',
    borderRadius: radius.pill,
    borderWidth: 2,
    ...shadows.sm,
  },
  winnerOrb: { borderWidth: 4, borderColor: '#FFFFFF', transform: [{ scale: 1.08 }] },
  legalDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
