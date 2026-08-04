import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  HelpCircle,
  RotateCw,
  X,
} from 'lucide-react-native';

import { PipeDirectionGlyph } from '@/components/game/PipeDirectionGlyph';
import { ThemedText } from '@/components/ui/ThemedText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';
import { getTurnModeCopy, TURN_UI } from '@/src/i18n/turnGames';
import type { TurnGameMode } from '@/types/turnGame';

const MINI_COLORS = [colors.cyan, colors.amber] as const;

function MiniGrid({
  values,
  arrow = 'right',
}: {
  values: readonly (0 | 1 | 2 | null)[];
  arrow?: 'right' | 'rotate';
}) {
  return (
    <View style={styles.miniGrid}>
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.miniCell,
            value === 2 && styles.miniBarrier,
            value !== null && value !== 2 && {
              backgroundColor: `${MINI_COLORS[value]}38`,
              borderColor: MINI_COLORS[value],
            },
          ]}
        >
          {value !== null && value !== 2 && (
            <ThemedText style={{ color: MINI_COLORS[value], fontWeight: '700' }}>
              {value === 0 ? '○' : '×'}
            </ThemedText>
          )}
        </View>
      ))}
      <View style={styles.diagramArrow}>
        {arrow === 'rotate'
          ? <RotateCw size={22} color={colors.primaryDark} />
          : <ArrowRight size={24} color={colors.primaryDark} />}
      </View>
    </View>
  );
}

function HowToDiagram({ mode, ui }: { mode: TurnGameMode; ui: (typeof TURN_UI)[keyof typeof TURN_UI] }) {
  if (mode === 'cipher_clash') {
    return (
      <View style={styles.sequenceDiagram}>
        <View style={styles.sequenceRow}>
          {['#E85D75', '#6C4EF6', '#F5C542', '#29C98B'].map((color, index) => (
            <View key={color} style={[styles.colorOrb, { backgroundColor: color }]}>
              <ThemedText style={styles.orbText}>{index + 1}</ThemedText>
            </View>
          ))}
        </View>
        <ArrowRight size={25} color={colors.primaryDark} />
        <View style={styles.feedbackPreview}>
          <ThemedText variant="label" style={{ color: colors.primaryDark }}>{`2 `}</ThemedText>
          <ThemedText variant="caption" color="muted">{`1 `}</ThemedText>
        </View>
      </View>
    );
  }

  if (mode === 'resonance_dials') {
    return (
      <View style={styles.frequencyDiagram}>
        <View style={styles.frequencyBox}>
          <ThemedText variant="caption" color="muted">{ui.current}</ThemedText>
          <ThemedText variant="mono">180 Hz</ThemedText>
        </View>
        <ArrowRight size={25} color={colors.primaryDark} />
        <View style={[styles.frequencyBox, styles.frequencyTarget]}>
          <ThemedText variant="caption" color="muted">{ui.target}</ThemedText>
          <ThemedText variant="mono" style={{ color: colors.amberMuted }}>220 Hz</ThemedText>
        </View>
      </View>
    );
  }

  if (mode === 'memory_pairs') {
    return (
      <View style={styles.cardDiagram}>
        {['?', '◆', '?', '◆'].map((symbol, index) => (
          <View key={index} style={[styles.previewCard, symbol !== '?' && styles.previewCardOpen]}>
            <ThemedText style={{ color: symbol === '?' ? colors.textMuted : colors.primaryDark }}>
              {symbol}
            </ThemedText>
          </View>
        ))}
        <ArrowRight size={24} color={colors.primaryDark} />
        <View style={styles.checkCircle}><Check size={20} color={colors.success} /></View>
      </View>
    );
  }

  if (mode === 'circuit_claim') {
    return (
      <View style={styles.circuitDiagram}>
        <View style={styles.previewCircuitBox}>
          <View style={[styles.previewLine, styles.previewTop]} />
          <View style={[styles.previewLine, styles.previewBottom]} />
          <View style={[styles.previewLine, styles.previewLeft]} />
          <View style={[styles.previewLine, styles.previewRight, { backgroundColor: colors.primary }]} />
          <ThemedText style={{ color: colors.primaryDark }}>○</ThemedText>
        </View>
        <ArrowRight size={26} color={colors.primaryDark} />
        <ThemedText variant="label" style={{ color: colors.primaryDark }}>{`+1 `}</ThemedText>
      </View>
    );
  }

  if (mode === 'pipe_circuit') {
    return (
      <View style={styles.pipeDiagram}>
        <PipeDirectionGlyph kind="corner" rotation={0} size={54} color={colors.primaryDark} />
        <RotateCw size={27} color={colors.primaryDark} />
        <PipeDirectionGlyph kind="corner" rotation={1} size={54} color={colors.primaryDark} />
        <View style={styles.checkCircle}><Check size={20} color={colors.success} /></View>
      </View>
    );
  }

  const values: Record<string, readonly (0 | 1 | 2 | null)[]> = {
    rune_grid: [null, null, null, null, 0, 0, 0, null, null, 1, null, null, null, 1, null, null],
    connect_four: [null, null, null, null, null, 1, null, null, 0, 1, 0, null, 0, 0, 1, 1],
    neon_trail: [0, 0, null, null, null, 0, null, 1, null, 0, null, 1, null, null, 1, 1],
    gateway_race: [null, null, 1, null, null, 2, null, null, null, 2, null, null, 0, null, null, null],
    polarity_war: [null, null, null, null, null, 0, 1, null, null, 1, 1, 0, null, null, null, null],
  };
  return <MiniGrid values={values[mode]} />;
}

