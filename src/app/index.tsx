/** Duelcade home screen — shared tabletop match entry point. */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  Polygon,
  Stop,
} from 'react-native-svg';
import {
  Award,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  LogIn,
  Play,
  History,
  Plus,
  Mail,
  RefreshCw,
  Settings,
  UserRound,
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
import { AuthProviderIcon, type SocialAuthProvider } from '@/components/ui/AuthProviderIcon';
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
import {
  AuthApiError,
  fetchAuthProviders,
  type AuthProvider,
  type AuthProviderAvailability,
  type PlayerProgression,
} from '@/services/AuthApi';
import { isRegistrationPasswordValid, passwordRequirements } from '@/services/PasswordPolicy';
import { firebaseClientProviderAvailable } from '@/services/FirebaseAuth';
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
  const [profileAuthVisible, setProfileAuthVisible] = useState(false);
  const [profileAuthLoading, setProfileAuthLoading] = useState(false);
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

  const openProfile = () => {
    triggerHaptic('light');
    if (user?.serverBacked && !user.isGuest) {
      router.push('/profile' as never);
      return;
    }
    setProfileAuthVisible(true);
  };

  const finishProfileSignIn = async (action: () => Promise<void>) => {
    if (profileAuthLoading) return;
    setProfileAuthLoading(true);
    try {
      await action();
      const signedInUser = useAuthStore.getState().user;
      if (signedInUser) setDisplayName(signedInUser.displayName);
      setProfileAuthVisible(false);
      router.push('/profile' as never);
    } finally {
      setProfileAuthLoading(false);
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
              if (user?.serverBacked && !user.isGuest) {
                router.push('/progression');
              } else {
                setProfileAuthVisible(true);
              }
            }}
            levelLabel={t('progression.level')}
            viewRewardsLabel={t('home.viewRewards')}
          />
          <View style={styles.topBarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={openProfile}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <UserRound size={20} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.settings')}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Settings size={20} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>
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
      {profileAuthVisible && (
        <ProfileAuthModal
          loading={profileAuthLoading}
          onClose={() => setProfileAuthVisible(false)}
          onOAuth={(provider) => finishProfileSignIn(
            () => useAuthStore.getState().signInWithOAuth(provider),
          )}
          onEmail={(mode, name, email, password) => finishProfileSignIn(
            () => mode === 'register'
              ? useAuthStore.getState().registerWithEmail(name, email, password)
              : useAuthStore.getState().signInWithEmail(email, password),
          )}
        />
      )}
    </SafeAreaView>
  );
}

type ActionModalKind = 'solo' | 'create' | 'join';

