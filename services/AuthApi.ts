import { getGameServerHttpUrl } from '@/services/GameServerAvailability';

export interface ServerPlayer {
  id: string;
  displayName: string;
  createdAt: number;
}

export interface ServerSession {
  player: ServerPlayer;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
}

export interface MatchHistoryItem {
  id: string;
  roomId: string;
  startedAt: number;
  finishedAt: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'final';
  totalRounds: number;
  modeOrder: string[];
  winnerPlayerId: string | null;
  forfeitedPlayerId: string | null;
  score: number;
  opponentDisplayName: string;
  opponentScore: number;
  xpEarned: number;
}

export type CosmeticType = 'avatar' | 'frame' | 'table_theme';
export type QuestKey = 'play_duel' | 'win_duel' | 'win_rounds';
export type FeedbackCategory =
  | 'bug'
  | 'gameplay'
  | 'balance'
  | 'tutorial'
  | 'performance'
  | 'other';
export type FeedbackScreen =
  | 'home'
  | 'solo'
  | 'create'
  | 'join'
  | 'lobby'
  | 'game'
  | 'results'
  | 'history'
  | 'progression'
  | 'settings'
  | 'other';
export type CoreMode =
  | 'rune_grid'
  | 'memory_pairs'
  | 'circuit_claim'
  | 'neon_trail';

export interface PlayerProgression {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  equipped: {
    avatar: string;
    frame: string;
    tableTheme: string;
  };
  mastery: {
    mode: CoreMode;
    xp: number;
    matchesPlayed: number;
  }[];
  inventory: {
    type: CosmeticType;
    itemId: string;
    unlockedAt: number;
    source: string;
  }[];
  catalog: {
    type: CosmeticType;
    itemId: string;
    unlockLevel: number;
  }[];
  dailyQuests: {
    key: QuestKey;
    date: string;
    progress: number;
    target: number;
    rewardXp: number;
    claimed: boolean;
  }[];
}

export interface FeedbackSubmission {
  id: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  screen: FeedbackScreen;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
  buildVersion: string;
  locale: 'tr' | 'en';
}

const API_URL = `${getGameServerHttpUrl()}/v1`;

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'AuthApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new AuthApiError(
        response.status,
        body?.error ?? `HTTP_${response.status}`,
      );
    }
    return response.status === 204
      ? undefined as T
      : response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export function createGuestSession(displayName: string): Promise<ServerSession> {
  return request('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  }, 30_000);
}

export function refreshGuestSession(refreshToken: string): Promise<ServerSession> {
  return request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, 30_000);
}

export function logoutGuestSession(refreshToken: string): Promise<void> {
  return request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function updateServerDisplayName(
  accessToken: string,
  displayName: string,
): Promise<{ player: ServerPlayer }> {
  return request('/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ displayName }),
  });
}

export function fetchMatchHistory(
  accessToken: string,
  limit = 20,
): Promise<{ matches: MatchHistoryItem[] }> {
  return request(`/matches?limit=${Math.min(50, Math.max(1, limit))}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchProgression(
  accessToken: string,
): Promise<{ progression: PlayerProgression }> {
  return request('/progression', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function claimDailyQuest(
  accessToken: string,
  questKey: QuestKey,
): Promise<{ progression: PlayerProgression }> {
  return request(`/quests/${questKey}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function equipCosmetic(
  accessToken: string,
  type: CosmeticType,
  itemId: string,
): Promise<{ progression: PlayerProgression }> {
  return request('/me/cosmetics', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ type, itemId }),
  });
}

export function submitFeedback(
  accessToken: string,
  submission: FeedbackSubmission,
): Promise<{ id: string; accepted: boolean }> {
  return request('/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(submission),
  });
}
