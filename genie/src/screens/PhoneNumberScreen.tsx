import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, Button, TextField, Card } from '../components';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';

interface PhoneNumberScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export const PhoneNumberScreen: React.FC<PhoneNumberScreenProps> = ({
  onComplete,
  onBack,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { updateUserPhoneNumber, sendOTPToUser, loading } = useAuthStore();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhoneNumber = () => {
    const newErrors: Record<string, string> = {};

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^972\d{9}$/.test(phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid Israeli phone number (972xxxxxxxxx)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validatePhoneNumber()) return;

    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Update user phone number
      await updateUserPhoneNumber(cleanPhoneNumber);
      
      // Send OTP
      await sendOTPToUser();
      
      onComplete();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save phone number');
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
            <Text variant="h2" style={styles.title}>
              Add Phone Number
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              We'll send you a verification code to confirm your phone number
            </Text>
          </View>

          <Card variant="elevated" padding="lg" style={styles.card}>
            <View style={styles.inputContainer}>
              <Text variant="caption" color="secondary" style={styles.label}>
                Phone Number
              </Text>
              <TextField
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="972xxxxxxxxx"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                error={errors.phoneNumber}
                style={styles.phoneInput}
              />
              <Text variant="caption" color="tertiary" style={styles.helpText}>
                Enter your Israeli phone number starting with 972
              </Text>
            </View>

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={!phoneNumber}
              style={styles.continueButton}
            />
          </Card>

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
    marginBottom: 40,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  card: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  phoneInput: {
    marginBottom: 8,
  },
  helpText: {
    textAlign: 'center',
  },
  continueButton: {
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    marginTop: 16,
  },
});
