export const PLAYER_AVATAR_IDS = [
  'bolt',
  'bot',
  'cat',
  'crown',
  'flame',
  'gamepad',
  'gem',
  'rocket',
  'shield',
  'sparkles',
  'swords',
  'trophy',
] as const;

export type PlayerAvatarId = typeof PLAYER_AVATAR_IDS[number];

export const PLAYER_FRAME_IDS = ['default', 'neon', 'ember', 'royal'] as const;
export type PlayerFrameId = typeof PLAYER_FRAME_IDS[number];

export const TABLE_THEME_IDS = ['classic', 'midnight', 'aurora'] as const;
export type TableThemeId = typeof TABLE_THEME_IDS[number];

export function isPlayerAvatarId(value: unknown): value is PlayerAvatarId {
  return typeof value === 'string'
    && (PLAYER_AVATAR_IDS as readonly string[]).includes(value);
}

export function isPlayerFrameId(value: unknown): value is PlayerFrameId {
  return typeof value === 'string'
    && (PLAYER_FRAME_IDS as readonly string[]).includes(value);
}

export function isTableThemeId(value: unknown): value is TableThemeId {
  return typeof value === 'string'
    && (TABLE_THEME_IDS as readonly string[]).includes(value);
}
