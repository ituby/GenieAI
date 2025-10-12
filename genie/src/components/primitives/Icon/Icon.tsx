import React from 'react';
import * as PhosphorIcons from 'phosphor-react-native';
import { useTheme } from '../../../theme/index';

export type IconName = string; // Allow any Phosphor icon name

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

// Convert icon name to PascalCase for Phosphor component lookup
const getIconComponent = (iconName: string) => {
  const pascalCaseName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  return (PhosphorIcons as any)[pascalCaseName];
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  weight = 'regular',
}) => {
  const theme = useTheme();
  const IconComponent = getIconComponent(name);
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Phosphor library`);
    // Fallback to a default icon
    const FallbackIcon = (PhosphorIcons as any).Question;
    return (
      <FallbackIcon
        size={size}
        color={color || theme.colors.text.tertiary}
        weight={weight}
      />
    );
  }

  return (
    <IconComponent
      size={size}
      color={color || theme.colors.text.primary}
      weight={weight}
    />
  );
};
