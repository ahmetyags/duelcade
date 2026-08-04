/** Duelcade home screen — shared tabletop match entry point. */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  Bot,
  ChevronDown,
  Clock3,
  Gauge,
  LogIn,
  Play,
  Gamepad2,
  History,
  Plus,
  RefreshCw,
  Settings,
  WifiOff,
  X,
} from 'lucide-react-native';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { PowerCoreMark } from '@/components/ui/PowerCoreMark';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { DurationSlider } from '@/components/ui/DurationSlider';
import { PlayerProfileEditor } from '@/components/ui/PlayerProfileEditor';
import { createRoom, initNetwork, joinRoom, resumeRoom } from '@/services/NetworkBridge';
import { getErrorMessage } from '@/services/ErrorMessages';
import { networkService } from '@/services/NetworkService';
import { startSinglePlayer } from '@/services/SinglePlayerService';
import { useProgressionQuery } from '@/services/ProgressionQuery';
import { triggerHaptic } from '@/services/HapticsService';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';
import {
  isPlayerAvatarId,
  isPlayerFrameId,
  isTableThemeId,
} from '@/types/profile';
import type { PlayerProgression } from '@/services/AuthApi';
import { warmUpGameServer, type GameServerStatus } from '@/services/GameServerAvailability';
import type { Difficulty } from '@/types/game';

