import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Button } from '../components';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';

interface OtpVerificationScreenProps {
  phone: string;
  onVerified: () => void;
  onResend: () => void;
}

const OTP_LENGTH = 6;

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  phone,
  onVerified,
  onResend,
}) => {
  const theme = useTheme();
  const { verifyOtp, loading } = useAuthStore();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer for resend button
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === OTP_LENGTH - 1 && newOtp.every((digit) => digit)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== OTP_LENGTH) {
      Alert.alert('Error', 'Please enter all digits');
      return;
    }

    try {
      await verifyOtp(phone, code);
      onVerified();
    } catch (error: any) {
      Alert.alert(
        'Verification Error',
        error.message || 'Invalid code, please try again'
      );
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;

    setResendTimer(60);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    onResend();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Verify Code
        </Text>

        <Text variant="body" color="secondary" style={styles.subtitle}>
          A verification code was sent to
        </Text>

        <Text variant="h3" style={styles.phone}>
          {phone}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                {
                  borderColor: digit
                    ? colors.primary
                    : theme.colors.border.primary,
                  backgroundColor: theme.colors.background.secondary,
                  color: theme.colors.text.primary,
                },
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(index, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textContentType="oneTimeCode"
            />
          ))}
        </View>

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onPress={() => handleVerify()}
          style={styles.verifyButton}
        >
          Verify Code
        </Button>

        <View style={styles.resendContainer}>
          <Text variant="body" color="secondary">
            Didn't receive a code?
          </Text>

          {resendTimer > 0 ? (
            <Text variant="body" color="tertiary" style={styles.timer}>
              Resend in {resendTimer} seconds
            </Text>
          ) : (
            <Button variant="ghost" onPress={handleResend}>
              Resend Code
            </Button>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  phone: {
    textAlign: 'center',
    marginBottom: 40,
    direction: 'ltr',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  verifyButton: {
    marginBottom: 24,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
  },
  timer: {
    fontSize: 14,
  },
});
