export const colors = {
  // Official Genie colors: Yellow, White, Dark Blue
  background: {
    primary: '#0A0C10',      // Very dark blue (almost black)
    secondary: '#101215',    // Dark blue-gray
    tertiary: '#181A1F',     // Medium dark blue
    card: '#1F2126',         // Card background (subtle blue tint)
    modal: '#101215',        // Modal background (dark blue)
  },
  
  // Neutral grayscale colors
  primary: {
    50: '#F9F9F9',
    100: '#F0F0F0',
    200: '#E0E0E0',
    300: '#D0D0D0',
    400: '#B0B0B0',
    500: '#808080',   // Neutral gray
    600: '#606060',
    700: '#404040',
    800: '#202020',
    900: '#000000',
  },
  
  // Secondary grayscale colors
  secondary: {
    50: '#FFFFFF',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D5D5D5',
    400: '#C5C5C5',
    500: '#909090',   // Light gray
    600: '#707070',
    700: '#505050',
    800: '#303030',
    900: '#101010',
  },
  
  // Official yellow color palette
  yellow: {
    50: '#FFFFF0',
    100: '#FFFFE0',
    200: '#FFFFC0',
    300: '#FFFFA0',
    400: '#FFFF80',
    500: '#FFFF68',   // Official Genie yellow
    600: '#FFFF68',
    700: '#FFFF68',
    800: '#B3B300',
    900: '#999900',
  },
  
  // Neutral blue accents
  blue: {
    400: '#808080',
    500: '#606060',   // Neutral gray
    600: '#404040',
  },
  
  // Neutral green
  green: {
    400: '#808080',
    500: '#606060',   // Neutral gray
    600: '#404040',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',      // Pure white
    secondary: '#CCCCCC',    // Light gray
    tertiary: '#999999',      // Medium gray
    disabled: '#666666',     // Disabled gray
    inverse: '#000000',      // Black for light backgrounds
  },
  
  // Status colors (using official colors)
  status: {
    success: '#FFFF68',      // Official yellow
    warning: '#FFFF68',      // Official yellow
    error: '#FF4444',        // Red for errors
    info: '#FFFFFF',         // White for info
  },
  
  // Border colors
  border: {
    primary: '#404040',      // Dark border
    secondary: '#606060',    // Medium border
    focus: '#FFFFFF',        // White focus
    error: '#999999',        // Gray border
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    medium: 'rgba(0, 0, 0, 0.7)',
    heavy: 'rgba(0, 0, 0, 0.9)',
  },
  
  // Gradient colors (using official colors)
  gradients: {
    primary: ['#FFFF68', '#FFFFFF'],     // Official yellow to white
    secondary: ['#FFFFFF', '#FFFF68'],   // White to yellow
    success: ['#FFFF68', '#FFFFFF'],     // Yellow to white
    warning: ['#FFFF68', '#FFFFFF'],     // Yellow to white
    dark: ['#000000', '#1A1A1A'],        // Black gradient
  },
} as const;

export type Colors = typeof colors;
