/**
 * KeypadPuzzle — PIN code entry interface for the Explorer.
 * Per Puzzle System Bible: Explorer enters code, Operator relays it.
 * Shows digit display, number pad, and submit/clear controls.
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius } from '@/theme/tokens';
import { triggerHaptic } from '@/services/HapticsService';
import { Delete, Check } from 'lucide-react-native';
import type { ClientPuzzleState } from '@/types/puzzle';
import { useTranslation } from '@/src/i18n';

interface KeypadPuzzleProps {
  readonly puzzle: ClientPuzzleState;
  readonly onSubmit: (code: string) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly maxDigits?: number;
  readonly disabled?: boolean;
}

export const KeypadPuzzle = React.memo<KeypadPuzzleProps>(function KeypadPuzzle({
  puzzle,
  onSubmit,
  style,
  maxDigits = 4,
  disabled = false,
}) {
  const [entry, setEntry] = useState<string>('');
  const { gameText, t } = useTranslation();

  const handleDigit = useCallback((digit: string) => {
    if (disabled) return;
    if (entry.length >= maxDigits) return;
    triggerHaptic('light');
    setEntry((prev) => prev + digit);
  }, [entry, maxDigits, disabled]);

  const handleDelete = useCallback(() => {
    if (disabled) return;
    triggerHaptic('light');
    setEntry((prev) => prev.slice(0, -1));
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    if (disabled || entry.length !== maxDigits) return;
    triggerHaptic('medium');
    onSubmit(entry);
    setEntry('');
  }, [entry, maxDigits, onSubmit, disabled]);

  const remainingAttempts = puzzle.maxAttempts !== null
    ? puzzle.maxAttempts - puzzle.attemptCount
    : null;

  return (
    <Panel variant="elevated" style={[{ padding: spacing.lg }, style]}>
      {/* Display */}
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <ThemedText variant="label" color="muted" style={{ marginBottom: spacing.sm }}>
          {gameText((puzzle.publicState as { keypadLabel?: string }).keypadLabel ?? t('puzzle.enterCode'))}
        </ThemedText>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: maxDigits }, (_, i) => (
            <View
              key={`digit_${i}`}
              style={{
                width: maxDigits > 4 ? 40 : 48,
                height: maxDigits > 4 ? 50 : 56,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                borderColor: i < entry.length ? colors.primary : colors.border,
                backgroundColor: i < entry.length ? `${colors.primary}15` : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i < entry.length && (
                <ThemedText
                  variant="monoLarge"
                  style={{ color: colors.primary, fontSize: 28 }}
                >
                  {entry[i]}
                </ThemedText>
              )}
            </View>
          ))}
        </View>
        {remainingAttempts !== null && remainingAttempts <= 3 && (
          <ThemedText
            variant="caption"
            color={remainingAttempts <= 1 ? 'error' : 'accent'}
            style={{ marginTop: spacing.sm }}
          >
            {t(remainingAttempts === 1 ? 'puzzle.attemptsRemaining' : 'puzzle.attemptsRemainingPlural', { count: remainingAttempts })}
          </ThemedText>
        )}
      </View>

      {/* Number Pad */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Pressable
            key={`key_${digit}`}
            accessibilityRole="button"
            accessibilityLabel={t('puzzle.keypadDigit', { digit })}
            onPress={() => handleDigit(digit)}
            disabled={disabled}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.4 : 1,
            })}
          >
            <ThemedText variant="mono" style={{ color: colors.textPrimary }}>
              {digit}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('puzzle.keypadDelete')}
          onPress={handleDelete}
          disabled={disabled || entry.length === 0}
          style={({ pressed }) => ({
            width: 72,
            height: 72,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || entry.length === 0 ? 0.3 : 1,
          })}
        >
          <Delete size={24} color={colors.accent} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('puzzle.keypadDigit', { digit: 0 })}
          onPress={() => handleDigit('0')}
          disabled={disabled}
          style={({ pressed }) => ({
            width: 72,
            height: 72,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.4 : 1,
          })}
        >
          <ThemedText variant="mono" style={{ color: colors.textPrimary }}>
            0
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('puzzle.keypadSubmit')}
          onPress={handleSubmit}
          disabled={disabled || entry.length !== maxDigits}
          style={({ pressed }) => ({
            width: 72,
            height: 72,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: entry.length === maxDigits ? colors.success : colors.border,
            backgroundColor: entry.length === maxDigits ? `${colors.success}20` : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: entry.length !== maxDigits || disabled ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <Check size={24} color={colors.success} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Panel>
  );
});
