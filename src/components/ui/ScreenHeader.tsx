import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import type { IconButtonTone } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { colors, spacing } from '@/theme/tokens';

interface ScreenHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly trailing?: React.ReactNode;
  readonly leadingIcon?: React.ReactNode;
  readonly leadingTone?: IconButtonTone;
  readonly maxWidth?: number;
}

/** Consistent page navigation and hierarchy for secondary app screens. */
export const ScreenHeader = React.memo<ScreenHeaderProps>(function ScreenHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  trailing,
  leadingIcon,
  leadingTone = 'neutral',
  maxWidth = 648,
}) {
  return (
    <View style={[styles.header, { maxWidth }]}>
      <IconButton
        accessibilityLabel={backLabel}
        onPress={onBack}
        tone={leadingTone}
        icon={leadingIcon ?? <ArrowLeft size={21} color={colors.primaryDark} strokeWidth={2.4} />}
      />
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
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, lineHeight: 29 },
  trailing: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
