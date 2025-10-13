import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
// i18n removed
import { LinearGradient } from 'expo-linear-gradient';
import {
  Button,
  Text,
  Card,
  TextField,
  Icon,
  AILoadingModal,
  GoalSuccessModal,
  PlanPreviewModal,
} from '../components';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GOAL_CATEGORIES } from '../config/constants';
import { GoalCategory } from '../types/goal';
import { supabase } from '../services/supabase/client';

interface NewGoalScreenProps {
  onGoalCreated?: () => void;
  onBack?: () => void;
}

export const NewGoalScreen: React.FC<NewGoalScreenProps> = ({
  onGoalCreated,
  onBack,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { createGoal, loading } = useGoalStore();

  // Check if user is subscribed
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('user_tokens')
            .select('is_subscribed')
            .eq('user_id', user.id)
            .single();

          setIsSubscribed(data?.is_subscribed || false);
        } catch (error) {
          console.log('User subscription check failed:', error);
          setIsSubscribed(false);
        }
      }
    };

    checkSubscription();
  }, [user?.id]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    intensity: 'easy' as 'easy' | 'medium' | 'hard',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingInterval, setLoadingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [successData, setSuccessData] = useState({
    taskCount: 0,
    rewardCount: 0,
    iconName: '',
    color: '',
  });
  const [planData, setPlanData] = useState({
    milestones: [] as Array<{
      week: number;
      title: string;
      description: string;
      tasks: number;
    }>,
    goalTitle: '',
  });

  // Animation for gradient
  const gradientAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (loadingInterval) {
        clearInterval(loadingInterval);
      }
    };
  }, [loadingInterval]);

  useEffect(() => {
    // Start gradient animation loop
    const startGradientAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startGradientAnimation();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Goal title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Goal description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Goal description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      setIsCreatingPlan(true);
      setLoadingStep(1);

      // Start progressive loading animation with faster pace to reach last title 3 seconds before results
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev >= 15) {
            // Stop at step 15, let the final step be triggered manually
            clearInterval(interval);
            return 15;
          }
          return prev + 1;
        });
      }, 1500); // Change step every 1500ms (1.5 seconds) for faster progression

      setLoadingInterval(interval);

      // First create the goal
      const goal = await createGoal({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: 'custom',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });

      console.log('✅ Goal created:', goal.id);

      // Then generate AI plan with detailed 21-day roadmap
      try {
        const response = await supabase.functions.invoke('generate-plan', {
          body: {
            user_id: user.id,
            goal_id: goal.id,
            category: 'custom',
            title: formData.title.trim(),
            description: formData.description.trim(),
            intensity: formData.intensity,
            timezone: 'Asia/Jerusalem',
            language: 'en', // Default to English
            detailed_plan: true, // Request detailed 21-day roadmap
          },
        });

        if (response.error) {
          console.error('❌ Plan generation error:', response.error);
          // Ensure we reach the final step before showing plan preview
          setLoadingStep(16);

          // Generate fallback milestones
          const fallbackMilestones = [
            {
              week: 1,
              title: 'Foundation & Setup',
              description:
                'Establishing core habits and building momentum for your journey.',
              tasks: 21,
            },
            {
              week: 2,
              title: 'Skill Development',
              description:
                'Advancing your skills and deepening your commitment to the goal.',
              tasks: 21,
            },
            {
              week: 3,
              title: 'Mastery & Transformation',
              description:
                'Achieving mastery and preparing for long-term success.',
              tasks: 21,
            },
          ];

          setTimeout(() => {
            setPlanData({
              milestones: fallbackMilestones,
              goalTitle: formData.title.trim(),
            });
            setIsCreatingPlan(false);
            setShowPlanPreview(true);
          }, 1000);
        } else {
          const taskCount = response.data?.tasks?.length || 21;
          const rewardCount = response.data?.rewards?.length || 0;
          const iconName = response.data?.icon_name || 'star';
          const color = response.data?.color || 'yellow';

          console.log('✅ AI Plan generated:', {
            taskCount,
            rewardCount,
            iconName,
            color,
          });

          // Update goal with AI-selected icon and color
          if (iconName && iconName !== 'star') {
            try {
              await supabase
                .from('goals')
                .update({ icon_name: iconName, color: color })
                .eq('id', goal.id);
              console.log(
                '🎨 Updated goal with icon and color:',
                iconName,
                color
              );
            } catch (iconError) {
              console.warn(
                '⚠️ Failed to update goal icon and color:',
                iconError
              );
            }
          }
          // Ensure we reach the final step before showing plan preview
          setLoadingStep(16);

          // Use milestones from AI response or generate fallback
          const milestones =
            response.data?.milestones ||
            generateMilestonesFromPlan(response.data);

          setTimeout(() => {
            setPlanData({
              milestones,
              goalTitle: formData.title.trim(),
            });
            setIsCreatingPlan(false);
            setShowPlanPreview(true);
          }, 1000);
        }
      } catch (planError) {
        console.error('❌ Failed to generate plan:', planError);
        // Ensure we reach the final step before showing plan preview
        setLoadingStep(15);

        // Generate fallback milestones
        const fallbackMilestones = [
          {
            week: 1,
            title: 'Foundation & Setup',
            description:
              'Establishing core habits and building momentum for your journey.',
            tasks: 21,
          },
          {
            week: 2,
            title: 'Skill Development',
            description:
              'Advancing your skills and deepening your commitment to the goal.',
            tasks: 21,
          },
          {
            week: 3,
            title: 'Mastery & Transformation',
            description:
              'Achieving mastery and preparing for long-term success.',
            tasks: 21,
          },
        ];

        setTimeout(() => {
          setPlanData({
            milestones: fallbackMilestones,
            goalTitle: formData.title.trim(),
          });
          setIsCreatingPlan(false);
          setShowPlanPreview(true);
        }, 1000);
      }
    } catch (error: any) {
      console.error('❌ Goal creation error:', error);
      // Ensure we reach the final step before showing error
      setLoadingStep(16);

      Alert.alert('Error', `Failed to create goal: ${error.message}`);
    } finally {
      // Clear loading interval
      if (loadingInterval) {
        clearInterval(loadingInterval);
        setLoadingInterval(null);
      }
      setIsCreatingPlan(false);
      setLoadingStep(1);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleIntensitySelect = (intensity: 'easy' | 'medium' | 'hard') => {
    // Check if user can select medium/hard intensity
    if ((intensity === 'medium' || intensity === 'hard') && !isSubscribed) {
      Alert.alert(
        'Premium Feature',
        'Medium and High intensity levels are available for subscribed users only. Upgrade to Premium to unlock advanced goal planning!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => {
              // TODO: Navigate to subscription screen
              console.log('Navigate to subscription');
            },
          },
        ]
      );
      return;
    }

    setFormData((prev) => ({ ...prev, intensity }));
  };

  const generateMilestonesFromPlan = (planData: any) => {
    // Extract milestones from the plan data
    const milestones = [];

    if (planData?.days) {
      // Group days by week
      const weeks = {};
      planData.days.forEach((day: any) => {
        const weekNumber = Math.ceil(day.day / 7);
        if (!weeks[weekNumber]) {
          weeks[weekNumber] = {
            week: weekNumber,
            title: `Week ${weekNumber} Focus`,
            description: `Building momentum and establishing key habits for your goal.`,
            tasks: 0,
          };
        }
        weeks[weekNumber].tasks += day.tasks?.length || 0;
      });

      // Convert to array and add descriptions
      Object.values(weeks).forEach((week: any) => {
        if (week.week === 1) {
          week.title = 'Foundation & Setup';
          week.description =
            'Establishing core habits and building momentum for your journey.';
        } else if (week.week === 2) {
          week.title = 'Skill Development';
          week.description =
            'Advancing your skills and deepening your commitment to the goal.';
        } else if (week.week === 3) {
          week.title = 'Mastery & Transformation';
          week.description =
            'Achieving mastery and preparing for long-term success.';
        }
        milestones.push(week);
      });
    }

    // Fallback if no plan data
    if (milestones.length === 0) {
      return [
        {
          week: 1,
          title: 'Foundation & Setup',
          description:
            'Establishing core habits and building momentum for your journey.',
          tasks: 21,
        },
        {
          week: 2,
          title: 'Skill Development',
          description:
            'Advancing your skills and deepening your commitment to the goal.',
          tasks: 21,
        },
        {
          week: 3,
          title: 'Mastery & Transformation',
          description: 'Achieving mastery and preparing for long-term success.',
          tasks: 21,
        },
      ];
    }

    return milestones;
  };

  const handleApprovePlan = () => {
    setShowPlanPreview(false);
    setSuccessData({
      taskCount: planData.milestones.reduce(
        (sum, milestone) => sum + milestone.tasks,
        0
      ),
      rewardCount: 5,
      iconName: 'star',
      color: 'yellow',
    });
    setShowSuccessModal(true);
  };

  const handleTryAgain = () => {
    setShowPlanPreview(false);
    // Reset form and allow user to try again
    setFormData({
      title: '',
      description: '',
      intensity: 'easy',
    });
    setErrors({});
  };

  const handleStartJourney = () => {
    setShowSuccessModal(false);
    onGoalCreated?.();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Fixed Header */}
      <View style={styles.absoluteHeader}>
        {/* Blur overlay */}
        <View style={styles.blurOverlay} />
        {/* Additional blur effect */}
        <View style={styles.blurEffect} />
        {/* Extra blur layers */}
        <View style={styles.blurEffect2} />
        <View style={styles.blurEffect3} />
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon
            name="arrow-left"
            size={24}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>
        <Text variant="h4" style={styles.largeTitle} numberOfLines={1}>
          Genie
        </Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form */}
          <View style={styles.form}>
            <TextField
              label="What's your goal?"
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              error={errors.title}
              placeholder="Learn Spanish"
              maxLength={100}
              inputStyle={styles.rightAlignedInput}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              containerStyle={styles.darkInputContainer}
            />

            <TextField
              label="Describe your goal in detail"
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              error={errors.description}
              placeholder="Why is this important to you? How will you know you've succeeded?"
              multiline
              numberOfLines={6}
              maxLength={500}
              containerStyle={[
                styles.descriptionContainer,
                styles.darkInputContainer,
              ]}
              inputStyle={styles.rightAlignedInput}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
            />

            {/* Intensity Level Selection */}
            <View style={styles.intensitySection}>
              <Text variant="h4" style={styles.intensityLabel}>
                Choose Intensity Level
              </Text>
              <Text
                variant="caption"
                color="secondary"
                style={styles.intensityDescription}
              >
                {formData.intensity === 'easy' &&
                  '3 tasks per day • Perfect for beginners'}
                {formData.intensity === 'medium' &&
                  '6 tasks per day • Balanced approach'}
                {formData.intensity === 'hard' &&
                  '12 tasks per day • Maximum challenge'}
              </Text>

              <View style={styles.intensityButtons}>
                <TouchableOpacity
                  style={[
                    styles.intensityButton,
                    formData.intensity === 'easy' &&
                      styles.intensityButtonSelected,
                  ]}
                  onPress={() => handleIntensitySelect('easy')}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="leaf"
                    size={20}
                    color={
                      formData.intensity === 'easy' ? '#000000' : '#FFFF68'
                    }
                    weight="fill"
                  />
                  <Text
                    style={[
                      styles.intensityButtonText,
                      formData.intensity === 'easy' &&
                        styles.intensityButtonTextSelected,
                    ]}
                  >
                    Easy
                  </Text>
                  <Text
                    style={[
                      styles.intensityButtonSubtext,
                      formData.intensity === 'easy' &&
                        styles.intensityButtonSubtextSelected,
                    ]}
                  >
                    3/day
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.intensityButton,
                    formData.intensity === 'medium' &&
                      styles.intensityButtonSelected,
                    !isSubscribed &&
                      !(formData.intensity === 'medium') &&
                      styles.intensityButtonLocked,
                  ]}
                  onPress={() => handleIntensitySelect('medium')}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="fire"
                    size={20}
                    color={
                      formData.intensity === 'medium' ? '#000000' : '#FFFF68'
                    }
                    weight="fill"
                  />
                  <Text
                    style={[
                      styles.intensityButtonText,
                      formData.intensity === 'medium' &&
                        styles.intensityButtonTextSelected,
                    ]}
                  >
                    Medium
                  </Text>
                  <Text
                    style={[
                      styles.intensityButtonSubtext,
                      formData.intensity === 'medium' &&
                        styles.intensityButtonSubtextSelected,
                    ]}
                  >
                    6/day
                  </Text>
                  {!isSubscribed && (
                    <View style={styles.premiumBadge}>
                      <Icon
                        name="crown"
                        size={12}
                        color="#FFFF68"
                        weight="fill"
                      />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.intensityButton,
                    formData.intensity === 'hard' &&
                      styles.intensityButtonSelected,
                    !isSubscribed &&
                      !(formData.intensity === 'hard') &&
                      styles.intensityButtonLocked,
                  ]}
                  onPress={() => handleIntensitySelect('hard')}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="lightning"
                    size={20}
                    color={
                      formData.intensity === 'hard' ? '#000000' : '#FFFF68'
                    }
                    weight="fill"
                  />
                  <Text
                    style={[
                      styles.intensityButtonText,
                      formData.intensity === 'hard' &&
                        styles.intensityButtonTextSelected,
                    ]}
                  >
                    Hard
                  </Text>
                  <Text
                    style={[
                      styles.intensityButtonSubtext,
                      formData.intensity === 'hard' &&
                        styles.intensityButtonSubtextSelected,
                    ]}
                  >
                    12/day
                  </Text>
                  {!isSubscribed && (
                    <View style={styles.premiumBadge}>
                      <Icon
                        name="crown"
                        size={12}
                        color="#FFFF68"
                        weight="fill"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* AI Loading Modal */}
          <AILoadingModal
            visible={isCreatingPlan}
            currentStep={loadingStep}
            totalSteps={16}
          />

          {/* Plan Preview Modal */}
          <PlanPreviewModal
            visible={showPlanPreview}
            milestones={planData.milestones}
            goalTitle={planData.goalTitle}
            onApprove={handleApprovePlan}
            onTryAgain={handleTryAgain}
          />

          {/* Goal Success Modal */}
          <GoalSuccessModal
            visible={showSuccessModal}
            taskCount={successData.taskCount}
            rewardCount={successData.rewardCount}
            iconName={successData.iconName}
            color={successData.color}
            onStartJourney={handleStartJourney}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Animated.View
              style={[
                styles.createButton,
                {
                  transform: [
                    {
                      scale: gradientAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.02, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                disabled={loading || isCreatingPlan}
                onPress={handleSubmit}
                activeOpacity={0.8}
                style={styles.createButtonTouchable}
              >
                <AnimatedLinearGradient
                  colors={[
                    gradientAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['#FFFF68', '#FFFFFF', '#FFFF68'],
                    }),
                    gradientAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['#FFFFFF', '#FFFF68', '#FFFFFF'],
                    }),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <View style={styles.createButtonContent}>
                    <Text style={styles.createButtonText}>
                      {isCreatingPlan
                        ? 'Genie is Creating Your Plan...'
                        : 'Send to Genie'}
                    </Text>
                    {loading || isCreatingPlan ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Icon
                        name="sparkle"
                        size={20}
                        color="#000000"
                        weight="fill"
                      />
                    )}
                  </View>
                </AnimatedLinearGradient>
              </TouchableOpacity>
            </Animated.View>
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
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area padding
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: -1,
  },
  blurEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 30,
    zIndex: -2,
  },
  blurEffect2: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 40,
    zIndex: -3,
  },
  blurEffect3: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 50,
    zIndex: -4,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 100, // Space for absolute header
  },
  scrollContent: {
    paddingBottom: 20,
  },
  spacer: {
    width: 60, // Same width as back button for centering
  },
  backButton: {
    padding: 8,
  },
  largeTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  form: {
    padding: 20,
    gap: 20,
  },
  descriptionContainer: {
    minHeight: 120,
  },
  rightAlignedInput: {
    textAlign: 'left',
    fontSize: 14,
  },
  darkInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  actions: {
    padding: 20,
  },
  createButton: {
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
  createButtonTouchable: {
    width: '100%',
  },
  createButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Intensity Level Styles
  intensitySection: {
    marginTop: 8,
  },
  intensityLabel: {
    marginBottom: 8,
    color: '#FFFFFF',
  },
  intensityDescription: {
    marginBottom: 16,
    color: '#FFFF68',
    fontSize: 12,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  intensityButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  intensityButtonSelected: {
    backgroundColor: '#FFFF68',
    borderColor: '#FFFF68',
  },
  intensityButtonLocked: {
    opacity: 0.6,
  },
  intensityButtonText: {
    color: '#FFFF68',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  intensityButtonTextSelected: {
    color: '#000000',
  },
  intensityButtonSubtext: {
    color: 'rgba(255, 255, 104, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  intensityButtonSubtextSelected: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    borderRadius: 8,
    padding: 4,
  },
});
