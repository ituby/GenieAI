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

// Generate personalized loading messages - detailed and without emojis
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
  const shortGoal = goalTitle.slice(0, 45);
  const shortDesc = goalDescription.slice(0, 60);
  
  return [
    {
      icon: 'MagicWand',
      title: 'Reading your request',
      subtitle: `Analyzing "${shortGoal}" and understanding what you want to achieve. Genie is processing every detail of your description to create the perfect plan.`,
    },
    {
      icon: 'Eye',
      title: 'Understanding the scope',
      subtitle: `Examining the full context of "${shortGoal}". Identifying the key challenges, opportunities, and what success looks like for this specific goal.`,
    },
    {
      icon: 'Brain',
      title: 'Running deep analysis',
      subtitle: `Genie is thinking about what it takes to achieve "${shortGoal}". Processing patterns from thousands of similar goals to find what works best.`,
    },
    {
      icon: 'Lightbulb',
      title: 'Generating insights',
      subtitle: `Connecting strategies and best practices specific to "${shortGoal}". Building a foundation of proven methods that lead to success.`,
    },
    {
      icon: 'Target',
      title: 'Mapping your journey',
      subtitle: `Breaking down "${shortGoal}" into ${totalTasks} actionable steps. Creating a clear roadmap across ${planDurationDays} days with realistic milestones.`,
    },
    {
      icon: 'CalendarCheck',
      title: 'Planning timeline structure',
      subtitle: `Designing your ${planDurationDays}-day journey for "${shortGoal}". Organizing tasks across ${daysText} to match your availability and preferences.`,
    },
    {
      icon: 'Clock',
      title: 'Optimizing task scheduling',
      subtitle: `Calculating optimal times for ${tasksPerDay} daily tasks. Using ${timeRangesText} to align with your energy patterns and lifestyle.`,
    },
    {
      icon: 'Puzzle',
      title: 'Crafting individual tasks',
      subtitle: `Genie is writing ${totalTasks} custom tasks specifically for "${shortGoal}". Each task is designed to build on the previous one and move you forward.`,
    },
    {
      icon: 'ListChecks',
      title: 'Creating subtask breakdowns',
      subtitle: `Breaking down each task into 1-6 actionable subtasks. Making "${shortGoal}" achievable through small, clear steps that you can track and complete.`,
    },
    {
      icon: 'Book',
      title: 'Writing detailed descriptions',
      subtitle: `Crafting 2-3 sentence descriptions for each task. Explaining what to do, why it matters, and how it connects to "${shortGoal}".`,
    },
    {
      icon: 'TrendUp',
      title: 'Building progression logic',
      subtitle: `Structuring Week 1 Foundation, Week 2 Development, and Week 3 Mastery phases. Creating a growth curve tailored to "${shortGoal}".`,
    },
    {
      icon: 'Sparkle',
      title: 'Personalizing content',
      subtitle: `Adapting every task title, description, and timing to match your specific request for "${shortGoal}". No generic templates here.`,
    },
    {
      icon: 'Shield',
      title: 'Validating task spacing',
      subtitle: `Checking that tasks are spaced at least 30 minutes apart. Ensuring no scheduling conflicts and realistic time allocation for "${shortGoal}".`,
    },
    {
      icon: 'Compass',
      title: 'Setting success metrics',
      subtitle: `Defining what progress looks like for "${shortGoal}". Establishing clear indicators so you can measure your advancement every step of the way.`,
    },
    {
      icon: 'Trophy',
      title: 'Designing reward system',
      subtitle: `Creating milestone celebrations and achievement badges for "${shortGoal}". Setting up weekly check-ins and completion rewards to keep you motivated.`,
    },
    {
      icon: 'Bell',
      title: 'Scheduling notifications',
      subtitle: `Planning ${totalTasks} smart reminders for your tasks. Adding good morning and good night messages from Genie to support your journey.`,
    },
    {
      icon: 'ChartLine',
      title: 'Calculating time allocations',
      subtitle: `Determining how long each task should take for "${shortGoal}". Allocating 20-60 minutes per task based on subtask complexity.`,
    },
    {
      icon: 'Users',
      title: 'Applying community wisdom',
      subtitle: `Incorporating insights from thousands who achieved goals like "${shortGoal}". Learning from what worked for others in similar journeys.`,
    },
    {
      icon: 'Leaf',
      title: 'Planning growth trajectory',
      subtitle: `Mapping how you will evolve during this ${planDurationDays}-day journey toward "${shortGoal}". Each week builds on the last for sustainable transformation.`,
    },
    {
      icon: 'Fire',
      title: 'Adding motivational elements',
      subtitle: `Infusing every task with purpose and inspiration for "${shortGoal}". Creating descriptions that remind you why this journey matters to you.`,
    },
    {
      icon: 'Mountain',
      title: 'Anticipating challenges',
      subtitle: `Identifying potential obstacles in your "${shortGoal}" path. Building in strategies and support to help you overcome difficulties when they arise.`,
    },
    {
      icon: 'Key',
      title: 'Highlighting success factors',
      subtitle: `Determining the critical habits, mindsets, and actions that will unlock "${shortGoal}". Focusing on what truly makes the difference.`,
    },
    {
      icon: 'Rocket',
      title: 'Building momentum strategy',
      subtitle: `Designing early wins and progressive challenges for "${shortGoal}". Ensuring you build confidence and momentum from day one.`,
    },
    {
      icon: 'Heart',
      title: 'Personalizing experience',
      subtitle: `Tailoring every aspect of the plan to your preferences and schedule. Making "${shortGoal}" fit seamlessly into your life.`,
    },
    {
      icon: 'Star',
      title: 'Crafting weekly themes',
      subtitle: `Creating distinct themes for each week of your "${shortGoal}" journey. Week 1 focuses on foundation, Week 2 on skill building, Week 3 on mastery.`,
    },
    {
      icon: 'Target',
      title: 'Defining clear outcomes',
      subtitle: `Establishing what completion looks like for each task in "${shortGoal}". Setting success criteria so you know when you've truly finished each step.`,
    },
    {
      icon: 'Compass',
      title: 'Ensuring directional clarity',
      subtitle: `Making sure every single task moves you closer to "${shortGoal}". Eliminating distractions and focusing only on what matters.`,
    },
    {
      icon: 'Lightning',
      title: 'Balancing energy demands',
      subtitle: `Distributing harder and easier tasks throughout each day for "${shortGoal}". Matching task difficulty to your typical energy patterns.`,
    },
    {
      icon: 'Shield',
      title: 'Running quality assurance',
      subtitle: `Double-checking task order, timing, and content quality for "${shortGoal}". Ensuring professional-grade planning standards.`,
    },
    {
      icon: 'Book',
      title: 'Integrating best practices',
      subtitle: `Adding proven methodologies and expert techniques relevant to "${shortGoal}". Drawing from industry standards and success patterns.`,
    },
    {
      icon: 'Sparkle',
      title: 'Fine-tuning difficulty curve',
      subtitle: `Adjusting the challenge level across ${planDurationDays} days for "${shortGoal}". Starting accessible, gradually increasing, and ensuring realistic expectations.`,
    },
    {
      icon: 'Calendar',
      title: 'Finalizing schedule',
      subtitle: `Locking in your ${totalTasks} tasks across ${totalDays} days. Confirming all times fit within your ${timeRangesText} preferences.`,
    },
    {
      icon: 'CheckCircle',
      title: 'Preparing your plan',
      subtitle: `Compiling everything into your personalized ${planDurationDays}-day roadmap for "${shortGoal}". Getting ready to show you the complete plan.`,
    },
    {
      icon: 'Eye',
      title: 'Reviewing plan coherence',
      subtitle: `Ensuring all ${totalTasks} tasks flow logically toward "${shortGoal}". Checking that each task builds on previous ones and leads naturally to the next.`,
    },
    {
      icon: 'Trophy',
      title: 'Setting achievement milestones',
      subtitle: `Configuring weekly checkpoints and celebration points for "${shortGoal}". Planning when you will pause to recognize your progress and earn rewards.`,
    },
    {
      icon: 'Wand',
      title: 'Adding final touches',
      subtitle: `Polishing task descriptions, refining timing, and ensuring everything is perfect for "${shortGoal}". Almost ready to present your custom plan.`,
    },
    {
      icon: 'Brain',
      title: 'Verifying plan completeness',
      subtitle: `Confirming that your plan covers everything needed to achieve "${shortGoal}". Checking that no critical steps or phases are missing.`,
    },
    {
      icon: 'Lightbulb',
      title: 'Optimizing task sequencing',
      subtitle: `Ensuring tasks for "${shortGoal}" are ordered for maximum learning and skill building. Each task prepares you perfectly for what comes next.`,
    },
    {
      icon: 'Target',
      title: 'Finalizing deliverables',
      subtitle: `Preparing concrete outputs and deliverables for "${shortGoal}". Making sure you will have tangible results to show for your ${planDurationDays} days of effort.`,
    },
    {
      icon: 'CheckCircle',
      title: 'Your plan is ready',
      subtitle: `Your personalized ${planDurationDays}-day plan with ${totalTasks} tasks is complete. Preparing to show you the roadmap to "${shortGoal}".`,
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
              <Text variant="h4" style={[styles.title, { color: '#FFFFFF' }]}>
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
                Genie is working on your personalized plan...
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
