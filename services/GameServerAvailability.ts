const DEFAULT_SERVER_URL = 'http://localhost:2567';

export const GAME_SERVER_URL =
  process.env.EXPO_PUBLIC_GAME_SERVER_URL ?? DEFAULT_SERVER_URL;

export type GameServerStatus = 'checking' | 'waking' | 'ready' | 'unavailable';

interface WarmUpOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly retryDelayMs?: number;
  readonly onProgress?: (status: Extract<GameServerStatus, 'checking' | 'waking'>) => void;
}

export function getGameServerHealthUrl(endpoint = GAME_SERVER_URL): string {
  return `${getGameServerHttpUrl(endpoint)}/health`;
}

export function getGameServerHttpUrl(endpoint = GAME_SERVER_URL): string {
  return endpoint
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:')
    .replace(/\/+$/, '');
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

async function probeServer(
  healthUrl: string,
  requestTimeoutMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  const timeout = setTimeout(abortRequest, requestTimeoutMs);
  signal?.addEventListener('abort', abortRequest, { once: true });

  try {
    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return false;
    const payload = await response.json() as { ok?: boolean };
    return payload.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
}

/**
 * Wakes sleeping hobby-tier servers and waits until the health endpoint is ready.
 * A sleeping Render instance can take close to a minute, so short probes are
 * retried instead of making the player press an online action repeatedly.
 */
export async function warmUpGameServer({
  signal,
  timeoutMs = 90_000,
  requestTimeoutMs = 15_000,
  retryDelayMs = 3_000,
  onProgress,
}: WarmUpOptions = {}): Promise<Extract<GameServerStatus, 'ready' | 'unavailable'>> {
  const startedAt = Date.now();
  let attempt = 0;

  while (!signal?.aborted && Date.now() - startedAt < timeoutMs) {
    onProgress?.(attempt === 0 ? 'checking' : 'waking');
    if (await probeServer(getGameServerHealthUrl(), requestTimeoutMs, signal)) {
      return 'ready';
    }

    attempt += 1;
    if (!signal?.aborted) await waitForRetry(retryDelayMs, signal);
  }

  return 'unavailable';
}
