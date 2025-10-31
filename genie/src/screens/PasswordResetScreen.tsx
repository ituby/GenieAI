import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextField, Text, Card } from '../components';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { usePopupContext } from '../contexts/PopupContext';
import { PhoneOtpVerification } from '../components/domain/PhoneOtpVerification/PhoneOtpVerification';
import * as Linking from 'expo-linking';

interface PasswordResetScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const theme = useTheme();
  const { showAlert, hidePopup } = usePopupContext();
  const { 
    resetPassword, 
    updatePassword, 
    verifyPasswordResetToken, 
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithToken,
    setLoading,
    loading 
  } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(''); // Will be filled after phone verification
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'sms-verify' | 'password'>('phone');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Reset loading state when entering password step to prevent frozen UI
  useEffect(() => {
    if (step === 'password') {
      console.log('🔄 Resetting loading state for password step');
      // Force reset loading state immediately when entering password step
      setLoading(false);
      setIsUpdatingPassword(false);
      // Close any open popups that might be blocking - use timeout to ensure it happens
      setTimeout(() => {
        hidePopup();
        console.log('✅ Loading state reset to false, popups closed');
      }, 50);
    }
  }, [step, setLoading, hidePopup]);

  // Force close any popups when component mounts with password step
  useEffect(() => {
    if (step === 'password') {
      // Extra safety - close popups after a short delay
      const timer = setTimeout(() => {
        hidePopup();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [step, hidePopup]);

  // Check for access token in URL when component mounts
  useEffect(() => {
    const checkForAccessToken = async () => {
      try {
        const url = await Linking.getInitialURL();
        console.log('🔗 PasswordResetScreen checking URL:', url);
        
        if (url && (url.includes('access_token') || url.includes('reset-password'))) {
          console.log('🔐 Password reset URL found, processing...');
          
          // Try to extract email from the URL first
          try {
            const parsedUrl = Linking.parse(url);
            if (parsedUrl.queryParams && parsedUrl.queryParams.email) {
              setEmail(parsedUrl.queryParams.email as string);
              console.log('📧 Email extracted from URL:', parsedUrl.queryParams.email);
            }
          } catch (parseError) {
            console.log('Could not parse email from URL');
          }
          
          // If there's an access token, verify it
          if (url.includes('access_token')) {
            const tokenMatch = url.match(/access_token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
              const token = tokenMatch[1];
              
              // Verify the token is valid
              const isValidToken = await verifyPasswordResetToken(token);
              
              if (isValidToken) {
                console.log('✅ Token is valid, switching to password step');
                setLoading(false);
                setIsUpdatingPassword(false);
                hidePopup(); // Close any open popups
                setTimeout(() => {
                  setStep('password');
                }, 100);
              } else {
                console.log('❌ Token is invalid, staying on email step');
                setLoading(false);
                showAlert(
                  'Invalid or expired reset link. Please request a new password reset.',
                  'Invalid Link'
                );
              }
            }
          } else {
            // No access token, but it's a reset-password URL, so show the screen
            console.log('🔐 Reset password URL without token, showing screen');
          }
        }
      } catch (error) {
        console.log('No initial URL found');
      }
    };

    checkForAccessToken();
  }, [verifyPasswordResetToken, showAlert]);

  const validatePhone = () => {
    const newErrors: Record<string, string> = {};

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (e.g., +972501234567)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetSMS = async () => {
    if (!validatePhone()) return;

    try {
      console.log('📱 Sending password reset SMS for phone:', phoneNumber);
      const result = await sendPasswordResetOtp(phoneNumber);
      
      if (result.success) {
        setMaskedPhone(result.phone || '****');
        setEmail(result.email || ''); // Save email for later use
        setStep('sms-verify');
        showAlert(
          `A verification code has been sent to ${result.phone}`,
          'Code Sent'
        );
      } else {
        showAlert(result.error || 'Failed to send verification code', 'Error');
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to send verification code', 'Error');
    }
  };

  const handleVerifySMS = async (otp: string) => {
    try {
      console.log('🔐 Verifying password reset SMS code');
      const result = await verifyPasswordResetOtp(email, otp);
      
      if (result.success && result.resetToken) {
        setResetToken(result.resetToken);
        // Force reset loading state and close any popups before switching to password step
        setLoading(false);
        setIsUpdatingPassword(false);
        hidePopup(); // Close any open popups
        // Use setTimeout to ensure state is fully reset before switching steps
        // DON'T show alert here - it blocks the screen!
        setTimeout(() => {
          setStep('password');
        }, 100);
      } else {
        throw new Error(result.error || 'Invalid verification code');
      }
    } catch (error: any) {
      setLoading(false);
      setIsUpdatingPassword(false);
      showAlert(error.message || 'Verification failed', 'Error');
      throw error; // Re-throw so PhoneOtpVerification can handle it
    }
  };

  const handleResendSMS = async () => {
    try {
      console.log('🔄 Resending password reset SMS');
      const result = await sendPasswordResetOtp(phoneNumber);
      
      if (result.success) {
        showAlert('A new verification code has been sent', 'Code Sent');
      } else {
        showAlert(result.error || 'Failed to resend code', 'Error');
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to resend code', 'Error');
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    if (!resetToken) {
      showAlert('Invalid reset session. Please start over.', 'Error');
      setStep('phone');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      console.log('🔐 Updating password with reset token');
      const result = await resetPasswordWithToken(resetToken, newPassword);
      
      if (result.success) {
        showAlert(
          'Your password has been successfully updated. You can now log in with your new password.',
          'Password Updated',
          onSuccess
        );
      } else {
        // Show specific error message from server
        const errorMessage = result.error || 'Failed to update password. Please check that your password is at least 8 characters long and try again.';
        console.error('❌ Password update failed:', errorMessage);
        showAlert(errorMessage, 'Error');
      }
    } catch (error: any) {
      console.error('❌ Password update error:', error);
      showAlert(
        error.message || 'Failed to update password. Please check your internet connection and try again.',
        'Error'
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const updateField = (field: string, value: string) => {
    if (field === 'phoneNumber') setPhoneNumber(value);
    if (field === 'newPassword') setNewPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Show SMS verification screen
  if (step === 'sms-verify') {
    return (
      <PhoneOtpVerification
        phone={maskedPhone}
        onVerified={handleVerifySMS}
        onResend={handleResendSMS}
        loading={loading}
        onBackToPhone={() => setStep('phone')}
      />
    );
  }

  return (
    <Card variant="elevated" padding="lg" style={styles.container} pointerEvents="auto">
      <View style={styles.header} pointerEvents="auto">
        <Text variant="h2" style={styles.title}>
          {step === 'phone' ? 'Reset Password' : 'Set New Password'}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your phone number to receive a verification code via SMS.'
            : 'You\'ve successfully verified the code. Please enter your new password below.'}
        </Text>
        
        {step === 'password' && email && (
          <Text variant="caption" color="tertiary" style={styles.emailHint}>
            Resetting password for: {email}
          </Text>
        )}
      </View>

      <View style={styles.form} pointerEvents="auto">
        {step === 'phone' ? (
          <TextField
            placeholder="Phone Number (e.g., +972501234567)"
            value={phoneNumber}
            onChangeText={(value) => updateField('phoneNumber', value)}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
            textContentType="telephoneNumber"
            editable={!loading}
          />
        ) : (
          <View style={styles.passwordFields} pointerEvents="auto">
            <TextField
              placeholder="New Password"
              value={newPassword}
              onChangeText={(value) => updateField('newPassword', value)}
              error={errors.newPassword}
              secureTextEntry
              editable={!isUpdatingPassword && !loading}
            />
            <TextField
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              error={errors.confirmPassword}
              secureTextEntry
              editable={!isUpdatingPassword && !loading}
            />
          </View>
        )}
      </View>

      <View style={styles.actions} pointerEvents="auto">
        <Button
          variant="primary"
          fullWidth
          loading={step === 'password' ? isUpdatingPassword : (loading && step === 'phone')}
          disabled={step === 'password' ? (isUpdatingPassword || loading) : loading}
          onPress={step === 'phone' ? handleSendResetSMS : handleUpdatePassword}
        >
          {step === 'phone' ? 'Send Verification Code' : 'Update Password'}
        </Button>

        <Button
          variant="ghost"
          onPress={step === 'phone' ? onBack : () => {
            setLoading(false);
            setIsUpdatingPassword(false);
            hidePopup(); // Close any open popups
            setStep('phone');
          }}
          style={styles.backButton}
          disabled={loading && step === 'password'}
        >
          <Text style={styles.backButtonText}>
            {step === 'phone' ? 'Back to Login' : 'Start Over'}
          </Text>
        </Button>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background.primary,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emailHint: {
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  passwordFields: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});