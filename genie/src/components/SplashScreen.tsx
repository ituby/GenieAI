import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationFinish,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo symbol animation (scale up with subtle bounce)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo type animation (slide up from mask below logo symbol with subtle bounce)
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.98,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onAnimationFinish after animations complete
      if (onAnimationFinish) {
        setTimeout(onAnimationFinish, 4000); // Wait 4 seconds before finishing (2 seconds + 2 additional)
      }
    });
  }, [scaleAnim, fadeAnim, onAnimationFinish]);

  return (
    <View style={styles.container}>
      {/* Logo Symbol */}
      <Animated.View
        style={[
          styles.logoSymbol,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/LogoSymbol.webp')}
          style={styles.logoSymbolImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Logo Type */}
      <Animated.View
        style={[
          styles.logoType,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/LogoType.webp')}
          style={styles.logoTypeImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    width: 140,
    height: 140,
    marginBottom: 30,
  },
  logoSymbolImage: {
    width: '100%',
    height: '100%',
  },
  logoType: {
    width: 120,
    height: 35,
  },
  logoTypeImage: {
    width: '100%',
    height: '100%',
  },
});
