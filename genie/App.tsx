import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { ThemeProvider } from './src/theme/index';
import { PopupProvider } from './src/contexts/PopupContext';
import { useAuthStore } from './src/store/useAuthStore';
// Text and Icon imports removed - no longer needed
// useTranslation import removed - no longer needed
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PasswordResetScreen } from './src/screens/PasswordResetScreen';
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
  const [showPasswordReset, setShowPasswordReset] = useState(false);

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

  // Handle deep links for password reset
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      // Handle password reset deep links
      if (url.includes('reset-password') || url.includes('access_token')) {
        console.log('🔐 Password reset deep link detected');
        
        // In development mode, always show password reset screen
        if (__DEV__) {
          console.log('🔧 Development mode: Auto-opening password reset screen');
          setShowPasswordReset(true);
          return;
        }
        
        // In production, verify the token first
        if (url.includes('access_token')) {
          const tokenMatch = url.match(/access_token=([^&]+)/);
          if (tokenMatch && tokenMatch[1]) {
            const token = tokenMatch[1];
            
            try {
              // Import the auth store to verify token
              const { verifyPasswordResetToken } = useAuthStore.getState();
              const isValidToken = await verifyPasswordResetToken(token);
              
              if (isValidToken) {
                console.log('✅ Token is valid, opening password reset screen');
                setShowPasswordReset(true);
              } else {
                console.log('❌ Token is invalid, not opening password reset screen');
              }
            } catch (error) {
              console.log('❌ Error verifying token:', error);
            }
          }
        } else {
          // For reset-password deep links without token, show the screen
          setShowPasswordReset(true);
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    getInitialURL();

    return () => {
      subscription?.remove();
    };
  }, []);

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
          <PopupProvider>
            <OnboardingScreen onComplete={handleOnboardingComplete} />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show password reset screen if deep link was triggered
  if (showPasswordReset) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <PasswordResetScreen
              onBack={() => setShowPasswordReset(false)}
              onSuccess={() => setShowPasswordReset(false)}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <LoginScreen />
            <StatusBar style="light" />
          </PopupProvider>
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
          <PopupProvider>
            <LoginScreen />
            <StatusBar style="light" />
          </PopupProvider>
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
          <PopupProvider>
            <TermsAcceptanceScreen
              onAccept={handleTermsAccept}
              onDecline={handleTermsDecline}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show splash screen before dashboard if authenticated and terms accepted
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <SplashScreen onAnimationFinish={() => setShowSplash(false)} />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  console.log('🎯 Rendering Dashboard - user is fully authenticated and verified');
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PopupProvider>
          <DashboardScreen />
          <StatusBar style="light" />
        </PopupProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Loading screen styles removed - no longer needed
