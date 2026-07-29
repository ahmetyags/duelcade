import assert from 'node:assert/strict';
import test from 'node:test';

import { useGameStore } from '../store/gameStore';
import type { GameSnapshot } from '../types/game';

test('reconnect checkpoint restores progress, time and mistakes', () => {
  const snapshot: GameSnapshot = {
    snapshotId: 'snapshot_reconnect',
    roomId: 'ABC123',
    seed: 'seed_reconnect',
    roles: {
      guide: 'operator',
      adventurer: 'explorer',
    },
    currentRoomId: 'ABC123',
    solvedPuzzleIds: ['puzzle_1', 'puzzle_2'],
    remainingTimeMs: 321_000,
    doorStates: {},
    powerStates: {},
    playerPosition: { x: 80, y: 120 },
    createdAt: Date.now(),
    attemptCount: 2,
    mistakeCount: 2,
  };

  useGameStore.getState().resetGame();
  useGameStore.getState().restoreCheckpoint(snapshot);

  const restored = useGameStore.getState();
  assert.deepEqual(restored.solvedPuzzleIds, ['puzzle_1', 'puzzle_2']);
  assert.equal(restored.remainingTimeMs, 321_000);
  assert.equal(restored.mistakeCount, 2);
});

test('checkpoint and feedback cannot count the same solved puzzle twice', () => {
  useGameStore.getState().resetGame();
  useGameStore.setState({ solvedPuzzleIds: ['puzzle_alpha'] });

  useGameStore.getState().markPuzzleSolved('puzzle_alpha', [], []);

  assert.deepEqual(useGameStore.getState().solvedPuzzleIds, ['puzzle_alpha']);
});
