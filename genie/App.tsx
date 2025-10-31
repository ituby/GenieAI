import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { ThemeProvider } from './src/theme/index';
import { PopupProvider, usePopupContext } from './src/contexts/PopupContext';
import { paymentService } from './src/services/paymentService';
import { useAuthStore } from './src/store/useAuthStore';
// Text and Icon imports removed - no longer needed
// useTranslation import removed - no longer needed
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PasswordResetScreen } from './src/screens/PasswordResetScreen';
import { TermsAcceptanceScreen } from './src/screens/TermsAcceptanceScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { UpdateAvailableModal } from './src/components/UpdateAvailableModal';
import { PaymentHandler } from './src/components/PaymentHandler';
// i18n removed

export default function App() {
  const {
    initialize,
    loading,
    isAuthenticated,
    needsTermsAcceptance,
    acceptTerms,
    checkPendingOtp,
    user,
    setLoading,
  } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const hasShownInitialSplash = useRef(false);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);
  const [hasPendingOtp, setHasPendingOtp] = useState<boolean | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showPostAuthSplash, setShowPostAuthSplash] = useState(false);
  const prevIsAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');

      // Initialize IAP on mobile platforms
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.log('📱 Initializing IAP...');
        try {
          const initialized = await paymentService.initializeIAP();
          if (initialized) {
            console.log('✅ IAP initialized successfully');
          } else {
            console.warn('⚠️ IAP initialization failed');
          }
        } catch (error) {
          console.error('❌ Error initializing IAP:', error);
        }
      }

      // Check for OTA updates (only in production)
      if (!__DEV__) {
        try {
          const Updates = await import('expo-updates');
          if (Updates.default && Updates.default.isEnabled) {
            console.log('🔄 Checking for updates...');
            const update = await Updates.default.checkForUpdateAsync();
            if (update.isAvailable) {
              console.log('📱 Update available, showing popup...');
              setUpdateInfo(update);
              setShowUpdateModal(true);
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
      
      // Handle payment callbacks
      if (url.includes('payment-success') || url.includes('payment-cancelled')) {
        console.log('💳 Payment callback received:', url);
        const result = await paymentService.handlePaymentCallback(url);
        
        if (result.success && result.type === 'success') {
          // Payment successful - refresh data and show success popup
          setTimeout(() => {
            alert('Payment successful! Your tokens have been added.');
          }, 1000);
        } else if (result.type === 'cancelled') {
          // Payment cancelled
          setTimeout(() => {
            alert('Payment cancelled.');
          }, 1000);
        }
        return;
      }
      
      // Handle password reset deep links
      if (url.includes('reset-password') || url.includes('access_token')) {
        console.log('🔐 Password reset deep link detected:', url);
        
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
          console.log('🔐 Opening password reset screen (no token verification needed)');
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
        // Add small delay to ensure server has updated after OTP verification
        await new Promise(resolve => setTimeout(resolve, 500));
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
      } else if (!isAuthenticated) {
        // Reset pending OTP status when user is not authenticated
        setHasPendingOtp(null);
      }
    };

    checkOtpStatus();
  }, [isAuthenticated, user?.email, checkPendingOtp]);

  // Detect authentication completion and show post-auth splash
  useEffect(() => {
    // Detect when user transitions from not authenticated to authenticated (after OTP verification)
    // Only after initial loading is complete (hasShownInitialSplash = true)
    if (prevIsAuthenticatedRef.current === false && isAuthenticated === true && !loading && hasShownInitialSplash.current) {
      console.log('✅ User authenticated - showing post-auth splash screen for data loading');
      setShowPostAuthSplash(true);
    }
    prevIsAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, loading]);

  // Hide splash after initial loading is complete
  useEffect(() => {
    // Hide splash when loading is done AND (user is not authenticated)
    // If user IS authenticated, let SplashScreen component handle hiding after data loads
    if (!loading && showSplash && !hasShownInitialSplash.current && !isAuthenticated) {
      hasShownInitialSplash.current = true;
      console.log('📱 No authenticated user - hiding splash to show login');
      setTimeout(() => {
        setShowSplash(false);
      }, 500);
    }
  }, [loading, isAuthenticated]);

  // Reset onboarding and splash when user becomes unauthenticated (sign out)
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    console.log('🔍 Auth state changed - isAuthenticated:', isAuthenticated, 'previous:', prevAuthRef.current);
    
    // Detect when user transitions from authenticated to not authenticated (sign out)
    if (prevAuthRef.current === true && isAuthenticated === false) {
      console.log('🚪 User signed out detected - resetting UI state');
      setDismissOnboarding(true); // Skip onboarding, go straight to login
      setShowSplash(false); // Don't show splash, go to login immediately
      setShowPostAuthSplash(false);
      setHasPendingOtp(null);
      hasShownInitialSplash.current = true; // Mark as shown so we go to login
      
      // Force clear loading state
      setLoading(false);
      
      console.log('🔄 UI state reset - should show login screen immediately');
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleOnboardingComplete = () => {
    // Dismiss onboarding for this session only
    setDismissOnboarding(true);
  };

  const handleSplashFinish = () => {
    console.log('✅ Initial splash finished - data loaded, showing app');
    hasShownInitialSplash.current = true;
    setShowSplash(false);
  };

  const handlePostAuthSplashFinish = () => {
    console.log('✅ Post-auth splash finished - showing dashboard');
    setShowPostAuthSplash(false);
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

  const handleUpdateApp = async () => {
    try {
      const Updates = await import('expo-updates');
      if (Updates.default && Updates.default.isEnabled) {
        console.log('📱 Downloading update...');
        await Updates.default.fetchUpdateAsync();
        console.log('✅ Update downloaded, restarting app...');
        await Updates.default.reloadAsync();
      }
    } catch (error) {
      console.log('❌ Error updating app:', error);
    }
  };

  const handleDismissUpdate = () => {
    setShowUpdateModal(false);
    setUpdateInfo(null);
  };

  // Show splash screen during initialization
  // Keep showing until loading is done AND (user is not authenticated OR data is loaded)
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <SplashScreen onAnimationFinish={handleSplashFinish} />
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
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
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show onboarding or login if user is not authenticated
  if (!isAuthenticated) {
    // Show onboarding unless dismissed for this session
    if (!dismissOnboarding) {
      return (
        <SafeAreaProvider>
          <ThemeProvider>
            <PopupProvider>
              <OnboardingScreen onComplete={handleOnboardingComplete} />
              <UpdateAvailableModal
                visible={showUpdateModal}
                onUpdate={handleUpdateApp}
                onDismiss={handleDismissUpdate}
                updateInfo={updateInfo}
              />
              <StatusBar style="light" />
            </PopupProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    }
    
    // Show login screen after onboarding dismissed
    console.log('🔐 User not authenticated, showing login screen');
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <LoginScreen />
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show login screen if user has pending REGISTRATION OTP (phone not verified yet)
  // This ensures new users complete phone verification before accessing dashboard
  if (hasPendingOtp === true) {
    console.log('📱 User has pending REGISTRATION OTP - must verify phone first');
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <LoginScreen />
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
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
              isProcessing={loading}
            />
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show post-authentication splash screen for data loading
  if (isAuthenticated && showPostAuthSplash) {
    console.log('📱 Showing post-auth splash screen - loading user data');
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <PopupProvider>
            <SplashScreen onAnimationFinish={handlePostAuthSplashFinish} />
            <UpdateAvailableModal
              visible={showUpdateModal}
              onUpdate={handleUpdateApp}
              onDismiss={handleDismissUpdate}
              updateInfo={updateInfo}
            />
            <StatusBar style="light" />
          </PopupProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // User is fully authenticated - show Dashboard
  console.log('🎯 Rendering Dashboard - user is fully authenticated and verified');
  console.log('🔐 Current auth state:', { isAuthenticated, user: !!user });
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PopupProvider>
          <PaymentHandler>
          <DashboardScreen />
          <UpdateAvailableModal
            visible={showUpdateModal}
            onUpdate={handleUpdateApp}
            onDismiss={handleDismissUpdate}
            updateInfo={updateInfo}
          />
          <StatusBar style="light" />
          </PaymentHandler>
        </PopupProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Loading screen styles removed - no longer needed
