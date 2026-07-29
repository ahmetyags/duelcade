/** Industrial terminal design tokens derived from the four device artworks. */

export const colors = {
  // Deep facility surfaces
  backgroundDeep: '#F7F4EE',
  background: '#FBFAF7',
  surfaceDark: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F7F5',
  surfaceMuted: '#F4F1EA',

  // Worn metal and structural frames
  metalDark: '#E7ECE9',
  metal: '#CAD4CF',
  metalLight: '#F7F9F8',
  borderDark: '#D8DED9',
  border: '#C9D5D0',
  borderFocused: '#168F86',
  borderSubtle: '#E1E7E3',

  // Terminal data and mechanical energy
  teal: '#1C665F',
  cyan: '#55C9BE',
  cyanMuted: '#2D8179',
  amber: '#D99A4A',
  amberMuted: '#9B6E36',
  amberStrong: '#EDB760',
  actionCyan: '#45DCCB',
  actionAmber: '#F2AB45',
  actionAmberDark: '#9A5D20',
  primary: '#2CCABB',
  primaryDark: '#14786F',
  primaryContainer: '#DDF5F1',
  secondary: '#F2AB45',
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
  textPrimary: '#17231F',
  textSecondary: '#4F5E57',
  textMuted: '#7B8982',
  textOnPrimary: '#10211D',
  textOnAccent: '#181208',

  // Overlays and restrained glow
  overlay: 'rgba(247, 244, 238, 0.96)',
  overlayLight: 'rgba(255, 255, 255, 0.92)',
  scanline: 'rgba(20, 120, 111, 0.025)',
  glow: 'rgba(44, 202, 187, 0.16)',
  glowOrange: 'rgba(217, 154, 74, 0.20)',
  glowRed: 'rgba(215, 108, 92, 0.20)',
  glowGreen: 'rgba(82, 188, 131, 0.18)',

  alarmRed: '#D76C5C',
  alarmBackground: 'rgba(215, 108, 92, 0.13)',
} as const;

/** Compact four-point rhythm suited to dense terminal controls. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Restrained radii keep panels mechanical instead of toy-like. */
export const radius = {
  none: 0,
  sm: 7,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const typography = {
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

/** Short dark shadows and restrained glows suggest mounted metal hardware. */
export const shadows = {
  sm: {
    boxShadow: '0 3px 0 rgba(0, 0, 0, 0.42)',
    elevation: 2,
  },
  md: {
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.38)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0 10px 22px rgba(0, 0, 0, 0.46)',
    elevation: 7,
  },
  glow: {
    boxShadow: '0 0 12px rgba(85, 201, 190, 0.18)',
    elevation: 2,
  },
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  entrance: 500,
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
