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

const FULL_TEXT = 'Your AI-powered goal companion';
const TYPING_SPEED = 80; // ms per character
const DISPLAY_TIME = 10000; // 10 seconds
const PAUSE_TIME = 5000; // 5 seconds

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const breathingAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [displayedText, setDisplayedText] = useState('');

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

  useEffect(() => {
    let typingInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let pauseTimeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const startTypingCycle = () => {
      // Reset text and animations completely
      setDisplayedText('');
      fadeAnimation.setValue(0);
      slideAnimation.setValue(0);
      currentIndex = 0;

      // Small delay then fade in and start typing
      setTimeout(() => {
        fadeAnimation.setValue(1);

        // Typing animation
        typingInterval = setInterval(() => {
          if (currentIndex < FULL_TEXT.length) {
            setDisplayedText(FULL_TEXT.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(typingInterval);

            // After typing is done, wait DISPLAY_TIME then fade out
            timeoutId = setTimeout(() => {
              // Fade out and slide down
              Animated.parallel([
                Animated.timing(fadeAnimation, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.timing(slideAnimation, {
                  toValue: 20,
                  duration: 500,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Clear text immediately after animation ends
                setDisplayedText('');

                // Wait PAUSE_TIME then restart
                pauseTimeoutId = setTimeout(startTypingCycle, PAUSE_TIME);
              });
            }, DISPLAY_TIME);
          }
        }, TYPING_SPEED);
      }, 100);
    };

    // Start the cycle
    startTypingCycle();

    return () => {
      clearInterval(typingInterval);
      clearTimeout(timeoutId);
      clearTimeout(pauseTimeoutId);
    };
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
            <View style={styles.subtitleMask}>
              <Animated.View
                style={{
                  opacity: fadeAnimation,
                  transform: [{ translateY: slideAnimation }],
                }}
              >
                <Text variant="caption" style={styles.subtitle}>
                  {displayedText}
                </Text>
              </Animated.View>
            </View>
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
            <Text style={styles.footerText}>
              © 2024 GenieAI • Version 1.0.0
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
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
    marginBottom: 12,
  },
  subtitleMask: {
    height: 20,
    overflow: 'hidden', // Creates mask effect
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 12,
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
    gap: 8,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
});
