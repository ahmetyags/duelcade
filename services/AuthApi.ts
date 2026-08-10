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

export type AuthProvider = 'guest' | 'email' | 'google' | 'facebook' | 'github';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  totalScore: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface AuthProviderAvailability {
  email: boolean;
  google: boolean;
  facebook: boolean;
  github: boolean;
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

export interface LeaderboardSummary {
  globalRank: number | null;
  totalScore: number;
  wins: number;
  losses: number;
  winRate: number;
}

export type CompetitiveLeague =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster';

export interface CompetitiveSummary {
  seasonRating: number;
  league: CompetitiveLeague;
  season: string;
  results: {
    wins: number;
    losses: number;
    draws: number;
  };
  winRate: number;
}

export interface SeasonSummary {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
}

export interface ProfileSummary {
  player: ServerPlayer;
  leaderboard: LeaderboardSummary;
  competitive: CompetitiveSummary;
  season: SeasonSummary;
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

export function fetchAuthProviders(): Promise<{ providers: AuthProviderAvailability }> {
  return request('/auth/providers', { method: 'GET' }, 30_000);
}

export function registerEmailSession(
  displayName: string,
  email: string,
  password: string,
): Promise<ServerSession> {
  return request('/auth/email/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password }),
  }, 30_000);
}

export function createEmailSession(email: string, password: string): Promise<ServerSession> {
  return request('/auth/email/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, 30_000);
}

export function exchangeOAuthSession(code: string): Promise<ServerSession> {
  return request('/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }, 30_000);
}

export function getOAuthStartUrl(provider: Exclude<AuthProvider, 'guest' | 'email'>, redirectUri: string): string {
  return `${API_URL}/auth/oauth/${provider}/start?redirectUri=${encodeURIComponent(redirectUri)}`;
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

export function fetchProfile(accessToken: string): Promise<ProfileSummary> {
  return request('/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchLeaderboard(
  accessToken: string,
): Promise<{ leaderboard: LeaderboardSummary; entries: LeaderboardEntry[] }> {
  return request('/leaderboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchCompetitive(
  accessToken: string,
): Promise<{ competitive: CompetitiveSummary }> {
  return request('/competitive', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchSeason(accessToken: string): Promise<{ season: SeasonSummary }> {
  return request('/season', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function updateProfile(
  accessToken: string,
  displayName: string,
): Promise<{ player: ServerPlayer }> {
  return request('/profile', {
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
