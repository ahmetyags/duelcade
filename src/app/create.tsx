/**
 * Create Room Screen — host flow for creating a new game room.
 * Per Bölüm 7.1: User creates room, server generates 6-char code,
 * host enters lobby with share button.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { DurationSlider } from '@/components/ui/DurationSlider';
import { PlayerProfileEditor } from '@/components/ui/PlayerProfileEditor';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { colors, spacing, radius } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRoomStore } from '@/store/roomStore';
import { createRoom } from '@/services/NetworkBridge';
import { getErrorMessage } from '@/services/ErrorMessages';
import { triggerHaptic } from '@/services/HapticsService';
import {
  warmUpGameServer,
  type GameServerStatus,
} from '@/services/GameServerAvailability';
import { ChevronLeft, Clock3, Gauge, RefreshCw, WifiOff } from 'lucide-react-native';
import { useTranslation } from '@/src/i18n';
import type { Difficulty } from '@/types/game';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const avatarId = useSettingsStore((s) => s.avatarId);
  const setAvatarId = useSettingsStore((s) => s.setAvatarId);
  const setError = useRoomStore((s) => s.setError);
  const error = useRoomStore((s) => s.error);
  const isLoading = useRoomStore((s) => s.isLoading);
  const setLoading = useRoomStore((s) => s.setLoading);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [name, setName] = useState(displayName || user?.displayName || '');
  const [serverStatus, setServerStatus] = useState<GameServerStatus>('checking');
  const warmupController = useRef<AbortController | null>(null);

  const runServerWarmup = useCallback((controller: AbortController) => {
    void warmUpGameServer({
      signal: controller.signal,
      onProgress: (status) => {
        if (!controller.signal.aborted) setServerStatus(status);
      },
    }).then((status) => {
      if (!controller.signal.aborted) setServerStatus(status);
    });
  }, []);

  const retryServerWarmup = useCallback(() => {
    warmupController.current?.abort();
    const controller = new AbortController();
    warmupController.current = controller;
    setServerStatus('checking');
    runServerWarmup(controller);
  }, [runServerWarmup]);

  useEffect(() => {
    const controller = new AbortController();
    warmupController.current = controller;
    runServerWarmup(controller);
    return () => controller.abort();
  }, [runServerWarmup]);

  const handleCreate = useCallback(async () => {
    if (serverStatus !== 'ready') return;
    triggerHaptic('medium');
    const finalName = name.trim() || displayName || user?.displayName
      || t('common.playerFallback', { number: Math.floor(Math.random() * 999) });
    setDisplayName(finalName);

    setLoading(true);
    setError(null);

    // Subscribe to room snapshot before creating
    const unsubscribe = useRoomStore.subscribe((state) => {
      if (state.room && state.roomCode) {
        unsubscribe();
        setLoading(false);
        router.push('/lobby');
      }
    });

    createRoom(finalName, avatarId, 'no_preference', difficulty, durationMinutes);
  }, [avatarId, displayName, user?.displayName, difficulty, durationMinutes, name, serverStatus, setDisplayName, setLoading, setError, router, t]);

  const serverStatusLabel =
    serverStatus === 'checking'
      ? t('home.serverChecking')
      : serverStatus === 'waking'
        ? t('home.serverWaking')
        : serverStatus === 'ready'
          ? t('home.serverReady')
          : t('home.serverUnavailable');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <ThemedText variant="subtitle">{t('create.title')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PlayerProfileEditor
          name={name}
          onNameChange={setName}
          avatarId={avatarId}
          onAvatarChange={setAvatarId}
          title={t('create.profile')}
          helperText={t('create.profileHelp')}
          namePlaceholder={t('create.namePlaceholder')}
          avatarLabel={t('create.avatar')}
          pickerTitle={t('create.chooseAvatar')}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Gauge size={19} color={colors.primaryDark} />
            <View>
              <ThemedText variant="label">{t('create.difficulty')}</ThemedText>
              <ThemedText variant="caption" color="muted">{t('create.difficultyHelp')}</ThemedText>
            </View>
          </View>
          <View style={styles.optionGrid}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: difficulty === option }}
                onPress={() => {
                  setDifficulty(option);
                  triggerHaptic('light');
                }}
                style={[
                  styles.optionCard,
                  difficulty === option && styles.optionCardActive,
                ]}
              >
                <ThemedText
                  variant="label"
                  style={{ color: difficulty === option ? colors.primaryDark : colors.textPrimary }}
                >
                  {option === 'easy' ? t('create.easy') : option === 'medium' ? t('create.medium') : t('create.hard')}
                </ThemedText>
                <ThemedText variant="caption" color="muted" style={styles.optionDescription}>
                  {option === 'easy'
                    ? t('create.easyDescription')
                    : option === 'medium'
                      ? t('create.mediumDescription')
                      : t('create.hardDescription')}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Clock3 size={19} color={colors.amber} />
            <View>
              <ThemedText variant="label">{t('create.duration')}</ThemedText>
              <ThemedText variant="caption" color="muted">{t('create.durationHelp')}</ThemedText>
            </View>
          </View>
          <DurationSlider value={durationMinutes} onChange={setDurationMinutes} />
        </View>

        {error && (
          <ThemedText variant="caption" color="error" style={{ textAlign: 'center' }}>
            {getErrorMessage(error, language)}
          </ThemedText>
        )}

        <View style={styles.submitArea}>
          <View
            style={[
              styles.serverStatus,
              serverStatus === 'unavailable' && styles.serverStatusError,
            ]}
          >
            {serverStatus === 'checking' || serverStatus === 'waking' ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : serverStatus === 'ready' ? (
              <View style={styles.serverReadyDot} />
            ) : (
              <WifiOff size={17} color={colors.error} strokeWidth={2.3} />
            )}
            <ThemedText
              variant="caption"
              color={serverStatus === 'unavailable' ? 'error' : 'secondary'}
              style={styles.serverStatusText}
            >
              {serverStatusLabel}
            </ThemedText>
            {serverStatus === 'unavailable' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.serverRetry')}
                onPress={retryServerWarmup}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <RefreshCw size={15} color={colors.primaryDark} strokeWidth={2.4} />
                <ThemedText variant="caption" style={styles.retryText}>
                  {t('home.serverRetry')}
                </ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedButton
            label={t('create.action')}
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={serverStatus !== 'ready'}
            onPress={handleCreate}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
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
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionCard: {
    flex: 1,
    minHeight: 112,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  optionDescription: {
    textAlign: 'center',
  },
  submitArea: {
    gap: spacing.sm,
  },
  serverStatus: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  serverStatusError: {
    borderColor: colors.alarmBackground,
    backgroundColor: colors.alarmBackground,
  },
  serverStatusText: {
    flex: 1,
  },
  serverReadyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  retryButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryContainer,
  },
  retryText: {
    color: colors.primaryDark,
    fontFamily: 'Quicksand-SemiBold',
  },
});
