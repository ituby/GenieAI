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
  goalTitle?: string;
  goalDescription?: string;
  planDurationDays?: number;
  preferredTimeRanges?: Array<{
    start_hour: number;
    end_hour: number;
    label: string;
  }>;
  preferredDays?: number[];
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

// Generate personalized loading messages with lots of variety
const generateLoadingMessages = (
  goalTitle: string = 'your goal',
  goalDescription: string = '',
  planDurationDays: number = 21,
  preferredTimeRanges?: Array<{start_hour: number, end_hour: number, label: string}>,
  preferredDays?: number[]
) => {
  const tasksPerDay = preferredTimeRanges?.length || 3;
  const totalDays = preferredDays && preferredDays.length > 0 
    ? Math.ceil(planDurationDays / 7) * preferredDays.length 
    : planDurationDays;
  const totalTasks = totalDays * tasksPerDay;
  const daysText = formatDays(preferredDays);
  const timeRangesText = formatTimeRanges(preferredTimeRanges);
  const shortGoal = goalTitle.slice(0, 40);
  const shortDesc = goalDescription.slice(0, 50);
  
  return [
    {
      icon: 'MagicWand',
      title: '✨ Reading Your Vision',
      subtitle: `Analyzing "${shortGoal}"... ${shortDesc}${goalDescription.length > 50 ? '...' : ''}`,
    },
    {
      icon: 'Eye',
      title: '👁️ Understanding Context',
      subtitle: `Genie is examining every detail of "${shortGoal}" to create the perfect roadmap for you.`,
    },
    {
      icon: 'Brain',
      title: '🧠 Deep Analysis Mode',
      subtitle: `Processing what it takes to achieve "${shortGoal}". Analyzing patterns, challenges, and opportunities...`,
    },
    {
      icon: 'Sparkle',
      title: '✨ Connecting Ideas',
      subtitle: `Linking concepts and strategies that will help you succeed with "${shortGoal}". Building the foundation...`,
    },
    {
      icon: 'Target',
      title: '🎯 Identifying Milestones',
      subtitle: `Breaking down "${shortGoal}" into achievable milestones. Mapping your ${planDurationDays}-day transformation journey...`,
    },
    {
      icon: 'CalendarCheck',
      title: '📅 Planning Timeline',
      subtitle: `Creating a ${planDurationDays}-day personalized plan for "${shortGoal}" with tasks scheduled on ${daysText}.`,
    },
    {
      icon: 'Clock',
      title: '⏰ Time Optimization',
      subtitle: `Setting up ${tasksPerDay} daily tasks ${timeRangesText} to perfectly fit your lifestyle and schedule.`,
    },
    {
      icon: 'Lightbulb',
      title: '💡 Strategic Planning',
      subtitle: `Designing ${totalTasks} strategic tasks that will guide you step-by-step toward "${shortGoal}".`,
    },
    {
      icon: 'ListChecks',
      title: '✅ Task Generation',
      subtitle: `Generating ${totalTasks} personalized tasks across ${totalDays} days. Each one is tailored for your success...`,
    },
    {
      icon: 'Puzzle',
      title: '🧩 Structuring Tasks',
      subtitle: `Breaking down each task into micro-actions for "${shortGoal}". Making big goals feel achievable...`,
    },
    {
      icon: 'TrendUp',
      title: '📈 Building Progression',
      subtitle: `Week 1: Foundation → Week 2: Development → Week 3: Mastery. Creating your growth curve for "${shortGoal}".`,
    },
    {
      icon: 'Rocket',
      title: '🚀 Momentum Builder',
      subtitle: `Designing tasks that build momentum and excitement. Ensuring you stay motivated throughout your "${shortGoal}" journey.`,
    },
    {
      icon: 'Star',
      title: '⭐ Adding Motivation',
      subtitle: `Infusing each task with purpose and meaning. Making "${shortGoal}" inspiring and rewarding every step of the way.`,
    },
    {
      icon: 'Heart',
      title: '❤️ Personal Touch',
      subtitle: `Tailoring task descriptions, motivational messages, and timing specifically for your "${shortGoal}" journey.`,
    },
    {
      icon: 'Compass',
      title: '🧭 Direction Setting',
      subtitle: `Ensuring every task points you toward "${shortGoal}". Creating a clear path with no confusion or detours.`,
    },
    {
      icon: 'Trophy',
      title: '🏆 Reward System',
      subtitle: `Setting up milestone celebrations and achievement badges. Your progress toward "${shortGoal}" will be celebrated!`,
    },
    {
      icon: 'Bell',
      title: '🔔 Smart Notifications',
      subtitle: `Creating ${totalTasks} intelligent reminders aligned with your schedule. You'll never miss a beat!`,
    },
    {
      icon: 'ChartLine',
      title: '📊 Progress Tracking',
      subtitle: `Establishing metrics, success indicators, and analytics. You'll see your progress toward "${shortGoal}" in real-time.`,
    },
    {
      icon: 'Shield',
      title: '🛡️ Quality Check',
      subtitle: `Validating task scheduling, checking for timing conflicts, and ensuring optimal spacing for "${shortGoal}".`,
    },
    {
      icon: 'Sparkle',
      title: '✨ Optimization Pass',
      subtitle: `Fine-tuning task difficulty, balancing workload, and ensuring sustainable progress toward "${shortGoal}".`,
    },
    {
      icon: 'Book',
      title: '📚 Knowledge Integration',
      subtitle: `Adding best practices, proven strategies, and expert tips relevant to "${shortGoal}". Learning from the best!`,
    },
    {
      icon: 'Lightning',
      title: '⚡ Energy Balance',
      subtitle: `Distributing tasks to match your energy levels throughout the day. Maximizing productivity for "${shortGoal}".`,
    },
    {
      icon: 'Users',
      title: '👥 Community Insights',
      subtitle: `Incorporating insights from thousands who achieved similar goals. You're not alone in pursuing "${shortGoal}"!`,
    },
    {
      icon: 'Leaf',
      title: '🌱 Growth Planning',
      subtitle: `Designing your transformation journey. Every task will help you grow and evolve toward "${shortGoal}".`,
    },
    {
      icon: 'Fire',
      title: '🔥 Motivation Boost',
      subtitle: `Adding powerful motivational elements to keep you fired up about "${shortGoal}" every single day!`,
    },
    {
      icon: 'Rainbow',
      title: '🌈 Positive Vibes',
      subtitle: `Infusing your plan with positivity and encouragement. "${shortGoal}" will feel exciting, not overwhelming!`,
    },
    {
      icon: 'Mountain',
      title: '⛰️ Challenge Mapping',
      subtitle: `Identifying potential obstacles in your "${shortGoal}" journey and creating strategies to overcome them.`,
    },
    {
      icon: 'Key',
      title: '🔑 Success Factors',
      subtitle: `Highlighting the key habits, mindsets, and actions that will unlock success with "${shortGoal}".`,
    },
    {
      icon: 'Wand',
      title: '🪄 Final Magic',
      subtitle: `Polishing your personalized plan, adding final touches, and preparing your ${planDurationDays}-day transformation!`,
    },
    {
      icon: 'RocketLaunch',
      title: '🚀 Launch Preparation',
      subtitle: `Your custom plan for "${shortGoal}" is almost ready. Preparing for liftoff in 3... 2... 1...`,
    },
    {
      icon: 'CheckCircle',
      title: '✅ Mission Complete!',
      subtitle: `Your personalized ${planDurationDays}-day plan with ${totalTasks} tasks is ready! Let's achieve "${shortGoal}" together! 🎉`,
    },
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
}) => {
  const theme = useTheme();
  const [breathingAnimation] = useState(new Animated.Value(1));

  // Generate personalized messages based on user's goal
  const loadingMessages = generateLoadingMessages(
    goalTitle,
    goalDescription,
    planDurationDays,
    preferredTimeRanges,
    preferredDays
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

  const currentStepData =
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
              <Text variant="h5" style={[styles.title, { color: '#FFFFFF' }]}>
                {currentStepData.title}
              </Text>
              <Text
                variant="body"
                style={[styles.subtitle, { color: '#FFFFFF', opacity: 0.8 }]}
              >
                {currentStepData.subtitle}
              </Text>
            </View>

            {/* Genie is working indicator */}
            <View style={styles.workingIndicator}>
              <Text
                variant="caption"
                style={[styles.workingText, { color: '#FFFFFF', opacity: 0.6 }]}
              >
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
});
