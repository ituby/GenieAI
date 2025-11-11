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

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp-verify' | 'password'>('email');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [maskedEmail, setMaskedEmail] = useState('');
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

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
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

  const handleSendResetOtp = async () => {
    if (!validateEmail()) return;

    try {
      console.log('📧 Sending password reset OTP for email:', email);
      const result = await sendPasswordResetOtp(email);
      
      if (result.success) {
        // Mask email for display (e.g., u***@example.com)
        const emailParts = email.split('@');
        const maskedLocal = emailParts[0].charAt(0) + '***';
        setMaskedEmail(maskedLocal + '@' + emailParts[1]);
        setStep('otp-verify');
        showAlert(
          `A verification code has been sent to ${email}`,
          'Code Sent'
        );
      } else {
        showAlert(result.error || 'Failed to send verification code', 'Error');
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to send verification code', 'Error');
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    try {
      console.log('🔐 Verifying password reset OTP code');
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

  const handleResendOtp = async () => {
    try {
      console.log('🔄 Resending password reset OTP');
      const result = await sendPasswordResetOtp(email);
      
      if (result.success) {
        showAlert('A new verification code has been sent to your email', 'Code Sent');
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
      setStep('email');
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
    if (field === 'email') setEmail(value);
    if (field === 'newPassword') setNewPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Show OTP verification screen
  if (step === 'otp-verify') {
    return (
      <PhoneOtpVerification
        phone={maskedEmail}
        onVerified={handleVerifyOtp}
        onResend={handleResendOtp}
        loading={loading}
        onBackToPhone={() => setStep('email')}
      />
    );
  }

  return (
    <Card variant="elevated" padding="lg" style={styles.container} pointerEvents="auto">
      <View style={styles.header} pointerEvents="auto">
        <Text variant="h2" style={styles.title}>
          {step === 'email' ? 'Reset Password' : 'Set New Password'}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email address to receive a verification code.'
            : 'You\'ve successfully verified the code. Please enter your new password below.'}
        </Text>
        
        {step === 'password' && email && (
          <Text variant="caption" color="tertiary" style={styles.emailHint}>
            Resetting password for: {email}
          </Text>
        )}
      </View>

      <View style={styles.form} pointerEvents="auto">
        {step === 'email' ? (
          <TextField
            placeholder="Email Address"
            value={email}
            onChangeText={(value) => updateField('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
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
          loading={step === 'password' ? isUpdatingPassword : (loading && step === 'email')}
          disabled={step === 'password' ? (isUpdatingPassword || loading) : loading}
          onPress={step === 'email' ? handleSendResetOtp : handleUpdatePassword}
        >
          {step === 'email' ? 'Send Verification Code' : 'Update Password'}
        </Button>

        <Button
          variant="ghost"
          onPress={step === 'email' ? onBack : () => {
            setLoading(false);
            setIsUpdatingPassword(false);
            hidePopup(); // Close any open popups
            setStep('email');
          }}
          style={styles.backButton}
          disabled={loading && step === 'password'}
        >
          <Text style={styles.backButtonText}>
            {step === 'email' ? 'Back to Login' : 'Start Over'}
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