import assert from 'node:assert/strict';
import test from 'node:test';

import { isDailyReturnWindow } from '../services/AnalyticsMetrics';

test('daily return detection only triggers after a full day gap', () => {
  const now = 1_700_000_000_000;

  assert.equal(isDailyReturnWindow(now, now), false);
  assert.equal(isDailyReturnWindow(now - 23 * 60 * 60 * 1000, now), false);
  assert.equal(isDailyReturnWindow(now - 24 * 60 * 60 * 1000 - 1, now), true);
});
