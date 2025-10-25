import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Firefly {
  id: number;
  centerX: number;
  centerY: number;
  angle: Animated.Value;
  radius: number;
  opacity: Animated.Value;
  scale: Animated.Value;
}

interface FireflyBackgroundProps {
  count?: number;
}

export const FireflyBackground: React.FC<FireflyBackgroundProps> = ({ count = 50 }) => {
  const firefliesRef = useRef<Firefly[]>([]);

  useEffect(() => {
    // Initialize fireflies with random centers across the screen
    firefliesRef.current = Array.from({ length: count }, (_, i) => {
      const centerX = Math.random() * SCREEN_WIDTH;
      const centerY = Math.random() * SCREEN_HEIGHT;
      const radius = 20 + Math.random() * 40; // Small circular motion radius (20-60px)
      
      return {
        id: i,
        centerX,
        centerY,
        angle: new Animated.Value(Math.random() * Math.PI * 2), // Random starting angle
        radius,
        opacity: new Animated.Value(Math.random() * 0.5 + 0.3),
        scale: new Animated.Value(Math.random() * 0.5 + 0.5),
      };
    });

    // Animate each firefly
    firefliesRef.current.forEach((firefly) => {
      animateFirefly(firefly);
    });
  }, [count]);

  const animateFirefly = (firefly: Firefly) => {
    const rotationDuration = 8000 + Math.random() * 8000; // 8-16 seconds per full rotation
    const currentAngle = (firefly.angle as any)._value || 0;
    
    Animated.parallel([
      // Circular rotation around center
      Animated.loop(
        Animated.timing(firefly.angle, {
          toValue: currentAngle + Math.PI * 2, // Full 360 degree rotation
          duration: rotationDuration,
          useNativeDriver: true,
        })
      ),
      // Glowing effect (pulsing opacity)
      Animated.loop(
        Animated.sequence([
          Animated.timing(firefly.opacity, {
            toValue: 0.9,
            duration: 1000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(firefly.opacity, {
            toValue: 0.3,
            duration: 1000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ),
      // Slight scale pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(firefly.scale, {
            toValue: 1,
            duration: 1500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(firefly.scale, {
            toValue: 0.5,
            duration: 1500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {firefliesRef.current.map((firefly) => {
        // Calculate x and y positions based on angle and radius for circular motion
        // Each firefly rotates around its own center point
        const translateX = firefly.angle.interpolate({
          inputRange: [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2],
          outputRange: [
            firefly.centerX + firefly.radius,
            firefly.centerX,
            firefly.centerX - firefly.radius,
            firefly.centerX,
            firefly.centerX + firefly.radius,
          ],
        });
        
        const translateY = firefly.angle.interpolate({
          inputRange: [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2],
          outputRange: [
            firefly.centerY,
            firefly.centerY + firefly.radius,
            firefly.centerY,
            firefly.centerY - firefly.radius,
            firefly.centerY,
          ],
        });
        
        return (
          <Animated.View
            key={firefly.id}
            style={[
              styles.firefly,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { scale: firefly.scale },
                ],
                opacity: firefly.opacity,
              },
            ]}
          >
            <View style={styles.fireflyGlow} />
            <View style={styles.fireflyCore} />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  firefly: {
    position: 'absolute',
    width: 4,
    height: 4,
  },
  fireflyCore: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFF68',
    position: 'absolute',
    left: 1,
    top: 1,
  },
  fireflyGlow: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFF68',
    opacity: 0.5,
    shadowColor: '#FFFF68',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 5,
  },
});

