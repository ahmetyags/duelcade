/**
 * Root layout — app entry point with providers.
 * Per Bölüm 13: React Query for server state, Zustand for game state,
 * providers wrap the root layout (not RootLayoutNav).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { audioService } from '@/services/AudioService';
import {
  flushAnalyticsEvents,
  trackAnalyticsEvent,
} from '@/services/AnalyticsService';
import { isDailyReturnWindow } from '@/services/AnalyticsMetrics';
import { initializeCrashReporting } from '@/services/CrashReportingService';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduceMotion ? 'none' : 'fade',
        animationDuration: reduceMotion ? 0 : 250,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="solo" />
      <Stack.Screen name="join" />
      <Stack.Screen name="lobby" />
      <Stack.Screen name="game" />
      <Stack.Screen name="results" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="history" />
      <Stack.Screen name="progression" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="feedback" />
    </Stack>
  );
}

function RootLayout() {
  const analyticsSessionTracked = useRef(false);
  const [fontsLoaded, fontError] = useFonts({
    Quicksand: require('../../assets/fonts/Quicksand-Regular.ttf'),
    'Quicksand-Medium': require('../../assets/fonts/Quicksand-Medium.ttf'),
    'Quicksand-SemiBold': require('../../assets/fonts/Quicksand-SemiBold.ttf'),
    'Quicksand-Bold': require('../../assets/fonts/Quicksand-Bold.ttf'),
  });

  const loadSession = useAuthStore((s) => s.loadSession);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settingsLoaded = useSettingsStore((s) => s.isLoaded);
  const usageAnalyticsEnabled = useSettingsStore((s) => s.usageAnalyticsEnabled);
  const lastSessionAt = useSettingsStore((s) => s.lastSessionAt);
  const authLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    loadSession();
    loadSettings();
    audioService.init();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        void flushAnalyticsEvents();
      }
    });

    return () => subscription.remove();
  }, [loadSession, loadSettings]);

  useEffect(() => {
    if (!settingsLoaded) return;
    initializeCrashReporting();
  }, [settingsLoaded]);

  useEffect(() => {
    if (
      !settingsLoaded
      || authLoading
      || !usageAnalyticsEnabled
      || analyticsSessionTracked.current
    ) return;
    analyticsSessionTracked.current = true;
    const sessionAt = Date.now();
    const returning = isDailyReturnWindow(lastSessionAt ?? sessionAt, sessionAt);
    trackAnalyticsEvent('app_session_started', {
      isReturningSession: returning,
    });
    useSettingsStore.getState().markSessionStarted(sessionAt);
    void flushAnalyticsEvents();
  }, [authLoading, lastSessionAt, settingsLoaded, usageAnalyticsEnabled]);

  const onLayout = useCallback(() => {
    if ((fontsLoaded || fontError) && settingsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, settingsLoaded]);

  if ((!fontsLoaded && !fontError) || !settingsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView
          style={{ flex: 1, backgroundColor: colors.backgroundDeep }}
          onLayout={onLayout}
        >
          <StatusBar style="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
