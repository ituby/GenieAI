import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/index';
import { ButtonProps } from './Button.types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  style,
  ...props
}) => {
  const theme = useTheme();

  const getButtonStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: disabled ? 0.6 : 1,
    };

    const sizeStyles = {
      xs: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        minHeight: 28,
      },
      sm: {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        minHeight: 36,
      },
      md: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        minHeight: 44,
      },
      lg: {
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[4],
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: '#FFFF68', // Official Genie yellow
      },
      secondary: {
        backgroundColor: theme.colors.background.tertiary, // Darker gray
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border.secondary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return [
      baseStyle,
      sizeStyles[size],
      variantStyles[variant],
      fullWidth && { width: '100%' as const },
      style,
    ];
  };

  const getTextStyles = () => {
    const baseTextStyle = {
      ...theme.textStyles.button,
      textAlign: 'center' as const,
    };

    const sizeTextStyles = {
      xs: {
        fontSize: theme.typography.sizes.xs,
        lineHeight: theme.typography.lineHeights.xs,
      },
      sm: {
        fontSize: theme.typography.sizes.sm,
        lineHeight: theme.typography.lineHeights.sm,
      },
      md: {
        fontSize: theme.typography.sizes.base,
        lineHeight: theme.typography.lineHeights.base,
      },
      lg: {
        fontSize: theme.typography.sizes.lg,
        lineHeight: theme.typography.lineHeights.lg,
      },
    };

    const variantTextStyles = {
      primary: {
        color: '#000000', // Black text on yellow background
      },
      secondary: {
        color: theme.colors.text.primary, // White text on darker gray background
      },
      outline: {
        color: theme.colors.text.secondary,
      },
      ghost: {
        color: theme.colors.text.secondary,
      },
    };

    return [baseTextStyle, sizeTextStyles[size], variantTextStyles[variant]];
  };

  const renderContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'secondary'
              ? theme.colors.text.inverse
              : theme.colors.primary[400]
          }
        />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={getTextStyles()}>{children}</Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      {...props}
      style={getButtonStyles()}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
