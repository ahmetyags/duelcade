import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { History, RotateCw, Swords } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchMatchHistory } from '@/services/AuthApi';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/src/i18n';
import { getTurnModeCopy } from '@/src/i18n/turnGames';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { TurnGameMode } from '@/types/turnGame';

const CORE_MODES = new Set<TurnGameMode>([
  'rune_grid',
  'memory_pairs',
  'circuit_claim',
  'neon_trail',
]);

export default function MatchHistoryScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const getValidAccessToken = useAuthStore((state) => state.getValidAccessToken);
  const history = useQuery({
    queryKey: ['match-history', user?.id],
    enabled: user?.serverBacked === true,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('AUTH_UNAVAILABLE');
      return fetchMatchHistory(accessToken, 30);
    },
  });
  const dateFormat = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <ScreenHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        backLabel={t('common.back')}
        onBack={() => router.back()}
        trailing={<History size={24} color={colors.primary} />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!user?.serverBacked ? (
          <EmptyState copy={t('history.offline')} />
        ) : history.isPending ? (
          <EmptyState copy={t('history.loading')} />
        ) : history.isError ? (
          <View style={styles.empty}>
            <ThemedText color="muted" style={styles.emptyCopy}>
              {t('history.error')}
            </ThemedText>
            <Pressable onPress={() => history.refetch()} style={styles.retry}>
              <RotateCw size={18} color={colors.primary} />
              <ThemedText variant="label" color="operator">{t('history.retry')}</ThemedText>
            </Pressable>
          </View>
        ) : history.data.matches.length === 0 ? (
          <EmptyState copy={t('history.empty')} />
        ) : (
          history.data.matches.map((match) => {
            const outcome = match.winnerPlayerId === null
              ? 'draw'
              : match.winnerPlayerId === user.id
                ? 'win'
                : 'loss';
            const modeTitles = [...new Set(match.modeOrder)]
              .filter((mode): mode is TurnGameMode => CORE_MODES.has(mode as TurnGameMode))
              .map((mode) => getTurnModeCopy(language, mode).title);
            return (
              <View key={match.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <ThemedText
                      variant="label"
                      style={[
                        styles.outcome,
                        outcome === 'win' && styles.win,
                        outcome === 'loss' && styles.loss,
                      ]}
                    >
                      {t(`history.${outcome}`)}
                    </ThemedText>
                    <ThemedText variant="body">{match.opponentDisplayName}</ThemedText>
                  </View>
                  <View style={styles.score}>
                    <ThemedText variant="monoLarge" color="operator">{match.score}</ThemedText>
                    <ThemedText color="muted">–</ThemedText>
                    <ThemedText variant="monoLarge">{match.opponentScore}</ThemedText>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Swords size={15} color={colors.textMuted} />
                  <ThemedText variant="caption" color="muted">
                    {t('history.rounds', { count: match.totalRounds })}
                  </ThemedText>
                  <ThemedText variant="caption" color="muted">·</ThemedText>
                  <ThemedText variant="caption" color="muted">
                    {dateFormat.format(new Date(match.finishedAt))}
                  </ThemedText>
                </View>
                {modeTitles.length > 0 && (
                  <ThemedText variant="caption" color="secondary">
                    {modeTitles.join(' · ')}
                  </ThemedText>
                )}
                <ThemedText variant="label" color="operator">
                  {t('history.xpEarned', { xp: match.xpEarned })}
                </ThemedText>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <View style={styles.empty}>
      <History size={38} color={colors.textMuted} />
      <ThemedText color="muted" style={styles.emptyCopy}>{copy}</ThemedText>
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
    gap: spacing.md,
  },
  empty: {
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
  emptyCopy: { textAlign: 'center' },
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
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  outcome: { color: colors.textMuted },
  win: { color: colors.success },
  loss: { color: colors.error },
  score: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
});
