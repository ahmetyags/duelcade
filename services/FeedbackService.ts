import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  submitFeedback,
  type FeedbackCategory,
  type FeedbackScreen,
} from '@/services/AuthApi';
import { useAuthStore } from '@/store/authStore';
import type { AppLanguage } from '@/store/settingsStore';

export interface FeedbackDraft {
  category: FeedbackCategory;
  rating: number;
  message: string;
  screen: FeedbackScreen;
  locale: AppLanguage;
}

function randomUuid(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function currentPlatform(): 'android' | 'ios' | 'web' {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return 'web';
}

function currentBuildVersion(): string {
  if (Platform.OS === 'android') {
    return String(Constants.expoConfig?.android?.versionCode ?? 'unknown');
  }
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.ios?.buildNumber ?? 'unknown';
  }
  return 'web';
}

export async function sendPlayerFeedback(draft: FeedbackDraft): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user?.serverBacked) throw new Error('SERVER_IDENTITY_REQUIRED');
  const accessToken = await useAuthStore.getState().getValidAccessToken();
  if (!accessToken) throw new Error('SERVER_IDENTITY_REQUIRED');
  await submitFeedback(accessToken, {
    id: randomUuid(),
    category: draft.category,
    rating: draft.rating,
    message: draft.message.trim(),
    screen: draft.screen,
    platform: currentPlatform(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    buildVersion: currentBuildVersion(),
    locale: draft.locale,
  });
}
