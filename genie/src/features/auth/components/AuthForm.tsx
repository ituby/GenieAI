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
  const [isProcessingOtp, setIsProcessingOtp] = useState(false); // Lock to prevent duplicate OTP requests
  const [isProcessingRegistration, setIsProcessingRegistration] = useState(false); // Lock to prevent duplicate registration
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading for form submission
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
      // Only check if we're not already showing OTP screen or processing
      if (showOtpScreen || pendingAuth || isProcessingOtp) return;

      const currentUser = user;
      if (currentUser?.email && !isAuthenticated) {
        console.log('🔍 Checking if user has any pending OTP');
        
        // Check for any unverified OTP in database
        const { data: otpData } = await supabase
          .from('otp_verifications')
          .select('current_stage, current_otp_expires_at, current_otp_code, login_verified, registration_verified')
          .eq('user_id', currentUser.id)
          .single();
        
        if (otpData && otpData.current_otp_code && otpData.current_otp_expires_at) {
          // Check if OTP is still valid
          const expiresAt = new Date(otpData.current_otp_expires_at);
          const isExpired = expiresAt < new Date();
          
          // Check if user needs to verify (either registration or login)
          const needsVerification = otpData.current_stage === 'registration' 
            ? !otpData.registration_verified 
            : !otpData.login_verified;
          
          if (!isExpired && needsVerification) {
            console.log(`📱 Found pending ${otpData.current_stage} OTP - showing OTP screen automatically`);
            
            setPhoneNumber(currentUser.email); // Use email since we're using email OTP
            setPendingAuth({
              email: currentUser.email,
              password: '',
              isNewUser: otpData.current_stage === 'registration',
            });
            setShowOtpScreen(true);
          } else if (isExpired) {
            console.log(`⏰ Pending OTP has expired - user will need to request a new one`);
          }
        }
      }
    };
    
    checkForPendingOtp();
  }, [user, isAuthenticated, showOtpScreen, pendingAuth, isProcessingOtp]);

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
    
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        // For login, first try regular login to check if phone verification is needed
        console.log('🔐 Login attempt');
        
        try {
          await signIn(formData.email, formData.password);
          console.log('✅ Login successful (no phone verification required)');
        } catch (error: any) {
          // Check if error is due to OTP verification requirement
          if (error.message === 'OTP_VERIFICATION_REQUIRED') {
            console.log('📱 Phone verification required');
            
            // Prevent duplicate OTP requests
            if (isProcessingOtp) {
              console.log('⏸️ Already processing OTP request - ignoring duplicate');
              return;
            }
            
            setIsProcessingOtp(true);
            
            try {
              // Get the current user from auth store (set by signIn)
              const currentUser = useAuthStore.getState().user;
              
              if (!currentUser?.id) {
                console.error('❌ User ID not available after sign in');
                throw new Error('Authentication state error. Please try again.');
              }
              
              // First, check if there's already a valid OTP waiting
              console.log('🔍 Checking for existing valid OTP for user:', currentUser.id);
              const { data: otpData } = await supabase
                .from('otp_verifications')
                .select('current_stage, current_otp_expires_at, current_otp_code, login_verified')
                .eq('user_id', currentUser.id)
                .single();
              
              let hasValidOtp = false;
              
              if (otpData && otpData.current_otp_code && otpData.current_otp_expires_at) {
                const expiresAt = new Date(otpData.current_otp_expires_at);
                const isExpired = expiresAt < new Date();
                const needsVerification = !otpData.login_verified;
                
                if (!isExpired && needsVerification) {
                  console.log('✅ Found valid OTP - showing OTP screen WITHOUT sending new code');
                  hasValidOtp = true;
                } else if (isExpired) {
                  console.log('⏰ Previous OTP expired - will send new one');
                }
              } else {
                console.log('📧 No existing OTP found - will send new one');
              }
              
              // Only send OTP if there's no valid one already
              if (!hasValidOtp) {
                console.log('📱 Sending new OTP...');
                const phone = await sendOtpToUserPhone(formData.email, formData.password);
                console.log('📱 New OTP sent to:', phone);
                setPhoneNumber(phone);
              } else {
                setPhoneNumber(formData.email);
              }
              
              setPendingAuth({
                email: formData.email,
                password: formData.password,
                isNewUser: false,
              });
              
              setIsProcessingOtp(false);
              
              // Use setTimeout to ensure state is updated properly
              setTimeout(() => {
                setShowOtpScreen(true);
                console.log('✅ OTP screen shown');
              }, 50);
            } catch (otpError: any) {
              console.error('❌ Failed to handle OTP:', otpError);
              setIsProcessingOtp(false);
              showAlert(otpError.message || 'Failed to verify authentication', 'Error');
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

        setPhoneNumber(formData.email); // OTP is sent to email, not phone
        setShowTermsScreen(true);
      }
    } catch (error: any) {
      showAlert(error.message || 'An error occurred', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermsAccepted = async () => {
    // Prevent double-click on terms accept button
    if (isProcessingRegistration) {
      console.log('⏸️ Already processing registration - ignoring duplicate');
      return;
    }
    
    if (!pendingAuth) {
      console.error('❌ No pending auth found');
      return;
    }

    setIsProcessingRegistration(true);
    
    try {
      console.log('📋 Terms accepted, creating user account...');
      // אחרי אישור תקנון - יצור משתמש ושלח OTP
      const phone = await signUpWithPhone(
        pendingAuth.email,
        pendingAuth.password,
        pendingAuth.fullName!,
        pendingAuth.phone!
      );
      console.log('✅ User created and OTP sent to:', phone);

      setPhoneNumber(phone);
      setIsProcessingRegistration(false);
      
      // First close terms screen, then open OTP screen in next tick
      setShowTermsScreen(false);
      
      // Use setTimeout to ensure terms screen is closed before opening OTP screen
      setTimeout(() => {
        setShowOtpScreen(true);
        console.log('✅ OTP screen state set to true - should show now');
      }, 50);
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      setIsProcessingRegistration(false);
      
      // Clear form and return to login screen
      setShowTermsScreen(false);
      setPendingAuth(null);
      
      // Show alert and switch to login mode after user clicks OK
      showAlert(
        error.message || 'Failed to create account',
        'Registration Failed',
        () => {
          // Switch to login mode after user acknowledges the error
          console.log('🔄 Switching to login mode after registration failure');
          onToggleMode();
        }
      );
    }
  };

  const handleTermsDeclined = () => {
    setShowTermsScreen(false);
    setPendingAuth(null);
  };

  const handleOtpVerified = async (otpToken: string) => {
    // אחרי אימות OTP מוצלח
    console.log('🎯 handleOtpVerified called with token:', otpToken);
    console.log('🎯 pendingAuth:', pendingAuth);
    
    if (!pendingAuth) {
      console.error('❌ No pending auth found!');
      showAlert('Authentication state lost. Please try logging in again.', 'Error');
      return;
    }
    
    try {
      console.log('🔐 OTP verification starting...');
      
      if (pendingAuth.isNewUser) {
        // For new users, just verify OTP (they're already signed in from registration)
        console.log('👤 New user - verifying REGISTRATION OTP...');
        await verifyOtpForNewUser(otpToken, pendingAuth.email);
        console.log('✅ REGISTRATION OTP verified - user is now authenticated');
      } else {
        // For existing users, verify LOGIN OTP
        console.log('👤 Existing user - verifying LOGIN OTP...');
        await verifyOtp(otpToken, pendingAuth.email);
        console.log('✅ LOGIN OTP verified - user is now authenticated');
      }
      
      console.log('✅ Verification completed, user should be redirected to dashboard');
      setShowOtpScreen(false);
      setPendingAuth(null);
    } catch (error: any) {
      console.error('❌ OTP verification failed:', error);
      // Don't exit OTP screen - let user try again
      showAlert(error.message || 'Verification failed. Please try again.', 'Verification Error');
      // Keep showOtpScreen = true and pendingAuth so user can retry
    }
  };

  const handleResendOtp = async () => {
    if (!pendingAuth) return;

    try {
      console.log('🔄 Resending OTP (force resend = true)...');
      let phone: string;
      
      // Send OTP for both registration and login - with force_resend = true
      console.log(`📧 Resending ${pendingAuth.isNewUser ? 'REGISTRATION' : 'LOGIN'} OTP for:`, pendingAuth.email);
      phone = await sendOtpToUserPhone(pendingAuth.email, pendingAuth.password, true); // Force resend!
      
      setPhoneNumber(phone);
      console.log('✅ OTP resent to:', phone);
      showAlert('A new verification code has been sent to your email', 'Code Sent');
    } catch (error: any) {
      console.error('❌ Failed to resend OTP:', error);
      showAlert(error.message || 'Failed to resend code', 'Error');
    }
  };

  const handleBackToPhone = () => {
    setShowOtpScreen(false);
    setPendingAuth(null);
    setIsProcessingOtp(false);
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
        isProcessing={isProcessingRegistration || loading}
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
          loading={isSubmitting}
          onPress={handleSubmit}
          style={mode === 'register' ? styles.registerButton : undefined}
        >
          <Text style={{ color: mode === 'login' ? '#000000' : '#FFFF68' }}>
            {mode === 'login' ? 'Login' : 'Register'}
          </Text>
        </Button>

        {mode === 'login' && (
          <Text variant="caption" color="tertiary" style={styles.otpHint}>
            Verification code will be sent to your email
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
