import assert from 'node:assert/strict';
import test from 'node:test';

import {
  arraysEqual,
  createAccessLogRecords,
  createAccessLogTargets,
  createDoorRingTargets,
  createFuseOrder,
  createTerminalSignal,
  createTerminalTargets,
} from '../src/components/game/devicePuzzleLogic';

test('device puzzle configurations are deterministic and valid', () => {
  const seed = 'room:puzzle:player';
  assert.deepEqual(createFuseOrder(seed), createFuseOrder(seed));
  assert.deepEqual([...createFuseOrder(seed)].sort(), [0, 1, 2, 3]);

  const terminalTargets = createTerminalTargets(seed);
  assert.equal(terminalTargets.length, 4);
  assert.ok(terminalTargets.every((value) => value >= 0 && value < 4));

  const signal = createTerminalSignal(seed);
  assert.equal(signal.length, 5);
  assert.ok(signal.every((value) => value >= 0 && value < 16));

  const access = createAccessLogTargets(seed);
  assert.equal(access.length, 6);
  assert.deepEqual([...access].sort(), ['amber', 'amber', 'green', 'green', 'red', 'red']);
  const records = createAccessLogRecords(seed);
  assert.deepEqual(records, createAccessLogRecords(seed));
  assert.equal(records.length, 6);
  assert.ok(records.every((record) => (
    record.category === 'green' ? record.risk < 40 :
    record.category === 'amber' ? record.risk >= 40 && record.risk < 70 :
    record.risk >= 70
  )));

  const rings = createDoorRingTargets(seed);
  assert.equal(rings.length, 4);
  assert.ok(rings.every((value) => value >= 0 && value < 8));
});

test('array validation rejects missing, extra and reordered steps', () => {
  assert.equal(arraysEqual([1, 2, 3], [1, 2, 3]), true);
  assert.equal(arraysEqual([1, 2], [1, 2, 3]), false);
  assert.equal(arraysEqual([1, 3, 2], [1, 2, 3]), false);
});
