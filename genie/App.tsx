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
import { TermsAcceptanceScreen } from './src/screens/TermsAcceptanceScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SplashScreen } from './src/components/SplashScreen';
// i18n removed

const ONBOARDING_KEY = 'hasSeenOnboarding';

export default function App() {
  const {
    initialize,
    loading,
    isAuthenticated,
    needsTermsAcceptance,
    acceptTerms,
    checkPendingOtp,
    user,
  } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  const [showSplash, setShowSplash] = useState(true);
  const [hasPendingOtp, setHasPendingOtp] = useState<boolean | null>(null);

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

  // Check for pending OTP when user becomes authenticated
  useEffect(() => {
    const checkOtpStatus = async () => {
      if (isAuthenticated && user?.email) {
        console.log('🔍 Checking for pending OTP for user:', user.email);
        try {
          const pendingOtp = await checkPendingOtp(user.email);
          setHasPendingOtp(pendingOtp);
          console.log('🔍 Pending OTP status:', pendingOtp);
          console.log('🔍 User authenticated:', isAuthenticated);
          console.log('🔍 Needs terms acceptance:', needsTermsAcceptance);
        } catch (error) {
          console.error('❌ Error checking pending OTP:', error);
          setHasPendingOtp(false);
        }
      }
    };

    checkOtpStatus();
  }, [isAuthenticated, user?.email, checkPendingOtp]);

  // Reset splash screen when user becomes authenticated and no pending OTP
  useEffect(() => {
    if (isAuthenticated && !needsTermsAcceptance && hasPendingOtp === false) {
      setShowSplash(true);
    }
  }, [isAuthenticated, needsTermsAcceptance, hasPendingOtp]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleTermsAccept = async () => {
    try {
      await acceptTerms();
    } catch (error) {
      console.error('Failed to accept terms:', error);
    }
  };

  const handleTermsDecline = () => {
    // User declined terms, sign them out
    useAuthStore.getState().signOut();
  };

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

  // Show login screen if authenticated but has pending OTP (user needs to complete phone verification)
  if (isAuthenticated && hasPendingOtp === true) {
    console.log('🔄 User authenticated but has pending OTP - showing login screen');
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoginScreen />
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show terms acceptance screen if authenticated but needs to accept terms
  if (isAuthenticated && needsTermsAcceptance) {
    console.log('📋 User needs to accept terms - showing terms screen');
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <TermsAcceptanceScreen
            onAccept={handleTermsAccept}
            onDecline={handleTermsDecline}
          />
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show splash screen before dashboard if authenticated and terms accepted
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <SplashScreen onAnimationFinish={() => setShowSplash(false)} />
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  console.log('🎯 Rendering Dashboard - user is fully authenticated and verified');
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
