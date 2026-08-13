import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

interface ScreenHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly trailing?: React.ReactNode;
  readonly maxWidth?: number;
}

/** Consistent page navigation and hierarchy for secondary app screens. */
export const ScreenHeader = React.memo<ScreenHeaderProps>(function ScreenHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  trailing,
  maxWidth = 648,
}) {
  return (
    <View style={[styles.header, { maxWidth }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.copy}>
        <ThemedText variant="title" style={styles.title} numberOfLines={2}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" color="muted" numberOfLines={2}>{subtitle}</ThemedText>
        ) : null}
      </View>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    width: '92%',
    minHeight: 82,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlayLight,
    ...shadows.sm,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, lineHeight: 29 },
  trailing: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.76, transform: [{ translateY: 1 }] },
});
