import * as Sentry from '@sentry/react-native';

import { useSettingsStore } from '@/store/settingsStore';

let initialized = false;

export function initializeCrashReporting(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      return useSettingsStore.getState().crashReportingEnabled ? event : null;
    },
  });
  initialized = true;
}

export function captureHandledError(error: unknown): void {
  if (
    initialized
    && useSettingsStore.getState().crashReportingEnabled
  ) {
    Sentry.captureException(error);
  }
}
