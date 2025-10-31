import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
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
      await onVerified(code);
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
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={styles.modalContainer}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text variant="h2" style={styles.title}>
                  Verify Your Account
                </Text>
                <Text variant="caption" color="secondary" style={styles.subtitle}>
                  A verification code was sent via SMS
                </Text>
                <Text variant="body" style={styles.phoneNumber}>
                  {phone}
                </Text>
              </View>

              <View style={styles.otpContainer}>
                <Text variant="caption" color="secondary" style={styles.instruction}>
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
                  <Text variant="body" color="secondary" style={styles.resendText}>
                    Didn't receive the code?
                  </Text>
                  <Button
                    variant="outline"
                    onPress={handleResend}
                    disabled={resendTimer > 0}
                    style={[
                      styles.resendButton,
                      resendTimer > 0 && styles.resendButtonDisabled,
                    ]}
                  >
                    <Text style={styles.resendButtonText}>
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend SMS'}
                    </Text>
                  </Button>
                </View>

                {onBackToPhone && (
                  <View style={styles.backContainer}>
                    <Button variant="ghost" onPress={onBackToPhone}>
                      Back
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#FFFF68',
    overflow: 'hidden',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 12,
  },
  phoneNumber: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#FFFF68',
  },
  otpContainer: {
    marginBottom: 32,
  },
  instruction: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 13,
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
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  otpInputFilled: {
    borderColor: '#FFFF68',
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
  },
  actions: {
    gap: 20,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 12,
  },
  resendText: {
    textAlign: 'center',
  },
  resendButton: {
    borderWidth: 1.5,
    borderColor: '#FFFF68',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  resendButtonDisabled: {
    borderColor: 'rgba(255, 255, 104, 0.3)',
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#FFFF68',
    fontWeight: '600',
    fontSize: 14,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
});
