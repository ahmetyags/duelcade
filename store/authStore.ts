/**
 * Auth store — manages optional guest authentication.
 * Per the design bible, authentication is optional (AUTH_OPTIONAL phase).
 * Guests can play with a display name. No mandatory account creation.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SeededRandom } from '@/engine/SeededRandom';

const AUTH_KEY = 'duelcade_auth';
const LEGACY_AUTH_KEYS = ['duo_arcade_auth', 'asymmetric_escape_auth'] as const;

interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly isGuest: boolean;
  readonly createdAt: number;
}

interface AuthStoreState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  signInAsGuest: (displayName: string) => Promise<void>;
  loadSession: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

function generateGuestId(): string {
  const rng = new SeededRandom(Date.now().toString());
  return `guest_${rng.nextInt(100000, 999999)}_${Date.now().toString(36)}`;
}

function generateDefaultName(): string {
  const adjectives = ['Cipher', 'Echo', 'Vector', 'Nova', 'Pulse', 'Grid', 'Flux', 'Axis'];
  const rng = new SeededRandom(Date.now().toString());
  const adj = rng.pick(adjectives);
  const num = rng.nextInt(100, 999);
  return `${adj}-${num}`;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  signInAsGuest: async (displayName: string) => {
    const name = displayName.trim() || generateDefaultName();
    const user: AuthUser = {
      id: generateGuestId(),
      displayName: name,
      isGuest: true,
      createdAt: Date.now(),
    };
    set({ user, isAuthenticated: true, isLoading: false });
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } catch {
      // Non-critical — session can continue in-memory
    }
  },

  loadSession: async () => {
    try {
      const currentRaw = await AsyncStorage.getItem(AUTH_KEY);
      let legacyRaw: string | null = null;
      if (!currentRaw) {
        for (const key of LEGACY_AUTH_KEYS) {
          legacyRaw = await AsyncStorage.getItem(key);
          if (legacyRaw) break;
        }
      }
      const raw = currentRaw ?? legacyRaw;
      if (raw) {
        const user = JSON.parse(raw) as AuthUser;
        if (legacyRaw) {
          await AsyncStorage.setItem(AUTH_KEY, legacyRaw);
          await AsyncStorage.multiRemove([...LEGACY_AUTH_KEYS]);
        }
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // Fall through to default state
    }
    set({ isLoading: false });
  },

  signOut: async () => {
    set({ user: null, isAuthenticated: false });
    try {
      await AsyncStorage.multiRemove([AUTH_KEY, ...LEGACY_AUTH_KEYS]);
    } catch {
      // Non-critical
    }
  },

  updateDisplayName: async (name: string) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, displayName: name.trim() || current.displayName };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    } catch {
      // Non-critical
    }
  },
}));
