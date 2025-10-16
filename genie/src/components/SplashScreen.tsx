import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions, Text, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { dataLoadingService } from '../services/dataLoadingService';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationFinish,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load user data if authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated && user?.id) {
        setIsLoadingData(true);
        setDataLoadingError(null);
        
        try {
          console.log('🔄 Loading user data during splash screen...');
          await dataLoadingService.preloadUserData(user.id);
          setDataLoaded(true);
          console.log('✅ User data loaded successfully during splash');
        } catch (error) {
          console.error('❌ Failed to load user data during splash:', error);
          setDataLoadingError(error instanceof Error ? error.message : 'Failed to load data');
          // Still continue to dashboard even if data loading fails
          setDataLoaded(true);
        } finally {
          setIsLoadingData(false);
        }
      } else {
        // If not authenticated, mark as loaded (no data to load)
        setDataLoaded(true);
      }
    };

    loadUserData();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    // Only start animations after data loading is complete
    if (!dataLoaded) return;

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
        setTimeout(onAnimationFinish, 2000); // Reduced wait time since data is already loaded
      }
    });
  }, [scaleAnim, fadeAnim, onAnimationFinish, dataLoaded]);

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

      {/* Loading indicator for data loading */}
      {isLoadingData && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFF68" />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      )}

      {/* Error message if data loading fails */}
      {dataLoadingError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Data loading failed, but you can continue</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  logoSymbolImage: {
    width: '100%',
    height: '100%',
  },
  logoType: {
    width: 90,
    height: 26,
  },
  logoTypeImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFFF68',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});
