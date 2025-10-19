import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
// i18n removed
import { Button, TextField, Text, Card } from '../../../components';
import { useTheme } from '../../../theme/index';
import { useAuthStore } from '../../../store/useAuthStore';
import { colors } from '../../../theme/colors';
import { PhoneOtpVerification } from '../../../components';
import { TermsAcceptanceScreen } from '../../../screens/TermsAcceptanceScreen';

interface AuthFormProps {
  mode: 'login' | 'register';
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode }) => {
  const theme = useTheme();
  const { signIn, signUp, signUpWithPhone, sendOtpToUserPhone, verifyOtp, verifyOtpForNewUser, checkPendingOtp, loading } =
    useAuthStore();

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [showTermsScreen, setShowTermsScreen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pendingAuth, setPendingAuth] = useState<{
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    isNewUser?: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required';
      }

      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone)) {
        newErrors.phone =
          'Please enter a valid phone number (e.g., +1234567890)';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (mode === 'login') {
        // בדוק אם יש OTP ממתין לאימות
        const hasPendingOtp = await checkPendingOtp(formData.email);
        if (hasPendingOtp) {
          Alert.alert(
            'Pending Verification',
            'You have a pending phone verification. Please complete it first.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Show OTP screen for pending verification
                  setPhoneNumber(formData.phone || '');
                  setShowOtpScreen(true);
                }
              }
            ]
          );
          return;
        }

        // אם אין OTP ממתין, שלח OTP חדש
        const phone = await sendOtpToUserPhone(
          formData.email,
          formData.password
        );

        // שמור את פרטי ההתחברות לשימוש אחרי אימות OTP
        setPendingAuth({
          email: formData.email,
          password: formData.password,
          isNewUser: false,
        });

        setPhoneNumber(phone);
        setShowOtpScreen(true);
      } else {
        // עבור הרשמה - שמור את הפרטים והצג מסך אישור תקנון
        setPendingAuth({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          isNewUser: true,
        });

        setPhoneNumber(formData.phone);
        setShowTermsScreen(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const handleTermsAccepted = async () => {
    if (!pendingAuth) return;

    try {
      // אחרי אישור תקנון - יצור משתמש ושלח OTP
      const phone = await signUpWithPhone(
        pendingAuth.email,
        pendingAuth.password,
        pendingAuth.fullName!,
        pendingAuth.phone!
      );

      setPhoneNumber(phone);
      setShowTermsScreen(false);
      setShowOtpScreen(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
      setShowTermsScreen(false);
      setPendingAuth(null);
    }
  };

  const handleTermsDeclined = () => {
    setShowTermsScreen(false);
    setPendingAuth(null);
  };

  const handleOtpVerified = async (otpToken: string) => {
    // אחרי אימות OTP מוצלח, התחבר עם האימייל והסיסמה
    if (pendingAuth) {
      try {
        console.log('🔐 OTP verified successfully, proceeding to sign in...');
        
        if (pendingAuth.isNewUser) {
          // For new users, verify OTP first, then sign in
          console.log('👤 New user - verifying OTP and signing in...');
          await verifyOtpForNewUser(phoneNumber, otpToken);
          console.log('✅ OTP verified for new user, now signing in...');
          await signIn(pendingAuth.email, pendingAuth.password);
          console.log('✅ New user signed in successfully');
        } else {
          // For existing users, just verify OTP
          console.log('👤 Existing user - verifying OTP and signing in...');
          await verifyOtp(phoneNumber, otpToken);
          console.log('✅ OTP verified for existing user, now signing in...');
          await signIn(pendingAuth.email, pendingAuth.password);
          console.log('✅ Existing user signed in successfully');
        }
        
        console.log('✅ Sign in completed, user should be redirected to dashboard');
        setShowOtpScreen(false);
        setPendingAuth(null);
      } catch (error: any) {
        console.error('❌ OTP verification or sign in failed:', error);
        Alert.alert('Login Error', error.message);
        setShowOtpScreen(false);
        setPendingAuth(null);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!pendingAuth) return;

    try {
      if (pendingAuth.isNewUser) {
        // For new users, resend OTP using the registration function
        const phone = await signUpWithPhone(
          pendingAuth.email,
          pendingAuth.password,
          pendingAuth.fullName!,
          pendingAuth.phone!
        );
        setPhoneNumber(phone);
      } else {
        // For existing users, check if there's a pending OTP first
        const hasPendingOtp = await checkPendingOtp(pendingAuth.email);
        if (hasPendingOtp) {
          Alert.alert(
            'Pending Verification',
            'You already have a pending verification. Please use the existing code or wait for it to expire.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // If no pending OTP, send new one
        const phone = await sendOtpToUserPhone(pendingAuth.email, pendingAuth.password);
        setPhoneNumber(phone);
      }
      Alert.alert('Success', 'A new code has been sent');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleBackToPhone = () => {
    setShowOtpScreen(false);
    setPendingAuth(null);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Show terms acceptance screen for registration
  if (showTermsScreen) {
    return (
      <TermsAcceptanceScreen
        onAccept={handleTermsAccepted}
        onDecline={handleTermsDeclined}
      />
    );
  }

  // Show OTP verification screen if needed
  if (showOtpScreen) {
    return (
      <PhoneOtpVerification
        phone={phoneNumber}
        onVerified={handleOtpVerified}
        onResend={handleResendOtp}
        loading={loading}
        onBackToPhone={pendingAuth?.isNewUser ? handleBackToPhone : undefined}
      />
    );
  }

  return (
    <Card variant="elevated" padding="lg" style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>
          {mode === 'login' ? 'Login' : 'Register'}
        </Text>
      </View>

      <View style={styles.form}>
        {mode === 'register' && (
          <TextField
            placeholder={'Full Name'}
            value={formData.fullName}
            onChangeText={(value) => updateField('fullName', value)}
            error={errors.fullName}
            autoCapitalize="words"
            textContentType="name"
          />
        )}

        {mode === 'register' && (
          <TextField
            placeholder={'Phone Number (e.g., +1234567890)'}
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            error={errors.phone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        )}

        <TextField
          placeholder={'Email'}
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />

        <TextField
          placeholder={'Password'}
          value={formData.password}
          onChangeText={(value) => updateField('password', value)}
          error={errors.password}
          secureTextEntry
        />

        {mode === 'register' && (
          <TextField
            placeholder={'Confirm Password'}
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
          />
        )}

        {mode === 'login' && (
          <Text variant="caption" color="tertiary" style={styles.otpHint}>
            A verification code will be sent to your registered phone number
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onPress={handleSubmit}
        >
          {mode === 'login' ? 'Login' : 'Register'}
        </Button>

        <View style={styles.toggleContainer}>
          <Text variant="body" color="secondary">
            {mode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
          </Text>
          <Button
            variant="ghost"
            onPress={onToggleMode}
            style={styles.toggleButton}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </Button>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  otpHint: {
    textAlign: 'center',
    marginTop: -8,
    fontSize: 10,
    opacity: 0.7,
  },
  actions: {
    gap: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 0,
  },
});