export function GameHowToPlayModal({
  mode,
  visible,
  onClose,
}: {
  mode: TurnGameMode;
  visible: boolean;
  onClose: () => void;
}) {
  const { language } = useTranslation();
  const ui = TURN_UI[language];
  const content = getTurnModeCopy(language, mode);
  const steps = [
    [ui.goal, content.help.goal],
    [ui.yourTurn, content.help.turn],
    [ui.win, content.help.win],
  ] as const;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.helpMark}>
              <HelpCircle size={24} color={colors.primaryDark} />
            </View>
            <View style={styles.headerCopy}>
              <ThemedText variant="caption" color="accent">{ui.howToPlay}</ThemedText>
              <ThemedText variant="subtitle">{content.title}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.closeHowTo}
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={21} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.diagram}>
              <HowToDiagram mode={mode} ui={ui} />
              <ThemedText variant="caption" color="muted" style={styles.diagramCaption}>
                {ui.diagramCaption}
              </ThemedText>
            </View>

            <View style={styles.steps}>
              {steps.map(([title, description], index) => (
                <View key={title} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText variant="label" style={{ color: colors.primaryDark }}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.stepCopy}>
                    <ThemedText variant="label">{title}</ThemedText>
                    <ThemedText color="secondary">{description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tip}>
              <ThemedText variant="label" style={{ color: colors.amberMuted }}>{ui.tip}</ThemedText>
              <ThemedText color="secondary">{content.help.tip}</ThemedText>
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.understood}
            onPress={onClose}
            style={styles.understoodButton}
          >
            <Check size={19} color={colors.textOnPrimary} />
            <ThemedText variant="label" color="onPrimary">{ui.backToGame}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: 'rgba(23,35,31,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helpMark: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { gap: spacing.lg },
  diagram: {
    minHeight: 190,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  diagramCaption: { textAlign: 'center' },
  miniGrid: {
    width: 184,
    height: 136,
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
  },
  miniCell: {
    width: '25%',
    height: '25%',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBarrier: { backgroundColor: colors.textSecondary },
  diagramArrow: {
    position: 'absolute',
    right: -18,
    top: 54,
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sequenceDiagram: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sequenceRow: { flexDirection: 'row', gap: spacing.xs },
  colorOrb: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbText: { color: '#FFFFFF', fontWeight: '700' },
  feedbackPreview: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  frequencyDiagram: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  frequencyBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  frequencyTarget: { borderColor: colors.amber, backgroundColor: colors.secondaryContainer },
  cardDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewCard: {
    width: 40,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCardOpen: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#E7F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  previewCircuitBox: {
    width: 80,
    height: 80,
    position: 'relative',
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLine: { position: 'absolute', backgroundColor: colors.textSecondary, borderRadius: radius.pill },
  previewTop: { top: -4, left: 4, right: 4, height: 8 },
  previewBottom: { bottom: -4, left: 4, right: 4, height: 8 },
  previewLeft: { left: -4, top: 4, bottom: 4, width: 8 },
  previewRight: { right: -4, top: 4, bottom: 4, width: 8 },
  pipeDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  tip: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.secondaryContainer,
    gap: spacing.xs,
  },
  understoodButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