function ProfileAuthModal({
  loading,
  onClose,
  onOAuth,
  onEmail,
}: {
  loading: boolean;
  onClose: () => void;
  onOAuth: (provider: Exclude<AuthProvider, 'guest' | 'email'>) => Promise<void>;
  onEmail: (mode: 'login' | 'register', name: string, email: string, password: string) => Promise<void>;
}) {
  const { language, t } = useTranslation();
  const currentName = useSettingsStore((state) => state.displayName);
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [providerAvailability, setProviderAvailability] = useState<AuthProviderAvailability | null>(null);
  const title = language === 'tr' ? 'Profilini oluştur' : 'Create your profile';
  const description = language === 'tr'
    ? 'İlerlemeni kaydetmek, sezonlara katılmak ve liderlik tablosunda yer almak için giriş yap.'
    : 'Sign in to save progress, join seasons, and appear on the leaderboard.';
  const providers = [
    { id: 'google' as const, label: 'Google' },
    { id: 'facebook' as const, label: 'Facebook' },
    { id: 'github' as const, label: 'GitHub' },
  ];
  const requirementCopy = {
    length: { tr: 'En az 8 karakter', en: 'At least 8 characters' },
    lower: { tr: 'Bir küçük harf', en: 'One lowercase letter' },
    upper: { tr: 'Bir büyük harf', en: 'One uppercase letter' },
    number: { tr: 'Bir rakam', en: 'One number' },
  } as const;
  const requirementStates = passwordRequirements(password);
  const validRegistrationPassword = isRegistrationPasswordValid(password);
  const authMethodAvailable = (provider: 'email' | SocialAuthProvider) => (
    providerAvailability?.[provider] === true
    && (
      providerAvailability.firebase !== true
      || (
        provider === 'github' && Platform.OS !== 'web'
          ? providerAvailability.oauth?.github === true
          : firebaseClientProviderAvailable(provider)
      )
    )
  );

  useEffect(() => {
    const controller = new AbortController();
    void warmUpGameServer({ signal: controller.signal }).then((status) => {
      if (controller.signal.aborted) return;
      if (status !== 'ready') {
        setAuthError(language === 'tr'
          ? 'Hesap sunucusuna ulaşılamıyor.'
          : 'The account server is unavailable.');
        return;
      }
      void fetchAuthProviders()
        .then((response) => setProviderAvailability(response.providers))
        .catch(() => setAuthError(language === 'tr'
          ? 'Giriş sistemi sunucuda henüz etkin değil.'
          : 'The sign-in system is not enabled on the server yet.'));
    });
    return () => controller.abort();
  }, [language]);
  const run = async (action: () => Promise<void>) => {
    setAuthError(null);
    try {
      await action();
    } catch (error) {
      const code = error instanceof AuthApiError
        ? error.code
        : error instanceof Error ? error.message : 'AUTH_FAILED';
      const messages: Record<string, { tr: string; en: string }> = {
        OAUTH_CANCELLED: { tr: 'Giriş iptal edildi.', en: 'Sign-in was cancelled.' },
        EMAIL_ALREADY_REGISTERED: { tr: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.', en: 'This email is already registered. Try signing in.' },
        INVALID_EMAIL_OR_PASSWORD: { tr: 'E-posta veya şifre hatalı.', en: 'Email or password is incorrect.' },
        OAUTH_PROVIDER_NOT_CONFIGURED: { tr: 'Bu giriş sağlayıcısı henüz yapılandırılmadı.', en: 'This sign-in provider is not configured yet.' },
        FIREBASE_NOT_CONFIGURED: { tr: 'Firebase uygulama ayarları eksik.', en: 'Firebase app configuration is missing.' },
        FIREBASE_AUTH_NOT_CONFIGURED: { tr: 'Firebase sunucuda henüz etkin değil.', en: 'Firebase is not enabled on the server yet.' },
        ACCOUNT_PROVIDER_MISMATCH: { tr: 'Bu e-posta başka bir giriş yöntemiyle kayıtlı.', en: 'This email is registered with another sign-in method.' },
        INVALID_EMAIL: { tr: 'Geçerli bir e-posta adresi gir.', en: 'Enter a valid email address.' },
        WEAK_PASSWORD: { tr: 'Şifre gerekliliklerini tamamla.', en: 'Complete all password requirements.' },
        NETWORK_ERROR: { tr: 'Firebase bağlantısı kurulamadı.', en: 'Could not reach Firebase.' },
        PERSISTENCE_UNAVAILABLE: { tr: 'Hesap sunucusu şu anda kullanılamıyor.', en: 'The account server is currently unavailable.' },
      };
      setAuthError((messages[code] ?? {
        tr: 'Giriş tamamlanamadı. Bağlantını kontrol edip tekrar dene.',
        en: 'Could not sign in. Check your connection and try again.',
      })[language]);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView accessibilityViewIsModal style={styles.profileAuthModal} contentContainerStyle={styles.profileAuthContent}>
          <View style={styles.actionModalHeader}>
            <View style={styles.actionModalTitle}>
              <UserRound size={23} color={colors.primaryDark} />
              <ThemedText variant="subtitle">{title}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2.6} />
            </Pressable>
          </View>
          <ThemedText color="secondary" style={styles.profileAuthDescription}>
            {description}
          </ThemedText>
          <View style={styles.providerGrid}>
            {providers.map(({ id, label }) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${label} sign in`}
                onPress={() => void run(() => onOAuth(id))}
                disabled={loading || !authMethodAvailable(id)}
                style={({ pressed }) => [
                  styles.providerButton,
                  pressed && styles.onlineActionPressed,
                  (loading || !authMethodAvailable(id)) && styles.disabledAuthMethod,
                ]}
              >
                <AuthProviderIcon provider={id as SocialAuthProvider} size={21} />
                <ThemedText variant="label">{label}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.authDivider}><View style={styles.authDividerLine} /><ThemedText variant="caption" color="muted">EMAIL</ThemedText><View style={styles.authDividerLine} /></View>
          {!providerAvailability && !authError && (
            <View style={styles.authLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText variant="caption" color="muted">
                {language === 'tr' ? 'Giriş sunucusu hazırlanıyor…' : 'Preparing sign-in server…'}
              </ThemedText>
            </View>
          )}
          {emailMode === 'register' && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={language === 'tr' ? 'Oyuncu adı' : 'Player name'}
              placeholderTextColor={colors.textMuted}
              maxLength={24}
              style={styles.authInput}
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.authInput}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={language === 'tr' ? 'Şifre (en az 8 karakter)' : 'Password (8+ characters)'}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
            style={styles.authInput}
          />
          {emailMode === 'register' && (
            <View style={styles.passwordRequirements} accessibilityLiveRegion="polite">
              {requirementStates.map((requirement) => (
                <View key={requirement.key} style={styles.passwordRequirement}>
                  <View style={[
                    styles.requirementIndicator,
                    { backgroundColor: requirement.valid ? colors.success : colors.surfaceDark },
                  ]}>
                    {requirement.valid && <Check size={11} color={colors.textOnPrimary} strokeWidth={3} />}
                  </View>
                  <ThemedText
                    variant="caption"
                    style={{ color: requirement.valid ? colors.success : colors.textMuted }}
                  >
                    {requirementCopy[requirement.key][language]}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
          {authError && <ThemedText variant="caption" color="error">{authError}</ThemedText>}
          <ThemedButton
            label={emailMode === 'register'
              ? language === 'tr' ? 'Email ile hesap oluştur' : 'Create account with email'
              : language === 'tr' ? 'Email ile giriş yap' : 'Sign in with email'}
            fullWidth
            loading={loading}
            disabled={
              !authMethodAvailable('email')
              ||
              !email.includes('@')
              || password.length < 8
              || (emailMode === 'register' && (!name.trim() || !validRegistrationPassword))
            }
            icon={<Mail size={18} color={colors.textOnPrimary} />}
            onPress={() => void run(() => onEmail(emailMode, name, email, password))}
          />
          <Pressable onPress={() => { setAuthError(null); setEmailMode((mode) => mode === 'login' ? 'register' : 'login'); }}>
            <ThemedText variant="caption" color="accent" style={styles.profileAuthFootnote}>
              {emailMode === 'register'
                ? language === 'tr' ? 'Zaten hesabın var mı? Giriş yap' : 'Already have an account? Sign in'
                : language === 'tr' ? 'Hesabın yok mu? Kayıt ol' : 'New here? Create an account'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

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
              style={kind === 'create' ? styles.createActionButton : undefined}
              labelStyle={kind === 'create' ? styles.createActionButtonLabel : undefined}
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
  const progressWidth = `${progress * 100}%` as const;

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
      <View style={styles.progressionHeaderTrack}>
        <View style={styles.progressionHeaderTrackBody}>
          <View
            style={[
              styles.progressionHeaderFill,
              hovered && styles.progressionHeaderFillHovered,
              { width: progressWidth },
            ]}
          >
            <View style={styles.progressionHeaderFillHighlight} />
          </View>
          <View style={styles.progressionHeaderTrackHighlight} />
        </View>
        <View style={[styles.progressionHeaderBadge, hovered && styles.progressionHeaderBadgeHovered]}>
          <Svg width="100%" height="100%" viewBox="0 0 52 52" style={styles.progressionHeaderBadgeArt}>
            <Defs>
              <LinearGradient id="levelBadgeFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0" stopColor={colors.amberStrong} />
                <Stop offset="0.5" stopColor={colors.secondary} />
                <Stop offset="1" stopColor={colors.amber} />
              </LinearGradient>
            </Defs>
            <Polygon
              points="26,2 31.4,5.7 38,5.2 40.9,11.1 46.8,14 46.3,20.6 50,26 46.3,31.4 46.8,38 40.9,40.9 38,46.8 31.4,46.3 26,50 20.6,46.3 14,46.8 11.1,40.9 5.2,38 5.7,31.4 2,26 5.7,20.6 5.2,14 11.1,11.1 14,5.2 20.6,5.7"
              fill={colors.actionAmber}
              stroke={colors.actionAmberDark}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <Polygon
              points="26,7 30.4,9.6 35.5,9.5 38,14 42.5,16.5 42.4,21.6 45,26 42.4,30.4 42.5,35.5 38,38 35.5,42.5 30.4,42.4 26,45 21.6,42.4 16.5,42.5 14,38 9.5,35.5 9.6,30.4 7,26 9.6,21.6 9.5,16.5 14,14 16.5,9.5 21.6,9.6"
              fill="url(#levelBadgeFill)"
              stroke={colors.secondaryContainer}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <Polygon
              points="14,14 20,9.5 26,8 32,10 38,14 34,13 26,12 18,14"
              fill="rgba(255,255,255,0.28)"
            />
          </Svg>
          <ThemedText variant="title" style={styles.progressionHeaderLevel}>
            {progression.level}
          </ThemedText>
        </View>
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
    gap: spacing.md,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  profileAuthModal: {
    width: '92%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderTopColor: colors.metalLight,
    borderRightColor: colors.border,
    borderBottomColor: colors.borderDark,
    borderLeftColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  profileAuthContent: { padding: spacing.lg, gap: spacing.md },
  profileAuthDescription: {
    lineHeight: 22,
  },
  authMethod: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    backgroundColor: colors.primaryContainer,
    ...shadows.sm,
  },
  disabledAuthMethod: {
    opacity: 0.58,
  },
  authMethodCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  authMethodLabel: {
    color: colors.primaryDark,
  },
  profileAuthFootnote: {
    textAlign: 'center',
  },
  providerGrid: { flexDirection: 'row', gap: spacing.sm },
  providerButton: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primaryContainer },
  authDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  authInput: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, paddingHorizontal: spacing.md, fontFamily: 'Quicksand-Medium', fontSize: 15 },
  passwordRequirements: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  authLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  passwordRequirement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  requirementIndicator: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  progressionHeaderHud: {
    flex: 1,
    minWidth: 0,
    maxWidth: 260,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  progressionHeaderHudPressed: {
    transform: [{ scale: 0.99 }],
  },
  progressionHeaderBadge: {
    position: 'absolute',
    left: 0,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  progressionHeaderBadgeArt: {
    position: 'absolute',
    inset: 0,
  },
  progressionHeaderBadgeHovered: {
    transform: [{ scale: 1.05 }],
  },
  progressionHeaderLevel: {
    color: colors.textOnAccent,
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    lineHeight: 22,
    ...Platform.select({
      web: { textShadow: `1px 2px 1px ${colors.secondaryContainer}` } as unknown as TextStyle,
      default: {
        textShadowColor: colors.secondaryContainer,
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 1,
      },
    }),
  },
  progressionHeaderTrack: {
    flex: 1,
    minWidth: 0,
    height: 50,
    justifyContent: 'center',
  },
  progressionHeaderTrackBody: {
    position: 'absolute',
    top: 8,
    right: 0,
    bottom: 8,
    left: 34,
    overflow: 'hidden',
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryContainer,
  },
  progressionHeaderFill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  progressionHeaderFillHovered: {
    backgroundColor: colors.actionCyan,
  },
  progressionHeaderFillHighlight: {
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressionHeaderTrackHighlight: {
    position: 'absolute',
    top: 3,
    right: 10,
    left: 44,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  progressionHeaderXp: {
    position: 'absolute',
    top: 16,
    right: 0,
    left: 34,
    color: colors.textPrimary,
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    ...Platform.select({
      web: { textShadow: `0 1px 1px ${colors.surface}` } as unknown as TextStyle,
      default: {
        textShadowColor: colors.surface,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      },
    }),
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
  createActionButton: { backgroundColor: colors.actionAmber },
  createActionButtonLabel: { color: colors.textOnAccent },
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
