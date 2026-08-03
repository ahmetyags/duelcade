import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { Panel } from '@/components/ui/Panel';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  sendPlayerFeedback,
  type FeedbackDraft,
} from '@/services/FeedbackService';
import type {
  FeedbackCategory,
  FeedbackScreen as FeedbackSource,
} from '@/services/AuthApi';
import { triggerHaptic } from '@/services/HapticsService';
import { useTranslation, type TranslationKey } from '@/src/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

const CATEGORIES: readonly FeedbackCategory[] = [
  'bug',
  'gameplay',
  'balance',
  'tutorial',
  'performance',
  'other',
];
const SOURCES: readonly FeedbackSource[] = [
  'home',
  'solo',
  'create',
  'join',
  'lobby',
  'game',
  'results',
  'history',
  'progression',
  'settings',
  'other',
];

function normalizeSource(value: string | string[] | undefined): FeedbackSource {
  const source = Array.isArray(value) ? value[0] : value;
  return SOURCES.includes(source as FeedbackSource) ? source as FeedbackSource : 'other';
}

export default function FeedbackScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const { language, t } = useTranslation();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => normalizeSource(params.source), [params.source]);
  const valid = category !== null && rating >= 1 && message.trim().length >= 10;

  const submit = async () => {
    if (!valid || !category) {
      setError(t('feedback.invalid'));
      return;
    }
    setSending(true);
    setError(null);
    const draft: FeedbackDraft = {
      category,
      rating,
      message,
      screen: source,
      locale: language,
    };
    try {
      await sendPlayerFeedback(draft);
      setSent(true);
      triggerHaptic('success');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message === 'SERVER_IDENTITY_REQUIRED'
          ? t('feedback.offline')
          : t('feedback.error'),
      );
      triggerHaptic('warning');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setCategory(null);
    setRating(0);
    setMessage('');
    setError(null);
    setSent(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText variant="subtitle">{t('feedback.title')}</ThemedText>
            <ThemedText variant="caption" color="muted">{t('feedback.subtitle')}</ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { width: Math.min(632, Math.max(280, viewportWidth - spacing.xl * 2)) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            <Panel variant="surface" style={styles.successCard}>
              <CheckCircle2 size={52} color={colors.success} />
              <ThemedText variant="subtitle">{t('feedback.successTitle')}</ThemedText>
              <ThemedText color="muted" style={styles.centerText}>
                {t('feedback.successDescription')}
              </ThemedText>
              <ThemedButton
                label={t('feedback.sendAnother')}
                variant="secondary"
                fullWidth
                onPress={reset}
              />
              <ThemedButton
                label={t('common.back')}
                variant="ghost"
                fullWidth
                onPress={() => router.back()}
              />
            </Panel>
          ) : (
            <>
              <View style={styles.section}>
                <ThemedText variant="label" color="muted">{t('feedback.category')}</ThemedText>
                <View style={styles.chips}>
                  {CATEGORIES.map((item) => {
                    const selected = category === item;
                    const label = t(`feedback.category.${item}` as TranslationKey);
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={label}
                        onPress={() => {
                          setCategory(item);
                          setError(null);
                          triggerHaptic('light');
                        }}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <ThemedText
                          variant="caption"
                          style={selected ? styles.chipTextSelected : undefined}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText variant="label" color="muted">{t('feedback.rating')}</ThemedText>
                <Panel variant="surface" style={styles.ratingCard}>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: rating === value }}
                        accessibilityLabel={t('feedback.ratingValue', { rating: value })}
                        onPress={() => {
                          setRating(value);
                          setError(null);
                          triggerHaptic('light');
                        }}
                        hitSlop={6}
                        style={styles.starButton}
                      >
                        <Star
                          size={34}
                          color={value <= rating ? colors.amber : colors.border}
                          fill={value <= rating ? colors.amber : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                  {rating > 0 && (
                    <ThemedText variant="caption" color="muted">
                      {t('feedback.ratingValue', { rating })}
                    </ThemedText>
                  )}
                </Panel>
              </View>

              <View style={styles.section}>
                <View style={styles.messageHeader}>
                  <ThemedText variant="label" color="muted">{t('feedback.message')}</ThemedText>
                  <ThemedText variant="caption" color="muted">
                    {t('feedback.characterCount', { count: message.length })}
                  </ThemedText>
                </View>
                <TextInput
                  accessibilityLabel={t('feedback.message')}
                  value={message}
                  onChangeText={(value) => {
                    setMessage(value.slice(0, 1000));
                    setError(null);
                  }}
                  placeholder={t('feedback.placeholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={styles.input}
                />
                <ThemedText variant="caption" color="muted">{t('feedback.privacy')}</ThemedText>
              </View>

              {error && (
                <ThemedText accessibilityRole="alert" variant="caption" color="error" style={styles.centerText}>
                  {error}
                </ThemedText>
              )}
              <ThemedButton
                label={sending ? t('feedback.sending') : t('feedback.submit')}
                loading={sending}
                disabled={!valid || sending}
                fullWidth
                onPress={() => void submit()}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
  },
  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    alignSelf: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary,
  },
  chipTextSelected: {
    color: colors.textOnPrimary,
  },
  ratingCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  starButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 150,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  centerText: {
    textAlign: 'center',
  },
});
