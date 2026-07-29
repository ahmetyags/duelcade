/**
 * SymbolPuzzle — symbol sequence matching interface for the Explorer.
 * Per Puzzle System Bible: Explorer selects symbols in the correct order
 * as relayed by the Operator who sees the target sequence on monitors.
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { colors, spacing, radius } from '@/theme/tokens';
import { triggerHaptic } from '@/services/HapticsService';
import { Triangle, Circle, Square, Diamond, Hexagon, Star, Cross, Waves } from 'lucide-react-native';
import type { ClientPuzzleState } from '@/types/puzzle';
import { useTranslation } from '@/src/i18n';

interface SymbolPuzzleProps {
  readonly puzzle: ClientPuzzleState;
  readonly onSubmit: (sequence: string[]) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly disabled?: boolean;
  readonly sequenceLength?: number;
}

const SYMBOL_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  triangle: Triangle,
  circle: Circle,
  square: Square,
  diamond: Diamond,
  hexagon: Hexagon,
  star: Star,
  cross: Cross,
  wave: Waves,
};

const SYMBOL_COLORS: Record<string, string> = {
  triangle: '#22D3EE',
  circle: '#F59E0B',
  square: '#22C55E',
  diamond: '#8B5CF6',
  hexagon: '#EF4444',
  star: '#FBBF24',
  cross: '#3B82F6',
  wave: '#06B6D4',
};

export const SymbolPuzzle = React.memo<SymbolPuzzleProps>(function SymbolPuzzle({
  puzzle,
  onSubmit,
  style,
  disabled = false,
  sequenceLength = 4,
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const { gameText, t } = useTranslation();

  const publicState = puzzle.publicState as {
    availableSymbols?: string[];
    panelLabel?: string;
  };

  const availableSymbols = publicState.availableSymbols ?? ['triangle', 'circle', 'square', 'diamond'];

  const handleSymbolPress = useCallback((symbol: string) => {
    if (disabled) return;
    if (selected.length >= sequenceLength) return;
    triggerHaptic('light');
    setSelected((prev) => [...prev, symbol]);
  }, [selected, sequenceLength, disabled]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    triggerHaptic('light');
    setSelected([]);
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    if (disabled || selected.length !== sequenceLength) return;
    triggerHaptic('medium');
    onSubmit(selected);
    setSelected([]);
  }, [selected, sequenceLength, onSubmit, disabled]);

  const remainingAttempts = puzzle.maxAttempts !== null
    ? puzzle.maxAttempts - puzzle.attemptCount
    : null;

  return (
    <Panel variant="elevated" style={[{ padding: spacing.lg }, style]}>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <ThemedText variant="subtitle" color="primary">
          {gameText(publicState.panelLabel ?? t('puzzle.glyphPanel'))}
        </ThemedText>
        <ThemedText variant="caption" color="muted" style={{ marginTop: spacing.xs }}>
          {t('puzzle.selectSymbols', { count: sequenceLength })}
        </ThemedText>
      </View>

      {/* Selection display */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        {Array.from({ length: sequenceLength }, (_, i) => {
          const symbol = selected[i];
          const Icon = symbol ? SYMBOL_ICONS[symbol] : null;
          const color = symbol ? SYMBOL_COLORS[symbol] : colors.textMuted;
          return (
            <View
              key={`sel_${i}`}
              style={{
                width: sequenceLength > 4 ? 44 : 52,
                height: sequenceLength > 4 ? 44 : 52,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: symbol ? color : colors.border,
                backgroundColor: symbol ? `${color}15` : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Icon ? <Icon size={sequenceLength > 4 ? 20 : 24} color={color} strokeWidth={2} /> : (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderSubtle }} />
              )}
            </View>
          );
        })}
      </View>

      {/* Symbol grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md }}>
        {availableSymbols.map((symbol) => {
          const Icon = SYMBOL_ICONS[symbol] ?? Circle;
          const color = SYMBOL_COLORS[symbol] ?? colors.textPrimary;
          const isSelected = selected.includes(symbol);
          return (
            <Pressable
              key={`sym_${symbol}`}
              accessibilityRole="button"
              accessibilityLabel={gameText(symbol)}
              onPress={() => handleSymbolPress(symbol)}
              disabled={disabled || isSelected}
              style={({ pressed }) => ({
                width: 64,
                height: 64,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: isSelected ? `${color}40` : color,
                backgroundColor: isSelected ? colors.surfaceMuted : `${color}10`,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled || isSelected ? 0.3 : pressed ? 0.7 : 1,
              })}
            >
              <Icon size={28} color={color} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' }}>
        <ThemedButton
          label={t('common.clear')}
          variant="secondary"
          size="sm"
          onPress={handleClear}
          disabled={disabled || selected.length === 0}
        />
        <ThemedButton
          label={t('common.submit')}
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          disabled={disabled || selected.length !== sequenceLength}
        />
      </View>

      {remainingAttempts !== null && remainingAttempts <= 2 && (
        <ThemedText
          variant="caption"
          color={remainingAttempts <= 1 ? 'error' : 'accent'}
          style={{ textAlign: 'center', marginTop: spacing.sm }}
        >
          {t(remainingAttempts === 1 ? 'puzzle.attemptsRemaining' : 'puzzle.attemptsRemainingPlural', { count: remainingAttempts })}
        </ThemedText>
      )}
    </Panel>
  );
});
