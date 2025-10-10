import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/index';
import { useAuthStore } from './src/store/useAuthStore';
import { Text, Icon } from './src/components';
import { useTranslation } from 'react-i18next';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import './src/i18n'; // Initialize i18n

const ONBOARDING_KEY = 'hasSeenOnboarding';

export default function App() {
  const { t } = useTranslation();
  const { initialize, loading, isAuthenticated } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      
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

  // Show loading screen while initializing
  if (loading || hasSeenOnboarding === null) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.loadingContainer}>
            <Image 
              source={require('./assets/LogoSymbol.webp')} 
              style={styles.loadingLogoSymbol}
              resizeMode="contain"
            />
            <Image 
              source={require('./assets/LogoType.webp')} 
              style={styles.loadingLogoType}
              resizeMode="contain"
            />
            <Text variant="caption" style={styles.loadingSubtitle}>
              {t('onboarding.subtitle')}
            </Text>
            <View style={styles.loadingIconContainer}>
              <Icon name="brain" size={24} color="#A855F7" weight="duotone" />
              <Text variant="body" color="secondary" style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </View>
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    );
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingLogoSymbol: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  loadingLogoType: {
    width: 120,
    height: 32,
    marginBottom: 4,
  },
  loadingSubtitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 12,
    marginBottom: 24,
  },
  loadingIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
  },
});