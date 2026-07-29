import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BrainCircuit, LockKeyhole } from 'lucide-react-native';

import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { useTranslation } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ClientPuzzleState, ColorPathSubmission } from '@/types/puzzle';
import { ColorPathGuideChallenge } from '@/components/game/ColorPathGuideChallenge';

export function GuideChallengePuzzle({
  puzzle,
  onSubmitAnswer,
  onSubmitPaths,
}: {
  puzzle: ClientPuzzleState;
  onSubmitAnswer: (answer: string) => void;
  onSubmitPaths: (paths: ColorPathSubmission[]) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const challenge = puzzle.guideChallenge;

  if (!challenge) {
    return (
      <Panel variant="muted">
        <ThemedText variant="caption" color="muted">{t('guide.loading')}</ThemedText>
      </Panel>
    );
  }

  const attemptsLeft = Math.max(0, challenge.maxAttempts - puzzle.guideAttemptCount);

  if (challenge.kind === 'color_paths') {
    return (
      <ColorPathGuideChallenge
        challenge={challenge}
        attemptCount={puzzle.guideAttemptCount}
        onSubmit={onSubmitPaths}
      />
    );
  }

  return (
    <Panel variant="elevated" style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBubble}>
          <BrainCircuit size={28} color={colors.operator} strokeWidth={2.2} />
        </View>
        <View style={styles.headingCopy}>
          <ThemedText variant="subtitle" color="operator">{t('guide.title')}</ThemedText>
          <ThemedText variant="caption" color="muted">{t('guide.description')}</ThemedText>
        </View>
      </View>

      <View style={styles.lockedRow}>
        <LockKeyhole size={17} color={colors.accent} />
        <ThemedText variant="label" color="accent">{t('guide.answerLocked')}</ThemedText>
      </View>

      <ThemedText variant="body" color="secondary" style={styles.question}>
        {t(challenge.kind === 'rune_equation' ? 'guide.runeQuestion' : 'guide.sequenceQuestion')}
      </ThemedText>

      {challenge.kind === 'rune_equation' ? (
        <View style={styles.equationBoard}>
          {challenge.equations.map((equation, index) => (
            <View key={`equation_${index}`} style={styles.equationRow}>
              <ThemedText variant="mono" style={styles.runeEquation}>
                {equation.runes.join(' + ')}
              </ThemedText>
              <ThemedText variant="mono" color="muted">=</ThemedText>
              <ThemedText variant="mono" color="operator">{equation.total}</ThemedText>
            </View>
          ))}
          <View style={[styles.equationRow, styles.questionEquation]}>
            <ThemedText variant="mono" style={styles.runeEquation}>{challenge.question}</ThemedText>
            <ThemedText variant="mono" color="operator">= ?</ThemedText>
          </View>
        </View>
      ) : (
        <View style={styles.sequence}>
          {challenge.sequence.map((value, index) => (
            <View key={`${value}_${index}`} style={styles.sequenceGem}>
              <ThemedText variant="mono" style={styles.sequenceValue}>{value}</ThemedText>
            </View>
          ))}
          <View style={[styles.sequenceGem, styles.missingGem]}>
            <ThemedText variant="mono" color="operator">?</ThemedText>
          </View>
        </View>
      )}

      <View style={styles.options}>
        {challenge.options.map((option) => {
          const active = selected === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setSelected(option)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
            >
              <ThemedText variant="mono" style={{ color: active ? colors.textOnPrimary : colors.operator }}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {puzzle.guideAttemptCount > 0 && (
        <ThemedText variant="caption" color="error" style={styles.feedback}>
          {t('guide.wrong', { count: attemptsLeft })}
        </ThemedText>
      )}

      <ThemedButton
        label={t('guide.unlock')}
        variant="operator"
        fullWidth
        disabled={selected === null}
        onPress={() => {
          if (selected === null) return;
          onSubmitAnswer(String(selected));
          setSelected(null);
        }}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderColor: colors.sapphire, borderWidth: 3 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.operatorContainer,
    borderWidth: 2,
    borderColor: colors.sapphire,
  },
  headingCopy: { flex: 1, gap: 2 },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  question: { textAlign: 'center', marginTop: spacing.lg },
  sequence: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  sequenceGem: {
    minWidth: 48,
    height: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.operatorContainer,
    borderWidth: 2,
    borderColor: colors.sapphire,
  },
  missingGem: { backgroundColor: colors.surfaceElevated, borderStyle: 'dashed' },
  sequenceValue: { color: colors.operator, fontSize: 20, letterSpacing: 0 },
  equationBoard: {
    gap: spacing.sm,
    marginVertical: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.sapphire,
  },
  equationRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  questionEquation: {
    borderTopWidth: 1,
    borderTopColor: colors.sapphire,
    paddingTop: spacing.sm,
  },
  runeEquation: { color: colors.operator, fontSize: 21, letterSpacing: 2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  option: {
    minWidth: '45%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.sapphire,
    backgroundColor: colors.surfaceElevated,
  },
  optionActive: { backgroundColor: colors.operator, borderColor: colors.operator },
  feedback: { textAlign: 'center', marginBottom: spacing.sm },
});
