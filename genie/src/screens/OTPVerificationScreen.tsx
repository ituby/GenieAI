import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, Button, TextField } from '../components';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';

interface OTPVerificationScreenProps {
  onVerified: () => void;
  onBack: () => void;
}

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  onVerified,
  onBack,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { verifyOTP, sendOTPToUser, loading, pendingPhoneNumber } = useAuthStore();
  
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Start countdown for resend button
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-verify when OTP code is complete
  useEffect(() => {
    if (otpCode.length === 6) {
      handleVerifyOTP();
    }
  }, [otpCode]);

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit code');
      return;
    }

    if (!pendingPhoneNumber) {
      setErrorMessage('No phone number found');
      return;
    }

    try {
      setErrorMessage('');
      await verifyOTP(pendingPhoneNumber, otpCode);
      onVerified();
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid code. Please try again.');
      // Clear the input for retry
      setOtpCode('');
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTPToUser();
      setCountdown(60);
      setCanResend(false);
      Alert.alert('Success', 'OTP sent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    if (phone.startsWith('972')) {
      return `+972 ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    }
    return phone;
  };

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
            <Text variant="h2" style={[styles.title, { color: '#FFFF68' }]}>
              Verify Phone Number
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              We sent a verification code to
            </Text>
          </View>

          <View style={styles.phoneContainer}>
            <Text variant="body" style={styles.phoneNumber}>
              {pendingPhoneNumber ? formatPhoneNumber(pendingPhoneNumber) : 'Loading...'}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextField
              value={otpCode}
              onChangeText={(text) => {
                setOtpCode(text);
                if (errorMessage) {
                  setErrorMessage('');
                }
              }}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
              inputStyle={styles.otpInput}
              autoFocus
            />
            {errorMessage ? (
              <Text variant="caption" color="error" style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}
          </View>

          <View style={styles.resendContainer}>
            <Text variant="caption" color="secondary">
              Didn't receive the code?
            </Text>
            <Button
              title={canResend ? 'Resend Code' : `Resend in ${countdown}s`}
              variant="text"
              onPress={handleResendOTP}
              disabled={!canResend || loading}
              style={styles.resendButton}
            />
          </View>

          <View style={styles.footer}>
            <Button
              title="Back to Login"
              variant="text"
              onPress={onBack}
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
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
    marginBottom: 20,
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 0,
  },
  phoneNumber: {
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    marginTop: 16,
  },
});
