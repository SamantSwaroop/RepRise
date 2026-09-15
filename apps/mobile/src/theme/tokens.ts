/**
 * RepRise design tokens — Nord-inspired dark theme.
 *
 * Typography hierarchy:
 *   - Display / numeric (weights, reps, metrics): Tabular figures suitable
 *     for aligned performance stats.
 *   - Body / UI chrome: Highly legible sans-serif for mobile readability.
 */

export const colors = {
  // Polar Night — backgrounds
  background: '#2E3440',
  surface: '#3B4252',
  surfaceRaised: '#434C5E',
  border: '#4C566A',

  // Snow Storm — text
  textPrimary: '#ECEFF4',
  textSecondary: '#E5E9F0',
  textMuted: '#D8DEE9',

  // Frost — primary accent
  accent: '#88C0D0',
  accentStrong: '#5E81AC',

  // Aurora — semantic
  success: '#A3BE8C',
  warning: '#EBCB8B',
  danger: '#BF616A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  control: 8,
  card: 12,
  sheet: 20,
} as const;

export const typography = {
  display: { size: 32, weight: '700' as const },
  h1: { size: 24, weight: '700' as const },
  h2: { size: 20, weight: '600' as const },
  body: { size: 16, weight: '400' as const },
  caption: { size: 13, weight: '400' as const },
} as const;

export const numericText = {
  fontVariant: ['tabular-nums'] as ('tabular-nums')[],
};

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  spring: {
    bouncy: { tension: 180, friction: 12 },
    gentle: { tension: 120, friction: 14 },
    snappy: { tension: 240, friction: 18 },
  },
} as const;
