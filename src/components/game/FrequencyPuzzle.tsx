import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, Plus, RadioTower } from 'lucide-react-native';

import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTranslation } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ClientPuzzleState } from '@/types/puzzle';

type FrequencyConfig = {
  labels?: string[];
  dialOptions?: number[][];
  initialIndices?: number[];
};

export function FrequencyPuzzle({
  puzzle,
  onSubmit,
}: {
  puzzle: ClientPuzzleState;
  onSubmit: (frequencies: number[]) => void;
}) {
  const { t } = useTranslation();
  const config = puzzle.publicState as FrequencyConfig;
  const labels = config.labels ?? ['A', 'B', 'C'];
  const options = config.dialOptions ?? labels.map(() => [100, 200, 300]);
  const [indices, setIndices] = useState<number[]>(
    config.initialIndices ?? labels.map(() => 0),
  );

  const turn = (dial: number, direction: -1 | 1) => {
    setIndices((current) => current.map((value, index) => {
      if (index !== dial) return value;
      const count = options[index]?.length ?? 1;
      return (value + direction + count) % count;
    }));
  };

  return (
    <Panel variant="elevated" style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBubble}>
          <RadioTower size={26} color={colors.explorer} />
        </View>
        <View style={styles.headingCopy}>
          <ThemedText variant="subtitle" color="explorer">{t('puzzle.frequencyTitle')}</ThemedText>
          <ThemedText variant="caption" color="muted">{t('puzzle.frequencyDescription')}</ThemedText>
        </View>
      </View>

      <View style={styles.warning}>
        <View style={styles.warningLight} />
        <ThemedText variant="label" color="accent">{t('puzzle.frequencyWarning')}</ThemedText>
      </View>

      <View style={styles.dials}>
        {labels.map((label, dial) => {
          const values = options[dial] ?? [0];
          const value = values[indices[dial] ?? 0] ?? values[0];
          return (
            <View key={label} style={styles.dialCard}>
              <View style={styles.channelBadge}>
                <ThemedText variant="label" color="explorer">
                  {t('puzzle.frequencyChannel', { channel: label })}
                </ThemedText>
              </View>
              <View style={styles.controls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('puzzle.frequencyDecrease', { channel: label })}
                  onPress={() => turn(dial, -1)}
                  style={styles.turnButton}
                >
                  <Minus size={20} color={colors.explorer} />
                </Pressable>
                <View style={styles.display}>
                  <ThemedText variant="mono" style={styles.frequency}>{value}</ThemedText>
                  <ThemedText variant="label" color="muted">Hz</ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('puzzle.frequencyIncrease', { channel: label })}
                  onPress={() => turn(dial, 1)}
                  style={styles.turnButton}
                >
                  <Plus size={20} color={colors.explorer} />
                </Pressable>
              </View>
              <View style={styles.scale}>
                {values.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tick,
                      index === indices[dial] && styles.tickActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <ThemedButton
        label={t('puzzle.frequencySubmit')}
        variant="explorer"
        fullWidth
        onPress={() => onSubmit(
          labels.map((_, index) => options[index]?.[indices[index] ?? 0] ?? 0),
        )}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderColor: colors.secondaryContainer, borderWidth: 3 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingCopy: { flex: 1, gap: 2 },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.explorerContainer,
  },
  warning: {
    marginVertical: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.alarmBackground,
  },
  warningLight: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  dials: { gap: spacing.sm, marginBottom: spacing.lg },
  dialCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelBadge: { alignItems: 'center', marginBottom: spacing.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  turnButton: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
  },
  display: {
    minWidth: 112,
    height: 66,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
  },
  frequency: { color: colors.sunlight, fontSize: 25, letterSpacing: 1 },
  scale: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  tick: { width: 4, height: 8, borderRadius: 2, backgroundColor: colors.border },
  tickActive: { height: 15, backgroundColor: colors.accent },
});
