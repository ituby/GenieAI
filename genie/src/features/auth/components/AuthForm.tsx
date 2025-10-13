import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
// i18n removed
import { Button, TextField, Text, Card } from '../../../components';
import { useTheme } from '../../../theme/index';
import { useAuthStore } from '../../../store/useAuthStore';

interface AuthFormProps {
  mode: 'login' | 'register';
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode }) => {
  const theme = useTheme();
  const { signIn, signUp, loading } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
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
        await signIn(formData.email, formData.password);
      } else {
        await signUp(formData.email, formData.password, formData.fullName);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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
          textContentType="password"
        />

        {mode === 'register' && (
          <TextField
            placeholder={'Confirm Password'}
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
            textContentType="password"
          />
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
              : 'Already have an account?'
            }
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
    backgroundColor: '#000000',
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
