import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Award,
  CalendarDays,
  CircleHelp,
  Medal,
  LogOut,
  RotateCw,
  ScrollText,
  Trophy,
  UserRound,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  fetchMatchHistory,
  fetchLeaderboard,
  fetchProfile,
  type CompetitiveSummary,
  type LeaderboardSummary,
  type MatchHistoryItem,
  type LeaderboardEntry,
  type ProfileSummary,
} from '@/services/AuthApi';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/src/i18n';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { isPlayerAvatarId, isPlayerFrameId } from '@/types/profile';

const MOCK_LEADERBOARD: LeaderboardSummary = {
  globalRank: null,
  totalScore: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
};

const MOCK_COMPETITIVE: CompetitiveSummary = {
  seasonRating: 1480,
  league: 'Silver',
  season: 'Season 1',
  results: { wins: 0, losses: 0, draws: 0 },
  winRate: 0,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const { language } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const getValidAccessToken = useAuthStore((state) => state.getValidAccessToken);
  const signOut = useAuthStore((state) => state.signOut);
  const avatarId = useSettingsStore((state) => state.avatarId);
  const frameId = useSettingsStore((state) => state.frameId);
  const [rulesVisible, setRulesVisible] = React.useState(false);
  const copy = language === 'tr' ? trCopy : enCopy;

  const profile = useQuery<ProfileSummary>({
    queryKey: ['profile', user?.id],
    enabled: user?.serverBacked === true,
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('AUTH_UNAVAILABLE');
      return fetchProfile(token);
    },
  });

  const matches = useQuery({
    queryKey: ['profile-matches', user?.id],
    enabled: user?.serverBacked === true,
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('AUTH_UNAVAILABLE');
      return fetchMatchHistory(token, 8);
    },
  });

  const ranking = useQuery({
    queryKey: ['leaderboard', user?.id],
    enabled: user?.serverBacked === true,
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('AUTH_UNAVAILABLE');
      return fetchLeaderboard(token);
    },
  });

  const player = profile.data?.player ?? user;
  const leaderboard = profile.data?.leaderboard ?? MOCK_LEADERBOARD;
  const competitive = profile.data?.competitive ?? MOCK_COMPETITIVE;
  const dateFormat = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'medium',
  });

  if (!user?.serverBacked || !player) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MagicBackdrop />
        <Header
          title={copy.title}
          subtitle={copy.subtitle}
          backLabel={language === 'tr' ? 'Geri' : 'Back'}
          onBack={() => router.back()}
        />
        <View style={styles.centerState}>
          <UserRound size={40} color={colors.textMuted} />
          <ThemedText color="muted" style={styles.centerCopy}>{copy.offline}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <Header
        title={copy.title}
        subtitle={copy.subtitle}
        backLabel={language === 'tr' ? 'Geri' : 'Back'}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, viewportWidth < 420 && styles.profileCardCompact]}>
          <PlayerAvatar avatarId={avatarId} frameId={frameId} size={82} />
          <View style={styles.profileCopy}>
            <ThemedText variant="title" style={styles.playerName}>
              {player.displayName}
            </ThemedText>
            <ThemedText variant="caption" style={styles.profileMeta} selectable>
              ID {player.id}
            </ThemedText>
            <View style={styles.inlineMeta}>
              <CalendarDays size={15} color="#C9E9E4" />
              <ThemedText variant="caption" style={styles.profileMeta}>
                {copy.created} {dateFormat.format(new Date(player.createdAt))}
              </ThemedText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.signOut}
            onPress={() => {
              void signOut();
              router.replace('/');
            }}
            style={({ pressed }) => [
              styles.signOutButton,
              viewportWidth < 420 && styles.signOutButtonCompact,
              pressed && styles.signOutPressed,
            ]}
          >
            <LogOut size={18} color={colors.error} />
            <ThemedText variant="label" style={styles.signOutLabel} numberOfLines={1}>
              {copy.signOut}
            </ThemedText>
          </Pressable>
        </View>

        {profile.isError && (
          <RetryCard copy={copy.profileError} onRetry={() => profile.refetch()} />
        )}

        <SectionCard icon={<Trophy size={21} color={colors.amber} />} title={copy.leaderboardTitle} featured>
          <View style={styles.statGrid}>
            <Stat label={copy.globalRank} value={leaderboard.globalRank ? `#${leaderboard.globalRank}` : '-'} />
            <Stat label={copy.totalScore} value={String(leaderboard.totalScore)} />
            <Stat label={copy.wins} value={String(leaderboard.wins)} tone="success" />
            <Stat label={copy.losses} value={String(leaderboard.losses)} tone="error" />
            <Stat label={copy.winRate} value={`${leaderboard.winRate}%`} />
          </View>
          <View style={styles.leaderboardList}>
            {ranking.isPending ? (
              <ThemedText color="muted">{copy.loadingLeaderboard}</ThemedText>
            ) : ranking.isError ? (
              <RetryCard compact copy={copy.leaderboardError} onRetry={() => ranking.refetch()} />
            ) : ranking.data.entries.length === 0 ? (
              <ThemedText color="muted">{copy.emptyLeaderboard}</ThemedText>
            ) : ranking.data.entries.slice(0, 20).map((entry) => (
              <LeaderboardRow
                key={entry.playerId}
                entry={entry}
                current={entry.playerId === user.id}
                copy={copy}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          icon={<Medal size={21} color={colors.primary} />}
          title={copy.competitiveTitle}
          action={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.openRules}
              accessibilityHint={copy.openRulesHint}
              onPress={() => setRulesVisible(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}
            >
              <CircleHelp size={21} color={colors.primaryDark} />
            </Pressable>
          )}
        >
          <View style={styles.competitiveTop}>
            <View>
              <ThemedText variant="caption" color="muted">{copy.seasonRating}</ThemedText>
              <ThemedText variant="monoLarge" color="operator">
                {competitive.seasonRating}
              </ThemedText>
            </View>
            <View style={styles.leagueBadge}>
              <Award size={18} color={colors.textOnAccent} />
              <ThemedText variant="label" style={styles.leagueText}>
                {competitive.league}
              </ThemedText>
            </View>
          </View>
          <View style={styles.statGrid}>
            <Stat label={copy.season} value={competitive.season} />
            <Stat label={copy.wins} value={String(competitive.results.wins)} tone="success" />
            <Stat label={copy.losses} value={String(competitive.results.losses)} tone="error" />
            <Stat label={copy.draws} value={String(competitive.results.draws)} />
            <Stat label={copy.winRate} value={`${competitive.winRate}%`} />
          </View>
        </SectionCard>

        <SectionCard icon={<ScrollText size={21} color={colors.primary} />} title={copy.recentMatchesTitle}>
          {matches.isPending ? (
            <ThemedText color="muted">{copy.loadingMatches}</ThemedText>
          ) : matches.isError ? (
            <RetryCard compact copy={copy.matchError} onRetry={() => matches.refetch()} />
          ) : matches.data.matches.length === 0 ? (
            <ThemedText color="muted">{copy.emptyMatches}</ThemedText>
          ) : (
            <View style={styles.matchList}>
              {matches.data.matches.map((match) => (
                <MatchRow key={match.id} match={match} userId={user.id} language={language} copy={copy} />
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>
      <RulesModal
        visible={rulesVisible}
        copy={copy}
        onClose={() => setRulesVisible(false)}
      />
    </SafeAreaView>
  );
}

function LeaderboardRow({
  entry,
  current,
  copy,
}: {
  entry: LeaderboardEntry;
  current: boolean;
  copy: ProfileCopy;
}) {
  const avatar = isPlayerAvatarId(entry.avatarId) ? entry.avatarId : 'sparkles';
  const frame = isPlayerFrameId(entry.frameId) ? entry.frameId : 'default';
  const podium = entry.rank <= 3;
  return (
    <View style={[styles.leaderboardRow, current && styles.leaderboardRowCurrent]}>
      <View style={[styles.rankBadge, podium && styles.rankBadgePodium]}>
        <ThemedText variant="label" style={[styles.rank, podium && styles.rankPodium]}>
          {entry.rank}
        </ThemedText>
      </View>
      <PlayerAvatar avatarId={avatar} frameId={frame} size={40} />
      <View style={styles.leaderboardPlayer}>
        <View style={styles.leaderboardNameRow}>
          <ThemedText variant="label" numberOfLines={1} style={styles.leaderboardName}>
            {entry.displayName}
          </ThemedText>
          {current && <View style={styles.youDot} />}
        </View>
        <ThemedText variant="caption" color="muted">
          {entry.wins}{copy.winShort} · {entry.losses}{copy.lossShort} · %{entry.winRate}
        </ThemedText>
      </View>
      <View style={styles.scorePill}>
        <ThemedText variant="label" color="operator">{entry.totalScore}</ThemedText>
        <ThemedText variant="caption" color="muted">{copy.pointsShort}</ThemedText>
      </View>
    </View>
  );
}

function RulesModal({
  visible,
  copy,
  onClose,
}: {
  visible: boolean;
  copy: ProfileCopy;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalLayer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.closeRules}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.rulesModal}>
          <View style={styles.rulesModalHeader}>
            <View style={styles.rulesModalIcon}>
              <Medal size={23} color={colors.actionAmber} />
            </View>
            <View style={styles.rulesModalCopy}>
              <ThemedText variant="subtitle" style={styles.rulesTitle}>{copy.rulesTitle}</ThemedText>
              <ThemedText variant="caption" style={styles.rulesSubtitle}>{copy.rulesSubtitle}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.closeRules}
              onPress={onClose}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <X size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.rulesScroll}
            contentContainerStyle={styles.rulesList}
            showsVerticalScrollIndicator={false}
          >
            {copy.rules.map((rule, index) => (
              <View key={rule.title} style={styles.ruleRow}>
                <View style={styles.ruleNumber}>
                  <ThemedText variant="caption" style={styles.ruleNumberText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.ruleCopy}>
                  <ThemedText variant="label">{rule.title}</ThemedText>
                  <ThemedText variant="caption" color="secondary">{rule.body}</ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Header({
  title,
  subtitle,
  backLabel,
  onBack,
}: {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      backLabel={backLabel}
      onBack={onBack}
      trailing={<UserRound size={24} color={colors.primary} />}
      maxWidth={728}
    />
  );
}

function SectionCard({
  icon,
  title,
  action,
  featured = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          {icon}
          <ThemedText variant="subtitle" style={styles.cardTitle}>{title}</ThemedText>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'error';
}) {
  return (
    <View style={styles.stat}>
      <ThemedText variant="caption" color="muted">{label}</ThemedText>
      <ThemedText
        variant="subtitle"
        style={[
          styles.statValue,
          tone === 'success' && { color: colors.success },
          tone === 'error' && { color: colors.error },
        ]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function MatchRow({
  match,
  userId,
  language,
  copy,
}: {
  match: MatchHistoryItem;
  userId: string;
  language: 'tr' | 'en';
  copy: ProfileCopy;
}) {
  const outcome = match.winnerPlayerId === null
    ? 'Draw'
    : match.winnerPlayerId === userId
      ? 'Win'
      : 'Lose';
  const dateFormat = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'short',
  });
  const durationMinutes = Math.max(1, Math.round((match.finishedAt - match.startedAt) / 60_000));
  return (
    <View style={styles.matchRow}>
      <View style={styles.matchMain}>
        <ThemedText variant="label">{match.opponentDisplayName}</ThemedText>
        <ThemedText variant="caption" color="muted">
          {dateFormat.format(new Date(match.finishedAt))} · {durationMinutes} {copy.minuteShort}
        </ThemedText>
      </View>
      <View style={styles.matchResult}>
        <ThemedText
          variant="label"
          style={[
            outcome === 'Win' && { color: colors.success },
            outcome === 'Lose' && { color: colors.error },
          ]}
        >
          {outcome === 'Win' ? copy.matchWin : outcome === 'Lose' ? copy.matchLoss : copy.matchDraw}
        </ThemedText>
        <ThemedText variant="caption" color="operator">+{match.xpEarned}</ThemedText>
      </View>
    </View>
  );
}

function RetryCard({
  copy,
  onRetry,
  compact = false,
}: {
  copy: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.retryCard, compact && styles.retryCardCompact]}>
      <ThemedText color="muted" style={styles.centerCopy}>{copy}</ThemedText>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <RotateCw size={17} color={colors.primary} />
        <ThemedText variant="label" color="operator">Retry</ThemedText>
      </Pressable>
    </View>
  );
}

type ProfileCopy = {
  title: string;
  subtitle: string;
  offline: string;
  created: string;
  profileError: string;
  leaderboardTitle: string;
  competitiveTitle: string;
  recentMatchesTitle: string;
  globalRank: string;
  totalScore: string;
  wins: string;
  losses: string;
  winRate: string;
  season: string;
  seasonRating: string;
  draws: string;
  winShort: string;
  lossShort: string;
  pointsShort: string;
  minuteShort: string;
  matchWin: string;
  matchLoss: string;
  matchDraw: string;
  loadingMatches: string;
  matchError: string;
  emptyMatches: string;
  loadingLeaderboard: string;
  leaderboardError: string;
  emptyLeaderboard: string;
  signOut: string;
  openRules: string;
  openRulesHint: string;
  closeRules: string;
  rulesTitle: string;
  rulesSubtitle: string;
  rules: { title: string; body: string }[];
};

const enCopy: ProfileCopy = {
  title: 'Profile',
  subtitle: 'Player identity, rank, and recent matches',
  offline: 'Create a profile from the home screen to sync this page.',
  created: 'Created',
  profileError: 'Profile data could not be loaded. Showing placeholders.',
  leaderboardTitle: 'Leaderboard',
  competitiveTitle: 'Competitive',
  recentMatchesTitle: 'Recent Matches',
  globalRank: 'Global Rank',
  totalScore: 'Total Score',
  wins: 'Wins',
  losses: 'Losses',
  winRate: 'Win Rate',
  season: 'Season',
  seasonRating: 'Season Rating',
  draws: 'Draws',
  winShort: 'W',
  lossShort: 'L',
  pointsShort: 'PTS',
  minuteShort: 'min',
  matchWin: 'Win',
  matchLoss: 'Loss',
  matchDraw: 'Draw',
  loadingMatches: 'Loading matches...',
  matchError: 'Recent matches could not be loaded.',
  emptyMatches: 'Finish an online duel to start your match history.',
  loadingLeaderboard: 'Loading global ranking...',
  leaderboardError: 'The global ranking could not be loaded.',
  emptyLeaderboard: 'The first ranked players will appear here.',
  signOut: 'Sign out',
  openRules: 'Competitive rules',
  openRulesHint: 'Opens the competitive rules dialog',
  closeRules: 'Close competitive rules',
  rulesTitle: 'Competitive Rules',
  rulesSubtitle: 'How seasons, leagues, and verified scores work',
  rules: [
    { title: 'Season Rating', body: 'Players gain and lose rating throughout a season.' },
    { title: 'Leagues', body: 'Players promote through leagues based on their rating.' },
    { title: 'Global Ranking', body: 'All players are ranked by competitive points.' },
    { title: 'Draw Rules', body: 'Draws change season rating according to the configured rules.' },
    { title: 'Anti Cheat', body: 'Scores are verified by the server. Client scores are not trusted, and suspicious scores are not added to the leaderboard before validation.' },
  ],
};

const trCopy: ProfileCopy = {
  title: 'Profil',
  subtitle: 'Oyuncu kimliği, sıralama ve son maçlar',
  offline: 'Bu sayfayı eşitlemek için ana sayfadan profilini oluştur.',
  created: 'Oluşturuldu',
  profileError: 'Profil verisi yüklenemedi. Yer tutucular gösteriliyor.',
  leaderboardTitle: 'Liderlik Tablosu',
  competitiveTitle: 'Rekabetçi',
  recentMatchesTitle: 'Son Maçlar',
  globalRank: 'Global Sıralama',
  totalScore: 'Toplam Puan',
  wins: 'Kazanılan Maç',
  losses: 'Kaybedilen Maç',
  winRate: 'Kazanma Oranı',
  season: 'Sezon',
  seasonRating: 'Sezon Puanı',
  draws: 'Beraberlik',
  winShort: 'G',
  lossShort: 'M',
  pointsShort: 'PUAN',
  minuteShort: 'dk',
  matchWin: 'Galibiyet',
  matchLoss: 'Mağlubiyet',
  matchDraw: 'Berabere',
  loadingMatches: 'Maçlar yükleniyor...',
  matchError: 'Son maçlar yüklenemedi.',
  emptyMatches: 'Maç geçmişini başlatmak için çevrimiçi bir düello tamamla.',
  loadingLeaderboard: 'Global sıralama yükleniyor...',
  leaderboardError: 'Global sıralama yüklenemedi.',
  emptyLeaderboard: 'İlk sıralamalı oyuncular burada görünecek.',
  signOut: 'Çıkış yap',
  openRules: 'Rekabetçi kuralları',
  openRulesHint: 'Rekabetçi kurallar penceresini açar',
  closeRules: 'Rekabetçi kurallarını kapat',
  rulesTitle: 'Rekabetçi Kuralları',
  rulesSubtitle: 'Sezonların, liglerin ve doğrulanmış skorların işleyişi',
  rules: [
    { title: 'Sezonluk Puan Sistemi', body: 'Oyuncular sezon boyunca puan kazanır ve kaybeder.' },
    { title: 'Ligler', body: 'Oyuncular puanlarına göre liglere yükselir.' },
    { title: 'Global Sıralama', body: 'Tüm oyuncular puanlarına göre sıralanır.' },
    { title: 'Beraberlik Kuralları', body: 'Beraberlik durumunda sezon puanı değişimi belirlenen kurallara göre yapılır.' },
    { title: 'Anti Cheat', body: 'Skor sistemi sunucu tarafından doğrulanır. İstemci tarafındaki skorlar güvenilir kabul edilmez. Şüpheli skorlar doğrulanmadan leaderboard’a işlenmez.' },
  ],
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  content: {
    width: '92%',
    maxWidth: 728,
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  profileCard: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 126,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.primaryDark,
    ...shadows.md,
  },
  profileCopy: { flex: 1, gap: spacing.xs },
  profileCardCompact: { flexWrap: 'wrap', padding: spacing.lg },
  signOutButton: {
    minWidth: 104,
    minHeight: 42,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: '#FFF7F5',
    ...shadows.sm,
  },
  signOutPressed: { opacity: 0.82, transform: [{ translateY: 2 }] },
  signOutButtonCompact: { width: '100%', marginTop: spacing.xs },
  signOutLabel: { color: colors.error, letterSpacing: 0.2 },
  playerName: { color: '#FFFFFF' },
  profileMeta: { color: '#C9E9E4' },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  cardFeatured: { borderColor: colors.amber, backgroundColor: '#FFFCF6' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 20 },
  helpButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 118,
    minHeight: 76,
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  statValue: { fontSize: 20, lineHeight: 25 },
  leaderboardList: { gap: spacing.sm },
  leaderboardRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  leaderboardRowCurrent: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  rankBadge: { width: 30, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  rankBadgePodium: { backgroundColor: colors.secondaryContainer, borderColor: colors.actionAmber },
  rank: { color: colors.textSecondary },
  rankPodium: { color: colors.actionAmberDark },
  leaderboardPlayer: { flex: 1, minWidth: 0, gap: 2 },
  leaderboardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  leaderboardName: { flex: 1 },
  youDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.actionCyan },
  scorePill: { minWidth: 50, alignItems: 'flex-end' },
  competitiveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  leagueBadge: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.actionAmber,
    backgroundColor: colors.secondary,
  },
  leagueText: { color: colors.textOnAccent },
  modalLayer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(16, 27, 23, 0.62)',
  },
  rulesModal: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '82%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.background,
    ...shadows.lg,
  },
  rulesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.primaryDark,
  },
  rulesModalIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryContainer },
  rulesModalCopy: { flex: 1, gap: 2 },
  rulesTitle: { color: '#FFFFFF' },
  rulesSubtitle: { color: '#C9E9E4' },
  modalClose: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  rulesScroll: { flexGrow: 0 },
  rulesList: { padding: spacing.lg, gap: spacing.sm },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  ruleNumber: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryContainer, borderWidth: 1, borderColor: colors.actionAmber },
  ruleNumberText: { color: colors.actionAmberDark, fontFamily: 'Quicksand-Bold' },
  ruleCopy: { flex: 1, gap: spacing.xs },
  matchList: { gap: spacing.sm },
  matchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  matchMain: { flex: 1, gap: spacing.xs },
  matchResult: { alignItems: 'flex-end', gap: spacing.xs },
  centerState: {
    width: '92%',
    maxWidth: 728,
    alignSelf: 'center',
    marginTop: spacing.xl,
    minHeight: 220,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centerCopy: { textAlign: 'center' },
  retryCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
  },
  retryCardCompact: {
    padding: spacing.md,
  },
  retryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
