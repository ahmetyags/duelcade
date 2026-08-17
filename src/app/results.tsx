import React, { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, MessageSquareText, RotateCw, Trophy } from 'lucide-react-native';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ThemedText } from '@/components/ui/ThemedText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { leaveRoom, voteRematch } from '@/services/NetworkBridge';
import {
  clearSinglePlayerSession,
  FIRST_DUEL_ROOM_CODE,
} from '@/services/SinglePlayerService';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';
import { progressionQueryKey } from '@/services/ProgressionQuery';
import { useAuthStore } from '@/store/authStore';
import { TURN_RESULTS, TURN_UI } from '@/src/i18n/turnGames';
import {
  durationBucket,
  trackAnalyticsEvent,
  type AnalyticsProperties,
} from '@/services/AnalyticsService';

export default function ResultsScreen() {
  const { language, t } = useTranslation();
  const copy = TURN_RESULTS[language];
  const turnUi = TURN_UI[language];
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const result = useGameStore((state) => state.result);
  const room = useRoomStore((state) => state.room);
  const localPlayerId = useRoomStore((state) => state.localPlayerId);
  const rematchVotes = useRoomStore((state) => state.rematchVotes);
  const singlePlayer = room?.sessionMode === 'single_player';
  const firstDuel = room?.code === FIRST_DUEL_ROOM_CODE;
  const localRequestedRematch = !!localPlayerId && rematchVotes.includes(localPlayerId);
  const opponentRequestedRematch = rematchVotes.some((playerId) => playerId !== localPlayerId);
  const resultTracked = useRef(false);

  useEffect(() => {
    if (result && firstDuel && result.forfeitedPlayerId !== localPlayerId) {
      useSettingsStore.getState().completeFirstDuel();
    }
  }, [firstDuel, localPlayerId, result]);

  useEffect(() => {
    if (!result || !room || resultTracked.current) return;
    resultTracked.current = true;
    const localForfeited = result.forfeitedPlayerId === localPlayerId;
    const playMode: AnalyticsProperties['playMode'] = firstDuel
      ? 'tutorial'
      : singlePlayer
        ? 'solo'
        : 'online';
    const properties = {
      playMode,
      difficulty: room.difficulty === 'final' ? 'hard' as const : room.difficulty,
      result: localForfeited
        ? 'abandoned' as const
        : result.winnerPlayerId === null
          ? 'draw' as const
          : result.winnerPlayerId === localPlayerId
            ? 'win' as const
            : 'loss' as const,
      durationBucket: durationBucket(result.completionTimeMs),
      durationMs: result.completionTimeMs,
      roundCount: result.totalPuzzles,
    };
    trackAnalyticsEvent(
      localForfeited ? 'match_abandoned' : 'match_completed',
      properties,
    );
    if (firstDuel && !localForfeited) {
      trackAnalyticsEvent('tutorial_completed', properties);
    }
  }, [firstDuel, localPlayerId, result, room, singlePlayer]);

  useEffect(() => {
    if (!result || singlePlayer || !user?.serverBacked) return;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: progressionQueryKey(user.id),
      });
      void queryClient.invalidateQueries({
        queryKey: ['match-history', user.id],
      });
    }, 750);
    return () => clearTimeout(timer);
  }, [queryClient, result, singlePlayer, user]);

  useEffect(() => {
    if (!singlePlayer && room?.status === 'waiting') router.replace('/lobby');
  }, [room?.status, router, singlePlayer]);

  const handleHome = useCallback(() => {
    if (singlePlayer) {
      clearSinglePlayerSession();
      useRoomStore.getState().clearRoom();
      useGameStore.getState().resetGame();
    } else {
      leaveRoom();
    }
    router.replace('/');
  }, [router, singlePlayer]);

  if (!result || !room) {
    return (
      <View style={styles.loading}>
        <ThemedText color="muted">{copy.loading}</ThemedText>
      </View>
    );
  }

  const winner = result.winnerPlayerId
    ? room.players.find((player) => player.id === result.winnerPlayerId)
    : null;
  const localWon = result.winnerPlayerId === localPlayerId;
  const forfeitedPlayer = result.forfeitedPlayerId
    ? room.players.find((player) => player.id === result.forfeitedPlayerId)
    : null;
  const localForfeited = result.forfeitedPlayerId === localPlayerId;
  const rematchLabel = localRequestedRematch
    ? copy.waiting
    : opponentRequestedRematch
      ? copy.acceptRematch
      : copy.playAgain;
  const title = localForfeited
    ? copy.leftTitle
    : result.failReason === 'player_left'
    ? copy.interruptedTitle
    : winner ? (localWon ? copy.wonTitle : copy.winnerTitle(winner.displayName)) : copy.drawTitle;
  const summary = forfeitedPlayer
    ? localForfeited
      ? singlePlayer
        ? copy.botWon
        : copy.opponentWon
      : copy.playerLeft(forfeitedPlayer.displayName)
    : singlePlayer
      ? copy.soloComplete(result.totalPuzzles)
      : copy.sharedComplete(result.totalPuzzles);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <View style={styles.content}>
        <View style={[styles.trophy, localWon && styles.trophyWon]}>
          <Trophy size={46} color={winner ? colors.amber : colors.cyan} />
        </View>
        <ThemedText variant="title" style={styles.title}>{title}</ThemedText>
        <ThemedText color="muted" style={styles.summary}>{summary}</ThemedText>

        <View style={styles.scoreboard}>
          {room.players.map((player, index) => {
            const score = result.playerScores?.[player.id] ?? 0;
            const isWinner = player.id === result.winnerPlayerId;
            const color = index === 0 ? colors.cyan : colors.amber;
            return (
              <View key={player.id} style={[styles.playerResult, isWinner && { borderColor: color }]}>
                <PlayerAvatar
                  avatarId={player.avatarId}
                  size={48}
                  color={color}
                  backgroundColor={`${color}18`}
                  borderColor={color}
                />
                <ThemedText variant="body" numberOfLines={1}>{player.displayName}</ThemedText>
                <ThemedText variant="monoLarge" style={{ color }}>{score}</ThemedText>
                <ThemedText variant="caption" color="muted">{turnUi.roundScore}</ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rematchLabel}
            disabled={localRequestedRematch}
            onPress={() => {
              if (singlePlayer) {
                clearSinglePlayerSession();
                useRoomStore.getState().clearRoom();
                useGameStore.getState().resetGame();
                router.replace('/solo');
                return;
              }
              trackAnalyticsEvent('rematch_requested', {
                playMode: singlePlayer ? 'solo' : 'online',
                difficulty: room.difficulty === 'final' ? 'hard' : room.difficulty,
                roundCount: result.totalPuzzles,
              });
              voteRematch(true);
            }}
            style={[
              styles.action,
              styles.primaryAction,
              localRequestedRematch && styles.disabled,
            ]}
          >
            <RotateCw size={21} color={colors.textOnPrimary} />
            <ThemedText variant="label" color="onPrimary">
              {rematchLabel}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('feedback.resultAction')}
            onPress={() => router.push({
              pathname: '/feedback',
              params: { source: 'results' },
            })}
            style={styles.action}
          >
            <MessageSquareText size={21} color={colors.primaryDark} />
            <ThemedText variant="label">{t('feedback.resultAction')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.home}
            onPress={handleHome}
            style={styles.action}
          >
            <Home size={21} color={colors.textPrimary} />
            <ThemedText variant="label">{copy.home}</ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundDeep },
  content: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  trophy: { width: 94, height: 94, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  trophyWon: { borderColor: colors.amber, backgroundColor: colors.secondaryContainer },
  title: { textAlign: 'center', fontSize: 34 },
  summary: { textAlign: 'center' },
  scoreboard: { width: '100%', flexDirection: 'row', gap: spacing.md, marginVertical: spacing.xl },
  playerResult: { flex: 1, minWidth: 0, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceDark, alignItems: 'center', gap: spacing.sm },
  actions: { width: '100%', gap: spacing.sm },
  action: { minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryAction: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.55 },
});
