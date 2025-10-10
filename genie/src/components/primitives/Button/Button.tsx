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
        backgroundColor: theme.colors.purple[500], // Solid color instead of gradient for now
      },
      secondary: {
        backgroundColor: theme.colors.background.tertiary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.purple[500],
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

    const variantTextStyles = {
      primary: {
        color: theme.colors.text.primary,
      },
      secondary: {
        color: theme.colors.text.primary,
      },
      outline: {
        color: theme.colors.purple[400],
      },
      ghost: {
        color: theme.colors.purple[400],
      },
    };

    return [baseTextStyle, variantTextStyles[variant]];
  };

  const renderContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'secondary'
              ? theme.colors.text.primary
              : theme.colors.purple[400]
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
