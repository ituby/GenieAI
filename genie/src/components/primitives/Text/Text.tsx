import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../../theme/index';

export type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'body' 
  | 'bodyLarge' 
  | 'bodySmall' 
  | 'button' 
  | 'caption' 
  | 'label';

export type TextColor = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'disabled' 
  | 'inverse' 
  | 'purple' 
  | 'success' 
  | 'warning' 
  | 'error';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  style,
  children,
  ...props
}) => {
  const theme = useTheme();

  const getTextStyles = () => {
    const variantStyle = theme.textStyles[variant];
    
    const colorStyles = {
      primary: { color: theme.colors.text.primary },
      secondary: { color: theme.colors.text.secondary },
      tertiary: { color: theme.colors.text.tertiary },
      disabled: { color: theme.colors.text.disabled },
      inverse: { color: theme.colors.text.inverse },
      purple: { color: theme.colors.purple[400] },
      success: { color: theme.colors.status.success },
      warning: { color: theme.colors.status.warning },
      error: { color: theme.colors.status.error },
    };

    return [
      variantStyle,
      colorStyles[color],
      style,
    ];
  };

  return (
    <RNText style={getTextStyles()} {...props}>
      {children}
    </RNText>
  );
};
