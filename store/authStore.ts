import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  AuthApiError,
  createGuestSession,
  logoutGuestSession,
  refreshGuestSession,
  updateServerDisplayName,
  type ServerSession,
} from '@/services/AuthApi';
import {
  deleteRefreshToken,
  readRefreshToken,
  saveRefreshToken,
} from '@/services/AuthTokenStorage';
import { setAccessTokenProvider } from '@/services/AccessTokenProvider';
import { SeededRandom } from '@/engine/SeededRandom';

const AUTH_KEY = 'duelcade_auth';
const LEGACY_AUTH_KEYS = ['duo_arcade_auth', 'asymmetric_escape_auth'] as const;

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly isGuest: boolean;
  readonly createdAt: number;
  readonly serverBacked: boolean;
}

interface AuthStoreState {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInAsGuest: (displayName: string) => Promise<void>;
  loadSession: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}

let refreshInFlight: Promise<string | null> | null = null;
let sessionLoadInFlight: Promise<void> | null = null;
let signInInFlight: Promise<void> | null = null;

function isRejectedSession(error: unknown): boolean {
  return error instanceof AuthApiError && error.status === 401;
}

function generateGuestId(): string {
  const rng = new SeededRandom(Date.now().toString());
  return `guest_${rng.nextInt(100000, 999999)}_${Date.now().toString(36)}`;
}

function generateDefaultName(): string {
  const adjectives = ['Cipher', 'Echo', 'Vector', 'Nova', 'Pulse', 'Grid', 'Flux', 'Axis'];
  const rng = new SeededRandom(Date.now().toString());
  return `${rng.pick(adjectives)}-${rng.nextInt(100, 999)}`;
}

function localUser(displayName: string, previous?: Partial<AuthUser>): AuthUser {
  return {
    id: previous?.id ?? generateGuestId(),
    displayName,
    isGuest: true,
    createdAt: previous?.createdAt ?? Date.now(),
    serverBacked: false,
  };
}

function serverUser(session: ServerSession): AuthUser {
  return {
    id: session.player.id,
    displayName: session.player.displayName,
    isGuest: true,
    createdAt: session.player.createdAt,
    serverBacked: true,
  };
}

async function saveUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

async function persistServerSession(
  session: ServerSession,
): Promise<Pick<AuthStoreState,
  'user' | 'accessToken' | 'accessTokenExpiresAt' | 'refreshTokenExpiresAt'
>> {
  const user = serverUser(session);
  await Promise.all([
    saveUser(user),
    saveRefreshToken(session.refreshToken),
  ]);
  return {
    user,
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
  };
}

function parseSavedUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof candidate.id !== 'string'
      || typeof candidate.displayName !== 'string'
      || typeof candidate.createdAt !== 'number'
    ) return null;
    return {
      id: candidate.id.slice(0, 96),
      displayName: candidate.displayName.trim().slice(0, 24),
      isGuest: true,
      createdAt: candidate.createdAt,
      serverBacked: candidate.serverBacked === true,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  accessToken: null,
  accessTokenExpiresAt: 0,
  refreshTokenExpiresAt: 0,
  isAuthenticated: false,
  isLoading: true,

  signInAsGuest: async (displayName) => {
    if (signInInFlight) return signInInFlight;
    signInInFlight = (async () => {
      if (sessionLoadInFlight) await sessionLoadInFlight;
      if (get().isAuthenticated) return;
      const name = displayName.trim().slice(0, 24) || generateDefaultName();
      set({ isLoading: true });
      try {
        const session = await createGuestSession(name);
        const persisted = await persistServerSession(session);
        set({ ...persisted, isAuthenticated: true, isLoading: false });
      } catch {
        const user = localUser(name);
        await saveUser(user).catch(() => undefined);
        set({
          user,
          accessToken: null,
          accessTokenExpiresAt: 0,
          refreshTokenExpiresAt: 0,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    })();
    try {
      await signInInFlight;
    } finally {
      signInInFlight = null;
    }
  },

  loadSession: async () => {
    if (sessionLoadInFlight) return sessionLoadInFlight;
    sessionLoadInFlight = (async () => {
      try {
        const currentRaw = await AsyncStorage.getItem(AUTH_KEY);
        let legacyRaw: string | null = null;
        if (!currentRaw) {
          for (const key of LEGACY_AUTH_KEYS) {
            legacyRaw = await AsyncStorage.getItem(key);
            if (legacyRaw) break;
          }
        }
        const saved = parseSavedUser(currentRaw ?? legacyRaw);
        const refreshToken = await readRefreshToken().catch(() => null);
        if (refreshToken) {
          try {
            const session = await refreshGuestSession(refreshToken);
            const persisted = await persistServerSession(session);
            await AsyncStorage.multiRemove([...LEGACY_AUTH_KEYS]);
            set({ ...persisted, isAuthenticated: true, isLoading: false });
            return;
          } catch (error) {
            if (isRejectedSession(error)) {
              await deleteRefreshToken().catch(() => undefined);
            } else {
              if (saved) {
                set({
                  user: saved,
                  accessToken: null,
                  accessTokenExpiresAt: 0,
                  refreshTokenExpiresAt: 0,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
              set({ isLoading: false });
              return;
            }
          }
        }
        if (saved) {
          try {
            const session = await createGuestSession(saved.displayName);
            const persisted = await persistServerSession(session);
            await AsyncStorage.multiRemove([...LEGACY_AUTH_KEYS]);
            set({ ...persisted, isAuthenticated: true, isLoading: false });
            return;
          } catch {
            const user = localUser(saved.displayName, saved);
            set({ user, isAuthenticated: true, isLoading: false });
            return;
          }
        }
      } catch {
        // A missing local session is equivalent to a signed-out guest.
      }
      set({ isLoading: false });
    })();
    try {
      await sessionLoadInFlight;
    } finally {
      sessionLoadInFlight = null;
    }
  },

  signOut: async () => {
    const refreshToken = await readRefreshToken().catch(() => null);
    set({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: 0,
      refreshTokenExpiresAt: 0,
      isAuthenticated: false,
    });
    await Promise.all([
      AsyncStorage.multiRemove([AUTH_KEY, ...LEGACY_AUTH_KEYS]),
      deleteRefreshToken().catch(() => undefined),
      refreshToken
        ? logoutGuestSession(refreshToken).catch(() => undefined)
        : Promise.resolve(),
    ]);
  },

  updateDisplayName: async (name) => {
    const current = get().user;
    if (!current) return;
    const displayName = name.trim().slice(0, 24) || current.displayName;
    let updated = { ...current, displayName };
    const accessToken = await get().getValidAccessToken();
    if (accessToken) {
      try {
        const response = await updateServerDisplayName(accessToken, displayName);
        updated = { ...updated, displayName: response.player.displayName };
      } catch {
        // Keep the local profile usable; the next successful update will sync it.
      }
    }
    set({ user: updated });
    await saveUser(updated).catch(() => undefined);
  },

  getValidAccessToken: async () => {
    const current = get();
    if (
      current.accessToken
      && current.accessTokenExpiresAt > Date.now() + 30_000
    ) return current.accessToken;
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const refreshToken = await readRefreshToken().catch(() => null);
      if (!refreshToken) return null;
      try {
        const session = await refreshGuestSession(refreshToken);
        const persisted = await persistServerSession(session);
        set({ ...persisted, isAuthenticated: true });
        return session.accessToken;
      } catch (error) {
        if (isRejectedSession(error)) {
          await deleteRefreshToken().catch(() => undefined);
        }
        set({
          accessToken: null,
          accessTokenExpiresAt: 0,
          refreshTokenExpiresAt: 0,
        });
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },
}));

setAccessTokenProvider(() => useAuthStore.getState().getValidAccessToken());
