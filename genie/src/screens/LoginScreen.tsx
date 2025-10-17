import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
// i18n removed
// import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components';
import { AuthForm } from '../features/auth/components/AuthForm';
import { useTheme } from '../theme/index';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const breathingAnimation = useRef(new Animated.Value(1)).current;

  const toggleAuthMode = () => {
    setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  useEffect(() => {
    // Breathing animation for logo symbol
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnimation, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();

    return () => breathing.stop();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Animated.View
              style={{
                transform: [{ scale: breathingAnimation }],
              }}
            >
              <Image
                source={require('../../assets/LogoSymbol.webp')}
                style={styles.logoSymbol}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <View style={styles.formContainer}>
            <AuthForm mode={authMode} onToggleMode={toggleAuthMode} />
          </View>

          <View style={styles.footer}>
            <Image
              source={require('../../assets/LogoType.webp')}
              style={styles.logoType}
              resizeMode="contain"
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
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
  },
  logoType: {
    width: 70, // Further reduced
    height: 18, // Further reduced
  },
  formContainer: {
    alignItems: 'center',
    marginBottom: 24, // Reduced to make space for footer logo
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
});
