import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGameServerHealthUrl,
  warmUpGameServer,
} from '../services/GameServerAvailability';

test('health endpoint uses HTTP equivalents for secure and local WebSocket URLs', () => {
  assert.equal(
    getGameServerHealthUrl('wss://duelcade.example.com/'),
    'https://duelcade.example.com/health',
  );
  assert.equal(
    getGameServerHealthUrl('ws://127.0.0.1:2567'),
    'http://127.0.0.1:2567/health',
  );
});

test('server warm-up retries failed probes until the server reports ready', async () => {
  const originalFetch = globalThis.fetch;
  const progress: string[] = [];
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      calls === 1 ? JSON.stringify({ ok: false }) : JSON.stringify({ ok: true }),
      {
        status: calls === 1 ? 503 : 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  };

  try {
    const result = await warmUpGameServer({
      timeoutMs: 1_000,
      requestTimeoutMs: 100,
      retryDelayMs: 1,
      onProgress: (status) => progress.push(status),
    });

    assert.equal(result, 'ready');
    assert.equal(calls, 2);
    assert.deepEqual(progress, ['checking', 'waking']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
