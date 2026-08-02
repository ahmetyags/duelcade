import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NetworkService,
  type NetworkTransport,
} from '../services/NetworkService';

test('action ids are epoch-seeded and monotonic for authoritative movement', () => {
  const before = Date.now() * 1000;
  const firstSession = new NetworkService();
  const first = firstSession.nextActionId();
  const second = firstSession.nextActionId();

  assert.ok(first >= before);
  assert.ok(second > first);

  const reloadedSession = new NetworkService();
  const afterReload = reloadedSession.nextActionId();
  assert.ok(afterReload >= first);
});

test('failed connection attempts leave the service in an error state', async () => {
  const service = new NetworkService();
  const transport: NetworkTransport = {
    connect: async () => {
      throw new Error('offline');
    },
    reconnect: async () => {
      throw new Error('expired');
    },
    disconnect: () => {},
    getSession: () => null,
    send: () => {},
    onEvent: () => () => {},
    onConnectionChange: () => () => {},
    onPingUpdate: () => () => {},
  };
  service.setTransport(transport);

  await assert.rejects(service.connect('ABC123', 'player-one'), /offline/);
  assert.equal(service.getConnectionState(), 'error');

  await assert.rejects(
    service.reconnect('ABC123', 'player-one', 'expired-token'),
    /expired/,
  );
  assert.equal(service.getConnectionState(), 'error');
});
