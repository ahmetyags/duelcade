/** Runtime network constants that must stay side-effect free for Metro/web bundling. */

export const PROTOCOL_VERSION = '1.9.0' as const;

export const SERVER_CLOSE_CODE = {
  HOST_LEFT: 4100,
  REGISTRATION_REJECTED: 4101,
  REGISTRATION_TIMEOUT: 4102,
} as const;
