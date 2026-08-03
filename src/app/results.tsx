import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, RotateCw, Trophy } from 'lucide-react-native';

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
import { TURN_RESULTS, TURN_UI } from '@/src/i18n/turnGames';

export default function ResultsScreen() {
  const { language } = useTranslation();
  const copy = TURN_RESULTS[language];
  const turnUi = TURN_UI[language];
  const router = useRouter();
  const [rematchRequested, setRematchRequested] = useState(false);
  const result = useGameStore((state) => state.result);
  const room = useRoomStore((state) => state.room);
  const localPlayerId = useRoomStore((state) => state.localPlayerId);
  const singlePlayer = room?.sessionMode === 'single_player';
  const firstDuel = room?.code === FIRST_DUEL_ROOM_CODE;

  useEffect(() => {
    if (result && firstDuel && result.forfeitedPlayerId !== localPlayerId) {
      useSettingsStore.getState().completeFirstDuel();
    }
  }, [firstDuel, localPlayerId, result]);

  useEffect(() => {
    if (rematchRequested && room?.status === 'waiting') router.replace('/lobby');
  }, [rematchRequested, room?.status, router]);

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
            disabled={rematchRequested}
            onPress={() => {
              if (singlePlayer) {
                clearSinglePlayerSession();
                useRoomStore.getState().clearRoom();
                useGameStore.getState().resetGame();
                router.replace('/solo');
                return;
              }
              voteRematch(true);
              setRematchRequested(true);
            }}
            style={[styles.action, styles.primaryAction, rematchRequested && styles.disabled]}
          >
            <RotateCw size={21} color={colors.textOnPrimary} />
            <ThemedText variant="label" color="onPrimary">
              {rematchRequested ? copy.waiting : copy.playAgain}
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleHome} style={styles.action}>
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
