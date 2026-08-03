import assert from 'node:assert/strict';
import test from 'node:test';

import { useRoomStore } from '../store/roomStore';

test('rematch votes are idempotent and cleared with the room lifecycle', () => {
  const store = useRoomStore.getState();
  store.clearRoom();

  store.setRematchVote('player-one', true);
  store.setRematchVote('player-one', true);
  store.setRematchVote('player-two', true);
  assert.deepEqual(useRoomStore.getState().rematchVotes, ['player-one', 'player-two']);

  useRoomStore.getState().setRematchVote('player-one', false);
  assert.deepEqual(useRoomStore.getState().rematchVotes, ['player-two']);

  useRoomStore.getState().clearRoom();
  assert.deepEqual(useRoomStore.getState().rematchVotes, []);
});
