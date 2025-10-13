import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme';

interface CustomRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
}

export const CustomRefreshControl: React.FC<CustomRefreshControlProps> = ({
  refreshing,
  onRefresh,
  tintColor,
}) => {
  const theme = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (refreshing) {
      setShowLoader(true);
      
      // Show loader with fade in
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Start spinning animation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      // Keep loader visible for 3 seconds, then hide
      const timer = setTimeout(() => {
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowLoader(false);
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // Hide loader immediately if refreshing stops
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowLoader(false);
      });
      
      // Stop spinning
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [refreshing, spinValue, opacityValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!showLoader) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: opacityValue }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Icon
          name="spinner"
          size={20}
          color={tintColor || theme.colors.yellow[500]}
          weight="fill"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
