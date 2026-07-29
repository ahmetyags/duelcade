import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { triggerHaptic } from '@/services/HapticsService';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ClientPuzzleState } from '@/types/puzzle';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTranslation } from '@/src/i18n';

export function SequencePuzzle({
  puzzle,
  onSubmit,
}: {
  puzzle: ClientPuzzleState;
  onSubmit: (sequence: string[]) => void;
}) {
  const publicState = puzzle.publicState as {
    panelLabel?: string;
    options?: string[];
    sequenceLength?: number;
  };
  const { gameText, t } = useTranslation();
  const options = publicState.options ?? [];
  const sequenceLength = publicState.sequenceLength ?? 4;
  const [selected, setSelected] = useState<string[]>([]);

  const choose = useCallback((value: string) => {
    if (selected.length >= sequenceLength) return;
    triggerHaptic('light');
    setSelected((current) => [...current, value]);
  }, [selected.length, sequenceLength]);

  const submit = useCallback(() => {
    if (selected.length !== sequenceLength) return;
    onSubmit(selected);
    setSelected([]);
  }, [onSubmit, selected, sequenceLength]);

  return (
    <Panel variant="elevated" style={{ padding: spacing.lg }}>
      <ThemedText variant="subtitle" color="primary" style={{ textAlign: 'center' }}>
        {gameText(publicState.panelLabel ?? t('puzzle.sequenceConsole'))}
      </ThemedText>
      <ThemedText variant="caption" color="muted" style={{ textAlign: 'center', marginTop: spacing.xs }}>
        {t('puzzle.relayRequired', { selected: selected.length, total: sequenceLength })}
      </ThemedText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
        {Array.from({ length: sequenceLength }, (_, index) => (
          <View
            key={`slot_${index}`}
            style={{
              flexGrow: 1,
              minWidth: 44,
              height: 44,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: selected[index] ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected[index] ? colors.glow : colors.surfaceMuted,
            }}
          >
            <ThemedText variant="label" color={selected[index] ? 'primary' : 'muted'}>
              {selected[index] ? gameText(selected[index]) : index + 1}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => choose(option)}
            accessibilityRole="button"
            accessibilityLabel={gameText(option)}
            style={({ pressed }) => ({
              flexGrow: 1,
              minWidth: '42%',
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ThemedText variant="label" color="primary" style={{ textAlign: 'center' }}>
              {gameText(option)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <ThemedButton
          label={t('common.clear')}
          variant="secondary"
          size="sm"
          fullWidth
          disabled={selected.length === 0}
          onPress={() => setSelected([])}
          style={{ flex: 1 }}
        />
        <ThemedButton
          label={t('common.submit')}
          size="sm"
          fullWidth
          disabled={selected.length !== sequenceLength}
          onPress={submit}
          style={{ flex: 1 }}
        />
      </View>
    </Panel>
  );
}
