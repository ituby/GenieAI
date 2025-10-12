import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Text } from '../../primitives';
import { useTheme } from '../../../theme';

interface AILoadingModalProps {
  visible: boolean;
  currentStep: number;
  totalSteps: number;
}

const loadingSteps = [
  {
    title: 'Creating Your Goal',
    subtitle: 'Setting up your personalized journey...',
  },
  {
    title: 'Analyzing Your Vision',
    subtitle: 'Understanding your goals and aspirations...',
  },
  {
    title: 'Generating AI Tasks',
    subtitle: 'Creating 63 personalized tasks for 21 days...',
  },
  {
    title: 'Building Your Roadmap',
    subtitle: 'Organizing tasks into a progressive plan...',
  },
  {
    title: 'Creating Rewards',
    subtitle: 'Designing motivational rewards and milestones...',
  },
  {
    title: 'Setting Up Notifications',
    subtitle: 'Preparing daily reminders and progress tracking...',
  },
  {
    title: 'Finalizing Your Plan',
    subtitle: 'Putting the finishing touches on your journey...',
  },
];

export const AILoadingModal: React.FC<AILoadingModalProps> = ({
  visible,
  currentStep,
  totalSteps,
}) => {
  const theme = useTheme();
  const [breathingAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // More prominent breathing animation for logo
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnimation, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnimation, {
            toValue: 0.9,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      breathing.start();

      return () => {
        breathing.stop();
      };
    }
  }, [visible, breathingAnimation]);

  const currentStepData = loadingSteps[Math.min(currentStep - 1, loadingSteps.length - 1)] || loadingSteps[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer]}>
          <View style={[styles.modal, { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>
            {/* Logo with breathing animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: breathingAnimation }],
              },
            ]}
          >
            <Image
              source={require('../../../../assets/LogoSymbol.webp')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>


          {/* Dynamic content */}
          <View style={styles.content}>
            <Text variant="h3" style={[styles.title, { color: '#FFFFFF' }]}>
              {currentStepData.title}
            </Text>
            <Text variant="body" style={[styles.subtitle, { color: '#FFFFFF', opacity: 0.8 }]}>
              {currentStepData.subtitle}
            </Text>
          </View>

          {/* Genie is working indicator */}
          <View style={styles.workingIndicator}>
            <Text variant="caption" style={[styles.workingText, { color: '#FFFFFF', opacity: 0.6 }]}>
              ✨ Genie is working its magic...
            </Text>
          </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFF68', // Official yellow border
    padding: 2,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modal: {
    width: '100%',
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 70,
    height: 70,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  workingIndicator: {
    alignItems: 'center',
  },
  workingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
