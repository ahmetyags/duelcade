import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, ChevronLeft, Clock3, Gauge } from 'lucide-react-native';

import { DurationSlider } from '@/components/ui/DurationSlider';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { PlayerProfileEditor } from '@/components/ui/PlayerProfileEditor';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { startSinglePlayer } from '@/services/SinglePlayerService';
import { triggerHaptic } from '@/services/HapticsService';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Difficulty } from '@/types/game';
import { useTranslation } from '@/src/i18n';

export default function SoloSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const displayName = useSettingsStore((state) => state.displayName);
  const setDisplayName = useSettingsStore((state) => state.setDisplayName);
  const avatarId = useSettingsStore((state) => state.avatarId);
  const setAvatarId = useSettingsStore((state) => state.setAvatarId);
  const [name, setName] = useState(displayName || user?.displayName || '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMinutes, setDurationMinutes] = useState(5);

  const handleStart = useCallback(() => {
    triggerHaptic('medium');
    const finalName = name.trim() || displayName || user?.displayName
      || t('common.playerFallback', { number: Math.floor(Math.random() * 999) });
    setDisplayName(finalName);
    startSinglePlayer(finalName, difficulty, durationMinutes);
    router.replace('/game');
  }, [difficulty, displayName, durationMinutes, name, router, setDisplayName, t, user?.displayName]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <ThemedText variant="subtitle">{t('solo.title')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PlayerProfileEditor
          name={name}
          onNameChange={setName}
          avatarId={avatarId}
          onAvatarChange={setAvatarId}
          title={t('create.profile')}
          helperText={t('solo.profileHelp')}
          namePlaceholder={t('create.namePlaceholder')}
          avatarLabel={t('create.avatar')}
          pickerTitle={t('create.chooseAvatar')}
        />

        <View style={styles.intro}>
          <View style={styles.botMark}>
            <Bot size={26} color={colors.primaryDark} />
          </View>
          <ThemedText color="muted" style={styles.introText}>{t('solo.subtitle')}</ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Gauge size={19} color={colors.primaryDark} />
            <View>
              <ThemedText variant="label">{t('create.difficulty')}</ThemedText>
              <ThemedText variant="caption" color="muted">{t('solo.difficultyHelp')}</ThemedText>
            </View>
          </View>
          <View style={styles.optionGrid}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: difficulty === option }}
                onPress={() => {
                  setDifficulty(option);
                  triggerHaptic('light');
                }}
                style={[
                  styles.optionCard,
                  difficulty === option && styles.optionCardActive,
                ]}
              >
                <ThemedText
                  variant="label"
                  style={{ color: difficulty === option ? colors.primaryDark : colors.textPrimary }}
                >
                  {option === 'easy'
                    ? t('create.easy')
                    : option === 'medium' ? t('create.medium') : t('create.hard')}
                </ThemedText>
                <ThemedText variant="caption" color="muted" style={styles.optionDescription}>
                  {option === 'easy'
                    ? t('solo.easyDescription')
                    : option === 'medium'
                      ? t('solo.mediumDescription')
                      : t('solo.hardDescription')}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Clock3 size={19} color={colors.amber} />
            <View>
              <ThemedText variant="label">{t('create.duration')}</ThemedText>
              <ThemedText variant="caption" color="muted">{t('create.durationHelp')}</ThemedText>
            </View>
          </View>
          <DurationSlider value={durationMinutes} onChange={setDurationMinutes} />
        </View>

        <ThemedButton
          label={t('solo.action')}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Bot size={21} color={colors.textOnPrimary} />}
          onPress={handleStart}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceDark,
  },
  botMark: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1 },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionGrid: { flexDirection: 'row', gap: spacing.sm },
  optionCard: {
    flex: 1,
    minHeight: 112,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  optionDescription: { textAlign: 'center' },
});
