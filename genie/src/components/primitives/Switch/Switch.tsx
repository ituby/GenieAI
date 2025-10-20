import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';

export interface SwitchProps extends RNSwitchProps {
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ 
  disabled = false, 
  ...props 
}) => {
  const theme = useTheme();

  return (
    <RNSwitch
      trackColor={{
        false: theme.colors.border.secondary,
        true: theme.colors.yellow[500],
      }}
      thumbColor={
        props.value 
          ? '#000000'  // Black when active (on)
          : '#FFFFFF'  // White when inactive (off)
      }
      disabled={disabled}
      {...props}
    />
  );
};
