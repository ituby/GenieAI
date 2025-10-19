import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
// i18n removed
import { Button, TextField, Text, Card, PasswordStrengthMeter } from '../../../components';
import { useTheme } from '../../../theme/index';
import { useAuthStore } from '../../../store/useAuthStore';
import { colors } from '../../../theme/colors';
import { PhoneOtpVerification } from '../../../components';
import { TermsAcceptanceScreen } from '../../../screens/TermsAcceptanceScreen';
import { usePopupContext } from '../../../contexts/PopupContext';
import { supabase } from '../../../services/supabase/client';

interface AuthFormProps {
  mode: 'login' | 'register';
  onToggleMode: () => void;
  onForgotPassword?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode, onForgotPassword }) => {
  const theme = useTheme();
  const { showAlert } = usePopupContext();
  const { signIn, signUp, signUpWithPhone, sendOtpToUserPhone, verifyOtp, verifyOtpForNewUser, checkPendingOtp, loading, user, isAuthenticated } =
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

  // Check if there's ANY pending OTP when component mounts or user changes
  useEffect(() => {
    const checkForPendingOtp = async () => {
      // Only check if we're not already showing OTP screen
      if (showOtpScreen || pendingAuth) return;

      const currentUser = user;
      if (currentUser?.email && !isAuthenticated) {
        console.log('🔍 Checking if user has any pending OTP');
        
        // Check for any unverified OTP in database
        const { data: otpData } = await supabase
          .from('otp_verifications')
          .select('phone_number, type, expires_at')
          .eq('user_id', currentUser.id)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (otpData && otpData.length > 0) {
          const pendingOtp = otpData[0];
          console.log(`📱 Found pending ${pendingOtp.type} OTP - showing OTP screen automatically`);
          
          setPhoneNumber(pendingOtp.phone_number);
          setPendingAuth({
            email: currentUser.email,
            password: '',
            isNewUser: pendingOtp.type === 'registration',
          });
          setShowOtpScreen(true);
        }
      }
    };
    
    checkForPendingOtp();
  }, [user, isAuthenticated]);

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
        // For login, first try regular login to check if phone verification is needed
        console.log('🔐 Login attempt');
        
        try {
          await signIn(formData.email, formData.password);
          console.log('✅ Login successful (no phone verification required)');
        } catch (error: any) {
          // Check if error is due to phone verification requirement
          if (error.message === 'PHONE_VERIFICATION_REQUIRED') {
            console.log('📱 Phone verification required, sending OTP');
            try {
              // Send OTP for phone verification
              const phone = await sendOtpToUserPhone(formData.email, formData.password);
              
              setPendingAuth({
                email: formData.email,
                password: formData.password,
                isNewUser: false,
              });
              
              setPhoneNumber(phone);
              setShowOtpScreen(true);
              console.log('📱 OTP screen will be shown for phone:', phone);
            } catch (otpError: any) {
              showAlert(otpError.message || 'Failed to send verification code', 'Error');
            }
          } else {
            // Other login errors
            throw error;
          }
        }
      } else {
        // Registration flow - show terms first
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
      showAlert(error.message || 'An error occurred', 'Error');
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
      showAlert(error.message || 'Failed to create account', 'Error');
      setShowTermsScreen(false);
      setPendingAuth(null);
    }
  };

  const handleTermsDeclined = () => {
    setShowTermsScreen(false);
    setPendingAuth(null);
  };

  const handleOtpVerified = async (otpToken: string) => {
    // אחרי אימות OTP מוצלח
    if (pendingAuth) {
      try {
        console.log('🔐 OTP verified successfully, proceeding...');
        
        if (pendingAuth.isNewUser) {
          // For new users, just verify OTP (they're already signed in from registration)
          console.log('👤 New user - verifying REGISTRATION OTP...');
          await verifyOtpForNewUser(phoneNumber, otpToken, pendingAuth.email);
          console.log('✅ REGISTRATION OTP verified - user is now authenticated');
        } else {
          // For existing users, verify LOGIN OTP
          console.log('👤 Existing user - verifying LOGIN OTP...');
          await verifyOtp(phoneNumber, otpToken, pendingAuth.email);
          console.log('✅ LOGIN OTP verified - user is now authenticated');
        }
        
        console.log('✅ Verification completed, user should be redirected to dashboard');
        setShowOtpScreen(false);
        setPendingAuth(null);
      } catch (error: any) {
        console.error('❌ OTP verification failed:', error);
        showAlert(error.message, 'Verification Error');
        setShowOtpScreen(false);
        setPendingAuth(null);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!pendingAuth) return;

    try {
      let phone: string;
      
      if (pendingAuth.isNewUser) {
        // For new users, resend OTP using the registration function
        phone = await signUpWithPhone(
          pendingAuth.email,
          pendingAuth.password,
          pendingAuth.fullName!,
          pendingAuth.phone!
        );
      } else {
        // For existing users, send OTP
        phone = await sendOtpToUserPhone(pendingAuth.email, pendingAuth.password);
      }
      
      setPhoneNumber(phone);
      showAlert('A new verification code has been sent to your phone', 'Code Sent');
    } catch (error: any) {
      showAlert(error.message || 'Failed to resend code', 'Error');
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
        <Text variant="h2" style={[styles.title, { color: '#FFFF68' }]}>
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
          <PasswordStrengthMeter password={formData.password} />
        )}

        {mode === 'login' && (
          <Button
            variant="ghost"
            onPress={() => {
              if (onForgotPassword) {
                onForgotPassword();
              } else {
                console.log('Forgot password clicked - no handler provided');
              }
            }}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>Forgot password? Click here to reset</Text>
          </Button>
        )}

        {mode === 'register' && (
          <TextField
            placeholder={'Confirm Password'}
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button
          variant={mode === 'login' ? 'primary' : 'outline'}
          fullWidth
          loading={loading}
          onPress={handleSubmit}
          style={mode === 'register' ? styles.registerButton : undefined}
        >
          <Text style={{ color: mode === 'login' ? '#000000' : '#FFFF68' }}>
            {mode === 'login' ? 'Login' : 'Register'}
          </Text>
        </Button>

        {mode === 'login' && (
          <Text variant="caption" color="tertiary" style={styles.otpHint}>
            Verification code will be sent to your phone
          </Text>
        )}

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
            <Text>
              {mode === 'login' ? 'Register' : 'Login'}
            </Text>
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
    marginTop: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  registerButton: {
    borderWidth: 2,
    borderColor: '#FFFF68',
    backgroundColor: 'transparent',
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
