import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Award,
  Check,
  Gift,
  LockKeyhole,
  Palette,
  RotateCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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

const TABLE_THEME_PREVIEWS = {
  classic: { board: '#F2F7F5', line: colors.cyanMuted, piece: colors.actionAmber },
  midnight: { board: '#17312C', line: colors.actionCyan, piece: colors.actionAmber },
  aurora: { board: '#DDF5F1', line: '#7C61FF', piece: colors.actionCyan },
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
      <ScreenHeader
        title={t('progression.title')}
        subtitle={t('progression.subtitle')}
        backLabel={t('common.back')}
        onBack={() => router.back()}
        trailing={<Award size={25} color={colors.amber} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
              <View pointerEvents="none" style={styles.levelGlow} />
              <View style={styles.levelBadge}>
                <View style={styles.levelBadgeInner}>
                  <View style={styles.levelBadgeContent}>
                    <Trophy size={17} color={colors.actionAmber} />
                    <ThemedText variant="title" style={styles.levelNumber}>{data.level}</ThemedText>
                  </View>
                </View>
                <View style={styles.levelLabelPill}>
                  <ThemedText variant="caption" style={styles.levelLabel}>
                    {t('progression.level')}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.levelCopy}>
                <View style={styles.rankEyebrow}>
                  <Sparkles size={14} color={colors.actionAmber} />
                  <ThemedText variant="label" style={styles.rankEyebrowText}>
                    {t('progression.playerRank')}
                  </ThemedText>
                </View>
                <ThemedText variant="subtitle" style={styles.totalXp}>
                    {t('progression.totalXp', { xp: data.totalXp })}
                </ThemedText>
                <View style={styles.levelTop}>
                  <ThemedText variant="caption" style={styles.levelProgressLabel}>
                    {t('progression.levelProgress')}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.levelProgressValue}>
                    {data.currentLevelXp}/{data.nextLevelXp} XP
                  </ThemedText>
                </View>
                <ProgressBar
                  value={data.currentLevelXp}
                  target={data.nextLevelXp}
                  accent="amber"
                />
                <ThemedText variant="caption" style={styles.nextUnlock}>
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

            <SectionHeader
              icon={<Award size={19} color={colors.amber} />}
              title={t('progression.mastery')}
              subtitle={t('progression.masteryHelp')}
            />
            <View style={styles.masteryGrid}>
              {data.mastery.map((item, index) => (
                <View key={item.mode} style={styles.masteryCard}>
                  <View style={[
                    styles.masteryAccent,
                    { backgroundColor: index % 2 === 0 ? colors.actionCyan : colors.actionAmber },
                  ]} />
                  <ThemedText variant="label">
                    {getTurnModeCopy(language, item.mode).title}
                  </ThemedText>
                  <View style={styles.masteryStats}>
                    <ThemedText variant="mono" color="operator">
                      {item.xp}
                    </ThemedText>
                    <ThemedText variant="caption" color="muted">XP</ThemedText>
                  </View>
                  <ThemedText variant="caption" color="muted">
                    {t('progression.matches', { count: item.matchesPlayed })}
                  </ThemedText>
                </View>
              ))}
            </View>
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
      <View style={styles.cosmeticGroupHeader}>
        <ThemedText variant="label" color="muted">{title}</ThemedText>
        <ThemedText variant="caption" color="muted">
          {owned.size}/{progression.catalog.filter((item) => item.type === type).length}
        </ThemedText>
      </View>
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
              {!unlocked ? (
                <View style={styles.lockedPreview}>
                  <LockKeyhole size={22} color={colors.textMuted} />
                </View>
              ) : type === 'avatar' && isPlayerAvatarId(item.itemId) ? (
                <PlayerAvatar
                  avatarId={item.itemId as PlayerAvatarId}
                  size={42}
                  frameId={
                    isPlayerFrameId(progression.equipped.frame)
                      ? progression.equipped.frame as PlayerFrameId
                      : 'default'
                  }
                />
              ) : type === 'frame' && isPlayerFrameId(item.itemId) ? (
                <PlayerAvatar
                  avatarId={isPlayerAvatarId(progression.equipped.avatar)
                    ? progression.equipped.avatar as PlayerAvatarId
                    : 'sparkles'}
                  size={42}
                  frameId={item.itemId as PlayerFrameId}
                />
              ) : type === 'table_theme' ? (
                <TableThemePreview itemId={item.itemId} />
              ) : (
                <Palette size={25} color={selected ? colors.success : colors.secondary} />
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

function TableThemePreview({ itemId }: { itemId: string }) {
  const palette = TABLE_THEME_PREVIEWS[itemId as keyof typeof TABLE_THEME_PREVIEWS]
    ?? TABLE_THEME_PREVIEWS.classic;
  return (
    <View style={[styles.tablePreview, { backgroundColor: palette.board, borderColor: palette.line }]}>
      <View style={[styles.tablePreviewLine, styles.tablePreviewVertical, { backgroundColor: palette.line }]} />
      <View style={[styles.tablePreviewLine, styles.tablePreviewHorizontal, { backgroundColor: palette.line }]} />
      <View style={[styles.tablePreviewPiece, styles.tablePieceOne, { backgroundColor: palette.piece }]} />
      <View style={[styles.tablePreviewPiece, styles.tablePieceTwo, { backgroundColor: palette.line }]} />
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

function ProgressBar({
  value,
  target,
  accent = 'cyan',
}: {
  value: number;
  target: number;
  accent?: 'cyan' | 'amber';
}) {
  const ratio = target <= 0 ? 0 : Math.min(1, Math.max(0, value / target));
  return (
    <View style={[styles.progressTrack, accent === 'amber' && styles.progressTrackOnDark]}>
      <View style={[
        styles.progressFill,
        accent === 'amber' && styles.progressFillAmber,
        { width: `${ratio * 100}%` },
      ]} />
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
  content: {
    width: '92%',
    maxWidth: 648,
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  levelCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 154,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.primaryDark,
    ...shadows.md,
  },
  levelGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -54,
    top: -88,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(69, 220, 203, 0.12)',
  },
  levelBadge: {
    width: 92,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeInner: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryContainer,
    borderWidth: 3,
    borderColor: colors.actionAmber,
    transform: [{ rotate: '45deg' }],
    ...shadows.glow,
  },
  levelLabelPill: {
    position: 'absolute',
    bottom: 0,
    minWidth: 68,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.actionAmber,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  levelBadgeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  levelLabel: { color: colors.textOnAccent, fontFamily: 'Quicksand-Bold' },
  levelNumber: {
    color: colors.actionAmberDark,
    fontSize: 34,
    lineHeight: 38,
  },
  levelCopy: { flex: 1, gap: spacing.xs, zIndex: 1 },
  rankEyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rankEyebrowText: { color: colors.actionAmber },
  totalXp: { color: '#FFFFFF', fontSize: 21, lineHeight: 27 },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  levelProgressLabel: { color: '#C9E9E4', flexShrink: 1 },
  levelProgressValue: { color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold' },
  nextUnlock: { color: '#C9E9E4', marginTop: spacing.xs },
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
  progressTrackOnDark: {
    height: 10,
    backgroundColor: 'rgba(8, 48, 43, 0.68)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  progressFillAmber: { backgroundColor: colors.actionAmber },
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
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 150,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  masteryAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  masteryStats: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  cosmeticSection: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  cosmeticGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cosmeticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cosmeticCard: {
    flexGrow: 1,
    flexBasis: '29%',
    maxWidth: 148,
    minWidth: 96,
    minHeight: 126,
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
  lockedPreview: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tablePreview: {
    position: 'relative',
    overflow: 'hidden',
    width: 58,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  tablePreviewLine: { position: 'absolute', opacity: 0.52 },
  tablePreviewVertical: { width: 2, top: 0, bottom: 0, left: 27 },
  tablePreviewHorizontal: { height: 2, left: 0, right: 0, top: 19 },
  tablePreviewPiece: { position: 'absolute', width: 9, height: 9, borderRadius: radius.pill },
  tablePieceOne: { left: 10, top: 7 },
  tablePieceTwo: { right: 10, bottom: 6 },
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
