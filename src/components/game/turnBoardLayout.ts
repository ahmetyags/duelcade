import { spacing } from '@/theme/tokens';

export const TURN_BOARD_GRID_GAP = spacing.xs;

const COMPACT_HEIGHT = 900;
const COMPACT_BOARD_MAX_WIDTH = 430;
const REGULAR_BOARD_MAX_WIDTH = 560;
const PAGE_HORIZONTAL_PADDING = spacing.xl * 2;
const BOARD_CHROME = spacing.md * 2 + 2;

/**
 * Returns a pixel cell size instead of relying on percentage widths mixed with
 * flex gaps. WebKit rounds that combination differently and can push the final
 * row outside an overflow-hidden board.
 */
export function turnBoardCellSize(
  viewportWidth: number,
  viewportHeight: number,
  columns: number,
): number {
  const maxBoardWidth = viewportHeight < COMPACT_HEIGHT
    ? COMPACT_BOARD_MAX_WIDTH
    : REGULAR_BOARD_MAX_WIDTH;
  const boardWidth = Math.min(
    Math.max(0, viewportWidth - PAGE_HORIZONTAL_PADDING),
    maxBoardWidth,
  );
  const innerWidth = Math.max(0, boardWidth - BOARD_CHROME);
  const gaps = TURN_BOARD_GRID_GAP * Math.max(0, columns - 1);
  return Math.max(1, Math.floor(((innerWidth - gaps) / columns) * 10) / 10);
}
