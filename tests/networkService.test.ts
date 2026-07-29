import assert from 'node:assert/strict';
import test from 'node:test';

import { NetworkService } from '../services/NetworkService';

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
