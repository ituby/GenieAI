import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/index';
import { useAuthStore } from './src/store/useAuthStore';
// Text and Icon imports removed - no longer needed
// useTranslation import removed - no longer needed
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SplashScreen } from './src/components/SplashScreen';
// i18n removed

const ONBOARDING_KEY = 'hasSeenOnboarding';

export default function App() {
  const { initialize, loading, isAuthenticated } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');

      // Check for OTA updates (only in production)
      if (!__DEV__) {
        try {
          const Updates = await import('expo-updates');
          if (Updates.default && Updates.default.isEnabled) {
            console.log('🔄 Checking for updates...');
            const update = await Updates.default.checkForUpdateAsync();
            if (update.isAvailable) {
              console.log('📱 Update available, downloading...');
              await Updates.default.fetchUpdateAsync();
              console.log('✅ Update downloaded, restarting app...');
              await Updates.default.reloadAsync();
            } else {
              console.log('✅ App is up to date');
            }
          }
        } catch (error) {
          console.log('❌ Error checking for updates:', error);
        }
      } else {
        console.log('🔄 OTA updates disabled in development mode');
      }

      // Check if user has seen onboarding
      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY);
      console.log('👁️ Has seen onboarding:', onboardingStatus === 'true');
      setHasSeenOnboarding(onboardingStatus === 'true');

      // Initialize auth (this will check for existing session)
      await initialize();
      console.log('🚀 App initialization complete');
    };

    initializeApp();
  }, [initialize]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationFinish={handleSplashFinish} />;
  }

  // Skip loading screen - go directly to onboarding or login
  if (hasSeenOnboarding === null) {
    // Initialize onboarding state without showing loading screen
    return null;
  }

  // Show onboarding if user hasn't seen it
  if (!hasSeenOnboarding) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoginScreen />
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show main app if authenticated
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DashboardScreen />
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Loading screen styles removed - no longer needed
