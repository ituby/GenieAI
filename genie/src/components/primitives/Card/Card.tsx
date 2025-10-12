import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/index';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  style,
  children,
  ...props
}) => {
  const theme = useTheme();

  const getCardStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background.card,
    };

    const paddingStyles = {
      none: {},
      sm: { padding: theme.spacing[3] },
      md: { padding: theme.spacing[4] },
      lg: { padding: theme.spacing[6] },
    };

    const variantStyles = {
      default: {
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
      },
      elevated: {
        shadowColor: theme.colors.primary[500],
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
      },
      gradient: {
        backgroundColor: `${theme.colors.background.card}30`, // More visible light gray instead of gradient
      },
    };

    return [
      baseStyle,
      paddingStyles[padding],
      variantStyles[variant],
      style,
    ];
  };

  return (
    <View style={getCardStyles()} {...props}>
      {children}
    </View>
  );
};
