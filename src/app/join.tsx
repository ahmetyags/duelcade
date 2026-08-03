/**
 * Join Room Screen — guest flow for joining an existing room.
 * Per Bölüm 7.1: Second player enters code or uses deep link.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { PlayerProfileEditor } from '@/components/ui/PlayerProfileEditor';
import { Panel } from '@/components/ui/Panel';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { colors, spacing, radius } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRoomStore } from '@/store/roomStore';
import { joinRoom } from '@/services/NetworkBridge';
import { getErrorMessage } from '@/services/ErrorMessages';
import { triggerHaptic } from '@/services/HapticsService';
import { ChevronLeft, LogIn } from 'lucide-react-native';
import { useTranslation } from '@/src/i18n';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const user = useAuthStore((s) => s.user);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const avatarId = useSettingsStore((s) => s.avatarId);
  const setAvatarId = useSettingsStore((s) => s.setAvatarId);
  const error = useRoomStore((s) => s.error);
  const setError = useRoomStore((s) => s.setError);
  const isLoading = useRoomStore((s) => s.isLoading);
  const setLoading = useRoomStore((s) => s.setLoading);

  const [name, setName] = useState(displayName || user?.displayName || '');
  const [code, setCode] = useState(
    typeof params.code === 'string'
      ? params.code.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)
      : '',
  );

  const handleJoin = useCallback(async () => {
    if (code.length !== 6) {
      setError('validation.roomCodeLength');
      return;
    }

    triggerHaptic('medium');
    const finalName = name.trim() || t('common.playerFallback', { number: Math.floor(Math.random() * 999) });
    setDisplayName(finalName);
    void updateDisplayName(finalName);

    setLoading(true);
    setError(null);

    const unsubscribe = useRoomStore.subscribe((state) => {
      if (state.room) {
        unsubscribe();
        setLoading(false);
        router.push('/lobby');
      }
      if (state.error) {
        unsubscribe();
        setLoading(false);
      }
    });

    joinRoom(code.toUpperCase(), finalName, avatarId, 'no_preference');
  }, [avatarId, code, name, setDisplayName, updateDisplayName, setLoading, setError, router, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <ThemedText variant="subtitle">{t('join.title')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Room code input */}
        <View style={styles.section}>
          <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
            {t('join.roomCode')}
          </ThemedText>
          <Panel variant="surface" style={styles.codeContainer}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))}
              placeholder="ABCDEF"
              placeholderTextColor={colors.textMuted}
              style={styles.codeInput}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Panel>
          <ThemedText variant="caption" color="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            {t('join.codeHelp')}
          </ThemedText>
        </View>

        <PlayerProfileEditor
          name={name}
          onNameChange={setName}
          avatarId={avatarId}
          onAvatarChange={setAvatarId}
          title={t('create.profile')}
          helperText={t('join.profileHelp')}
          namePlaceholder={t('create.namePlaceholder')}
          avatarLabel={t('create.avatar')}
          pickerTitle={t('create.chooseAvatar')}
        />

        {error && (
          <ThemedText variant="caption" color="error" style={{ textAlign: 'center' }}>
            {getErrorMessage(error, language)}
          </ThemedText>
        )}

        <ThemedButton
          label={t('join.action')}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={code.length !== 6}
          icon={<LogIn size={21} color={colors.textOnPrimary} strokeWidth={2.3} />}
          onPress={handleJoin}
        />
      </ScrollView>
    </SafeAreaView>
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
    gap: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1.5,
  },
  codeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  codeInput: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.primary,
    textAlign: 'center',
    width: '100%',
  },
  roleOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
  },
});
