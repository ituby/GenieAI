import React from 'react';
import { 
  Target,
  Briefcase,
  Brain,
  Sparkle,
  Heart,
  CheckCircle,
  Circle,
  Plus,
  ArrowLeft,
  DotsThree,
  Fire,
  ClipboardText,
  Sun,
  MoonStars,
  Sunset,
  User,
  SignOut,
  Bell,
  Gear,
  Trophy,
  TrendUp,
  Calendar,
  CalendarCheck,
  Clock,
} from 'phosphor-react-native';
import { useTheme } from '../../../theme/index';

export type IconName = 
  | 'target'
  | 'briefcase' 
  | 'brain'
  | 'sparkle'
  | 'heart'
  | 'check-circle'
  | 'circle'
  | 'plus'
  | 'arrow-left'
  | 'dots-three'
  | 'fire'
  | 'clipboard-text'
  | 'sun'
  | 'moon-stars'
  | 'sunset'
  | 'user'
  | 'sign-out'
  | 'bell'
  | 'gear'
  | 'trophy'
  | 'trend-up'
  | 'calendar'
  | 'calendar-check'
  | 'clock';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

const iconMap = {
  'target': Target,
  'briefcase': Briefcase,
  'brain': Brain,
  'sparkle': Sparkle,
  'heart': Heart,
  'check-circle': CheckCircle,
  'circle': Circle,
  'plus': Plus,
  'arrow-left': ArrowLeft,
  'dots-three': DotsThree,
  'fire': Fire,
  'clipboard-text': ClipboardText,
  'sun': Sun,
  'moon-stars': MoonStars,
  'sunset': Sunset,
  'user': User,
  'sign-out': SignOut,
  'bell': Bell,
  'gear': Gear,
  'trophy': Trophy,
  'trend-up': TrendUp,
  'calendar': Calendar,
  'calendar-check': CalendarCheck,
  'clock': Clock,
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  weight = 'regular',
}) => {
  const theme = useTheme();
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color || theme.colors.text.primary}
      weight={weight}
    />
  );
};
