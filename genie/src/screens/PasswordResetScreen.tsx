import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextField, Text, Card } from '../components';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { usePopupContext } from '../contexts/PopupContext';
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
  const { showAlert } = usePopupContext();
  const { resetPassword, updatePassword, verifyPasswordResetToken, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
                setStep('password');
              } else {
                console.log('❌ Token is invalid, staying on email step');
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
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetEmail = async () => {
    if (!validateEmail()) return;

    try {
      await resetPassword(email);
      showAlert(
        'Please check your email and click the link to reset your password.',
        'Reset Email Sent',
        () => {
          // Only in development/simulator, skip to password step
          if (__DEV__) {
            console.log('🔧 Development mode: Skipping email verification');
            setStep('password');
          }
        }
      );
    } catch (error: any) {
      showAlert(error.message || 'Failed to send reset email', 'Error');
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    try {
      await updatePassword(newPassword);
      showAlert(
        'Your password has been successfully updated.',
        'Password Updated',
        onSuccess
      );
    } catch (error: any) {
      showAlert(error.message || 'Failed to update password', 'Error');
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

  return (
    <Card variant="elevated" padding="lg" style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>
          {step === 'email' ? 'Reset Password' : 'Set New Password'}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email address and we\'ll send you a link to reset your password.'
            : 'You\'ve successfully verified your email. Please enter your new password below.'}
        </Text>
        
        {step === 'password' && email && (
          <Text variant="caption" color="tertiary" style={styles.emailHint}>
            Resetting password for: {email}
          </Text>
        )}
      </View>

      <View style={styles.form}>
        {step === 'email' ? (
          <TextField
            placeholder="Email"
            value={email}
            onChangeText={(value) => updateField('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
          />
        ) : (
          <View style={styles.passwordFields}>
            <TextField
              placeholder="New Password"
              value={newPassword}
              onChangeText={(value) => updateField('newPassword', value)}
              error={errors.newPassword}
              secureTextEntry
            />
            <TextField
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              error={errors.confirmPassword}
              secureTextEntry
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onPress={step === 'email' ? handleSendResetEmail : handleUpdatePassword}
        >
          {step === 'email' ? 'Reset Password' : 'Update Password'}
        </Button>

        <Button
          variant="ghost"
          onPress={step === 'email' ? onBack : () => setStep('email')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            {step === 'email' ? 'Back to Login' : 'Back to Email'}
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