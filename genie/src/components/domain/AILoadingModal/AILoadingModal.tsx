import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../primitives';
import { Icon } from '../../primitives';
import { useTheme } from '../../../theme';

interface AILoadingModalProps {
  visible: boolean;
  currentStep: number;
  totalSteps: number;
  goalTitle?: string;
  goalDescription?: string;
  planDurationDays?: number;
  preferredTimeRanges?: Array<{
    start_hour: number;
    end_hour: number;
    label: string;
  }>;
  preferredDays?: number[];
  stage?: 'outline' | 'tasks'; // New prop to indicate which stage we're in
  onStop?: () => void; // Callback for stop button
}

// Helper function to format days
const formatDays = (days?: number[]): string => {
  if (!days || days.length === 0) return 'all 7 days of the week';
  if (days.length === 7) return 'all 7 days of the week';
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDays = days.map(d => dayNames[d]).join(', ');
  return `${days.length} days: ${selectedDays}`;
};

// Helper function to format time ranges
const formatTimeRanges = (ranges?: Array<{start_hour: number, end_hour: number, label: string}>): string => {
  if (!ranges || ranges.length === 0) return 'throughout the day';
  
  const rangeDescriptions = ranges.map(r => 
    `${r.label} (${r.start_hour}:00-${r.end_hour}:00)`
  ).join(', ');
  
  return `${ranges.length} time slots: ${rangeDescriptions}`;
};

// HeyGen Live Streaming messages
const generateLoadingMessages = (
  goalTitle: string = 'your goal',
  goalDescription: string = '',
  planDurationDays: number = 21,
  preferredTimeRanges?: Array<{start_hour: number, end_hour: number, label: string}>,
  preferredDays?: number[],
  stage: 'outline' | 'tasks' = 'outline'
) => {
  return [
    "Analyzing your request and understanding your goals",
    "Processing your input to create a personalized plan",
    "Generating insights and strategies for your journey",
    "Building a comprehensive roadmap for your success",
    "Creating milestones and checkpoints for your progress",
    "Designing a structured approach to achieve your goals",
    "Optimizing your plan based on best practices",
    "Personalizing your experience for maximum impact",
    "Finalizing your customized plan details",
    "Preparing your personalized roadmap for success"
  ];
};

export const AILoadingModal: React.FC<AILoadingModalProps> = ({
  visible,
  currentStep,
  totalSteps,
  goalTitle = 'your goal',
  goalDescription = '',
  planDurationDays = 21,
  preferredTimeRanges,
  preferredDays,
  stage = 'outline',
  onStop,
}) => {
  const theme = useTheme();
  const [breathingAnimation] = useState(new Animated.Value(1));

  // Generate personalized messages based on user's goal
  const loadingMessages = generateLoadingMessages(
    goalTitle,
    goalDescription,
    planDurationDays,
    preferredTimeRanges,
    preferredDays,
    stage
  );

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

  const currentMessage =
    loadingMessages[Math.min(currentStep - 1, loadingMessages.length - 1)] ||
    loadingMessages[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer]}>
          <View
            style={[styles.modal, { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}
          >
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
              <Text
                variant="body"
                style={[styles.message, { color: '#FFFFFF' }]}
              >
                {currentMessage}
              </Text>
            </View>

            {/* Genie is working indicator */}
            <View style={styles.workingIndicator}>
              <Text
                variant="caption"
                style={[styles.workingText, { color: '#FFFFFF', opacity: 0.6 }]}
              >
                Genie is working on your personalized plan...
              </Text>
            </View>
          </View>
        </View>
        
        {/* Stop button below modal */}
        {onStop && (
          <View style={styles.stopButtonContainer}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={onStop}
              activeOpacity={0.8}
            >
              <Text style={styles.stopButtonText}>[ ] stop</Text>
            </TouchableOpacity>
          </View>
        )}
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
    lineHeight: 22,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  workingIndicator: {
    alignItems: 'center',
  },
  workingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  stopButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
