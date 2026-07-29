/**
 * Not Found Screen — fallback for unmatched routes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { colors, spacing } from '@/theme/tokens';
import { useTranslation } from '@/src/i18n';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ThemedText variant="title" style={{ color: colors.primary, fontSize: 48 }}>
        404
      </ThemedText>
      <ThemedText variant="body" color="muted" style={{ textAlign: 'center' }}>
        {t('notFound.description')}
      </ThemedText>
      <ThemedButton
        label={t('notFound.home')}
        variant="primary"
        size="md"
        onPress={() => router.replace('/')}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
