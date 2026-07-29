/** Unified role, mission and session HUD for the focused game screen. */

import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Compass, Lightbulb, LogOut, Shield } from 'lucide-react-native';

import { ConnectionIndicator } from '@/components/ui/ConnectionIndicator';
import { ThemedText } from '@/components/ui/ThemedText';
import { TimerDisplay } from '@/components/ui/TimerDisplay';
import { useTranslation } from '@/src/i18n';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { PlayerRole } from '@/types/game';

interface GameHUDProps {
  readonly role: PlayerRole;
  readonly roomCode: string;
  readonly onLeave: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly puzzleProgress?: { solved: number; total: number };
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly hintsRevealed: number;
  readonly availableHints: number;
  readonly onHint: () => void;
}

export const GameHUD = React.memo<GameHUDProps>(function GameHUD({
  role,
  roomCode,
  onLeave,
  style,
  puzzleProgress,
  currentStep,
  totalSteps,
  hintsRevealed,
  availableHints,
  onHint,
}) {
  const { t } = useTranslation();
  const operator = role === 'operator';
  const roleColor = operator ? colors.operator : colors.explorer;
  const roleBackground = operator ? colors.operatorContainer : colors.explorerContainer;
  const borderColor = operator ? colors.cyanMuted : colors.amberMuted;
  const missionBackground = colors.surfaceElevated;
  const RoleIcon = operator ? Shield : Compass;
  const hintsExhausted = availableHints === 0 || hintsRevealed >= availableHints;

  return (
    <View style={styles.outer}>
      <View style={[styles.hud, { borderColor }, style]}>
        <View style={styles.sessionRow}>
          <View style={[styles.avatar, { backgroundColor: roleBackground, borderColor }]}>
            <RoleIcon size={21} color={roleColor} strokeWidth={2.4} />
          </View>

          <View style={styles.identity}>
            <ThemedText
              variant="body"
              style={[styles.roleTitle, { color: roleColor }]}
              numberOfLines={1}
            >
              {operator ? t('common.spiritGuide') : t('common.adventurer')}
            </ThemedText>
            <View style={styles.statusLine}>
              <ConnectionIndicator />
              <ThemedText variant="label" color="muted" numberOfLines={1} style={styles.statusText}>
                {roomCode}
                {puzzleProgress ? ` · ${puzzleProgress.solved}/${puzzleProgress.total}` : ''}
              </ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.timerBubble,
              { borderColor: operator ? colors.cyanMuted : colors.amber },
            ]}
          >
            <TimerDisplay compact />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.leave')}
            hitSlop={8}
            onPress={onLeave}
            style={({ pressed }) => [styles.leaveButton, pressed && styles.controlPressed]}
          >
            <LogOut size={18} color={colors.error} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View
          style={[
            styles.missionRow,
            {
              backgroundColor: missionBackground,
              borderLeftColor: roleColor,
            },
          ]}
        >
          <View style={styles.missionCopy}>
            <ThemedText
              variant="body"
              style={[styles.missionTitle, { color: roleColor }]}
              numberOfLines={2}
            >
              {t(operator ? 'game.guideTaskTitle' : 'game.adventurerTaskTitle')}
            </ThemedText>
            <ThemedText variant="label" style={{ color: roleColor }}>
              {t('game.step', { current: currentStep, total: totalSteps })}
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.hint')}
            accessibilityState={{ disabled: hintsExhausted }}
            disabled={hintsExhausted}
            onPress={onHint}
            style={({ pressed }) => [
              styles.hintButton,
              hintsExhausted && styles.hintButtonDisabled,
              pressed && styles.controlPressed,
            ]}
          >
            <Lightbulb size={19} color={colors.accent} strokeWidth={2.3} />
            <ThemedText variant="label" color="accent">
              {availableHints > 0 ? `${hintsRevealed}/${availableHints}` : t('game.hint')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  hud: {
    width: '100%',
    maxWidth: 680,
    gap: 6,
    padding: 6,
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: colors.overlay,
    ...shadows.md,
  },
  sessionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  roleTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  timerBubble: {
    minWidth: 70,
    height: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  leaveButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surfaceDark,
  },
  missionRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingLeft: spacing.md,
    paddingRight: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: colors.border,
  },
  missionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  missionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  hintButton: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  hintButtonDisabled: {
    opacity: 0.42,
    borderColor: colors.border,
  },
  controlPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
});
