/** Duelcade home screen — shared tabletop match entry point. */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogIn,
  Gamepad2,
  History,
  Plus,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { PowerCoreMark } from '@/components/ui/PowerCoreMark';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { initNetwork, resumeRoom } from '@/services/NetworkBridge';
import { getErrorMessage } from '@/services/ErrorMessages';
import { networkService } from '@/services/NetworkService';
import { startSinglePlayer } from '@/services/SinglePlayerService';
import { triggerHaptic } from '@/services/HapticsService';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { user, isAuthenticated, signInAsGuest } = useAuthStore();
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const avatarId = useSettingsStore((s) => s.avatarId);
  const lastRoomCode = useSettingsStore((s) => s.lastRoomCode);
  const lastRoomPlayerId = useSettingsStore((s) => s.lastRoomPlayerId);
  const lastRoomReconnectToken = useSettingsStore((s) => s.lastRoomReconnectToken);
  const hasCompletedFirstDuel = useSettingsStore((s) => s.hasCompletedFirstDuel);
  const setPhase = useGameStore((s) => s.setPhase);
  const activeRoom = useRoomStore((s) => s.room);
  const error = useRoomStore((s) => s.error);
  const isLoading = useRoomStore((s) => s.isLoading);

  useEffect(() => {
    initNetwork();
    if (!useRoomStore.getState().room) setPhase('home');
  }, [setPhase]);

  const ensureAuth = async (): Promise<void> => {
    if (!isAuthenticated) {
      const name = displayName || t('common.adventurerFallback', { number: Math.floor(Math.random() * 999) });
      await signInAsGuest(name);
      if (!displayName) setDisplayName(name);
    }
  };

  const handleCreate = async () => {
    triggerHaptic('light');
    await ensureAuth();
    router.push('/create');
  };

  const handleSolo = async () => {
    triggerHaptic('light');
    await ensureAuth();
    router.push('/solo');
  };

  const handleFirstDuel = async () => {
    triggerHaptic('medium');
    await ensureAuth();
    const name = useSettingsStore.getState().displayName
      || t('common.playerFallback', { number: 1 });
    startSinglePlayer(name, 'easy', 2, { tutorial: true });
    router.replace('/game');
  };

  const handleJoin = async () => {
    triggerHaptic('light');
    await ensureAuth();
    router.push('/join');
  };

  const openRoom = (status: NonNullable<typeof activeRoom>['status']) => {
    if (status === 'playing') {
      router.push('/game');
    } else if (status === 'completed' || status === 'failed') {
      router.push('/results');
    } else {
      router.push('/lobby');
    }
  };

  const handleContinue = async () => {
    if (!lastRoomCode) return;
    triggerHaptic('medium');
    await ensureAuth();

    const connectionState = networkService.getConnectionState();
    if (
      activeRoom?.code === lastRoomCode &&
      (connectionState === 'connected' || connectionState === 'reconnecting')
    ) {
      openRoom(activeRoom.status);
      return;
    }

    if (!lastRoomPlayerId || !lastRoomReconnectToken) {
      router.push({ pathname: '/join', params: { code: lastRoomCode } });
      return;
    }

    const roomReady = new Promise<boolean>((resolve) => {
      let settled = false;
      const unsubscribe = useRoomStore.subscribe((state) => {
        if (!settled && state.room?.code === lastRoomCode) {
          settled = true;
          unsubscribe();
          resolve(true);
        } else if (!settled && state.error) {
          settled = true;
          unsubscribe();
          resolve(false);
        }
      });
      setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(false);
      }, 5000);
    });

    const reconnected = await resumeRoom(
      lastRoomCode,
      lastRoomPlayerId,
      lastRoomReconnectToken,
    );
    if (!reconnected || !await roomReady) return;
    const room = useRoomStore.getState().room;
    if (room) openRoom(room.status);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.worldChip}>
            <Sparkles size={15} color={colors.primary} strokeWidth={2.5} />
            <ThemedText variant="label" color="operator">{t('home.coopAdventure')}</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <Settings size={20} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroMark}>
            <PowerCoreMark size={104} />
          </View>
          <View style={styles.titleRow}>
            <ThemedText variant="title" style={styles.title}>Duel</ThemedText>
            <ThemedText variant="title" style={styles.titleAccent}>cade</ThemedText>
          </View>
          <ThemedText variant="subtitle" color="secondary" style={styles.subtitle}>
            {t('home.subtitle')}
          </ThemedText>
          <View style={styles.featureLine}>
            <Gamepad2 size={16} color={colors.primaryDark} strokeWidth={2.2} />
            <ThemedText variant="caption" color="secondary">
              {t('home.turnDescription')}
            </ThemedText>
          </View>
        </View>

        {isAuthenticated && user && (
          <Panel variant="surface" style={styles.playerCard}>
            <PlayerAvatar avatarId={avatarId} size={42} />
            <View style={styles.playerCopy}>
              <ThemedText variant="body" style={styles.playerName}>
                {displayName || user.displayName}
              </ThemedText>
              <ThemedText variant="caption" color="muted">{t('home.ready')}</ThemedText>
            </View>
            <View style={styles.onlineDot} />
          </Panel>
        )}

        <View style={styles.actions}>
          {!hasCompletedFirstDuel && (
            <ThemedButton
              label={t('home.quickStart')}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Sparkles size={21} color={colors.textOnPrimary} strokeWidth={2.3} />}
              onPress={handleFirstDuel}
            />
          )}
          <ThemedButton
            label={t('home.singlePlayer')}
            variant={hasCompletedFirstDuel ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            icon={<UserRound size={21} color={colors.textOnPrimary} strokeWidth={2.3} />}
            onPress={handleSolo}
          />
          <ThemedButton
            label={t('home.create')}
            variant="secondary"
            size="lg"
            fullWidth
            style={styles.createButton}
            icon={<Plus size={21} color={colors.textPrimary} strokeWidth={2.3} />}
            onPress={handleCreate}
          />
          <ThemedButton
            label={t('home.join')}
            variant="secondary"
            size="lg"
            fullWidth
            icon={<LogIn size={21} color={colors.textPrimary} strokeWidth={2.3} />}
            onPress={handleJoin}
          />
          {lastRoomCode && (
            <ThemedButton
              label={t('home.continue', { code: lastRoomCode })}
              variant="ghost"
              size="md"
              fullWidth
              loading={isLoading}
              onPress={handleContinue}
            />
          )}
          {user?.serverBacked && (
            <ThemedButton
              label={t('home.history')}
              variant="ghost"
              size="md"
              fullWidth
              icon={<History size={19} color={colors.textPrimary} strokeWidth={2.2} />}
              onPress={() => router.push('/history')}
            />
          )}
          {error && (
            <ThemedText variant="caption" color="error" style={styles.continueError}>
              {getErrorMessage(error, language)}
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    boxSizing: 'border-box',
    paddingHorizontal: spacing.lg,
    paddingTop: 21,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  worldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  hero: {
    alignItems: 'center',
    marginTop: 52,
    paddingVertical: spacing.sm,
  },
  heroMark: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  title: {
    fontSize: 34,
    lineHeight: 39,
    color: colors.textPrimary,
  },
  titleAccent: {
    fontSize: 34,
    lineHeight: 39,
    color: colors.amber,
  },
  subtitle: {
    maxWidth: 280,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
  },
  featureLine: {
    marginTop: spacing.sm,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryContainer,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderColor: colors.primaryContainer,
  },
  playerCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  continueError: {
    textAlign: 'center',
  },
  playerName: {
    fontFamily: 'Quicksand-SemiBold',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.emerald,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  actions: {
    gap: spacing.md,
  },
  createButton: {
    backgroundColor: 'rgb(217, 154, 74)',
  },
});
