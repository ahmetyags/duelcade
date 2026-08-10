import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Award,
  Check,
  Gift,
  LockKeyhole,
  Palette,
  RotateCw,
  Target,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  claimDailyQuest,
  equipCosmetic,
  type CosmeticType,
  type PlayerProgression,
  type QuestKey,
} from '@/services/AuthApi';
import {
  progressionQueryKey,
  useProgressionQuery,
} from '@/services/ProgressionQuery';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/src/i18n';
import { getTurnModeCopy } from '@/src/i18n/turnGames';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import {
  isPlayerAvatarId,
  isPlayerFrameId,
  isTableThemeId,
  type PlayerAvatarId,
  type PlayerFrameId,
} from '@/types/profile';
import { trackAnalyticsEvent } from '@/services/AnalyticsService';

const ITEM_LABELS = {
  en: {
    sparkles: 'Spark',
    bolt: 'Bolt',
    gamepad: 'Arcade',
    bot: 'DuelBot',
    shield: 'Shield',
    cat: 'Lucky Cat',
    flame: 'Flame',
    rocket: 'Rocket',
    gem: 'Gem',
    swords: 'Swords',
    crown: 'Crown',
    trophy: 'Trophy',
    default: 'Classic',
    neon: 'Neon',
    ember: 'Ember',
    royal: 'Royal',
    classic: 'Classic Table',
    midnight: 'Midnight Table',
    aurora: 'Aurora Table',
  },
  tr: {
    sparkles: 'Kıvılcım',
    bolt: 'Şimşek',
    gamepad: 'Arcade',
    bot: 'DuelBot',
    shield: 'Kalkan',
    cat: 'Şanslı Kedi',
    flame: 'Alev',
    rocket: 'Roket',
    gem: 'Mücevher',
    swords: 'Kılıçlar',
    crown: 'Taç',
    trophy: 'Kupa',
    default: 'Klasik',
    neon: 'Neon',
    ember: 'Kor',
    royal: 'Kraliyet',
    classic: 'Klasik Masa',
    midnight: 'Gece Masası',
    aurora: 'Aurora Masası',
  },
} as const;

