/**
 * Settings Screen — accessibility and audio preferences.
 * Per Bölüm 12.3: Colorblind mode, vibration, button sound,
 * high contrast, large text, reduce motion, left-handed mode.
 */

import React from 'react';
import { View, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ui/ThemedText';
import { Panel } from '@/components/ui/Panel';
import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { colors, spacing, radius } from '@/theme/tokens';
import { useSettingsStore, type AppLanguage } from '@/store/settingsStore';
import { triggerHaptic } from '@/services/HapticsService';
import { ChevronLeft, Eye, Vibrate, Zap, Type, Hand, Volume2, Bell, Globe2, Check } from 'lucide-react-native';
import { useTranslation } from '@/src/i18n';
import { audioService } from '@/services/AudioService';

export default function SettingsScreen() {
  const router = useRouter();
  const s = useSettingsStore();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MagicBackdrop />
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <ThemedText variant="subtitle">{t('settings.title')}</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
            {t('settings.languageSection')}
          </ThemedText>
          <Panel variant="surface" style={styles.languageCard}>
            <View style={styles.languageHeader}>
              <View style={styles.languageIcon}>
                <Globe2 size={21} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.languageCopy}>
                <ThemedText variant="body" style={{ fontWeight: '600' }}>{t('settings.language')}</ThemedText>
                <ThemedText variant="caption" color="muted">{t('settings.languageDescription')}</ThemedText>
              </View>
            </View>
            <View style={styles.languageOptions}>
              <LanguageOption
                language="tr"
                label={t('settings.turkish')}
                selected={s.language === 'tr'}
                onSelect={s.setLanguage}
              />
              <LanguageOption
                language="en"
                label={t('settings.english')}
                selected={s.language === 'en'}
                onSelect={s.setLanguage}
              />
            </View>
          </Panel>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
            {t('settings.accessibility')}
          </ThemedText>
          <Panel variant="surface" style={styles.toggleGroup}>
            <ToggleRow
              icon={Eye}
              label={t('settings.colorblind')}
              description={t('settings.colorblindDescription')}
              value={s.colorblindMode}
              onToggle={() => { s.toggleColorblindMode(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Vibrate}
              label={t('settings.vibration')}
              description={t('settings.vibrationDescription')}
              value={s.vibrationEnabled}
              onToggle={() => { s.toggleVibration(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Zap}
              label={t('settings.reduceMotion')}
              description={t('settings.reduceMotionDescription')}
              value={s.reduceMotion}
              onToggle={() => { s.toggleReduceMotion(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Eye}
              label={t('settings.highContrast')}
              description={t('settings.highContrastDescription')}
              value={s.highContrast}
              onToggle={() => { s.toggleHighContrast(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Type}
              label={t('settings.largeText')}
              description={t('settings.largeTextDescription')}
              value={s.largeText}
              onToggle={() => { s.toggleLargeText(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Hand}
              label={t('settings.leftHanded')}
              description={t('settings.leftHandedDescription')}
              value={s.leftHandedMode}
              onToggle={() => { s.toggleLeftHanded(); triggerHaptic('light'); }}
            />
            <Divider />
            <ToggleRow
              icon={Bell}
              label={t('settings.visualAlerts')}
              description={t('settings.visualAlertsDescription')}
              value={s.visualAlertsInsteadOfSound}
              onToggle={() => { s.toggleVisualAlerts(); triggerHaptic('light'); }}
            />
          </Panel>
        </View>

        {/* Audio Section */}
        <View style={styles.section}>
          <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
            {t('settings.audio')}
          </ThemedText>
          <Panel variant="surface" style={styles.toggleGroup}>
            <SliderRow
              icon={Volume2}
              label={t('settings.buttonSound')}
              value={s.buttonVolume}
              onChange={s.setButtonVolume}
            />
          </Panel>
        </View>

        {/* Reset */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.reset')}
          onPress={() => { s.resetSettings(); triggerHaptic('warning'); }}
          style={({ pressed }) => [
            styles.resetBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText variant="caption" color="error" style={{ textAlign: 'center' }}>
            {t('settings.reset')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LanguageOption({ language, label, selected, onSelect }: {
  language: AppLanguage;
  label: string;
  selected: boolean;
  onSelect: (language: AppLanguage) => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        onSelect(language);
        triggerHaptic('light');
      }}
      style={({ pressed }) => [
        styles.languageOption,
        selected && styles.languageOptionSelected,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <ThemedText
        variant="body"
        style={{ color: selected ? colors.textOnPrimary : colors.textSecondary, fontWeight: '700' }}
      >
        {label}
      </ThemedText>
      {selected && <Check size={17} color={colors.textOnPrimary} strokeWidth={3} />}
    </Pressable>
  );
}

// ─── Toggle Row ────────────────────────────────────────────────────

function ToggleRow({ icon: Icon, label, description, value, onToggle }: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Icon size={18} color={value ? colors.primary : colors.textMuted} strokeWidth={2} />
        <View style={styles.toggleCopy}>
          <ThemedText variant="body" style={{ fontWeight: '500' }}>{label}</ThemedText>
          <ThemedText variant="caption" color="muted">{description}</ThemedText>
        </View>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: `${colors.primary}40` }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

// ─── Slider Row ────────────────────────────────────────────────────

function SliderRow({ icon: Icon, label, value, onChange }: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const changeAndPreview = (nextValue: number) => {
    onChange(nextValue);
    triggerHaptic('light');
    void audioService.previewButtonSound();
  };
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLeft}>
        <Icon size={18} color={colors.textSecondary} strokeWidth={2} />
        <ThemedText variant="body" numberOfLines={2} style={styles.sliderLabel}>{label}</ThemedText>
      </View>
      <View style={styles.sliderRight}>
        <ThemedText
          accessibilityLabel={t('settings.currentVolume', {
            label,
            value: Math.round(value * 100),
          })}
          variant="mono"
          style={{ color: colors.primary, fontSize: 14, width: 36 }}
        >
          {Math.round(value * 100)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.decreaseVolume', { label })}
          disabled={value <= 0}
          onPress={() => changeAndPreview(Math.max(0, value - 0.1))}
          style={styles.sliderBtn}
        >
          <ThemedText variant="body" color="secondary">−</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.increaseVolume', { label })}
          disabled={value >= 1}
          onPress={() => changeAndPreview(Math.min(1, value + 0.1))}
          style={styles.sliderBtn}
        >
          <ThemedText variant="body" color="secondary">+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1.5,
  },
  languageCard: {
    gap: spacing.md,
    borderColor: colors.cyanMuted,
    backgroundColor: colors.surfaceDark,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  languageIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.operatorContainer,
    borderWidth: 2,
    borderColor: colors.sapphire,
  },
  languageCopy: {
    flex: 1,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageOption: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderBottomWidth: 5,
    borderBottomColor: colors.primaryDark,
  },
  toggleGroup: {
    padding: 0,
    overflow: 'hidden' as never,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
  },
  sliderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sliderRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sliderLabel: {
    flex: 1,
    minWidth: 0,
    fontWeight: '500',
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    backgroundColor: `${colors.error}10`,
  },
});
