/**
 * Settings store — manages user preferences and accessibility settings.
 * Persisted to AsyncStorage via the storage service.
 * Per Bölüm 12.3 (Erişilebilirlik ayarları).
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isPlayerAvatarId,
  type PlayerAvatarId,
} from '@/types/profile';

export const SETTINGS_KEY = 'duelcade_settings';
const LEGACY_SETTINGS_KEYS = ['duo_arcade_settings', 'asymmetric_escape_settings'] as const;

export type AppLanguage = 'tr' | 'en';

/** The only audible layer is the short UI button feedback (0-1). */
interface AudioSettings {
  buttonVolume: number;
}

/** Accessibility settings per design bible. */
interface AccessibilitySettings {
  colorblindMode: boolean;
  vibrationEnabled: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  leftHandedMode: boolean;
  visualAlertsInsteadOfSound: boolean;
}

/** Display name and profile settings. */
interface ProfileSettings {
  displayName: string;
  avatarId: PlayerAvatarId;
  lastRoomCode: string | null;
  lastRoomPlayerId: string | null;
  lastRoomReconnectToken: string | null;
  language: AppLanguage;
}

interface SettingsStoreState extends AudioSettings, AccessibilitySettings, ProfileSettings {
  isLoaded: boolean;

  // Audio actions
  setButtonVolume: (v: number) => void;

  // Accessibility actions
  toggleColorblindMode: () => void;
  toggleVibration: () => void;
  toggleReduceMotion: () => void;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleLeftHanded: () => void;
  toggleVisualAlerts: () => void;

  // Profile actions
  setDisplayName: (name: string) => void;
  setAvatarId: (avatarId: PlayerAvatarId) => void;
  setLastRoomCode: (code: string | null) => void;
  setLastRoomSession: (session: {
    roomCode: string;
    playerId: string;
    reconnectionToken: string;
  }) => void;
  clearLastRoomSession: () => void;
  setLanguage: (language: AppLanguage) => void;

  // Persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: AudioSettings & AccessibilitySettings & ProfileSettings = {
  buttonVolume: 0.6,
  colorblindMode: false,
  vibrationEnabled: true,
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  leftHandedMode: false,
  visualAlertsInsteadOfSound: false,
  displayName: '',
  avatarId: 'sparkles',
  lastRoomCode: null,
  lastRoomPlayerId: null,
  lastRoomReconnectToken: null,
  language: 'tr',
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function savedBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSavedSettings(
  saved: Record<string, unknown>,
): AudioSettings & AccessibilitySettings & ProfileSettings {
  return {
    buttonVolume: clampVolume(Number(
      saved.buttonVolume ?? saved.sfxVolume ?? defaultSettings.buttonVolume,
    )),
    colorblindMode: savedBoolean(saved.colorblindMode, defaultSettings.colorblindMode),
    vibrationEnabled: savedBoolean(saved.vibrationEnabled, defaultSettings.vibrationEnabled),
    reduceMotion: savedBoolean(saved.reduceMotion, defaultSettings.reduceMotion),
    highContrast: savedBoolean(saved.highContrast, defaultSettings.highContrast),
    largeText: savedBoolean(saved.largeText, defaultSettings.largeText),
    leftHandedMode: savedBoolean(saved.leftHandedMode, defaultSettings.leftHandedMode),
    visualAlertsInsteadOfSound: savedBoolean(
      saved.visualAlertsInsteadOfSound,
      defaultSettings.visualAlertsInsteadOfSound,
    ),
    displayName: typeof saved.displayName === 'string' ? saved.displayName.slice(0, 24) : '',
    avatarId: isPlayerAvatarId(saved.avatarId) ? saved.avatarId : defaultSettings.avatarId,
    lastRoomCode: typeof saved.lastRoomCode === 'string' ? saved.lastRoomCode.slice(0, 6) : null,
    lastRoomPlayerId: typeof saved.lastRoomPlayerId === 'string'
      ? saved.lastRoomPlayerId.slice(0, 96)
      : null,
    lastRoomReconnectToken: typeof saved.lastRoomReconnectToken === 'string'
      ? saved.lastRoomReconnectToken.slice(0, 512)
      : null,
    language: saved.language === 'en' ? 'en' : 'tr',
  };
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,

  setButtonVolume: (v) => { set({ buttonVolume: clampVolume(v) }); get().saveSettings(); },

  toggleColorblindMode: () => { set((s) => ({ colorblindMode: !s.colorblindMode })); get().saveSettings(); },
  toggleVibration: () => { set((s) => ({ vibrationEnabled: !s.vibrationEnabled })); get().saveSettings(); },
  toggleReduceMotion: () => { set((s) => ({ reduceMotion: !s.reduceMotion })); get().saveSettings(); },
  toggleHighContrast: () => { set((s) => ({ highContrast: !s.highContrast })); get().saveSettings(); },
  toggleLargeText: () => { set((s) => ({ largeText: !s.largeText })); get().saveSettings(); },
  toggleLeftHanded: () => { set((s) => ({ leftHandedMode: !s.leftHandedMode })); get().saveSettings(); },
  toggleVisualAlerts: () => { set((s) => ({ visualAlertsInsteadOfSound: !s.visualAlertsInsteadOfSound })); get().saveSettings(); },

  setDisplayName: (name) => { set({ displayName: name }); get().saveSettings(); },
  setAvatarId: (avatarId) => { set({ avatarId }); get().saveSettings(); },
  setLastRoomCode: (code) => { set({ lastRoomCode: code }); get().saveSettings(); },
  setLastRoomSession: ({ roomCode, playerId, reconnectionToken }) => {
    set({
      lastRoomCode: roomCode.trim().toUpperCase().slice(0, 6),
      lastRoomPlayerId: playerId.slice(0, 96),
      lastRoomReconnectToken: reconnectionToken.slice(0, 512),
    });
    get().saveSettings();
  },
  clearLastRoomSession: () => {
    set({
      lastRoomCode: null,
      lastRoomPlayerId: null,
      lastRoomReconnectToken: null,
    });
    get().saveSettings();
  },
  setLanguage: (language) => { set({ language }); get().saveSettings(); },

  loadSettings: async () => {
    try {
      const currentRaw = await AsyncStorage.getItem(SETTINGS_KEY);
      let legacyRaw: string | null = null;
      if (!currentRaw) {
        for (const key of LEGACY_SETTINGS_KEYS) {
          legacyRaw = await AsyncStorage.getItem(key);
          if (legacyRaw) break;
        }
      }
      const raw = currentRaw ?? legacyRaw;
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        if (legacyRaw) {
          await AsyncStorage.setItem(SETTINGS_KEY, legacyRaw);
          await AsyncStorage.multiRemove([...LEGACY_SETTINGS_KEYS]);
        }
        set({ ...normalizeSavedSettings(saved), isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const toSave = {
        buttonVolume: state.buttonVolume,
        colorblindMode: state.colorblindMode,
        vibrationEnabled: state.vibrationEnabled,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        largeText: state.largeText,
        leftHandedMode: state.leftHandedMode,
        visualAlertsInsteadOfSound: state.visualAlertsInsteadOfSound,
        displayName: state.displayName,
        avatarId: state.avatarId,
        lastRoomCode: state.lastRoomCode,
        lastRoomPlayerId: state.lastRoomPlayerId,
        lastRoomReconnectToken: state.lastRoomReconnectToken,
        language: state.language,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
    } catch {
      // Silently fail — settings are non-critical
    }
  },

  resetSettings: async () => {
    const profile = {
      displayName: get().displayName,
      avatarId: get().avatarId,
      lastRoomCode: get().lastRoomCode,
      lastRoomPlayerId: get().lastRoomPlayerId,
      lastRoomReconnectToken: get().lastRoomReconnectToken,
    };
    set({ ...defaultSettings, ...profile, isLoaded: true });
    await get().saveSettings();
  },
}));