export default function ProgressionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language, t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const getValidAccessToken = useAuthStore((state) => state.getValidAccessToken);
  const setAvatarId = useSettingsStore((state) => state.setAvatarId);
  const setFrameId = useSettingsStore((state) => state.setFrameId);
  const setTableThemeId = useSettingsStore((state) => state.setTableThemeId);
  const progression = useProgressionQuery();
  const data = progression.data?.progression;

  const updateProgression = (next: PlayerProgression) => {
    queryClient.setQueryData(
      progressionQueryKey(user?.id),
      { progression: next },
    );
  };

  const claim = useMutation({
    mutationFn: async (questKey: QuestKey) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('AUTH_UNAVAILABLE');
      return claimDailyQuest(token, questKey);
    },
    onSuccess: (response, questKey) => {
      updateProgression(response.progression);
      trackAnalyticsEvent('quest_claimed', { questKey });
    },
  });

  React.useEffect(() => {
    trackAnalyticsEvent('progression_viewed');
  }, []);

  const equip = useMutation({
    mutationFn: async (item: { type: CosmeticType; itemId: string }) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('AUTH_UNAVAILABLE');
      return equipCosmetic(token, item.type, item.itemId);
    },
    onSuccess: (response, item) => {
      updateProgression(response.progression);
      if (item.type === 'avatar' && isPlayerAvatarId(item.itemId)) {
        setAvatarId(item.itemId);
      } else if (item.type === 'frame' && isPlayerFrameId(item.itemId)) {
        setFrameId(item.itemId);
      } else if (
        item.type === 'table_theme'
        && isTableThemeId(item.itemId)
      ) {
        setTableThemeId(item.itemId);
      }
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText variant="title" style={styles.title}>
            {t('progression.title')}
          </ThemedText>
          <ThemedText variant="caption" color="muted">
            {t('progression.subtitle')}
          </ThemedText>
        </View>
        <Award size={25} color={colors.amber} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!user?.serverBacked || user.isGuest ? (
          <StatusCard copy={t('progression.offline')} />
        ) : progression.isPending ? (
          <StatusCard copy={t('progression.loading')} />
        ) : progression.isError || !data ? (
          <View style={styles.statusCard}>
            <ThemedText color="muted">{t('progression.error')}</ThemedText>
            <Pressable onPress={() => progression.refetch()} style={styles.retry}>
              <RotateCw size={17} color={colors.primary} />
              <ThemedText variant="label" color="operator">
                {t('history.retry')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.levelCard}>
              <View style={styles.levelBadge}>
                <ThemedText variant="label" color="muted">
                  {t('progression.level')}
                </ThemedText>
                <ThemedText variant="title" style={styles.levelNumber}>
                  {data.level}
                </ThemedText>
              </View>
              <View style={styles.levelCopy}>
                <View style={styles.levelTop}>
                  <ThemedText variant="subtitle">
                    {t('progression.totalXp', { xp: data.totalXp })}
                  </ThemedText>
                  <ThemedText variant="caption" color="muted">
                    {data.currentLevelXp}/{data.nextLevelXp} XP
                  </ThemedText>
                </View>
                <ProgressBar
                  value={data.currentLevelXp}
                  target={data.nextLevelXp}
                />
                <ThemedText variant="caption" color="secondary">
                  {t('progression.nextUnlock')}
                </ThemedText>
              </View>
            </View>

            <SectionHeader
              icon={<Target size={19} color={colors.primary} />}
              title={t('progression.dailyQuests')}
              subtitle={t('progression.dailyQuestsHelp')}
            />
            <View style={styles.stack}>
              {data.dailyQuests.map((quest) => {
                const complete = quest.progress >= quest.target;
                return (
                  <View key={quest.key} style={styles.questCard}>
                    <View style={styles.flex}>
                      <ThemedText variant="body" style={styles.cardTitle}>
                        {t(`progression.quest.${quest.key}`)}
                      </ThemedText>
                      <ThemedText variant="caption" color="muted">
                        {quest.progress}/{quest.target} · +{quest.rewardXp} XP
                      </ThemedText>
                      <ProgressBar value={quest.progress} target={quest.target} />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!complete || quest.claimed || claim.isPending}
                      onPress={() => claim.mutate(quest.key)}
                      style={[
                        styles.claimButton,
                        (!complete || quest.claimed) && styles.disabled,
                      ]}
                    >
                      {quest.claimed ? (
                        <Check size={17} color={colors.success} />
                      ) : (
                        <Gift size={17} color={colors.textOnPrimary} />
                      )}
                      <ThemedText
                        variant="caption"
                        style={{ color: quest.claimed ? colors.success : colors.textOnPrimary }}
                      >
                        {quest.claimed
                          ? t('progression.claimed')
                          : t('progression.claim')}
                      </ThemedText>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <SectionHeader
              icon={<Award size={19} color={colors.amber} />}
              title={t('progression.mastery')}
              subtitle={t('progression.masteryHelp')}
            />
            <View style={styles.masteryGrid}>
              {data.mastery.map((item) => (
                <View key={item.mode} style={styles.masteryCard}>
                  <ThemedText variant="label">
                    {getTurnModeCopy(language, item.mode).title}
                  </ThemedText>
                  <ThemedText variant="monoLarge" color="operator">
                    {item.xp} XP
                  </ThemedText>
                  <ThemedText variant="caption" color="muted">
                    {t('progression.matches', { count: item.matchesPlayed })}
                  </ThemedText>
                </View>
              ))}
            </View>

            <SectionHeader
              icon={<Palette size={19} color={colors.secondary} />}
              title={t('progression.cosmetics')}
              subtitle={t('progression.cosmeticsHelp')}
            />
            {(['avatar', 'frame', 'table_theme'] as const).map((type) => (
              <CosmeticGroup
                key={type}
                type={type}
                progression={data}
                language={language}
                title={t(`progression.cosmeticType.${type}`)}
                pending={equip.isPending}
                onEquip={(itemId) => equip.mutate({ type, itemId })}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CosmeticGroup({
  type,
  progression,
  language,
  title,
  pending,
  onEquip,
}: {
  type: CosmeticType;
  progression: PlayerProgression;
  language: 'tr' | 'en';
  title: string;
  pending: boolean;
  onEquip: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const owned = new Set(
    progression.inventory
      .filter((item) => item.type === type)
      .map((item) => item.itemId),
  );
  const equipped = type === 'avatar'
    ? progression.equipped.avatar
    : type === 'frame'
      ? progression.equipped.frame
      : progression.equipped.tableTheme;
  return (
    <View style={styles.cosmeticSection}>
      <ThemedText variant="label" color="muted">{title}</ThemedText>
      <View style={styles.cosmeticGrid}>
        {progression.catalog.filter((item) => item.type === type).map((item) => {
          const unlocked = owned.has(item.itemId);
          const selected = equipped === item.itemId;
          return (
            <Pressable
              key={item.itemId}
              accessibilityRole="button"
              disabled={!unlocked || selected || pending}
              onPress={() => onEquip(item.itemId)}
              style={[
                styles.cosmeticCard,
                selected && styles.cosmeticSelected,
                !unlocked && styles.cosmeticLocked,
              ]}
            >
              {type === 'avatar' && isPlayerAvatarId(item.itemId) ? (
                <PlayerAvatar
                  avatarId={item.itemId as PlayerAvatarId}
                  size={42}
                  frameId={
                    isPlayerFrameId(progression.equipped.frame)
                      ? progression.equipped.frame as PlayerFrameId
                      : 'default'
                  }
                />
              ) : unlocked ? (
                <Palette size={25} color={selected ? colors.success : colors.secondary} />
              ) : (
                <LockKeyhole size={24} color={colors.textMuted} />
              )}
              <ThemedText variant="caption" style={styles.cosmeticLabel}>
                {ITEM_LABELS[language][item.itemId as keyof typeof ITEM_LABELS.en]
                  ?? item.itemId}
              </ThemedText>
              <ThemedText
                variant="caption"
                color={selected ? 'success' : 'muted'}
              >
                {selected
                  ? t('progression.equipped')
                  : unlocked
                    ? t('progression.equip')
                    : t('progression.unlockLevel', { level: item.unlockLevel })}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <View style={styles.flex}>
        <ThemedText variant="subtitle">{title}</ThemedText>
        <ThemedText variant="caption" color="muted">{subtitle}</ThemedText>
      </View>
    </View>
  );
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const ratio = target <= 0 ? 0 : Math.min(1, Math.max(0, value / target));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

function StatusCard({ copy }: { copy: string }) {
  return (
    <View style={styles.statusCard}>
      <Award size={38} color={colors.textMuted} />
      <ThemedText color="muted" style={styles.statusCopy}>{copy}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  header: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 24 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  levelBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.amberMuted,
    borderWidth: 2,
    borderColor: colors.amber,
  },
  levelNumber: { color: colors.amber, lineHeight: 34 },
  levelCopy: { flex: 1, gap: spacing.sm },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stack: { gap: spacing.sm },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  flex: { flex: 1, gap: spacing.xs },
  cardTitle: { fontFamily: 'Quicksand-SemiBold' },
  claimButton: {
    minWidth: 92,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.45 },
  masteryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  masteryCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 150,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cosmeticSection: { gap: spacing.sm },
  cosmeticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cosmeticCard: {
    width: 112,
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cosmeticSelected: {
    borderColor: colors.success,
    backgroundColor: colors.primaryContainer,
  },
  cosmeticLocked: { opacity: 0.55, backgroundColor: colors.surfaceDark },
  cosmeticLabel: { textAlign: 'center', fontFamily: 'Quicksand-SemiBold' },
  statusCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
  },
  statusCopy: { textAlign: 'center' },
  retry: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
