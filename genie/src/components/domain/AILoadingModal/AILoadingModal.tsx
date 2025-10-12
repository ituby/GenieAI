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
import { Icon } from '../../primitives';
import { useTheme } from '../../../theme';

interface AILoadingModalProps {
  visible: boolean;
  currentStep: number;
  totalSteps: number;
}

const loadingMessages = [
  {
    icon: "MagicWand",
    title: "Gathering your wishes...",
    subtitle: "Genie is reading your goal carefully."
  },
  {
    icon: "Brain",
    title: "Thinking deeply...",
    subtitle: "Crafting ideas that actually fit your goal."
  },
  {
    icon: "Lightbulb",
    title: "Connecting the dots...",
    subtitle: "Turning your thoughts into daily actions."
  },
  {
    icon: "MagnifyingGlass",
    title: "Analyzing your motivation...",
    subtitle: "Understanding what drives you most."
  },
  {
    icon: "HandsPraying",
    title: "Shaping your personal journey...",
    subtitle: "Every step will lead you closer to success."
  },
  {
    icon: "CalendarCheck",
    title: "Building your 21-day roadmap...",
    subtitle: "Structuring your tasks with logic and flow."
  },
  {
    icon: "ClipboardText",
    title: "Assigning daily missions...",
    subtitle: "Morning, afternoon, and evening — all planned."
  },
  {
    icon: "ChatsCircle",
    title: "Writing motivational lines...",
    subtitle: "Words that'll keep you focused each day."
  },
  {
    icon: "Star",
    title: "Adding a touch of magic...",
    subtitle: "Genie makes every task personal."
  },
  {
    icon: "RocketLaunch",
    title: "Preparing your launch plan...",
    subtitle: "Success sequence almost ready."
  },
  {
    icon: "Compass",
    title: "Calibrating direction...",
    subtitle: "Ensuring every task moves you forward."
  },
  {
    icon: "PuzzlePiece",
    title: "Filling in the missing pieces...",
    subtitle: "Matching tasks to your skills and limits."
  },
  {
    icon: "Heartbeat",
    title: "Empowering your mindset...",
    subtitle: "Balancing ambition and realism."
  },
  {
    icon: "HourglassHigh",
    title: "Polishing your transformation path...",
    subtitle: "One wish, many small steps."
  },
  {
    icon: "CheckCircle",
    title: "Finalizing your plan...",
    subtitle: "Almost done — your 21-day journey awaits."
  }
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

  const currentStepData = loadingMessages[Math.min(currentStep - 1, loadingMessages.length - 1)] || loadingMessages[0];

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
            <View style={styles.iconContainer}>
              <Icon 
                name={currentStepData.icon as any} 
                size={32} 
                color="#FFFF68" 
                weight="fill" 
              />
            </View>
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
  iconContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
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
