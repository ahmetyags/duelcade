import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { MagicBackdrop } from '@/components/ui/MagicBackdrop';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTranslation } from '@/src/i18n';
import { colors, spacing } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const { language } = useTranslation();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <View style={styles.container}>
      <MagicBackdrop />
      <ThemedText variant="subtitle">
        {language === 'tr' ? 'Giriş tamamlanıyor…' : 'Completing sign-in…'}
      </ThemedText>
      <ThemedText color="muted" style={styles.copy}>
        {language === 'tr'
          ? 'Bu pencere otomatik kapanacak.'
          : 'This window will close automatically.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.backgroundDeep,
  },
  copy: { textAlign: 'center' },
});
