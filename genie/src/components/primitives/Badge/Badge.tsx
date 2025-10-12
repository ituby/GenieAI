import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../../theme';

interface BadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  size = 'small',
  color,
  backgroundColor,
}) => {
  const theme = useTheme();

  if (count <= 0) return null;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          fontSize: 10,
        };
      case 'medium':
        return {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          fontSize: 12,
        };
      case 'large':
        return {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          fontSize: 14,
        };
      default:
        return {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          fontSize: 10,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        sizeStyles,
        {
          backgroundColor: backgroundColor || theme.colors.status.error,
        },
      ]}
    >
      <Text
        variant="caption"
        style={[
          styles.text,
          {
            color: color || theme.colors.text.onPrimary,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
