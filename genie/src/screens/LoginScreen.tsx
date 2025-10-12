import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
// import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '../components';
import { AuthForm } from '../features/auth/components/AuthForm';
import { OTPVerificationScreen } from './OTPVerificationScreen';
import { PhoneNumberScreen } from './PhoneNumberScreen';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabase/client';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { sendOTPToUser, otpVerified, isAuthenticated, user, showOTPScreen, setShowOTPScreen } = useAuthStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  // Debug logging
  console.log('🔍 LoginScreen render:', {
    isAuthenticated,
    otpVerified,
    showOTPScreen,
    showPhoneNumber,
    userEmail: user?.email
  });

  // Log when showOTPScreen changes
  useEffect(() => {
    console.log('📱 showOTPScreen changed to:', showOTPScreen);
  }, [showOTPScreen]);


  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  const handleOTPRequired = async () => {
    try {
      // Check if user has phone number
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('phone_number')
          .eq('id', user.id)
          .single();

        if (!userData?.phone_number) {
          // User doesn't have phone number, show phone number screen
          console.log('📱 No phone number found, showing phone number screen');
          setShowPhoneNumber(true);
          return;
        }

        // User has phone number, send OTP (this will automatically show OTP screen)
        console.log('📱 Phone number found, sending OTP');
        try {
          await sendOTPToUser();
          console.log('✅ OTP sent successfully, OTP screen should be shown automatically');
        } catch (error) {
          console.error('❌ Failed to send OTP:', error);
          // Show OTP screen even if SMS fails (for testing)
          setShowOTPScreen(true);
        }
      } else {
        console.error('❌ No user found');
      }
    } catch (error) {
      console.error('❌ Failed to send OTP:', error);
      // If there's an error, show phone number screen as fallback
      setShowPhoneNumber(true);
    }
  };

  const handleOTPVerified = () => {
    setShowOTPScreen(false);
  };

  const handleBackToLogin = () => {
    setShowOTPScreen(false);
  };

  const handlePhoneNumberComplete = () => {
    setShowPhoneNumber(false);
    setShowOTPScreen(true);
  };

  const handleBackFromPhone = () => {
    setShowPhoneNumber(false);
  };

  // Show phone number screen if needed
  if (showPhoneNumber) {
    return (
      <PhoneNumberScreen
        onComplete={handlePhoneNumberComplete}
        onBack={handleBackFromPhone}
      />
    );
  }

  // Show OTP screen if needed
  if (showOTPScreen) {
    return (
      <OTPVerificationScreen
        onVerified={handleOTPVerified}
        onBack={handleBackToLogin}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image 
              source={require('../../assets/LogoSymbol.webp')} 
              style={styles.logoSymbol}
              resizeMode="contain"
            />
            <Image 
              source={require('../../assets/LogoType.webp')} 
              style={styles.logoType}
              resizeMode="contain"
            />
            <Text variant="caption" style={styles.subtitle}>
              {t('onboarding.subtitle')}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {isAuthenticated && !otpVerified ? (
              <View style={styles.continueContainer}>
                <Text variant="h3" style={styles.continueTitle}>
                  {t('auth.continueVerification')}
                </Text>
                <Text variant="body" color="secondary" style={styles.continueSubtitle}>
                  {t('auth.continueVerificationSubtitle')}
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleOTPRequired}
                  style={styles.continueButton}
                >
                  {t('auth.continue')}
                </Button>
              </View>
            ) : (
              <AuthForm 
                mode={authMode} 
                onToggleMode={toggleAuthMode} 
                onOTPRequired={handleOTPRequired}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text variant="caption" color="tertiary" style={styles.footerText}>
              {t('onboarding.description')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Top safe area padding
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoSymbol: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  logoType: {
    width: 120,
    height: 32,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 12,
  },
  formContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  continueContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  continueTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  continueSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  continueButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    maxWidth: 300,
  },
});
