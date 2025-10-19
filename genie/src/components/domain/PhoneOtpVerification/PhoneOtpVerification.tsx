import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Button } from '../../primitives';
import { useTheme } from '../../../theme';
import { colors } from '../../../theme/colors';

interface PhoneOtpVerificationProps {
  phone: string;
  onVerified: (otpToken: string) => void;
  onResend: () => void;
  loading?: boolean;
  onBackToPhone?: () => void;
}

const OTP_LENGTH = 6;

export const PhoneOtpVerification: React.FC<PhoneOtpVerificationProps> = ({
  phone,
  onVerified,
  onResend,
  loading = false,
  onBackToPhone,
}) => {
  const theme = useTheme();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const hiddenInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus hidden input for autofill on mount
    hiddenInputRef.current?.focus();
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

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.length === OTP_LENGTH) {
      handleVerify(newOtp.join(''));
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    
    if (digits.length === OTP_LENGTH) {
      // Complete OTP pasted
      const newOtp = digits.split('');
      setOtp(newOtp);
      handleVerify(digits);
    } else if (digits.length > 0 && digits.length < OTP_LENGTH) {
      // Partial input - fill what we have
      const newOtp = Array(OTP_LENGTH).fill('');
      digits.split('').forEach((digit, i) => {
        if (i < OTP_LENGTH) newOtp[i] = digit;
      });
      setOtp(newOtp);
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
      onVerified(code);
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
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2" style={styles.title}>
            Verify Phone Number
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            We sent a verification code to
          </Text>
          <Text variant="body" style={styles.phoneNumber}>
            {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <Text variant="body" color="secondary" style={styles.instruction}>
            Enter the 6-digit code
          </Text>
          
          {/* Hidden input for autofill */}
          <TextInput
            ref={hiddenInputRef}
            style={styles.hiddenInput}
            value={otp.join('')}
            onChangeText={handlePaste}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
          />

          <View style={styles.otpInputs}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onPress={() => handleVerify()}
            disabled={otp.some(digit => !digit)}
          >
            Verify Code
          </Button>

          <View style={styles.resendContainer}>
            <Text variant="body" color="secondary">
              Didn't receive the code?
            </Text>
            <Button
              variant="ghost"
              onPress={handleResend}
              disabled={resendTimer > 0}
              style={styles.resendButton}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Button>
          </View>

          {onBackToPhone && (
            <View style={styles.backContainer}>
              <Button variant="ghost" onPress={onBackToPhone}>
                Change Phone Number
              </Button>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    textAlign: 'center',
    fontWeight: '600',
  },
  otpContainer: {
    marginBottom: 48,
  },
  instruction: {
    textAlign: 'center',
    marginBottom: 24,
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    opacity: 0,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border.primary,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  otpInputFilled: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  actions: {
    gap: 24,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    paddingHorizontal: 0,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
});
