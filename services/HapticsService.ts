/**
 * Haptics service — wraps expo-haptics with settings awareness.
 * Per Bölüm 12 (Geri bildirim hiyerarşisi): secondary feedback layer.
 * Respects the user's vibration setting from the settings store.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'none';

/** Trigger a haptic pattern, respecting user settings. */
export function triggerHaptic(pattern: HapticPattern): void {
  const { vibrationEnabled } = useSettingsStore.getState();
  if (!vibrationEnabled || pattern === 'none' || Platform.OS === 'web') return;

  try {
    switch (pattern) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // Haptics not available on this device/platform
  }
}

/** Trigger a rhythmic alarm vibration pattern. */
export async function triggerAlarmHaptic(): Promise<void> {
  const { vibrationEnabled } = useSettingsStore.getState();
  if (!vibrationEnabled || Platform.OS === 'web') return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics not available
  }
}
