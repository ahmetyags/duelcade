import assert from 'node:assert/strict';
import test from 'node:test';

import { generateGuestDisplayName } from '../services/GuestIdentity';

test('generated guest names always use the stable Guest-#### format', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    assert.match(generateGuestDisplayName(seed), /^Guest-\d{4}$/);
  }
});
