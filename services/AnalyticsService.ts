import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getAccessTokenForNetwork } from '@/services/AccessTokenProvider';
import { getGameServerHttpUrl } from '@/services/GameServerAvailability';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

export const ANALYTICS_QUEUE_KEY = 'duelcade_analytics_queue';
export const ANALYTICS_CONTRACT_VERSION = 1;
const MAX_QUEUE_SIZE = 100;
const BATCH_SIZE = 25;
const SESSION_ID = randomUuid();

export type AnalyticsEventName =
  | 'app_session_started'
  | 'tutorial_started'
  | 'tutorial_completed'
  | 'match_started'
  | 'first_move'
  | 'match_completed'
  | 'match_abandoned'
  | 'rematch_requested'
  | 'progression_viewed'
  | 'quest_claimed';

export interface AnalyticsProperties {
  playMode?: 'online' | 'solo' | 'tutorial';
  difficulty?: 'easy' | 'medium' | 'hard';
  result?: 'win' | 'loss' | 'draw' | 'abandoned';
  durationBucket?: 'under_2m' | '2_to_5m' | 'over_5m';
  durationMs?: number;
  roundCount?: number;
  questKey?: 'play_duel' | 'win_duel' | 'win_rounds';
  mode?: 'rune_grid' | 'memory_pairs' | 'circuit_claim' | 'neon_trail';
  isReturningSession?: boolean;
}

interface QueuedAnalyticsEvent {
  ownerId: string;
  id: string;
  name: AnalyticsEventName;
  sessionId: string;
  occurredAt: number;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
  properties: AnalyticsProperties;
}

let queueOperation: Promise<void> = Promise.resolve();

function randomUuid(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function analyticsPlatform(): 'android' | 'ios' | 'web' {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return 'web';
}

function enqueue(operation: () => Promise<void>): Promise<void> {
  queueOperation = queueOperation.then(operation, operation);
  return queueOperation;
}

async function readQueue(): Promise<QueuedAnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.slice(-MAX_QUEUE_SIZE) : [];
  } catch {
    return [];
  }
}

async function saveQueue(events: readonly QueuedAnalyticsEvent[]): Promise<void> {
  if (events.length === 0) {
    await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(
    ANALYTICS_QUEUE_KEY,
    JSON.stringify(events.slice(-MAX_QUEUE_SIZE)),
  );
}

export function durationBucket(durationMs: number): AnalyticsProperties['durationBucket'] {
  if (durationMs < 2 * 60_000) return 'under_2m';
  if (durationMs <= 5 * 60_000) return '2_to_5m';
  return 'over_5m';
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {},
): void {
  if (!useSettingsStore.getState().usageAnalyticsEnabled) return;
  const user = useAuthStore.getState().user;
  if (!user?.serverBacked) return;
  const event: QueuedAnalyticsEvent = {
    ownerId: user.id,
    id: randomUuid(),
    name,
    sessionId: SESSION_ID,
    occurredAt: Date.now(),
    platform: analyticsPlatform(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    properties,
  };
  void enqueue(async () => {
    const queue = await readQueue();
    await saveQueue([...queue, event]);
  }).then(() => flushAnalyticsEvents());
}

export async function flushAnalyticsEvents(): Promise<void> {
  if (!useSettingsStore.getState().usageAnalyticsEnabled) return;
  return enqueue(async () => {
    const user = useAuthStore.getState().user;
    if (!user?.serverBacked) return;
    const token = await getAccessTokenForNetwork();
    if (!token) return;
    const queue = await readQueue();
    const owned = queue.filter((event) => event.ownerId === user.id);
    const batch = owned.slice(0, BATCH_SIZE);
    if (batch.length === 0) {
      await saveQueue(owned);
      return;
    }
    try {
      const response = await fetch(`${getGameServerHttpUrl()}/v1/analytics/events`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractVersion: ANALYTICS_CONTRACT_VERSION,
          events: batch.map(({ ownerId: _ownerId, ...event }) => event),
        }),
      });
      if (!response.ok) return;
      const sentIds = new Set(batch.map((event) => event.id));
      await saveQueue(owned.filter((event) => !sentIds.has(event.id)));
    } catch {
      // Offline events stay queued and are retried during the next session.
    }
  });
}

export function clearAnalyticsQueue(): Promise<void> {
  return enqueue(() => AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY));
}
