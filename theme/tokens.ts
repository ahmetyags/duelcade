/** Duelcade's shared modern-neon-arcade design language. */

export const colors = {
  // Layered warm-neutral surfaces. These deliberately avoid an all-white card stack.
  backgroundDeep: '#F3F0E9',
  background: '#F8F6F1',
  surfaceDark: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#EDF7F4',
  surfaceMuted: '#EEEAE2',
  surfaceHigh: '#FFFFFF',
  surfaceTeal: '#E2F6F2',
  surfaceAmber: '#FFF0DA',

  // Worn metal and structural frames
  metalDark: '#E7ECE9',
  metal: '#CAD4CF',
  metalLight: '#F7F9F8',
  borderDark: '#B8C8C2',
  border: '#C8D6D1',
  borderFocused: '#168F86',
  borderSubtle: '#DDE6E2',

  // Terminal data and mechanical energy
  teal: '#116C64',
  cyan: '#2FCFC0',
  cyanMuted: '#278D84',
  amber: '#E49734',
  amberMuted: '#9B6E36',
  amberStrong: '#EDB760',
  actionCyan: '#25D4C4',
  actionAmber: '#F5A63A',
  actionAmberDark: '#A25B12',
  primary: '#22C8B8',
  primaryDark: '#0C746B',
  primaryContainer: '#DDF5F1',
  secondary: '#F3A33A',
  secondaryDark: '#684722',
  secondaryContainer: '#FFF0D8',
  accent: '#F2AB45',

  // Functional states
  success: '#52BC83',
  warning: '#D5A34F',
  error: '#D76C5C',
  info: '#62B6C4',
  disabled: '#4A5550',
  rare: '#9AABA4',

  // Puzzle signal colors retained as controlled device lamps
  ruby: '#D76C5C',
  sapphire: '#62B6C4',
  emerald: '#52BC83',
  sunlight: '#D99A4A',
  peach: '#C98255',
  lavender: '#84958E',
  operator: '#45DCCB',
  operatorContainer: '#12312C',
  explorer: '#F2AB45',
  explorerContainer: '#33281B',

  // Typography
  textPrimary: '#14231F',
  textSecondary: '#465852',
  textMuted: '#687A73',
  textOnPrimary: '#10211D',
  textOnAccent: '#181208',

  // Overlays and restrained glow
  overlay: 'rgba(248, 246, 241, 0.94)',
  overlayLight: 'rgba(255, 255, 255, 0.90)',
  modalScrim: 'rgba(12, 32, 28, 0.52)',
  scanline: 'rgba(20, 120, 111, 0.025)',
  glow: 'rgba(44, 202, 187, 0.16)',
  glowOrange: 'rgba(217, 154, 74, 0.20)',
  glowRed: 'rgba(215, 108, 92, 0.20)',
  glowGreen: 'rgba(82, 188, 131, 0.18)',

  alarmRed: '#D76C5C',
  alarmBackground: 'rgba(215, 108, 92, 0.13)',
} as const;

/** A compact four-point rhythm tuned for 320–430 px mobile layouts. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Slightly sharpened radii keep the interface geometric, not toy-like. */
export const radius = {
  none: 0,
  sm: 7,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 42,
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 17,
    letterSpacing: 0.8,
  },
  mono: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 2,
  },
  monoLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 4,
  },
} as const;

/** Soft elevation plus focused brand glows. Avoid applying glow to whole screens. */
export const shadows = {
  sm: {
    boxShadow: '0 2px 5px rgba(20, 52, 45, 0.10)',
    elevation: 2,
  },
  md: {
    boxShadow: '0 8px 20px rgba(20, 52, 45, 0.12)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0 18px 42px rgba(16, 46, 39, 0.18)',
    elevation: 7,
  },
  glow: {
    boxShadow: '0 0 18px rgba(37, 212, 196, 0.24)',
    elevation: 2,
  },
  glowAmber: {
    boxShadow: '0 0 18px rgba(245, 166, 58, 0.24)',
    elevation: 2,
  },
} as const;

export const animation = {
  fast: 140,
  normal: 220,
  slow: 380,
  entrance: 260,
  alarm: 600,
} as const;

export const zIndex = {
  background: 0,
  content: 1,
  overlay: 10,
  modal: 20,
  hud: 30,
  toast: 40,
  alert: 50,
} as const;

/** Room accents remain inside the same facility palette. */
export const roomThemes: Record<string, { primary: string; accent: string; ambient: string }> = {
  control_room: { primary: '#55C9BE', accent: '#D99A4A', ambient: '#081310' },
  laboratory: { primary: '#52BC83', accent: '#62B6C4', ambient: '#091713' },
  archive: { primary: '#62B6C4', accent: '#D99A4A', ambient: '#091512' },
  generator_room: { primary: '#D99A4A', accent: '#D76C5C', ambient: '#161109' },
  security_hall: { primary: '#D76C5C', accent: '#62B6C4', ambient: '#140C0A' },
  server_room: { primary: '#55C9BE', accent: '#87978F', ambient: '#071411' },
  vault: { primary: '#D99A4A', accent: '#52BC83', ambient: '#130F08' },
  maintenance_tunnel: { primary: '#87978F', accent: '#62B6C4', ambient: '#0D1210' },
  observation_room: { primary: '#62B6C4', accent: '#87978F', ambient: '#091310' },
  escape_gate: { primary: '#52BC83', accent: '#D99A4A', ambient: '#08140F' },
};

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type TypographyToken = keyof typeof typography;
