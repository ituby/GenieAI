export const colors = {
  // Dark theme base colors
  background: {
    primary: '#0A0A0B',      // Deep black
    secondary: '#1A1A1D',    // Dark gray
    tertiary: '#2D2D30',     // Medium gray
    card: '#1E1E21',         // Card background
    modal: '#16161A',        // Modal background
  },
  
  // Purple accent colors (main brand)
  purple: {
    50: '#F3E8FF',
    100: '#E9D5FF',
    200: '#D8B4FE',
    300: '#C084FC',
    400: '#A855F7',
    500: '#8B5CF6',   // Primary purple
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  
  // Electric blue accents
  blue: {
    400: '#38BDF8',
    500: '#06B6D4',   // Electric blue
    600: '#0891B2',
  },
  
  // Neon green for success
  green: {
    400: '#4ADE80',
    500: '#10B981',   // Neon green
    600: '#059669',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',      // Pure white
    secondary: '#D1D5DB',    // Light gray
    tertiary: '#9CA3AF',     // Medium gray
    disabled: '#6B7280',     // Disabled gray
    inverse: '#000000',      // Black for light backgrounds
  },
  
  // Status colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
  },
  
  // Border colors
  border: {
    primary: '#374151',      // Dark border
    secondary: '#4B5563',    // Medium border
    focus: '#8B5CF6',        // Purple focus
    error: '#EF4444',        // Error border
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    medium: 'rgba(0, 0, 0, 0.7)',
    heavy: 'rgba(0, 0, 0, 0.9)',
  },
  
  // Gradient colors
  gradients: {
    primary: ['#8B5CF6', '#A855F7'],
    secondary: ['#06B6D4', '#38BDF8'],
    success: ['#10B981', '#4ADE80'],
    dark: ['#0A0A0B', '#1A1A1D'],
  },
} as const;

export type Colors = typeof colors;
