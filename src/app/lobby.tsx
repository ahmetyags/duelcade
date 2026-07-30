/**
 * Lobby Screen — waiting room before game starts.
 * Per Bölüm 7.3: Player name, connection quality, ready state,
 * role preference, room code copy/share, host starts when both ready.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Share as RNShare } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Panel } from '@/components/ui/Panel';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ConnectionIndicator } from '@/components/ui/ConnectionIndicator';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';
import { setPlayerReady, leaveRoom } from '@/services/NetworkBridge';
import { triggerHaptic } from '@/services/HapticsService';
import { Clock3, Copy, Gauge, Share as ShareIcon, LogOut, Check, Users } from 'lucide-react-native';
import { useTranslation } from '@/src/i18n';
import { TURN_LOBBY } from '@/src/i18n/turnGames';

export default function LobbyScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const lobbyCopy = TURN_LOBBY[language];
  const room = useRoomStore((s) => s.room);
  const isHost = useRoomStore((s) => s.isHost);
  const roomCode = useRoomStore((s) => s.roomCode);
  const localPlayer = useRoomStore((s) => s.getLocalPlayer());
  const otherPlayer = useRoomStore((s) => s.getOtherPlayer());
  const allReady = useRoomStore((s) => s.allReady());
  const setPhase = useGameStore((s) => s.setPhase);
  const gamePhase = useGameStore((s) => s.phase);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room) {
      router.replace('/');
      return;
    }
    setPhase('lobby');

    // Auto-assign roomCode from room config if not set
    if (!useRoomStore.getState().roomCode && room.code) {
      useRoomStore.getState().setRoomCode(room.code);
    }
  }, [room, setPhase, router]);

  useEffect(() => {
    if (gamePhase === 'loading_level' || gamePhase === 'playing') {
      router.replace('/game');
    }
  }, [gamePhase, router]);

  const handleReady = useCallback(() => {
    triggerHaptic('medium');
    setPlayerReady(!localPlayer?.isReady);
  }, [localPlayer]);

  const handleCopyCode = useCallback(async () => {
    triggerHaptic('light');
    const code = room?.code ?? roomCode;
    if (!code) return;
    const copiedSuccessfully = await Clipboard.setStringAsync(code);
    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [room, roomCode]);

  const handleShare = useCallback(async () => {
    triggerHaptic('light');
    try {
      const code = room?.code ?? roomCode ?? '';
      const inviteUrl = Linking.createURL('/join', { queryParams: { code } });
      await RNShare.share({
        message: t('lobby.shareMessage', { code, url: inviteUrl }),
      });
    } catch {
      // Share cancelled
    }
  }, [room, roomCode, t]);

  const handleLeave = useCallback(() => {
    triggerHaptic('warning');
    leaveRoom();
    router.replace('/');
  }, [router]);

  if (!room) return null;

  const displayCode = room.code ?? roomCode ?? '------';
  const bothPlayersPresent = room.players.length === 2;
  const canStart = isHost && bothPlayersPresent && allReady;
  const waitingForRematch = room.status === 'completed' || room.status === 'failed';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleLeave} style={styles.backBtn}>
          <LogOut size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <ThemedText variant="subtitle">{t('lobby.title')}</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      {/* Room code card */}
      <View style={styles.content}>
        <Panel variant="elevated" style={styles.codeCard}>
          <ThemedText variant="label" color="muted" style={{ textAlign: 'center', letterSpacing: 2 }}>
            {t('lobby.roomCode')}
          </ThemedText>
          <View style={styles.codeRow}>
            {displayCode.split('').map((char, i) => (
              <View key={i} style={styles.codeCharBox}>
                <ThemedText variant="monoLarge" style={{ color: colors.primary, fontSize: 28 }}>
                  {char}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.codeActions}>
            <Pressable onPress={handleCopyCode} style={styles.codeActionBtn}>
              {copied ? (
                <Check size={16} color={colors.success} strokeWidth={2.5} />
              ) : (
                <Copy size={16} color={colors.textSecondary} strokeWidth={2} />
              )}
              <ThemedText variant="label" color="secondary" style={{ marginLeft: spacing.xs }}>
                {copied ? t('lobby.copied') : t('lobby.copy')}
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleShare} style={styles.codeActionBtn}>
              <ShareIcon size={16} color={colors.primary} strokeWidth={2} />
              <ThemedText variant="label" color="primary" style={{ marginLeft: spacing.xs }}>
                {t('lobby.share')}
              </ThemedText>
            </Pressable>
          </View>
        </Panel>

        <View style={styles.matchConfig}>
          <View style={styles.configChip}>
            <Gauge size={16} color={colors.primaryDark} />
            <ThemedText variant="caption">
              {room.difficulty === 'easy'
                ? t('create.easy')
                : room.difficulty === 'medium' ? t('create.medium') : t('create.hard')}
            </ThemedText>
          </View>
          <View style={styles.configChip}>
            <Clock3 size={16} color={colors.amber} />
            <ThemedText variant="caption">
              {room.matchDurationMinutes} {t('create.minutes').toLocaleLowerCase()}
            </ThemedText>
          </View>
        </View>

        {/* Players list */}
        <View style={styles.playersSection}>
          <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
            {t('lobby.players', { count: room.players.length })}
          </ThemedText>
          <View style={styles.playersList}>
            {/* Local player */}
            {localPlayer && (
              <PlayerCard
                name={localPlayer.displayName}
                avatarId={localPlayer.avatarId}
                isHost={localPlayer.isHost}
                isReady={localPlayer.isReady}
                isLocal
                seatLabel={lobbyCopy.playerOne}
              />
            )}
            {/* Other player or waiting slot */}
            {otherPlayer ? (
              <PlayerCard
                name={otherPlayer.displayName}
                avatarId={otherPlayer.avatarId}
                isHost={otherPlayer.isHost}
                isReady={otherPlayer.isReady}
                isLocal={false}
                seatLabel={lobbyCopy.playerTwo}
              />
            ) : (
              <Panel variant="muted" style={styles.waitingSlot}>
                <Users size={20} color={colors.textMuted} strokeWidth={2} />
                <ThemedText variant="caption" color="muted">
                  {t('lobby.waitingPartner')}
                </ThemedText>
              </Panel>
            )}
          </View>
        </View>

        {/* Connection quality */}
        <View style={styles.connectionRow}>
          <ConnectionIndicator showLabel />
          <ThemedText variant="caption" color="muted">
            {bothPlayersPresent ? t('lobby.bothConnected') : t('lobby.awaitingConnection')}
          </ThemedText>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!bothPlayersPresent && (
            <ThemedText variant="caption" color="muted" style={{ textAlign: 'center' }}>
              {t('lobby.shareHelp')}
            </ThemedText>
          )}
          <ThemedButton
            label={waitingForRematch
              ? t('lobby.waitingRematch')
              : localPlayer?.isReady
                ? t('lobby.notReadyAction')
                : t('lobby.readyAction')}
            variant={localPlayer?.isReady ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            disabled={!bothPlayersPresent || waitingForRematch}
            loading={false}
            onPress={handleReady}
            icon={localPlayer?.isReady ? undefined : <Check size={21} color={colors.textOnPrimary} strokeWidth={2.3} />}
          />
          {canStart && (
            <ThemedText variant="caption" color="success" style={{ textAlign: 'center' }}>
              {t('lobby.allReady')}
            </ThemedText>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Player Card ───────────────────────────────────────────────────

function PlayerCard({ name, avatarId, isHost, isReady, isLocal, seatLabel }: {
  name: string;
  avatarId: import('@/types/profile').PlayerAvatarId;
  isHost: boolean;
  isReady: boolean;
  isLocal: boolean;
  seatLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <Panel variant="surface" style={styles.playerCard}>
      <View style={styles.playerCardLeft}>
        <PlayerAvatar
          avatarId={avatarId}
          size={38}
          color={isLocal ? colors.primaryDark : colors.secondaryDark}
          backgroundColor={isLocal ? colors.primaryContainer : colors.secondaryContainer}
          borderColor={isLocal ? colors.primary : colors.explorer}
        />
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <ThemedText variant="body" style={{ fontWeight: '600' }}>{name}</ThemedText>
            {isHost && (
              <View style={styles.hostBadge}>
                <ThemedText variant="label" color="accent" style={{ fontSize: 9 }}>{t('lobby.host')}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText variant="label" color="muted" style={{ textTransform: 'capitalize' }}>
            {isLocal ? t('lobby.you') : t('lobby.partner')} · {seatLabel}
          </ThemedText>
        </View>
      </View>
      <View style={[
        styles.readyBadge,
        { backgroundColor: isReady ? `${colors.success}20` : `${colors.textMuted}20`, borderColor: isReady ? colors.success : colors.border },
      ]}>
        <ThemedText variant="label" style={{ color: isReady ? colors.success : colors.textMuted, fontSize: 10 }}>
          {isReady ? t('lobby.ready') : t('lobby.notReady')}
        </ThemedText>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
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
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xl,
    gap: spacing.md,
  },
  codeCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  codeRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  codeCharBox: {
    flex: 1,
    minWidth: 32,
    maxWidth: 44,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  matchConfig: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  configChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  codeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  playersSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1.5,
  },
  playersList: {
    gap: spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  playerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hostBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: `${colors.accent}20`,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  readyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  waitingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderStyle: 'dashed' as never,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
