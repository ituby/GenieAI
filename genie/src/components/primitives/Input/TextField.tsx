import React, { useState } from 'react';
import {
  TextInput,
  View,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: any;
  inputStyle?: any;
  multiline?: boolean;
  numberOfLines?: number;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  containerStyle,
  inputStyle,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      flexDirection: 'row' as const,
      alignItems: props.multiline ? 'flex-start' as const : 'center' as const,
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
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[4],
        minHeight: 52,
      },
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.colors.background.secondary,
        borderColor: error
          ? theme.colors.border.error
          : isFocused
          ? theme.colors.border.focus
          : theme.colors.border.primary,
      },
      filled: {
        backgroundColor: theme.colors.background.tertiary,
        borderColor: 'transparent',
      },
    };

    return [
      baseStyle,
      sizeStyles[size],
      variantStyles[variant],
      containerStyle,
    ];
  };

  const getInputStyles = () => {
    const baseStyle = {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: theme.typography.sizes.base,
      fontFamily: theme.typography.fonts.regular,
      textAlign: 'center',
    };

    return [baseStyle, inputStyle];
  };

  return (
    <View>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      
      <View style={getContainerStyles()}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={getInputStyles()}
          placeholderTextColor={theme.colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {(error || helperText) && (
        <Text
          variant="caption"
          color={error ? 'error' : 'tertiary'}
          style={styles.helperText}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  helperText: {
    marginTop: 4,
  },
});
