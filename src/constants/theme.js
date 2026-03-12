export const COLORS = {
  bg: '#0D1117',
  surface: '#161B22',
  elevated: '#21262D',
  border: '#30363D',
  accent: '#FF6B35',
  accentLight: '#FF8C5A',
  accentDark: '#D4521A',
  text: '#F0F6FC',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  success: '#3FB950',
  successBg: '#0F2B1A',
  warning: '#D29922',
  error: '#F85149',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};

export const FONT = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOW = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  accentGlow: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  successGlow: {
    shadowColor: '#3FB950',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  warningGlow: {
    shadowColor: '#D29922',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
};

/** Animation timing presets */
export const TIMING = {
  fast:   150,
  normal: 250,
  slow:   450,
  spring:        { damping: 15, stiffness: 220 },
  springBouncy:  { damping: 10, stiffness: 180 },
  springSnappy:  { damping: 20, stiffness: 300 },
};
