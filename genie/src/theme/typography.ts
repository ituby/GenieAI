export const typography = {
  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    bold: 'Inter-Bold',
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  lineHeights: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 42,
    '4xl': 48,
    '5xl': 64,
  },
  
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
} as const;

export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.sizes['4xl'],
    lineHeight: typography.lineHeights['4xl'],
    fontWeight: typography.weights.bold,
  },
  h2: {
    fontSize: typography.sizes['3xl'],
    lineHeight: typography.lineHeights['3xl'],
    fontWeight: typography.weights.bold,
  },
  h3: {
    fontSize: typography.sizes['2xl'],
    lineHeight: typography.lineHeights['2xl'],
    fontWeight: typography.weights.bold,
  },
  h4: {
    fontSize: typography.sizes.xl,
    lineHeight: typography.lineHeights.xl,
    fontWeight: typography.weights.medium,
  },
  
  // Body text
  body: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.base,
    fontWeight: typography.weights.normal,
  },
  bodyLarge: {
    fontSize: typography.sizes.lg,
    lineHeight: typography.lineHeights.lg,
    fontWeight: typography.weights.normal,
  },
  bodySmall: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
    fontWeight: typography.weights.normal,
  },
  
  // UI elements
  button: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.base,
    fontWeight: typography.weights.medium,
  },
  caption: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.lineHeights.xs,
    fontWeight: typography.weights.normal,
  },
  label: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
    fontWeight: typography.weights.medium,
  },
} as const;

export type Typography = typeof typography;
export type TextStyles = typeof textStyles;
