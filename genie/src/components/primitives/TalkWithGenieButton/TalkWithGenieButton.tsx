import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../Icon';
import { Text } from '../Text';

interface TalkWithGenieButtonProps {
  onPress: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const TalkWithGenieButton: React.FC<TalkWithGenieButtonProps> = ({
  onPress,
  disabled = false,
  size = 'medium',
  style,
}) => {
  return (
    <LinearGradient
      colors={['#FFFF68', '#FFFF68']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBorder}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={styles.button}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Talk with Genie</Text>
          <Icon
            name="sparkle"
            size={size === 'small' ? 14 : size === 'large' ? 18 : 16}
            color="#FFFF68"
            weight="fill"
          />
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 16,
    padding: 2,
    width: '100%',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
