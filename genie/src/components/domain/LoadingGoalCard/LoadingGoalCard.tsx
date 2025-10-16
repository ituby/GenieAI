import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';

export interface LoadingGoalCardProps {
  title: string;
  color?: string;
  iconName?: string;
}

export const LoadingGoalCard: React.FC<LoadingGoalCardProps> = ({
  title,
  color = '#FFFF68',
  iconName = 'star',
}) => {
  const theme = useTheme();
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulseAnimation, shimmerAnimation]);

  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Card variant="default" padding="md" style={styles.card}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: pulseAnimation,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <Icon name={iconName} size={20} color="#FFFFFF" weight="fill" />
          </View>
          <View style={styles.titleContainer}>
            <Text variant="h4" style={styles.title}>
              {title}
            </Text>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBar}>
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      transform: [{ translateX: shimmerTranslateX }],
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color="secondary" style={styles.loadingText}>
                Genie is working his magic...
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  container: {
    minHeight: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'flex-start',
  },
  loadingBar: {
    width: 120,
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFF68',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