export default function HomeScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { user, isAuthenticated, signInAsGuest } = useAuthStore();
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const avatarId = useSettingsStore((s) => s.avatarId);
  const frameId = useSettingsStore((s) => s.frameId);
  const tableThemeId = useSettingsStore((s) => s.tableThemeId);
  const setAvatarId = useSettingsStore((s) => s.setAvatarId);
  const setFrameId = useSettingsStore((s) => s.setFrameId);
  const setTableThemeId = useSettingsStore((s) => s.setTableThemeId);
  const lastRoomCode = useSettingsStore((s) => s.lastRoomCode);
  const lastRoomPlayerId = useSettingsStore((s) => s.lastRoomPlayerId);
  const lastRoomReconnectToken = useSettingsStore((s) => s.lastRoomReconnectToken);
  const setPhase = useGameStore((s) => s.setPhase);
  const activeRoom = useRoomStore((s) => s.room);
  const error = useRoomStore((s) => s.error);
  const isLoading = useRoomStore((s) => s.isLoading);
  const progression = useProgressionQuery();
  const progressionData = progression.data?.progression;
  const [activeActionModal, setActiveActionModal] = useState<ActionModalKind | null>(null);
  const displayedProgression = progressionData ?? {
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    nextLevelXp: 100,
  };

  useEffect(() => {
    const equipped = progression.data?.progression.equipped;
    if (!equipped) return;
    if (isPlayerAvatarId(equipped.avatar) && equipped.avatar !== avatarId) {
      setAvatarId(equipped.avatar);
    }
    if (isPlayerFrameId(equipped.frame) && equipped.frame !== frameId) {
      setFrameId(equipped.frame);
    }
    if (
      isTableThemeId(equipped.tableTheme)
      && equipped.tableTheme !== tableThemeId
    ) {
      setTableThemeId(equipped.tableTheme);
    }
  }, [
    avatarId,
    frameId,
    progression.data,
    setAvatarId,
    setFrameId,
    setTableThemeId,
    tableThemeId,
  ]);

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

  const handleQuickPlay = async () => {
    triggerHaptic('medium');
    await ensureAuth();
    const name = useSettingsStore.getState().displayName
      || t('common.playerFallback', { number: Math.floor(Math.random() * 999) });
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const durations = [2, 3, 4, 5];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const durationMinutes = durations[Math.floor(Math.random() * durations.length)];
    startSinglePlayer(name, difficulty, durationMinutes);
    router.replace('/game');
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
          <HomeProgressionHud
            progression={displayedProgression}
            onPress={() => {
              void ensureAuth().then(() => router.push('/progression'));
            }}
            levelLabel={t('progression.level')}
            viewRewardsLabel={t('home.viewRewards')}
          />
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
        </View>

        {isAuthenticated && user && (
          <Panel variant="surface" style={styles.playerCard}>
            <PlayerAvatar avatarId={avatarId} frameId={frameId} size={42} />
            <View style={styles.playerCopy}>
              <ThemedText variant="body" style={styles.playerName}>
                {displayName || user.displayName}
              </ThemedText>
              <ThemedText variant="caption" color="muted">{t('home.ready')}</ThemedText>
            </View>
            {progressionData ? (
              <View style={styles.levelChip}>
                <Award size={14} color={colors.amber} />
                <ThemedText variant="label" style={styles.levelChipText}>
                  {progressionData.level}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.onlineDot} />
            )}
          </Panel>
        )}

        <View style={styles.actions}>
          <View style={styles.playControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.quickPlay')}
              onPress={handleQuickPlay}
              style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            >
              <Play size={24} color={colors.textOnAccent} fill={colors.textOnAccent} strokeWidth={2.7} />
              <ThemedText variant="title" style={styles.playButtonLabel}>{t('home.play')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.playSettings')}
              onPress={() => setActiveActionModal('solo')}
              style={({ pressed }) => [styles.playSettingsButton, pressed && styles.playButtonPressed]}
            >
              <ChevronDown size={28} color={colors.textOnAccent} strokeWidth={3} />
            </Pressable>
          </View>
          <View style={styles.onlineActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.create')}
              onPress={() => setActiveActionModal('create')}
              style={({ pressed }) => [styles.onlineAction, pressed && styles.onlineActionPressed]}
            >
              <Plus size={20} color={colors.primaryDark} strokeWidth={2.8} />
              <ThemedText variant="subtitle" style={styles.onlineActionLabel}>{t('home.createShort')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.join')}
              onPress={() => setActiveActionModal('join')}
              style={({ pressed }) => [styles.onlineAction, pressed && styles.onlineActionPressed]}
            >
              <LogIn size={20} color={colors.primaryDark} strokeWidth={2.8} />
              <ThemedText variant="subtitle" style={styles.onlineActionLabel}>{t('home.joinShort')}</ThemedText>
            </Pressable>
          </View>
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
      {activeActionModal && (
        <HomeActionModal
          key={activeActionModal}
          kind={activeActionModal}
          onClose={() => setActiveActionModal(null)}
          ensureAuth={ensureAuth}
        />
      )}
    </SafeAreaView>
  );
}

type ActionModalKind = 'solo' | 'create' | 'join';

function HomeActionModal({
  kind,
  onClose,
  ensureAuth,
}: {
  kind: ActionModalKind;
  onClose: () => void;
  ensureAuth: () => Promise<void>;
}) {
  const router = useRouter();
  const { language, t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateDisplayName = useAuthStore((state) => state.updateDisplayName);
  const displayName = useSettingsStore((state) => state.displayName);
  const setDisplayName = useSettingsStore((state) => state.setDisplayName);
  const avatarId = useSettingsStore((state) => state.avatarId);
  const setAvatarId = useSettingsStore((state) => state.setAvatarId);
  const error = useRoomStore((state) => state.error);
  const setError = useRoomStore((state) => state.setError);
  const isLoading = useRoomStore((state) => state.isLoading);
  const setLoading = useRoomStore((state) => state.setLoading);
  const [name, setName] = useState(displayName || user?.displayName || '');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [serverStatus, setServerStatus] = useState<GameServerStatus>('checking');
  const [warmupAttempt, setWarmupAttempt] = useState(0);

  useEffect(() => {
    if (kind !== 'create') return undefined;
    const controller = new AbortController();
    void warmUpGameServer({
      signal: controller.signal,
      onProgress: (status) => {
        if (!controller.signal.aborted) setServerStatus(status);
      },
    }).then((status) => {
      if (!controller.signal.aborted) setServerStatus(status);
    });
    return () => controller.abort();
  }, [kind, warmupAttempt]);

  const saveProfile = () => {
    const finalName = name.trim() || displayName || user?.displayName
      || t('common.playerFallback', { number: Math.floor(Math.random() * 999) });
    setDisplayName(finalName);
    void updateDisplayName(finalName);
    return finalName;
  };

  const handleSoloStart = async () => {
    triggerHaptic('medium');
    await ensureAuth();
    startSinglePlayer(saveProfile(), difficulty, durationMinutes);
    onClose();
    router.replace('/game');
  };

  const navigateWhenRoomReady = () => {
    const unsubscribe = useRoomStore.subscribe((state) => {
      if (state.room && state.roomCode) {
        unsubscribe();
        setLoading(false);
        onClose();
        router.push('/lobby');
      } else if (state.error) {
        unsubscribe();
        setLoading(false);
      }
    });
  };

  const handleCreate = async () => {
    if (serverStatus !== 'ready') return;
    triggerHaptic('medium');
    await ensureAuth();
    const finalName = saveProfile();
    setLoading(true);
    setError(null);
    navigateWhenRoomReady();
    void createRoom(finalName, avatarId, 'no_preference', difficulty, durationMinutes);
  };

  const handleJoin = async () => {
    if (roomCode.length !== 6) {
      setError('validation.roomCodeLength');
      return;
    }
    triggerHaptic('medium');
    await ensureAuth();
    const finalName = saveProfile();
    setLoading(true);
    setError(null);
    navigateWhenRoomReady();
    void joinRoom(roomCode, finalName, avatarId, 'no_preference');
  };

  const title = kind === 'solo'
    ? t('solo.title')
    : kind === 'create' ? t('create.title') : t('join.title');
  const profileHelp = kind === 'solo'
    ? t('solo.profileHelp')
    : kind === 'create' ? t('create.profileHelp') : t('join.profileHelp');
  const serverStatusLabel = serverStatus === 'checking'
    ? t('home.serverChecking')
    : serverStatus === 'waking'
      ? t('home.serverWaking')
      : serverStatus === 'ready'
        ? t('home.serverReady')
        : t('home.serverUnavailable');

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.actionModal}>
          <View style={styles.actionModalHeader}>
            <View style={styles.actionModalTitle}>
              {kind === 'solo' ? <Bot size={23} color={colors.primaryDark} /> : kind === 'create' ? <Plus size={23} color={colors.amberMuted} /> : <LogIn size={23} color={colors.primaryDark} />}
              <ThemedText variant="subtitle">{title}</ThemedText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.modalCloseButton}>
              <X size={20} color={colors.textSecondary} strokeWidth={2.6} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.actionModalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {kind === 'join' && (
              <View style={styles.roomCodeSection}>
                <ThemedText variant="label" color="muted">{t('join.roomCode')}</ThemedText>
                <TextInput
                  value={roomCode}
                  onChangeText={(value) => setRoomCode(value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))}
                  placeholder="ABCDEF"
                  placeholderTextColor={colors.textMuted}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.roomCodeInput}
                />
                <ThemedText variant="caption" color="muted" style={styles.roomCodeHelp}>{t('join.codeHelp')}</ThemedText>
              </View>
            )}

            <PlayerProfileEditor
              name={name}
              onNameChange={setName}
              avatarId={avatarId}
              onAvatarChange={setAvatarId}
              title={t('create.profile')}
              helperText={profileHelp}
              namePlaceholder={t('create.namePlaceholder')}
              avatarLabel={t('create.avatar')}
              pickerTitle={t('create.chooseAvatar')}
            />

            {kind !== 'join' && (
              <>
                {kind === 'solo' && (
                  <View style={styles.modalIntro}>
                    <Bot size={20} color={colors.primaryDark} />
                    <ThemedText variant="caption" color="secondary" style={styles.modalIntroText}>{t('solo.subtitle')}</ThemedText>
                  </View>
                )}
                <ModalDifficultySelector difficulty={difficulty} onChange={setDifficulty} />
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeading}>
                    <Clock3 size={18} color={colors.amber} />
                    <View>
                      <ThemedText variant="label">{t('create.duration')}</ThemedText>
                      <ThemedText variant="caption" color="muted">{t('create.durationHelp')}</ThemedText>
                    </View>
                  </View>
                  <DurationSlider value={durationMinutes} onChange={setDurationMinutes} />
                </View>
              </>
            )}

            {kind === 'create' && (
              <View style={[styles.serverStatus, serverStatus === 'unavailable' && styles.serverStatusError]}>
                {serverStatus === 'checking' || serverStatus === 'waking' ? <ActivityIndicator size="small" color={colors.primaryDark} /> : serverStatus === 'ready' ? <View style={styles.serverReadyDot} /> : <WifiOff size={17} color={colors.error} />}
                <ThemedText variant="caption" color={serverStatus === 'unavailable' ? 'error' : 'secondary'} style={styles.serverStatusCopy}>{serverStatusLabel}</ThemedText>
                {serverStatus === 'unavailable' && (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('home.serverRetry')} onPress={() => {
                    setServerStatus('checking');
                    setWarmupAttempt((attempt) => attempt + 1);
                  }} style={styles.serverRetry}>
                    <RefreshCw size={15} color={colors.primaryDark} />
                  </Pressable>
                )}
              </View>
            )}
            {error && <ThemedText variant="caption" color="error" style={styles.modalError}>{getErrorMessage(error, language)}</ThemedText>}
            <ThemedButton
              label={kind === 'solo' ? t('solo.action') : kind === 'create' ? t('create.action') : t('join.action')}
              variant={kind === 'create' ? 'explorer' : 'primary'}
              size="lg"
              fullWidth
              loading={kind !== 'solo' && isLoading}
              disabled={kind === 'create' && serverStatus !== 'ready'}
              icon={kind === 'solo' ? <Bot size={20} color={colors.textOnPrimary} /> : kind === 'create' ? <Plus size={20} color={colors.textOnAccent} /> : <LogIn size={20} color={colors.textOnPrimary} />}
              onPress={kind === 'solo' ? handleSoloStart : kind === 'create' ? handleCreate : handleJoin}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalDifficultySelector({
  difficulty,
  onChange,
}: {
  difficulty: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.modalSection}>
      <View style={styles.modalSectionHeading}>
        <Gauge size={18} color={colors.primaryDark} />
        <View>
          <ThemedText variant="label">{t('create.difficulty')}</ThemedText>
          <ThemedText variant="caption" color="muted">{t('create.difficultyHelp')}</ThemedText>
        </View>
      </View>
      <View style={styles.modalDifficultyOptions}>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((option) => {
          const selected = difficulty === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option)}
              style={[styles.modalDifficultyOption, selected && styles.modalDifficultyOptionSelected]}
            >
              <ThemedText variant="label" style={{ color: selected ? colors.primaryDark : colors.textPrimary }}>
                {option === 'easy' ? t('create.easy') : option === 'medium' ? t('create.medium') : t('create.hard')}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HomeProgressionHud({
  progression,
  onPress,
  levelLabel,
  viewRewardsLabel,
}: {
  progression: Pick<
    PlayerProgression,
    'level' | 'currentLevelXp' | 'nextLevelXp'
  >;
  onPress: () => void;
  levelLabel: string;
  viewRewardsLabel: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  const progress = progression.nextLevelXp <= 0
    ? 0
    : Math.min(1, Math.max(0, progression.currentLevelXp / progression.nextLevelXp));
  const xpLabel = `${progression.currentLevelXp} / ${progression.nextLevelXp} XP`;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${levelLabel} ${progression.level}, ${xpLabel}. ${viewRewardsLabel}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.progressionHeaderHud,
        pressed && styles.progressionHeaderHudPressed,
      ]}
    >
      <View style={[styles.progressionHeaderBadge, hovered && styles.progressionHeaderBadgeHovered]}>
        <ThemedText variant="title" style={styles.progressionHeaderLevel}>
          {progression.level}
        </ThemedText>
      </View>
      <View style={styles.progressionHeaderTrack}>
        <View style={[
          styles.progressionHeaderFill,
          { width: `${progress * 100}%` },
          hovered && styles.progressionHeaderFillHovered,
        ]} />
        <ThemedText variant="caption" style={styles.progressionHeaderXp}>
          {xpLabel}
        </ThemedText>
      </View>
    </Pressable>
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
  levelChip: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  levelChipText: { color: colors.amberMuted },
  progressionHeaderHud: {
    width: 208,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  progressionHeaderHudPressed: {
    transform: [{ scale: 0.99 }],
  },
  progressionHeaderBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.amberStrong,
    backgroundColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  progressionHeaderBadgeHovered: {
    transform: [{ rotate: '45deg' }, { scale: 1.04 }],
  },
  progressionHeaderLevel: {
    color: colors.textOnAccent,
    fontFamily: 'Quicksand-Bold',
    fontSize: 21,
    lineHeight: 25,
    transform: [{ rotate: '-45deg' }],
  },
  progressionHeaderTrack: {
    width: 172,
    height: 16,
    marginLeft: -4,
    overflow: 'hidden',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.primaryContainer,
  },
  progressionHeaderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progressionHeaderFillHovered: {
    backgroundColor: colors.actionCyan,
    boxShadow: '0 0 8px rgba(69, 220, 203, 0.55)',
  },
  progressionHeaderXp: {
    color: colors.textPrimary,
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  playControl: {
    minHeight: 58,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  playButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.actionAmber,
    borderBottomColor: colors.actionAmberDark,
    backgroundColor: colors.secondary,
  },
  playSettingsButton: {
    width: 62,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.actionAmber,
    borderBottomColor: colors.actionAmberDark,
    backgroundColor: colors.secondary,
  },
  playButtonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 2 }],
  },
  playButtonLabel: {
    color: colors.textOnAccent,
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    lineHeight: 28,
  },
  onlineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  onlineAction: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  onlineActionPressed: {
    backgroundColor: colors.surface,
    transform: [{ translateY: 1 }],
  },
  onlineActionLabel: {
    color: colors.primaryDark,
    fontFamily: 'Quicksand-Bold',
    fontSize: 17,
    lineHeight: 21,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(23, 35, 31, 0.48)',
  },
  actionModal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    ...shadows.lg,
  },
  actionModalHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  actionModalTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionModalContent: { padding: spacing.lg, gap: spacing.lg },
  roomCodeSection: { gap: spacing.sm },
  roomCodeInput: {
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.surface,
    color: colors.primary,
    fontFamily: 'Quicksand-Bold',
    fontSize: 25,
    letterSpacing: 6,
    textAlign: 'center',
  },
  roomCodeHelp: { textAlign: 'center' },
  modalIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surface,
  },
  modalIntroText: { flex: 1 },
  modalSection: { gap: spacing.sm },
  modalSectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalDifficultyOptions: { flexDirection: 'row', gap: spacing.sm },
  modalDifficultyOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalDifficultyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  serverStatus: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surface,
  },
  serverStatusError: { borderColor: colors.error },
  serverStatusCopy: { flex: 1 },
  serverReadyDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  serverRetry: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalError: { textAlign: 'center' },
  actions: {
    gap: spacing.md,
  },
});
