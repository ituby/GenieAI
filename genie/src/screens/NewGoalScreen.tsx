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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  Button,
  Text,
  Card,
  TextField,
  Icon,
  AILoadingModal,
  GoalSuccessModal,
  PlanPreviewModal,
  Dropdown,
} from '../components';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GOAL_CATEGORIES } from '../config/constants';

// Category configuration with icons and colors
const CATEGORY_CONFIG = [
  // First row
  {
    value: 'lifestyle' as const,
    label: 'Lifestyle',
    icon: 'heart',
    color: '#10B981', // green
  },
  {
    value: 'career' as const,
    label: 'Career',
    icon: 'briefcase',
    color: '#3B82F6', // blue
  },
  {
    value: 'mindset' as const,
    label: 'Mindset',
    icon: 'brain',
    color: '#8B5CF6', // purple
  },
  {
    value: 'character' as const,
    label: 'Character',
    icon: 'star',
    color: '#EC4899', // pink
  },
  // Second row
  {
    value: 'goal' as const,
    label: 'Goal',
    icon: 'flag',
    color: '#EF4444', // red
  },
  {
    value: 'learning' as const,
    label: 'Learning',
    icon: 'book',
    color: '#06B6D4', // cyan
  },
  {
    value: 'health' as const,
    label: 'Health',
    icon: 'heartbeat',
    color: '#22C55E', // green
  },
  {
    value: 'finance' as const,
    label: 'Finance',
    icon: 'currency-dollar',
    color: '#84CC16', // lime
  },
  // Third row
  {
    value: 'social' as const,
    label: 'Social',
    icon: 'users',
    color: '#A855F7', // violet
  },
  {
    value: 'fitness' as const,
    label: 'Fitness',
    icon: 'barbell',
    color: '#F97316', // orange
  },
  {
    value: 'creativity' as const,
    label: 'Creativity',
    icon: 'palette',
    color: '#EC4899', // pink
  },
  {
    value: 'custom' as const,
    label: 'Custom',
    icon: 'target',
    color: '#FFFF68', // Genie yellow
  },
];
import { GoalCategory } from '../types/goal';
import { supabase } from '../services/supabase/client';
import { Switch } from '../components/primitives/Switch';

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

  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'custom' as GoalCategory,
    planDurationDays: 21,
    tasksPerDayRange: { min: 3, max: 5 } as { min: number, max: number },
    preferredTimeRanges: [
      { start_hour: 8, end_hour: 12, label: 'Morning' },
      { start_hour: 14, end_hour: 18, label: 'Afternoon' },
      { start_hour: 19, end_hour: 23, label: 'Evening' }
    ] as Array<{start_hour: number, end_hour: number, label: string}>,
    preferredDays: [1, 2, 3, 4, 5, 6] as number[], // All days except Sunday (0)
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
    subcategory: null as string | null,
    marketingDomain: null as string | null,
    planOutline: [] as Array<{ title: string; description: string }>,
  });
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [planCategory, setPlanCategory] = useState<string | null>(null);
  const [planIconName, setPlanIconName] = useState<string | null>(null);
  const [planColor, setPlanColor] = useState<string | null>(null);

  // Publish preference: true = publish with developers (earn points & rewards), false = private (no points/rewards)
  const [publishWithDevelopers, setPublishWithDevelopers] =
    useState<boolean>(true);

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

  // Keys for persisting progress
  const PROGRESS_KEY = 'genie:new-goal-progress';

  const persistProgress = async (data: any) => {
    try {
      const payload = JSON.stringify({ ...data, userId: user?.id || null });
      await AsyncStorage.setItem(PROGRESS_KEY, payload);
    } catch (e) {
      // Non-critical
    }
  };

  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(PROGRESS_KEY);
    } catch {}
  };

  const restoreProgress = async () => {
    try {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || saved.userId !== user?.id) return;

      // Restore basic form/progress state
      if (saved.formData) setFormData(saved.formData);
      if (saved.createdGoalId) setCreatedGoalId(saved.createdGoalId);
      if (typeof saved.loadingStep === 'number')
        setLoadingStep(saved.loadingStep);
      if (typeof saved.isCreatingPlan === 'boolean')
        setIsCreatingPlan(saved.isCreatingPlan);
      if (typeof saved.showPlanPreview === 'boolean')
        setShowPlanPreview(saved.showPlanPreview);
      if (saved.planData) setPlanData(saved.planData);
      if (saved.planCategory) setPlanCategory(saved.planCategory);
      if (saved.planIconName) setPlanIconName(saved.planIconName);
      if (saved.planColor) setPlanColor(saved.planColor);

      // If we were in the middle of creation, re-trigger plan generation
      if (saved.state === 'creating' && saved.createdGoalId && saved.formData) {
        resumePlanGeneration(saved.createdGoalId, saved.formData);
      }
    } catch {}
  };

  useEffect(() => {
    restoreProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resumePlanGeneration = async (
    goalId: string,
    savedForm: typeof formData
  ) => {
    try {
      setIsCreatingPlan(true);
      // Recreate the interval progression
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev >= 15 ? 15 : prev + 1));
      }, 1500);
      setLoadingInterval(interval);

      // Get device timezone and current time using expo-localization
      const calendars = Localization.getCalendars();
      const deviceTimezone = calendars[0]?.timeZone || 'UTC'; // e.g., "Asia/Jerusalem"
      const deviceNow = new Date(); // Local device time
      const deviceUtcOffset = -deviceNow.getTimezoneOffset(); // Note: getTimezoneOffset returns negative of actual offset
      
      const response = await supabase.functions.invoke('generate-plan', {
        body: {
          user_id: user?.id,
          goal_id: goalId,
          category: savedForm.category,
          title: savedForm.title.trim(),
          description: savedForm.description.trim(),
          intensity: 'medium', // Default intensity based on tasks per day range
          timezone: deviceTimezone, // Legacy field for backward compatibility
          device_now_iso: deviceNow.toISOString(),
          device_timezone: deviceTimezone,
          device_utc_offset_minutes: deviceUtcOffset,
          language: 'en',
          detailed_plan: true,
          plan_duration_days: savedForm.planDurationDays,
          preferred_time_ranges: savedForm.preferredTimeRanges,
          preferred_days: savedForm.preferredDays.length > 0 ? savedForm.preferredDays : undefined,
        },
      });

      if (response.error) {
        setLoadingStep(16);
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
          const data = {
            milestones: fallbackMilestones,
            goalTitle: savedForm.title.trim(),
            subcategory: null,
            marketingDomain: null,
            planOutline: fallbackMilestones.map((m) => ({
              title: m.title,
              description: m.description,
            })),
          };
          setPlanData(data);
          setIsCreatingPlan(false);
          setShowPlanPreview(true);
          persistProgress({
            state: 'preview',
            isCreatingPlan: false,
            showPlanPreview: true,
            planData: data,
            createdGoalId: goalId,
            formData: savedForm,
            loadingStep: 16,
            planCategory,
          });
        }, 1000);
      } else {
        const taskCount = response.data?.tasks?.length || 21;
        const rewardCount = response.data?.rewards?.length || 0;
        const iconName = response.data?.icon_name || 'star';
        const aiColor =
          (response.data?.color as string | undefined) || undefined;
        const category = response.data?.category || 'custom';
        const subcategory = response.data?.subcategory || null;
        const marketingDomain = response.data?.marketing_domain || null;

        setPlanCategory(category);
        setPlanIconName(iconName);
        setPlanColor(aiColor || mapCategoryToColor(category));
        setLoadingStep(16);
        // Prefer AI-provided milestones; otherwise derive from days
        let milestones =
          response.data?.milestones ||
          generateMilestonesFromPlan(response.data);
        const planOutline =
          response.data?.plan_outline ||
          milestones.map((m: any) => ({
            title: m.title,
            description: m.description,
          }));

        // If we have a 3-item outline, align milestone titles/descriptions to it
        if (
          Array.isArray(planOutline) &&
          planOutline.length >= 3 &&
          Array.isArray(milestones) &&
          milestones.length >= 3
        ) {
          milestones = milestones.slice(0, 3).map((m: any, idx: number) => ({
            ...m,
            title: planOutline[idx]?.title || m.title,
            description: planOutline[idx]?.description || m.description,
          }));
        }

        setTimeout(() => {
          const data = {
            milestones,
            goalTitle: savedForm.title.trim(),
            subcategory,
            marketingDomain,
            planOutline,
          };
          setPlanData(data);
          setIsCreatingPlan(false);
          setShowPlanPreview(true);
          persistProgress({
            state: 'preview',
            isCreatingPlan: false,
            showPlanPreview: true,
            planData: data,
            createdGoalId: goalId,
            formData: savedForm,
            loadingStep: 16,
            planCategory: category,
            planIconName: iconName,
            planColor: aiColor || mapCategoryToColor(category),
          });
        }, 1000);
      }
    } catch (e) {
      setIsCreatingPlan(false);
    } finally {
      if (loadingInterval) {
        clearInterval(loadingInterval);
        setLoadingInterval(null);
      }
    }
  };

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

      // Get selected category config
      const selectedCategoryConfig = CATEGORY_CONFIG.find(cat => cat.value === formData.category);
      
      // First create the goal
      const goal = await createGoal({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: 'paused',
        start_date: new Date().toISOString().split('T')[0],
        icon_name: selectedCategoryConfig?.icon || 'star',
        color: selectedCategoryConfig?.color || '#FFFF68',
      });

      console.log('✅ Goal created:', goal.id);
      setCreatedGoalId(goal.id);

      // Persist initial progress
      persistProgress({
        state: 'creating',
        isCreatingPlan: true,
        loadingStep: 1,
        createdGoalId: goal.id,
        formData,
      });

      // Then generate AI plan with detailed 21-day roadmap
      try {
        // Get device timezone and current time using expo-localization
        const calendars = Localization.getCalendars();
        const deviceTimezone = calendars[0]?.timeZone || 'UTC'; // e.g., "Asia/Jerusalem"
        const deviceNow = new Date(); // Local device time
        const deviceUtcOffset = -deviceNow.getTimezoneOffset(); // Note: getTimezoneOffset returns negative of actual offset
        
        const response = await supabase.functions.invoke('generate-plan', {
          body: {
            user_id: user.id,
            goal_id: goal.id,
            category: formData.category,
            title: formData.title.trim(),
            description: formData.description.trim(),
            intensity: 'medium', // Default intensity based on tasks per day range
            timezone: deviceTimezone, // Legacy field for backward compatibility
            device_now_iso: deviceNow.toISOString(),
            device_timezone: deviceTimezone,
            device_utc_offset_minutes: deviceUtcOffset,
            language: 'en', // Default to English
            detailed_plan: true, // Request detailed 21-day roadmap
            plan_duration_days: formData.planDurationDays,
            preferred_time_ranges: formData.preferredTimeRanges,
            preferred_days: formData.preferredDays.length > 0 ? formData.preferredDays : undefined,
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
              subcategory: null,
              marketingDomain: null,
              planOutline: fallbackMilestones.map((m) => ({
                title: m.title,
                description: m.description,
              })),
            });
            setIsCreatingPlan(false);
            setShowPlanPreview(true);
            persistProgress({
              state: 'preview',
              isCreatingPlan: false,
              showPlanPreview: true,
              planData: {
                milestones: fallbackMilestones,
                goalTitle: formData.title.trim(),
                subcategory: null,
                marketingDomain: null,
                planOutline: fallbackMilestones.map((m) => ({
                  title: m.title,
                  description: m.description,
                })),
              },
              createdGoalId: goal.id,
              formData,
              loadingStep: 16,
            });
          }, 1000);
        } else {
          const taskCount = response.data?.tasks?.length || 21;
          const rewardCount = response.data?.rewards?.length || 0;
          const iconName = response.data?.icon_name || 'star';
          const aiColor =
            (response.data?.color as string | undefined) || undefined;
          const category = response.data?.category || 'custom';
          const subcategory = response.data?.subcategory || null;
          const marketingDomain = response.data?.marketing_domain || null;

          console.log('✅ AI Plan generated:', {
            taskCount,
            rewardCount,
            iconName,
            color: aiColor,
          });
          setPlanCategory(category);
          setPlanIconName(iconName);
          setPlanColor(aiColor || mapCategoryToColor(category));
          // Ensure we reach the final step before showing plan preview
          setLoadingStep(16);

          // Use milestones from AI response or derive from days
          let milestones =
            response.data?.milestones ||
            generateMilestonesFromPlan(response.data);
          // Build outline and align milestone titles/descriptions if possible
          const planOutline =
            response.data?.plan_outline ||
            milestones.map((m: any) => ({
              title: m.title,
              description: m.description,
            }));
          if (
            Array.isArray(planOutline) &&
            planOutline.length >= 3 &&
            Array.isArray(milestones) &&
            milestones.length >= 3
          ) {
            milestones = milestones.slice(0, 3).map((m: any, idx: number) => ({
              ...m,
              title: planOutline[idx]?.title || m.title,
              description: planOutline[idx]?.description || m.description,
            }));
          }

          setTimeout(() => {
            setPlanData({
              milestones,
              goalTitle: formData.title.trim(),
              subcategory,
              marketingDomain,
              planOutline,
            });
            setIsCreatingPlan(false);
            setShowPlanPreview(true);
            persistProgress({
              state: 'preview',
              isCreatingPlan: false,
              showPlanPreview: true,
              planData: {
                milestones,
                goalTitle: formData.title.trim(),
                subcategory,
                marketingDomain,
                planOutline,
              },
              createdGoalId: goal.id,
              formData,
              loadingStep: 16,
              planCategory: category,
              planIconName: iconName,
              planColor: aiColor || mapCategoryToColor(category),
            });
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
            subcategory: null,
            marketingDomain: null,
            planOutline: fallbackMilestones.map((m) => ({
              title: m.title,
              description: m.description,
            })),
          });
          setIsCreatingPlan(false);
          setShowPlanPreview(true);
          persistProgress({
            state: 'preview',
            isCreatingPlan: false,
            showPlanPreview: true,
            planData: {
              milestones: fallbackMilestones,
              goalTitle: formData.title.trim(),
              subcategory: null,
              marketingDomain: null,
              planOutline: fallbackMilestones.map((m) => ({
                title: m.title,
                description: m.description,
              })),
            },
            createdGoalId: goal.id,
            formData,
            loadingStep: 16,
          });
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
      persistProgress({
        state: 'idle',
        isCreatingPlan: false,
        loadingStep: 1,
        createdGoalId,
        formData,
      });
      setIsCreatingPlan(false);
      setLoadingStep(1);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.description.trim() && formData.category;
      case 2:
        return true;
      default:
        return false;
    }
  };


  type Milestone = {
    week: number;
    title: string;
    description: string;
    tasks: number;
  };
  const generateMilestonesFromPlan = (planData: any): Milestone[] => {
    // Extract milestones from the plan data
    const milestones: Milestone[] = [];

    if (planData?.days) {
      // Group days by week
      const weeks: Record<number, Milestone> = {} as any;
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
      Object.values(weeks).forEach((week) => {
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

  const handleApprovePlan = async () => {
    setShowPlanPreview(false);
    // Get the selected category config for success modal
    const selectedCategoryConfig = CATEGORY_CONFIG.find(cat => cat.value === formData.category);
    
    setSuccessData({
      taskCount: planData.milestones.reduce(
        (sum, milestone) => sum + milestone.tasks,
        0
      ),
      rewardCount: 5,
      iconName: selectedCategoryConfig?.icon || 'star',
      color: selectedCategoryConfig?.color || '#FFFF68',
    });
    // If user consented to share and a goal was created, insert shared submission row
    try {
      // Activate the goal with user's selected category and color
      if (createdGoalId) {
        // Get the selected category config to preserve user's choice
        const selectedCategoryConfig = CATEGORY_CONFIG.find(cat => cat.value === formData.category);
        const finalCategory = formData.category;
        const finalIcon = selectedCategoryConfig?.icon || 'star';
        const finalColor = selectedCategoryConfig?.color || '#FFFF68';
        
        try {
          await supabase
            .from('goals')
            .update({
              status: 'active',
              category: finalCategory,
              icon_name: finalIcon,
              color: finalColor,
            })
            .eq('id', createdGoalId);
        } catch (e) {
          console.warn('Failed to activate goal with user settings:', e);
        }
      }

      if (publishWithDevelopers && createdGoalId && user?.id) {
        // Fetch user points for this goal (if exists)
        const { data: pointsRow } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .eq('goal_id', createdGoalId)
          .single();

        // Insert shared submission
        await supabase.from('shared_goal_submissions').insert({
          user_id: user.id,
          goal_id: createdGoalId,
          request_title: formData.title.trim(),
          request_description: formData.description.trim(),
          intensity: 'medium', // Default intensity
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          category: (planCategory as any) || 'custom',
          subcategory: planData.subcategory,
          marketing_domain: planData.marketingDomain,
          plan_milestones: planData.milestones,
          plan_outline: planData.planOutline,
          tasks_generated: planData.milestones.reduce(
            (sum, m) => sum + (m.tasks || 0),
            0
          ),
          program_start_at: new Date().toISOString(),
          program_end_at: null,
          points_earned: pointsRow?.points || 0,
          adherence_score: 0,
          status: 'active',
          publish_with_developers: true,
          consent_version: 'v1',
          notes: null,
        });
      }
    } catch (e) {
      console.warn('Failed to insert shared submission:', e);
    }

    setShowSuccessModal(true);
    // Mark as completed in progress store
    persistProgress({ state: 'success' });
  };

  // Category -> color name mapping used when AI doesn't provide a color
  const mapCategoryToColor = (category: string): string => {
    const map: Record<string, string> = {
      lifestyle: 'green',
      career: 'blue',
      mindset: 'purple',
      character: 'pink',
      goal: 'red',
      learning: 'cyan',
      health: 'green',
      finance: 'lime',
      social: 'violet',
      fitness: 'orange',
      creativity: 'pink',
      custom: 'yellow',
    };
    return map[category] || 'yellow';
  };

  const handleTryAgain = () => {
    setShowPlanPreview(false);
    // Reset form and allow user to try again
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      category: 'custom',
      planDurationDays: 21,
      tasksPerDayRange: { min: 3, max: 5 },
      preferredTimeRanges: [
        { start_hour: 8, end_hour: 12, label: 'Morning' },
        { start_hour: 14, end_hour: 18, label: 'Afternoon' },
        { start_hour: 19, end_hour: 23, label: 'Evening' }
      ],
      preferredDays: [1, 2, 3, 4, 5, 6],
    });
    setErrors({});
    // Clear persisted progress on try again
    clearProgress();
  };

  const handleStartJourney = () => {
    setShowSuccessModal(false);
    onGoalCreated?.();
    clearProgress();
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
        <View style={styles.spacer} />
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
          {/* Multi-Step Form */}
          <View style={styles.form}>

            {/* Step Content */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                <Card style={styles.stepCard}>
                  <View style={styles.stepNumberCircle}>
                    <Text variant="body" color="primary" style={styles.stepNumberText}>
                      1
                    </Text>
                  </View>
                  <View style={styles.stepCardContent}>
                    <Text variant="h3" color="primary" style={styles.stepTitle}>
                      What's your goal?
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.stepDescription}>
                      Tell me what you want to achieve and I'll create a personalized plan for you.
                    </Text>
                  </View>
                </Card>

                {/* Category Selection */}
                <View style={[styles.categorySection, styles.fieldSpacing]}>
                  <Dropdown
                    options={CATEGORY_CONFIG}
                    value={formData.category}
                    onValueChange={(value) => updateField('category', value)}
                    placeholder="Select a category"
                    style={styles.categoryDropdown}
                    label="What area of your life?"
                  />
                </View>

                {/* Title */}
                <View style={styles.fieldSpacing}>
                  <TextField
                    label="What exactly do you want to achieve?"
                    value={formData.title}
                    onChangeText={(value) => updateField('title', value)}
                    error={errors.title}
                    placeholder="e.g., 'Learn Spanish fluently', 'Run a marathon', 'Start my own business'"
                    maxLength={100}
                    inputStyle={styles.rightAlignedInput}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    containerStyle={styles.darkInputContainer}
                  />
                </View>

                {/* Description */}
                <View style={styles.fieldSpacing}>
                  <TextField
                    label="Tell me more about your journey"
                    value={formData.description}
                    onChangeText={(value) => updateField('description', value)}
                    error={errors.description}
                    placeholder="Why is this important to you? What's your current situation? What challenges do you face? How will success look and feel?"
                    multiline
                    numberOfLines={6}
                    maxLength={500}
                    containerStyle={[styles.darkInputContainer, styles.descriptionContainer]}
                    inputStyle={styles.rightAlignedInput}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>

                {/* Advanced Settings Button */}
                <View style={styles.advancedSettingsContainer}>
                  <TouchableOpacity
                    style={styles.advancedSettingsButton}
                    onPress={() => setShowAdvancedSettings(true)}
                    activeOpacity={0.8}
                  >
                    <Icon name="sliders" size={20} color="#FFFF68" weight="bold" />
                    <Text variant="body" color="primary" style={styles.advancedSettingsText}>
                      Advanced Settings
                    </Text>
                    <Icon name="chevron-right" size={16} color="#FFFF68" weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.stepContent}>
                <Card style={styles.stepCard}>
                  <View style={styles.stepNumberCircle}>
                    <Text variant="body" color="primary" style={styles.stepNumberText}>
                      2
                    </Text>
                  </View>
                  <View style={styles.stepCardContent}>
                    <Text variant="h3" color="primary" style={styles.stepTitle}>
                      Share with developers
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.stepDescription}>
                      Help us improve and promote Genie. Published goals earn points
                      and unlock rewards & perks. Private goals do not participate
                      in points and rewards.
                    </Text>
                  </View>
                </Card>

                {/* Publish preference */}
                <Card variant="default" padding="md" style={{ marginTop: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="h4">Enable sharing</Text>
                    <Switch
                      value={publishWithDevelopers}
                      onValueChange={setPublishWithDevelopers}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FFFF68' }}
                      thumbColor={publishWithDevelopers ? '#000000' : '#FFFFFF'}
                    />
                  </View>
                </Card>
              </View>
            )}

            {/* Advanced Settings Modal */}
            {showAdvancedSettings && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text variant="h3" color="primary" style={styles.modalTitle}>
                      Advanced Settings
                    </Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowAdvancedSettings(false)}
                      activeOpacity={0.8}
                    >
                      <Icon name="x" size={24} color="#FFFF68" weight="bold" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {/* Plan Duration */}
                    <View style={styles.section}>
                      <Text variant="h4" color="primary" style={styles.sectionTitle}>
                        Plan duration
                      </Text>
                      <Text variant="caption" color="secondary" style={styles.sectionSubtitle}>
                        How long should your plan last?
                      </Text>
                      <Dropdown
                        options={[
                          { label: '1 week', value: '7' },
                          { label: '2 weeks', value: '14' },
                          { label: '3 weeks', value: '21' },
                          { label: '1 month', value: '30' },
                          { label: '6 weeks', value: '42' },
                          { label: '2 months', value: '60' },
                          { label: '3 months', value: '90' },
                          { label: '6 months', value: '180' },
                          { label: '1 year', value: '365' },
                        ]}
                        value={formData.planDurationDays.toString()}
                        onValueChange={(value) => updateField('planDurationDays', parseInt(value))}
                        placeholder="Select duration"
                        style={styles.durationDropdown}
                        label="Duration"
                      />
                    </View>

                    {/* Preferred Days */}
                    <View style={styles.section}>
                      <Text variant="h4" color="primary" style={styles.sectionTitle}>
                        Preferred days
                      </Text>
                      <Text variant="caption" color="secondary" style={styles.sectionSubtitle}>
                        Select your available days (or leave blank for every day)
                      </Text>
                      <View style={styles.daysGrid}>
                        {[
                          { value: 0, label: 'S' },
                          { value: 1, label: 'M' },
                          { value: 2, label: 'T' },
                          { value: 3, label: 'W' },
                          { value: 4, label: 'T' },
                          { value: 5, label: 'F' },
                          { value: 6, label: 'S' },
                        ].map((day) => (
                          <TouchableOpacity
                            key={day.value}
                            style={[
                              styles.dayOption,
                              formData.preferredDays.includes(day.value) && styles.dayOptionActive,
                            ]}
                            onPress={() => {
                              const newDays = formData.preferredDays.includes(day.value)
                                ? formData.preferredDays.filter(d => d !== day.value)
                                : [...formData.preferredDays, day.value];
                              updateField('preferredDays', newDays);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text
                              variant="body"
                              color={formData.preferredDays.includes(day.value) ? 'primary' : 'secondary'}
                              style={[
                                styles.dayOptionText,
                                formData.preferredDays.includes(day.value) && styles.dayOptionTextActive
                              ]}
                            >
                              {day.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Preferred Time Ranges */}
                    <View style={styles.section}>
                      <Text variant="h4" color="primary" style={styles.sectionTitle}>
                        Preferred times
                      </Text>
                      <Text variant="caption" color="secondary" style={styles.sectionSubtitle}>
                        Choose up to 3 time ranges that work for you
                      </Text>
                      {formData.preferredTimeRanges.map((range, index) => (
                        <View key={index} style={styles.timeRangeCard}>
                          <View style={styles.timeRangeHeader}>
                            <Text variant="caption" color="secondary" style={styles.timeRangeLabel}>
                              {index === 0 ? "Morning" : index === 1 ? "Afternoon" : "Evening"}
                            </Text>
                            <Icon 
                              name={index === 0 ? "sun" : index === 1 ? "sun-horizon" : "moon"} 
                              size={20} 
                              color="#FFFF68" 
                              weight="fill" 
                            />
                          </View>
                          <View style={styles.timeInputs}>
                            <View style={styles.timeInput}>
                              <Text variant="caption" color="secondary" style={styles.timeLabel}>From:</Text>
                              <View style={styles.timePickerContainer}>
                                <TouchableOpacity
                                  style={styles.timePickerButton}
                                  onPress={() => {
                                    if (range.start_hour > 0) {
                                      const newRanges = [...formData.preferredTimeRanges];
                                      newRanges[index].start_hour = range.start_hour - 1;
                                      updateField('preferredTimeRanges', newRanges);
                                    }
                                  }}
                                >
                                  <Icon name="minus" size={14} color="#FFFF68" weight="bold" />
                                </TouchableOpacity>
                                <View style={styles.timeDisplay}>
                                  <Text variant="h4" color="primary" style={styles.timeText}>
                                    {range.start_hour.toString().padStart(2, '0')}:00
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.timePickerButton}
                                  onPress={() => {
                                    if (range.start_hour < range.end_hour - 1) {
                                      const newRanges = [...formData.preferredTimeRanges];
                                      newRanges[index].start_hour = range.start_hour + 1;
                                      updateField('preferredTimeRanges', newRanges);
                                    }
                                  }}
                                >
                                  <Icon name="plus" size={14} color="#FFFF68" weight="bold" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={styles.timeInput}>
                              <Text variant="caption" color="secondary" style={styles.timeLabel}>To:</Text>
                              <View style={styles.timePickerContainer}>
                                <TouchableOpacity
                                  style={styles.timePickerButton}
                                  onPress={() => {
                                    if (range.end_hour > range.start_hour + 1) {
                                      const newRanges = [...formData.preferredTimeRanges];
                                      newRanges[index].end_hour = range.end_hour - 1;
                                      updateField('preferredTimeRanges', newRanges);
                                    }
                                  }}
                                >
                                  <Icon name="minus" size={14} color="#FFFF68" weight="bold" />
                                </TouchableOpacity>
                                <View style={styles.timeDisplay}>
                                  <Text variant="h4" color="primary" style={styles.timeText}>
                                    {range.end_hour.toString().padStart(2, '0')}:00
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.timePickerButton}
                                  onPress={() => {
                                    if (range.end_hour < 23) {
                                      const newRanges = [...formData.preferredTimeRanges];
                                      newRanges[index].end_hour = range.end_hour + 1;
                                      updateField('preferredTimeRanges', newRanges);
                                    }
                                  }}
                                >
                                  <Icon name="plus" size={14} color="#FFFF68" weight="bold" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                      {formData.preferredTimeRanges.length < 3 && (
                        <TouchableOpacity
                          style={styles.addTimeRangeButton}
                          onPress={() => {
                            const newRanges = [...formData.preferredTimeRanges];
                            newRanges.push({
                              start_hour: 9,
                              end_hour: 17,
                              label: `Range ${newRanges.length + 1}`
                            });
                            updateField('preferredTimeRanges', newRanges);
                          }}
                        >
                          <Icon name="plus" size={16} color="#FFFF68" weight="bold" />
                          <Text variant="body" color="primary" style={styles.addTimeRangeText}>
                            Add Time Range
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Tasks Per Day Range */}
                    <View style={styles.section}>
                      <Text variant="h4" color="primary" style={styles.sectionTitle}>
                        Tasks per day
                      </Text>
                      <Text variant="caption" color="secondary" style={styles.sectionSubtitle}>
                        Choose your daily task range
                      </Text>
                      <View style={styles.tasksRangeCard}>
                        <View style={styles.tasksRangeContainer}>
                          <View style={styles.tasksRangeInput}>
                            <Text variant="caption" color="secondary" style={styles.rangeLabel}>From:</Text>
                            <View style={styles.numberPickerContainer}>
                              <TouchableOpacity
                                style={styles.numberPickerButton}
                                onPress={() => {
                                  if (formData.tasksPerDayRange.min > 1) {
                                    updateField('tasksPerDayRange', {
                                      ...formData.tasksPerDayRange,
                                      min: formData.tasksPerDayRange.min - 1
                                    });
                                  }
                                }}
                              >
                                <Icon name="minus" size={16} color="#FFFF68" weight="bold" />
                              </TouchableOpacity>
                              <View style={styles.numberDisplay}>
                                <Text variant="h4" color="primary" style={styles.numberText}>
                                  {formData.tasksPerDayRange.min}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.numberPickerButton}
                                onPress={() => {
                                  if (formData.tasksPerDayRange.min < formData.tasksPerDayRange.max - 1) {
                                    updateField('tasksPerDayRange', {
                                      ...formData.tasksPerDayRange,
                                      min: formData.tasksPerDayRange.min + 1
                                    });
                                  }
                                }}
                              >
                                <Icon name="plus" size={16} color="#FFFF68" weight="bold" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.tasksRangeInput}>
                            <Text variant="caption" color="secondary" style={styles.rangeLabel}>To:</Text>
                            <View style={styles.numberPickerContainer}>
                              <TouchableOpacity
                                style={styles.numberPickerButton}
                                onPress={() => {
                                  if (formData.tasksPerDayRange.max > formData.tasksPerDayRange.min + 1) {
                                    updateField('tasksPerDayRange', {
                                      ...formData.tasksPerDayRange,
                                      max: formData.tasksPerDayRange.max - 1
                                    });
                                  }
                                }}
                              >
                                <Icon name="minus" size={16} color="#FFFF68" weight="bold" />
                              </TouchableOpacity>
                              <View style={styles.numberDisplay}>
                                <Text variant="h4" color="primary" style={styles.numberText}>
                                  {formData.tasksPerDayRange.max}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.numberPickerButton}
                                onPress={() => {
                                  if (formData.tasksPerDayRange.max < 10) {
                                    updateField('tasksPerDayRange', {
                                      ...formData.tasksPerDayRange,
                                      max: formData.tasksPerDayRange.max + 1
                                    });
                                  }
                                }}
                              >
                                <Icon name="plus" size={16} color="#FFFF68" weight="bold" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  {/* Modal Buttons */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowAdvancedSettings(false)}
                      activeOpacity={0.8}
                    >
                      <Text variant="body" color="primary" style={styles.modalCancelButtonText}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSaveButton}
                      onPress={() => setShowAdvancedSettings(false)}
                      activeOpacity={0.8}
                    >
                      <Text variant="body" color="primary" style={styles.modalSaveButtonText}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              {currentStep < 2 ? (
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.navButtonPrimary,
                    !canProceedToNextStep() && styles.navButtonDisabled,
                    styles.centeredButton,
                  ]}
                  onPress={nextStep}
                  disabled={!canProceedToNextStep()}
                  activeOpacity={0.8}
                >
                  <Text variant="body" color="primary" style={[styles.navButtonText, styles.navButtonTextBlack, { textAlign: 'center' }]}>
                    Continue
                  </Text>
                  <Icon name="arrow-right" size={20} color="#000000" weight="bold" />
                </TouchableOpacity>
              ) : (
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
              )}
              
              {currentStep > 1 && (
                <TouchableOpacity
                  style={styles.stepBackButton}
                  onPress={prevStep}
                  activeOpacity={0.8}
                >
                  <Icon name="arrow-left" size={20} color="#FFFF68" weight="bold" />
                  <Text variant="body" color="primary" style={styles.stepBackButtonText}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
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
            planOutline={planData.planOutline}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 40, // Small padding under header
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
  categorySection: {
    gap: 12,
  },
  categoryDropdown: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionContainer: {
    minHeight: 140,
  },
  rightAlignedInput: {
    textAlign: 'left',
    fontSize: 14,
  },
  darkInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centeredButton: {
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
  // New styles for plan customization
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 12,
  },
  fieldSpacing: {
    marginBottom: 20,
  },
  durationDropdown: {
    marginTop: 12,
  },
  timeRangeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeRangeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeRangeLabel: {
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInput: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    marginBottom: 6,
    fontWeight: '500',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timePickerButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    minWidth: 50,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  timeText: {
    fontWeight: '700',
    fontSize: 16,
  },
  removeTimeRangeButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  addTimeRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    borderStyle: 'dashed',
    gap: 8,
  },
  addTimeRangeText: {
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  dayOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  dayOptionActive: {
    backgroundColor: '#FFFF68',
    borderColor: '#FFFF68',
  },
  dayOptionText: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  dayOptionTextActive: {
    color: '#000000',
  },
  // Step indicator styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#FFFF68',
    borderColor: '#FFFF68',
  },
  stepNumber: {
    fontWeight: '700',
    fontSize: 16,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#FFFF68',
  },
  // Step content styles
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  // Navigation buttons styles
  navigationButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 0,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#FFFF68',
    borderColor: '#FFFF68',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontWeight: '600',
  },
  navButtonTextBlack: {
    color: '#000000',
  },
  navButtonSpacer: {
    flex: 1,
  },
  stepBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  stepBackButtonText: {
    fontWeight: '600',
  },
  // Tasks range styles
  tasksRangeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 12,
  },
  tasksRangeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  tasksRangeInput: {
    flex: 1,
    alignItems: 'center',
  },
  rangeLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  numberPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  numberPickerButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberDisplay: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  numberText: {
    fontWeight: '700',
  },
  // Back button styles
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  // Step card styles
  stepCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
    position: 'relative',
  },
  stepNumberCircle: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFF68',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
  },
  stepCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  // Create Button Styles (for Send to Genie)
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
  // Advanced Settings Button
  advancedSettingsContainer: {
    marginTop: 0,
  },
  advancedSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
    justifyContent: 'space-between',
  },
  advancedSettingsText: {
    flex: 1,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelButtonText: {
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#FFFF68',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  modalSaveButtonText: {
    fontWeight: '600',
    color: '#000000',
  },
});
