import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
// i18n removed
// import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components';
import { AuthForm } from '../features/auth/components/AuthForm';
import { useTheme } from '../theme/index';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
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
            <Image 
              source={require('../../assets/LogoSymbol.webp')} 
              style={styles.logoSymbol}
              resizeMode="contain"
            />
            <Image 
              source={require('../../assets/LogoType.webp')} 
              style={styles.logoType}
              resizeMode="contain"
            />
            <Text variant="caption" style={styles.subtitle}>
              Your AI-powered goal companion
            </Text>
          </View>

          <View style={styles.formContainer}>
            <AuthForm mode={authMode} onToggleMode={toggleAuthMode} />
          </View>

          <View style={styles.footer}>
            <Text variant="caption" color="tertiary" style={styles.footerText}>
              Create goals and get a personalized 21-day plan
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Top safe area padding
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
  logoSymbol: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  logoType: {
    width: 120,
    height: 32,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 12,
  },
  formContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    maxWidth: 300,
  },
});
