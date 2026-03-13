export const colors = {
  background: '#05070A',
  surface: '#10131A',
  surfaceSoft: '#151925',
  surfaceElevated: '#1B2132',
  borderSubtle: '#222839',
  borderStrong: '#3A4258',
  textPrimary: '#F7F8FC',
  textSecondary: '#A5AECE',
  textMuted: '#6C7390',
  textDanger: '#F56565',
  accent: '#FF5C7A',
  accentSoft: 'rgba(255,92,122,0.16)',
  accentStrong: '#FF8FA4',
  success: '#34D399',
  warning: '#FBBF24',
  dangerStrong: '#DC2626',
  outline: '#2D3345',
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 20,
  },
  accentGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 18,
  },
};

export const typography = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.1,
  },
};
