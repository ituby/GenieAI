import React, { createContext, useContext, ReactNode } from 'react';
import { colors, Colors } from './colors';
import { typography, textStyles, Typography, TextStyles } from './typography';
import { spacing, borderRadius, Spacing, BorderRadius } from './spacing';

export interface Theme {
  colors: Colors;
  typography: Typography;
  textStyles: TextStyles;
  spacing: Spacing;
  borderRadius: BorderRadius;
  isDark: boolean;
}

export const theme: Theme = {
  colors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  isDark: true,
};

const ThemeContext = createContext<Theme>(theme);

interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  theme: customTheme = theme 
}) => {
  return (
    <ThemeContext.Provider value={customTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export individual theme parts
export { colors, typography, textStyles, spacing, borderRadius };
export type { Colors, Typography, TextStyles, Spacing, BorderRadius };
