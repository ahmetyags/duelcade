import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TURN_BOARD_GRID_GAP,
  turnBoardCellSize,
} from '../src/components/game/turnBoardLayout';

for (const device of [
  { name: 'iPhone 15 Safari portrait', width: 393, height: 852 },
  { name: 'iPhone 15 Safari landscape', width: 852, height: 393 },
  { name: 'Android Chrome portrait', width: 412, height: 915 },
  { name: 'compact Android Chrome', width: 360, height: 800 },
]) {
  test(`${device.name} keeps every hard grid column inside the board`, () => {
    for (const columns of [3, 4, 5, 6, 7, 8, 9]) {
      const cell = turnBoardCellSize(device.width, device.height, columns);
      const usedWidth = cell * columns + TURN_BOARD_GRID_GAP * (columns - 1);
      const maxBoardWidth = Math.min(device.width - 48, device.height < 900 ? 430 : 560);
      const innerWidth = maxBoardWidth - 26;
      assert.ok(usedWidth <= innerWidth, `${columns} columns overflow by ${usedWidth - innerWidth}px`);
      assert.ok(cell > 0);
    }
  });
}
