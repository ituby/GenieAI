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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { colors } from '../theme/colors';

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
  onShowTokenPurchase?: () => void;
}

export const NewGoalScreen: React.FC<NewGoalScreenProps> = ({
  onGoalCreated,
  onBack,
  onShowTokenPurchase,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { createGoal, loading } = useGoalStore();

  // Check if user is subscribed
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user?.id) {
        try {
          // Check subscription
          const { data: tokenData } = await supabase
            .from('user_tokens')
            .select('is_subscribed')
            .eq('user_id', user.id)
            .single();

          const subscribed = tokenData?.is_subscribed || false;
          setIsSubscribed(subscribed);

          // Load user preferences (includes timezone synced from users table)
          const { data: prefs, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && prefs) {
            console.log('📋 Loaded user preferences:', prefs);
            console.log('📋 User timezone from preferences:', prefs.timezone);
            setFormData((prev) => ({
              ...prev,
              // Force 21 days for non-subscribers, allow saved value for subscribers
              planDurationDays: subscribed ? (prefs.plan_duration_days || 21) : 21,
              tasksPerDayRange: {
                min: prefs.tasks_per_day_min || 3,
                max: prefs.tasks_per_day_max || 5,
              },
              preferredTimeRanges: prefs.preferred_time_ranges || [
                { start_hour: 8, end_hour: 12, label: 'Morning' },
                { start_hour: 14, end_hour: 18, label: 'Afternoon' },
                { start_hour: 19, end_hour: 23, label: 'Evening' },
              ],
              preferredDays: prefs.preferred_days || [1, 2, 3, 4, 5, 6],
            }));
          } else {
            console.log('📋 No user preferences found, using defaults');
            // Ensure non-subscribers get 21 days
            if (!subscribed) {
              setFormData((prev) => ({
                ...prev,
                planDurationDays: 21,
              }));
            }
          }
        } catch (error) {
          console.log('User preferences load failed:', error);
        }
      }
    };

    loadUserPreferences();
  }, [user?.id]);

  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'custom' as GoalCategory,
    planDurationDays: 21,
    tasksPerDayRange: { min: 3, max: 5 } as { min: number; max: number },
    preferredTimeRanges: [
      { start_hour: 8, end_hour: 12, label: 'Morning' },
      { start_hour: 14, end_hour: 18, label: 'Afternoon' },
      { start_hour: 19, end_hour: 23, label: 'Evening' },
    ] as Array<{ start_hour: number; end_hour: number; label: string }>,
    preferredDays: [1, 2, 3, 4, 5, 6] as number[], // All days except Sunday (0)
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingInterval, setLoadingInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isCancelledRef = React.useRef(false); // Track if user cancelled the process
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [isResuming, setIsResuming] = useState(false); // Prevent duplicate resume calls
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

  // Surprise Me feature
  const [isSurprisingMe, setIsSurprisingMe] = useState(false);
  // Surprise Me button is always visible now

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

  // Keep Surprise Me button always visible
  // Removed animation that hides button when title is filled

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
      // Check if there's text from dashboard chat input
      const categoryText = await AsyncStorage.getItem('genie:category');
      const titleText = await AsyncStorage.getItem('genie:title_text');
      const inputText = await AsyncStorage.getItem('genie:input_text');
      
      if (categoryText || titleText || inputText) {
        setFormData(prev => ({
          ...prev,
          category: (categoryText as GoalCategory) || prev.category,
          title: titleText?.trim() || '',
          description: inputText?.trim() || '',
        }));
        // Clear the stored text
        await AsyncStorage.removeItem('genie:category');
        await AsyncStorage.removeItem('genie:title_text');
        await AsyncStorage.removeItem('genie:input_text');
      }

      // First, check database for paused goals (highest priority)
      if (user?.id) {
        const { data: pendingGoals, error: dbError } = await supabase
          .from('goals')
          .select(
            'id, title, description, category, icon_name, color, plan_duration_days, preferred_time_ranges, preferred_days'
          )
          .eq('user_id', user.id)
          .eq('status', 'paused')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!dbError && pendingGoals && pendingGoals.length > 0) {
          const pendingGoal = pendingGoals[0];
          console.log(
            '📋 Found paused goal in DB:',
            pendingGoal.id,
            '- resuming...'
          );

          // Restore form data from goal
          setFormData({
            title: pendingGoal.title,
            description: pendingGoal.description,
            category: pendingGoal.category,
            planDurationDays: pendingGoal.plan_duration_days || 21,
            tasksPerDayRange: { min: 3, max: 5 },
            preferredTimeRanges: pendingGoal.preferred_time_ranges || [
              { start_hour: 8, end_hour: 12, label: 'Morning' },
              { start_hour: 14, end_hour: 18, label: 'Afternoon' },
              { start_hour: 19, end_hour: 23, label: 'Evening' },
            ],
            preferredDays: pendingGoal.preferred_days || [1, 2, 3, 4, 5, 6],
          });

          setCreatedGoalId(pendingGoal.id);

          // Resume plan generation (will check plan_outlines table)
          resumePlanGeneration(pendingGoal.id, {
            title: pendingGoal.title,
            description: pendingGoal.description,
            category: pendingGoal.category,
            planDurationDays: pendingGoal.plan_duration_days || 21,
            tasksPerDayRange: { min: 3, max: 5 },
            preferredTimeRanges: pendingGoal.preferred_time_ranges || [
              { start_hour: 8, end_hour: 12, label: 'Morning' },
              { start_hour: 14, end_hour: 18, label: 'Afternoon' },
              { start_hour: 19, end_hour: 23, label: 'Evening' },
            ],
            preferredDays: pendingGoal.preferred_days || [1, 2, 3, 4, 5, 6],
          });

          return; // Exit early - database takes priority
        }
      }

      // If no paused goals in DB, check AsyncStorage
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || saved.userId !== user?.id) return;

      // Check if the saved goal is still paused in the database
      if (saved.createdGoalId) {
        const { data: goalData } = await supabase
          .from('goals')
          .select('status')
          .eq('id', saved.createdGoalId)
          .single();

        // If goal is no longer paused, clear the progress
        if (!goalData || goalData.status !== 'paused') {
          console.log('🧹 Clearing stale progress - goal is no longer paused');
          await clearProgress();
          return;
        }
      }

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

      // Restore success data if available
      if (saved.successData) {
        setSuccessData(saved.successData);
      } else if (saved.planData) {
        // Generate success data from plan data if not saved
        const taskCount =
          saved.planData.milestones?.reduce(
            (sum: number, milestone: any) => sum + (milestone.tasks || 0),
            0
          ) || 21;
        const selectedCategoryConfig = CATEGORY_CONFIG.find(
          (cat) => cat.value === saved.formData?.category
        );
        setSuccessData({
          taskCount,
          rewardCount: 5,
          iconName:
            saved.planIconName || selectedCategoryConfig?.icon || 'star',
          color: saved.planColor || selectedCategoryConfig?.color || '#FFFF68',
        });
      }

      // If we were in the middle of creation, re-trigger plan generation
      if (saved.state === 'creating' && saved.createdGoalId && saved.formData) {
        resumePlanGeneration(saved.createdGoalId, saved.formData);
      }

      // If we were in preview state, show the plan preview modal
      // But only if the goal is still paused (not active)
      if (saved.state === 'preview' && saved.planData && saved.createdGoalId) {
        const { data: goalData } = await supabase
          .from('goals')
          .select('status')
          .eq('id', saved.createdGoalId)
          .single();

        // Only show preview if goal is still paused
        if (goalData?.status === 'paused') {
          setShowPlanPreview(true);
        } else {
          console.log('🧹 Goal is no longer paused, clearing preview state');
          await clearProgress();
        }
      }

      // If we were in success state, show the success modal
      if (saved.state === 'success' && saved.successData) {
        setShowSuccessModal(true);
      }
    } catch {}
  };

  useEffect(() => {
    restoreProgress();
    cleanupOrphanedGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Check for advanced settings flag on mount
  useEffect(() => {
    const checkAdvancedSettings = async () => {
      const showAdvanced = await AsyncStorage.getItem('genie:show_advanced');
      if (showAdvanced === 'true') {
        // Small delay to ensure screen is mounted
        setTimeout(() => {
          setShowAdvancedSettings(true);
        }, 100);
        await AsyncStorage.removeItem('genie:show_advanced');
      }
    };
    checkAdvancedSettings();
  }, []);

  // Clean up orphaned goals (paused goals older than 24 hours with no progress)
  const cleanupOrphanedGoals = async () => {
    if (!user?.id) return;

    try {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'paused')
        .lt('created_at', oneDayAgo.toISOString());

      if (error) {
        console.warn('⚠️ Error cleaning up orphaned goals:', error);
      } else {
        console.log('🧹 Cleaned up old paused goals');
      }
    } catch (error) {
      console.warn('⚠️ Error in cleanupOrphanedGoals:', error);
    }
  };

  const resumePlanGeneration = async (
    goalId: string,
    savedForm: typeof formData
  ) => {
    // Prevent duplicate calls
    if (isResuming) {
      console.log(
        '⚠️ Already resuming plan generation, skipping duplicate call'
      );
      return;
    }

    try {
      // Reset cancellation flag when resuming
      isCancelledRef.current = false;
      
      setIsResuming(true);
      console.log('🔄 Resuming plan generation for goal:', goalId);

      // First, check immediately if plan outline already exists (fast check)
      console.log('🔍 Quick check - looking for existing plan outline...');
      const { data: quickCheckData, error: quickCheckError } = await supabase
        .from('plan_outlines')
        .select('*')
        .eq('goal_id', goalId)
        .single();

      if (!quickCheckError && quickCheckData) {
        // Plan outline exists! Load it immediately and show preview without loading animation
        console.log('✅ Plan outline found immediately - loading data...');

        // Reconstruct plan_outline array from week columns
        const reconstructedOutline: Array<{
          title: string;
          description: string;
        }> = [];
        for (let i = 1; i <= 24; i++) {
          const titleKey = `week_${i}_title` as keyof typeof quickCheckData;
          const descKey =
            `week_${i}_description` as keyof typeof quickCheckData;

          if (quickCheckData[titleKey] && quickCheckData[descKey]) {
            reconstructedOutline.push({
              title: quickCheckData[titleKey] as string,
              description: quickCheckData[descKey] as string,
            });
          } else {
            break; // No more weeks
          }
        }

        // Get goal data for additional info
        const { data: goalData } = await supabase
          .from('goals')
          .select('*, goal_tasks(id)')
          .eq('id', goalId)
          .single();

        const taskCount = goalData?.goal_tasks?.length || 0;

        const data = {
          milestones: quickCheckData.milestones || [],
          goalTitle: goalData?.title || savedForm.title,
          subcategory: null,
          marketingDomain: null,
          planOutline: reconstructedOutline,
          deliverables: quickCheckData.deliverables || {},
        };

        setPlanData(data);
        setPlanCategory(goalData?.category || savedForm.category);
        setPlanIconName(goalData?.icon_name || 'star');
        setPlanColor(goalData?.color || '#FFFF68');
        setSuccessData({
          taskCount,
          rewardCount: 5,
          iconName: goalData?.icon_name || 'star',
          color: goalData?.color || '#FFFF68',
        });

        // Show preview immediately without loading animation
        setShowPlanPreview(true);

        await persistProgress({
          state: 'preview',
          isCreatingPlan: false,
          showPlanPreview: true,
          planData: data,
          createdGoalId: goalId,
          formData: savedForm,
          loadingStep: 40,
          planCategory: goalData?.category,
          planIconName: goalData?.icon_name,
          planColor: goalData?.color,
          successData: {
            taskCount,
            rewardCount: 5,
            iconName: goalData?.icon_name || 'star',
            color: goalData?.color || '#FFFF68',
          },
        });

        setIsResuming(false);
        return;
      }

      // Plan outline doesn't exist yet - start loading animation and poll
      console.log(
        '⏳ Plan outline not ready yet - starting loading animation...'
      );
      setIsCreatingPlan(true);
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev >= 39 ? 39 : prev + 1));
      }, 800);
      setLoadingInterval(interval);

      // Poll the database to check if plan outline was created (previous request completing)
      const pollForPlanOutline = async (maxAttempts = 60): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          console.log(
            `🔍 Polling attempt ${attempt}/${maxAttempts} - checking if plan outline exists...`
          );

          const { data: planOutlineData, error: outlineError } = await supabase
            .from('plan_outlines')
            .select('*')
            .eq('goal_id', goalId)
            .single();

          if (!outlineError && planOutlineData) {
            // Plan outline exists! Load it and show preview
            console.log('✅ Plan outline found - loading data...');

            // Reconstruct plan_outline array from week columns
            const reconstructedOutline: Array<{
              title: string;
              description: string;
            }> = [];
            for (let i = 1; i <= 24; i++) {
              const titleKey =
                `week_${i}_title` as keyof typeof planOutlineData;
              const descKey =
                `week_${i}_description` as keyof typeof planOutlineData;

              if (planOutlineData[titleKey] && planOutlineData[descKey]) {
                reconstructedOutline.push({
                  title: planOutlineData[titleKey] as string,
                  description: planOutlineData[descKey] as string,
                });
              } else {
                break; // No more weeks
              }
            }

            // Get goal data for additional info
            const { data: goalData } = await supabase
              .from('goals')
              .select('*, goal_tasks(id)')
              .eq('id', goalId)
              .single();

            const taskCount = goalData?.goal_tasks?.length || 0;

            const data = {
              milestones: planOutlineData.milestones || [],
              goalTitle: goalData?.title || savedForm.title,
              subcategory: null,
              marketingDomain: null,
              planOutline: reconstructedOutline,
              deliverables: planOutlineData.deliverables || {},
            };

            setPlanData(data);
            setPlanCategory(goalData?.category || savedForm.category);
            setPlanIconName(goalData?.icon_name || 'star');
            setPlanColor(goalData?.color || '#FFFF68');
            setSuccessData({
              taskCount,
              rewardCount: 5,
              iconName: goalData?.icon_name || 'star',
              color: goalData?.color || '#FFFF68',
            });

            if (interval) clearInterval(interval);
            setLoadingInterval(null);
            setIsCreatingPlan(false);
            setShowPlanPreview(true);

            await persistProgress({
              state: 'preview',
              isCreatingPlan: false,
              showPlanPreview: true,
              planData: data,
              createdGoalId: goalId,
              formData: savedForm,
              loadingStep: 40,
              planCategory: goalData?.category,
              planIconName: goalData?.icon_name,
              planColor: goalData?.color,
              successData: {
                taskCount,
                rewardCount: 5,
                iconName: goalData?.icon_name || 'star',
                color: goalData?.color || '#FFFF68',
              },
            });

            return true;
          }

          // Wait 3 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        console.log(
          '⏱️ Polling timeout - no plan outline found after',
          maxAttempts,
          'attempts'
        );
        return false;
      };

      // Try polling (wait up to 3 minutes for previous request to complete)
      const planFound = await pollForPlanOutline(60);

      if (planFound) {
        // Plan was found via polling, we're done!
        return;
      }

      // If polling failed, the previous request probably failed - send a new request
      console.log('🆕 Previous request likely failed, sending new request...');

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
          preferred_days:
            savedForm.preferredDays.length > 0
              ? savedForm.preferredDays
              : undefined,
        },
      });

      if (response.error) {
        console.error('❌ Generate-plan error:', response.error);
        
        // Check if this is a token insufficiency error
        const errorMessage = response.error?.message || '';
        const isTokenError = errorMessage.includes('tokens') || 
                            errorMessage.includes('Not enough') ||
                            errorMessage.includes('Insufficient');
        
        if (isTokenError) {
          // Show token error to user - DO NOT use fallback
          setIsCreatingPlan(false);
          setShowPlanPreview(false);
          Alert.alert(
            'Not Enough Tokens',
            errorMessage + '\n\nPlease load at least 100 tokens to continue with Genie.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Get Tokens', 
                onPress: () => {
                  console.log('User needs to purchase tokens');
                  // TODO: Navigate to subscription/purchase screen
                }
              }
            ]
          );
          return; // Stop here
        }
        
        // For other errors, use fallback
        console.warn('⚠️ Using fallback milestones due to non-token error');
        setLoadingStep(40);
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
          // 🚨 Check if user cancelled before showing preview
          if (isCancelledRef.current) {
            console.log('⏸️ User cancelled - skipping plan preview');
            return;
          }
          
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
        setLoadingStep(40);
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
          // 🚨 Check if user cancelled before showing preview
          if (isCancelledRef.current) {
            console.log('⏸️ User cancelled - skipping plan preview');
            return;
          }
          
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
      console.error('Error in resumePlanGeneration:', e);
    } finally {
      if (loadingInterval) {
        clearInterval(loadingInterval);
        setLoadingInterval(null);
      }
      setIsResuming(false); // Reset flag to allow future calls
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

  const handleSaveAdvancedSettings = async () => {
    if (!user?.id) {
      setShowAdvancedSettings(false);
      return;
    }

    try {
      console.log('💾 Saving advanced settings to user preferences...');
      
      // Get timezone from users table
      const { data: userData } = await supabase
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const userTimezone = userData?.timezone || 'UTC';
      console.log('📍 User timezone from users table:', userTimezone);

      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            plan_duration_days: formData.planDurationDays,
            tasks_per_day_min: formData.tasksPerDayRange.min,
            tasks_per_day_max: formData.tasksPerDayRange.max,
            preferred_time_ranges: formData.preferredTimeRanges,
            preferred_days: formData.preferredDays,
            timezone: userTimezone, // שאיבה מטבלת users
          },
          { onConflict: 'user_id' }
        );

      if (prefsError) {
        console.warn('⚠️ Failed to save advanced settings:', prefsError);
      } else {
        console.log('✅ Advanced settings saved to user preferences with timezone:', userTimezone);
      }
    } catch (error) {
      console.warn('⚠️ Error saving advanced settings:', error);
    }

    setShowAdvancedSettings(false);
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      // 🚨 CHECK TOKENS FIRST - before starting the creation process!
      const totalWeeks = Math.ceil(formData.planDurationDays / 7);
      const tokensNeeded = totalWeeks * 3; // 3 tokens per milestone
      
      console.log(`📊 Plan needs ${tokensNeeded} tokens (${totalWeeks} weeks × 3)`);
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('tokens_remaining, is_subscribed, monthly_tokens')
        .eq('user_id', user.id)
        .single();
      
      if (tokenError) {
        console.error('❌ Error checking tokens:', tokenError);
        Alert.alert('Error', 'Unable to check token balance. Please try again.');
        return;
      }
      
      const currentTokens = tokenData?.tokens_remaining || 0;
      
      if (currentTokens < tokensNeeded) {
        const tokensToLoad = Math.max(100, tokensNeeded - currentTokens);
        Alert.alert(
          'Not Enough Tokens',
          `You need ${tokensNeeded} tokens to create this ${formData.planDurationDays}-day plan, but you only have ${currentTokens} tokens.\n\nPlease load at least ${tokensToLoad} tokens to continue with Genie.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Get Tokens', 
              onPress: () => {
                console.log('User needs to purchase tokens');
                // TODO: Navigate to subscription/tokens screen
              }
            }
          ]
        );
        return; // Stop here - don't start creation
      }
      
      console.log(`✅ User has ${currentTokens} tokens - sufficient for ${totalWeeks} milestones`);
      
      // Reset cancellation flag at the start of a new process
      isCancelledRef.current = false;
      
      setIsCreatingPlan(true);
      setLoadingStep(1);

      // Start progressive loading animation - now with 40 messages
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev >= 39) {
            // Stop at step 39, let the final step (40) be triggered when done
            clearInterval(interval);
            return 39;
          }
          return prev + 1;
        });
      }, 800); // Change step every 800ms for 40 messages = ~32 seconds total

      setLoadingInterval(interval);

      // Update user preferences with current form data
      try {
        console.log('💾 Updating user preferences...');
        
        // Get timezone from users table
        const { data: userData } = await supabase
          .from('users')
          .select('timezone')
          .eq('id', user.id)
          .single();

        const userTimezone = userData?.timezone || 'UTC';
        console.log('📍 User timezone from users table:', userTimezone);

        const { error: prefsError } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              plan_duration_days: formData.planDurationDays,
              tasks_per_day_min: formData.tasksPerDayRange.min,
              tasks_per_day_max: formData.tasksPerDayRange.max,
              preferred_time_ranges: formData.preferredTimeRanges,
              preferred_days: formData.preferredDays,
              timezone: userTimezone, // שאיבה מטבלת users
            },
            { onConflict: 'user_id' }
          );

        if (prefsError) {
          console.warn('⚠️ Failed to update user preferences:', prefsError);
          // Don't block goal creation if preferences update fails
        } else {
          console.log('✅ User preferences updated successfully with timezone:', userTimezone);
        }
      } catch (prefsUpdateError) {
        console.warn('⚠️ Error updating preferences:', prefsUpdateError);
        // Continue with goal creation
      }

      // Get selected category config
      const selectedCategoryConfig = CATEGORY_CONFIG.find(
        (cat) => cat.value === formData.category
      );

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
        // Save advanced settings to database
        plan_duration_days: formData.planDurationDays,
        preferred_time_ranges: formData.preferredTimeRanges,
        preferred_days: formData.preferredDays,
        tasks_per_day_min: formData.tasksPerDayRange.min,
        tasks_per_day_max: formData.tasksPerDayRange.max,
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

      // Then generate AI plan outline first (Stage 1)
      try {
        // Get device timezone and current time using expo-localization
        const calendars = Localization.getCalendars();
        const deviceTimezone = calendars[0]?.timeZone || 'UTC'; // e.g., "Asia/Jerusalem"
        const deviceNow = new Date(); // Local device time
        const deviceUtcOffset = -deviceNow.getTimezoneOffset(); // Note: getTimezoneOffset returns negative of actual offset

        // Stage 1: Generate plan outline
        const outlineResponse = await supabase.functions.invoke(
          'generate-plan',
          {
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
              stage: 'outline', // Request outline generation only
              plan_duration_days: formData.planDurationDays,
              preferred_time_ranges: formData.preferredTimeRanges,
              preferred_days:
                formData.preferredDays.length > 0
                  ? formData.preferredDays
                  : undefined,
              tasks_per_day_min: formData.tasksPerDayRange.min,
              tasks_per_day_max: formData.tasksPerDayRange.max,
            },
          }
        );

        if (outlineResponse.error) {
          console.error(
            '❌ Plan outline generation error:',
            outlineResponse.error
          );
          
          // Check if this is a token insufficiency error
          const errorMessage = outlineResponse.error?.message || '';
          const isTokenError = errorMessage.includes('tokens') || 
                              errorMessage.includes('Not enough') ||
                              errorMessage.includes('Insufficient');
          
          if (isTokenError) {
            // Show token error to user - DO NOT use fallback
            setIsCreatingPlan(false);
            setShowPlanPreview(false);
            Alert.alert(
              'Not Enough Tokens',
              errorMessage + '\n\nPlease purchase tokens to continue using Genie.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Get Tokens', 
                  onPress: () => {
                    // Show token purchase modal if callback provided
                    if (onShowTokenPurchase) {
                      onShowTokenPurchase();
                    } else {
                      console.log('User needs to purchase tokens - no callback provided');
                    }
                  }
                }
              ]
            );
            return; // Stop here - don't use fallback
          }
          
          // For other errors, use fallback
          console.warn('⚠️ Using fallback milestones due to non-token error');
          setLoadingStep(40);

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
            // 🚨 Check if user cancelled before showing preview
            if (isCancelledRef.current) {
              console.log('⏸️ User cancelled - skipping plan preview (outline error fallback)');
              return;
            }
            
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
          // Stage 1 successful - we got the outline
          const iconName = outlineResponse.data?.icon_name || 'star';
          const aiColor =
            (outlineResponse.data?.color as string | undefined) || undefined;
          const category = outlineResponse.data?.category || 'custom';
          const subcategory = outlineResponse.data?.subcategory || null;
          const marketingDomain =
            outlineResponse.data?.marketing_domain || null;
          const milestones = outlineResponse.data?.milestones || [];
          const planOutline = outlineResponse.data?.plan_outline || [];

          console.log('✅ AI Plan outline generated:', {
            iconName,
            color: aiColor,
            category,
            milestonesCount: milestones.length,
            outlineCount: planOutline.length,
          });

          setPlanCategory(category);
          setPlanIconName(iconName);
          setPlanColor(aiColor || mapCategoryToColor(category));

          // Ensure we reach the final step before showing plan preview
          setLoadingStep(40);

          setTimeout(() => {
            // 🚨 Check if user cancelled before showing preview
            if (isCancelledRef.current) {
              console.log('⏸️ User cancelled - skipping plan preview (success path)');
              return;
            }
            
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
        setLoadingStep(40);

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
          // 🚨 Check if user cancelled before showing preview
          if (isCancelledRef.current) {
            console.log('⏸️ User cancelled - skipping plan preview (second outline error)');
            return;
          }
          
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
      setLoadingStep(40);

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

  const handleSurpriseMe = async () => {
    try {
      setIsSurprisingMe(true);

      // Check if user has entered a title
      const hasTitle = formData.title.trim().length > 0;

      // Call the Supabase Edge Function with selected category and optional title
      const { data, error } = await supabase.functions.invoke('suggest-goal', {
        body: {
          category: formData.category,
          userContext: '',
          userId: user?.id,  // Send userId for token deduction
          title: hasTitle ? formData.title.trim() : undefined, // Send title if exists
        },
      });

      if (error) {
        console.error('Error getting goal suggestion:', error);
        Alert.alert(
          'Oops!',
          'Could not generate a surprise goal. Please try again.'
        );
        return;
      }

      if (data?.success && data?.data) {
        const suggestion = data.data;

        // If user had a title, only update description (keep their title)
        // If no title, update both title and description
        if (hasTitle) {
          setFormData((prev) => ({
            ...prev,
            description: suggestion.description,
            category: suggestion.category as GoalCategory,
          }));

          // Show feedback about description completion
          setTimeout(() => {
            Alert.alert(
              '✨ Description Added!',
              'I completed the description based on your title. Feel free to edit it!',
              [{ text: 'Got it!', style: 'default' }]
            );
          }, 300);
        } else {
          // No title - update everything
          setFormData((prev) => ({
            ...prev,
            title: suggestion.title,
            description: suggestion.description,
            category: suggestion.category as GoalCategory,
          }));

          // Show feedback about full suggestion
          setTimeout(() => {
            Alert.alert(
              '✨ Surprise!',
              `How about this goal: "${suggestion.title}"?\n\nFeel free to edit it to make it your own!`,
              [{ text: 'Got it!', style: 'default' }]
            );
          }, 300);
        }

        // Clear any errors
        setErrors({});
      }
    } catch (error) {
      console.error('Error in handleSurpriseMe:', error);
      Alert.alert('Oops!', 'Something went wrong. Please try again.');
    } finally {
      setIsSurprisingMe(false);
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
        return (
          formData.title.trim() &&
          formData.description.trim() &&
          formData.category
        );
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

  const generateMilestonesFromTasks = (
    tasks: any[],
    planDurationDays: number
  ): any[] => {
    // Generate milestones from existing tasks by grouping them into weeks
    const totalWeeks = Math.ceil(planDurationDays / 7);
    const weeks: Record<number, any> = {};

    // Group tasks by week
    tasks.forEach((task: any) => {
      const taskDate = new Date(task.run_at);
      const dayNumber =
        Math.floor(
          (taskDate.getTime() -
            new Date(tasks[0]?.run_at || Date.now()).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
      const weekNumber = Math.ceil(dayNumber / 7);

      if (!weeks[weekNumber]) {
        weeks[weekNumber] = {
          week: weekNumber,
          title:
            weekNumber === 1
              ? 'Foundation & Setup'
              : weekNumber === 2
                ? 'Skill Development'
                : 'Mastery & Transformation',
          description:
            weekNumber === 1
              ? 'Establishing core habits and building momentum for your journey.'
              : weekNumber === 2
                ? 'Advancing your skills and deepening your commitment to the goal.'
                : 'Achieving mastery and preparing for long-term success.',
          tasks: 0,
        };
      }
      weeks[weekNumber].tasks++;
    });

    // Convert to array and ensure we have at least 3 milestones
    const milestonesArray = Object.values(weeks);

    // If we have fewer than 3 milestones, add placeholder ones
    while (milestonesArray.length < 3) {
      const nextWeek = milestonesArray.length + 1;
      milestonesArray.push({
        week: nextWeek,
        title:
          nextWeek === 1
            ? 'Foundation & Setup'
            : nextWeek === 2
              ? 'Skill Development'
              : 'Mastery & Transformation',
        description:
          nextWeek === 1
            ? 'Establishing core habits and building momentum for your journey.'
            : nextWeek === 2
              ? 'Advancing your skills and deepening your commitment to the goal.'
              : 'Achieving mastery and preparing for long-term success.',
        tasks: 0,
      });
    }

    return milestonesArray.slice(0, 3); // Return max 3 milestones for preview
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

    // Check if goal is already active (prevent duplicate requests)
    if (createdGoalId) {
      const { data: goalData } = await supabase
        .from('goals')
        .select('status')
        .eq('id', createdGoalId)
        .single();

      if (goalData?.status === 'active') {
        console.log('⚠️ Goal is already active, skipping task generation');
        // Just close the screen and return to dashboard
        if (onGoalCreated) {
          onGoalCreated();
        }
        await clearProgress();
        return;
      }
    }

    // Immediately clear any persisted progress to prevent modal from reopening
    await clearProgress();

    // Activate the goal FIRST before closing the screen
    // This ensures the goal shows as loading in dashboard
    if (createdGoalId) {
      const selectedCategoryConfig = CATEGORY_CONFIG.find(
        (cat) => cat.value === formData.category
      );
      const finalCategory = formData.category;
      const finalIcon = planIconName || selectedCategoryConfig?.icon || 'star';
      const finalColor =
        planColor || selectedCategoryConfig?.color || '#FFFF68';

      await supabase
        .from('goals')
        .update({
          status: 'active',
          category: finalCategory,
          icon_name: finalIcon,
          color: finalColor,
        })
        .eq('id', createdGoalId);

      console.log('✅ Goal activated - tasks will be generated in background');
    }

    // Close the NewGoal screen and return to dashboard
    // The goal will show as loading in dashboard until tasks are ready
    if (onGoalCreated) {
      onGoalCreated();
    }

    // Clear progress and close modals
    await clearProgress();

    // Reset all modal states to prevent reopening
    setShowPlanPreview(false);
    setShowSuccessModal(false);

    try {
      // Get device timezone and current time using expo-localization
      const calendars = Localization.getCalendars();
      const deviceTimezone = calendars[0]?.timeZone || 'UTC';
      const deviceNow = new Date();
      const deviceUtcOffset = -deviceNow.getTimezoneOffset();

      // Stage 2: Generate detailed tasks using the separate generate-tasks function
      // Note: This may timeout on the client side, but the function continues running on the server
      const tasksResponse = await supabase.functions.invoke('generate-tasks', {
        body: {
          user_id: user?.id,
          goal_id: createdGoalId,
          device_now_iso: deviceNow.toISOString(),
          device_timezone: deviceTimezone,
        },
      });

      // Log the task generation request
      if (tasksResponse.error) {
        const errorMessage = tasksResponse.error.message || '';
        const errorStatus = tasksResponse.error.status || 0;

        // Check if it's a token insufficiency error (402)
        const isTokenError = errorStatus === 402 || 
                            errorMessage.includes('tokens') || 
                            errorMessage.includes('Not enough') ||
                            errorMessage.includes('Insufficient');

        if (isTokenError) {
          // Show token purchase modal
          console.log('🚨 Token error during task generation - showing purchase modal');
          // The goal is already marked as paused with error_message
          // We'll show a button to continue after purchase in the dashboard
          Alert.alert(
            'Not Enough Tokens',
            errorMessage + '\n\nPlease purchase tokens to continue creating tasks.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Get Tokens', 
                onPress: () => {
                  // Show token purchase modal if callback provided
                  if (onShowTokenPurchase) {
                    onShowTokenPurchase();
                  } else {
                    console.log('User needs to purchase tokens - no callback provided');
                  }
                }
              }
            ]
          );
          return; // Stop here - don't continue
        }

        // Check if it's a timeout error (which is expected for long-running tasks)
        const isTimeoutError =
          errorMessage.includes('FunctionsHttpError') ||
          errorMessage.includes('non-2xx status code') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('aborted');

        if (isTimeoutError) {
          // This is expected - the function is still running in the background
          console.log(
            '⏳ Task generation is running in background (client timeout - this is normal)'
          );
          console.log(
            '📝 Tasks will appear in the card once generation is complete'
          );
          
          // But let's check if tasks were already created despite the timeout
          if (createdGoalId) {
            try {
              console.log('🔍 Checking if tasks were created despite timeout...');
              const { data: existingTasks, error: tasksCheckError } = await supabase
                .from('goal_tasks')
                .select('id')
                .eq('goal_id', createdGoalId);

              if (tasksCheckError) {
                console.error('❌ Error checking for tasks:', tasksCheckError);
              }

              if (existingTasks && existingTasks.length > 0) {
                // Tasks were created! Update goal to active
                console.log(`✅ Found ${existingTasks.length} tasks despite timeout! Updating goal to active`);
                await supabase
                  .from('goals')
                  .update({
                    status: 'active',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', createdGoalId);
                console.log('✅ Goal updated to active successfully');
              } else {
                console.log('⏳ No tasks found yet, will continue waiting...');
              }
            } catch (updateError) {
              console.error('❌ Failed to check/update goal status:', updateError);
            }
          }
        } else {
          // Real error - but check if tasks were actually created
          console.error('❌ Tasks generation error:', tasksResponse.error);

          if (createdGoalId) {
            try {
              // Check if tasks exist in the database
              console.log('🔍 Checking if tasks were created despite error...');
              const { data: existingTasks, error: tasksCheckError } = await supabase
                .from('goal_tasks')
                .select('id')
                .eq('goal_id', createdGoalId);

              if (tasksCheckError) {
                console.error('❌ Error checking for tasks:', tasksCheckError);
              }

              if (existingTasks && existingTasks.length > 0) {
                // Tasks were created! Update goal to active
                console.log(`✅ Found ${existingTasks.length} tasks! Updating goal to active`);
                await supabase
                  .from('goals')
                  .update({
                    status: 'active',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', createdGoalId);
                console.log('✅ Goal updated to active successfully');
              } else {
                // No tasks found - mark goal as failed
                console.log('⚠️ No tasks found, marking goal as failed:', createdGoalId);
                await supabase
                  .from('goals')
                  .update({
                    status: 'failed',
                    error_message: errorMessage || 'Task generation failed',
                  })
                  .eq('id', createdGoalId);
                console.log('✅ Goal marked as failed successfully');
              }
            } catch (updateError) {
              console.error('❌ Failed to update goal status:', updateError);
            }
          }
        }
      } else {
        console.log('✅ Task generation completed successfully');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a timeout error
      const isTimeoutError =
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('FunctionsHttpError');

      if (isTimeoutError) {
        // This is expected - the function is still running in the background
        console.log(
          '⏳ Task generation is running in background (client timeout - this is normal)'
        );
        console.log(
          '📝 Tasks will appear in the card once generation is complete'
        );
        
        // But let's check if tasks were already created despite the timeout
        if (createdGoalId) {
          try {
            console.log('🔍 Checking if tasks were created despite timeout...');
            const { data: existingTasks, error: tasksCheckError } = await supabase
              .from('goal_tasks')
              .select('id')
              .eq('goal_id', createdGoalId);

            if (tasksCheckError) {
              console.error('❌ Error checking for tasks:', tasksCheckError);
            }

            if (existingTasks && existingTasks.length > 0) {
              // Tasks were created! Update goal to active
              console.log(`✅ Found ${existingTasks.length} tasks despite timeout! Updating goal to active`);
              await supabase
                .from('goals')
                .update({
                  status: 'active',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', createdGoalId);
              console.log('✅ Goal updated to active successfully');
            } else {
              console.log('⏳ No tasks found yet, will continue waiting...');
            }
          } catch (updateError) {
            console.error('❌ Failed to check/update goal status:', updateError);
          }
        }
      } else {
        // Real error - but check if tasks were actually created
        console.error('❌ Error in Stage 2:', error);

        if (createdGoalId) {
          try {
            // Check if tasks exist in the database
            console.log('🔍 Checking if tasks were created despite error...');
            const { data: existingTasks, error: tasksCheckError } = await supabase
              .from('goal_tasks')
              .select('id')
              .eq('goal_id', createdGoalId);

            if (tasksCheckError) {
              console.error('❌ Error checking for tasks:', tasksCheckError);
            }

            if (existingTasks && existingTasks.length > 0) {
              // Tasks were created! Update goal to active
              console.log(`✅ Found ${existingTasks.length} tasks! Updating goal to active`);
              await supabase
                .from('goals')
                .update({
                  status: 'active',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', createdGoalId);
              console.log('✅ Goal updated to active successfully');
            } else {
              // No tasks found - mark goal as failed
              console.log(
                '⚠️ No tasks found, marking goal as failed due to error:',
                createdGoalId
              );
              await supabase
                .from('goals')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                })
                .eq('id', createdGoalId);
              console.log('✅ Goal marked as failed successfully');
            }
          } catch (updateError) {
            console.error('❌ Failed to update goal status:', updateError);
          }
        }
      }
    }
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

  const handleTryAgain = async () => {
    try {
      // If a goal was created, delete it completely
      if (createdGoalId && user?.id) {
        console.log('🗑️ Deleting goal and all related data:', createdGoalId);

        // Delete the goal - CASCADE will handle tasks, notifications, rewards, etc.
        const { error: deleteError } = await supabase
          .from('goals')
          .delete()
          .eq('id', createdGoalId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('❌ Error deleting goal:', deleteError);
          // Don't block the user - continue with reset even if delete failed
          console.warn('⚠️ Continuing with reset despite delete error');
        } else {
          console.log('✅ Goal and all related data deleted successfully');
        }

        setCreatedGoalId(null);
      }

      // Reset UI state
      setShowPlanPreview(false);
      setCurrentStep(1);

      // Reset form to defaults
      setFormData({
        title: '',
        description: '',
        category: 'custom',
        planDurationDays: 21,
        tasksPerDayRange: { min: 3, max: 5 },
        preferredTimeRanges: [
          { start_hour: 8, end_hour: 12, label: 'Morning' },
          { start_hour: 14, end_hour: 18, label: 'Afternoon' },
          { start_hour: 19, end_hour: 23, label: 'Evening' },
        ],
        preferredDays: [1, 2, 3, 4, 5, 6],
      });

      setErrors({});
      setPlanData({
        milestones: [],
        goalTitle: '',
        subcategory: null,
        marketingDomain: null,
        planOutline: [],
      });

      // Clear persisted progress
      clearProgress();

      console.log('✅ UI reset complete - ready for new goal');
    } catch (error) {
      console.error('❌ Error in handleTryAgain:', error);
      // Don't show alert - just log and reset anyway
      console.warn('⚠️ Resetting UI despite error');

      // Force reset
      setShowPlanPreview(false);
      setCurrentStep(1);
      setCreatedGoalId(null);
    }
  };

  const handleStartJourney = () => {
    setShowSuccessModal(false);
    onGoalCreated?.();
    clearProgress();
  };

  const [slideAnimation] = useState(new Animated.Value(300));
  const [fadeAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Slide up animation on mount
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnimation, fadeAnimation]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.primary,
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {/* Fixed Header */}
      <View style={styles.absoluteHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" weight="bold" />
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
          {/* Multi-Step Form */}
          <View style={styles.form}>
            {/* Step Content */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                <Card style={styles.stepCard}>
                  <View style={styles.stepCardContent}>
                    <View style={styles.stepHeader}>
                      <Text
                        variant="h3"
                        color="primary"
                        style={styles.stepTitle}
                      >
                        What's your goal?
                      </Text>
                      <View style={styles.stepNumberCircle}>
                        <Text
                          variant="body"
                          color="primary"
                          style={styles.stepNumberText}
                        >
                          1
                        </Text>
                      </View>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.stepDescription}
                    >
                      Tell me what you want to achieve and I'll{'\n'}create a
                      personalized plan for you.
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
                    rightIcon={
                      <TouchableOpacity
                        onPress={handleSurpriseMe}
                        disabled={isSurprisingMe}
                        activeOpacity={0.7}
                        style={styles.surpriseMeInlineButton}
                      >
                        {isSurprisingMe ? (
                          <ActivityIndicator size="small" color="#FFFF68" />
                        ) : (
                          <>
                            <Text
                              variant="body"
                              style={styles.surpriseMeText}
                            >
                              Surprise Me
                            </Text>
                            <Icon
                              name="sparkle"
                              size={16}
                              color="#FFFF68"
                              weight="fill"
                            />
                          </>
                        )}
                      </TouchableOpacity>
                    }
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
                    containerStyle={[
                      styles.darkInputContainer,
                      styles.descriptionContainer,
                    ]}
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
                    <Icon
                      name="sliders"
                      size={20}
                      color="#FFFF68"
                      weight="bold"
                    />
                    <Text
                      variant="body"
                      color="primary"
                      style={styles.advancedSettingsText}
                    >
                      Advanced Settings
                    </Text>
                    <Icon
                      name="caret-right"
                      size={16}
                      color="#FFFF68"
                      weight="bold"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.stepContent}>
                <Card style={styles.stepCard}>
                  <View style={styles.stepCardContent}>
                    <View style={styles.stepHeader}>
                      <Text
                        variant="h3"
                        color="primary"
                        style={styles.stepTitle}
                      >
                        Share with developers
                      </Text>
                      <View style={styles.stepNumberCircle}>
                        <Text
                          variant="body"
                          color="primary"
                          style={styles.stepNumberText}
                        >
                          2
                        </Text>
                      </View>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.stepDescription}
                    >
                      Help us improve and promote Genie. Published goals{'\n'}
                      earn points and unlock rewards & perks. Private{'\n'}goals
                      do not participate in points and rewards.
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
                      trackColor={{
                        false: 'rgba(255, 255, 255, 0.2)',
                        true: '#FFFF68',
                      }}
                      thumbColor={publishWithDevelopers ? '#000000' : '#FFFFFF'}
                    />
                  </View>
                </Card>
              </View>
            )}

            {/* Advanced Settings Modal */}
            <Modal
              visible={showAdvancedSettings}
              animationType="slide"
              presentationStyle="formSheet"
              onRequestClose={() => setShowAdvancedSettings(false)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <View style={{ width: 24 }} />
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

                <ScrollView
                  style={styles.modalContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Plan Duration */}
                  <View style={[styles.section, styles.firstSection]}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionTitleRow}>
                        {!isSubscribed && (
                          <Icon name="crown" size={16} color="#FFFF68" weight="fill" style={styles.subscriptionIcon} />
                        )}
                    <Text
                      variant="h4"
                      color="primary"
                      style={styles.sectionTitle}
                    >
                      Plan duration
                    </Text>
                      </View>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.sectionSubtitle}
                    >
                      {isSubscribed 
                        ? 'How long should your plan last?'
                        : '3 weeks plan available. Subscribe to customize duration.'}
                    </Text>
                    {isSubscribed ? (
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
                      onValueChange={(value) =>
                        updateField('planDurationDays', parseInt(value))
                      }
                      placeholder="Select duration"
                      style={styles.durationDropdown}
                      label="Duration"
                    />
                    ) : (
                      <View style={[styles.durationDropdown, styles.disabledDropdown]}>
                        <Text variant="body" style={styles.disabledText}>
                          3 weeks (21 days)
                        </Text>
                        <Icon name="lock" size={16} color="rgba(255, 255, 255, 0.3)" weight="fill" />
                      </View>
                    )}
                  </View>

                  {/* Tasks Per Day Range */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionTitleRow}>
                        {!isSubscribed && (
                          <Icon name="crown" size={16} color="#FFFF68" weight="fill" style={styles.subscriptionIcon} />
                        )}
                        <Text
                          variant="h4"
                          color="primary"
                          style={styles.sectionTitle}
                        >
                          Tasks per day
                        </Text>
                      </View>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.sectionSubtitle}
                    >
                      {isSubscribed 
                        ? 'Choose your daily task range'
                        : 'Default range (3-5 tasks). Subscribe to customize.'}
                    </Text>
                    <View style={[styles.tasksRangeCard, !isSubscribed && styles.disabledCard]}>
                      <View style={styles.tasksRangeContainer}>
                        <View style={styles.tasksRangeInput}>
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.rangeLabel}
                          >
                            From:
                          </Text>
                          <View style={styles.numberPickerContainer}>
                            <TouchableOpacity
                              style={[styles.numberPickerButton, !isSubscribed && styles.disabledButton]}
                              onPress={() => {
                                if (isSubscribed && formData.tasksPerDayRange.min > 1) {
                                  updateField('tasksPerDayRange', {
                                    ...formData.tasksPerDayRange,
                                    min: formData.tasksPerDayRange.min - 1,
                                  });
                                }
                              }}
                              disabled={!isSubscribed}
                            >
                              <Icon
                                name="minus"
                                size={16}
                                color={isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"}
                                weight="bold"
                              />
                            </TouchableOpacity>
                            <View style={styles.numberDisplay}>
                              <Text
                                variant="h4"
                                color="primary"
                                style={styles.numberText}
                              >
                                {formData.tasksPerDayRange.min}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.numberPickerButton, !isSubscribed && styles.disabledButton]}
                              onPress={() => {
                                if (
                                  isSubscribed &&
                                  formData.tasksPerDayRange.min <
                                  formData.tasksPerDayRange.max - 1
                                ) {
                                  updateField('tasksPerDayRange', {
                                    ...formData.tasksPerDayRange,
                                    min: formData.tasksPerDayRange.min + 1,
                                  });
                                }
                              }}
                              disabled={!isSubscribed}
                            >
                              <Icon
                                name="plus"
                                size={16}
                                color={isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"}
                                weight="bold"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.tasksRangeInput}>
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.rangeLabel}
                          >
                            To:
                          </Text>
                          <View style={styles.numberPickerContainer}>
                            <TouchableOpacity
                              style={[styles.numberPickerButton, !isSubscribed && styles.disabledButton]}
                              onPress={() => {
                                if (
                                  isSubscribed &&
                                  formData.tasksPerDayRange.max >
                                  formData.tasksPerDayRange.min + 1
                                ) {
                                  updateField('tasksPerDayRange', {
                                    ...formData.tasksPerDayRange,
                                    max: formData.tasksPerDayRange.max - 1,
                                  });
                                }
                              }}
                              disabled={!isSubscribed}
                            >
                              <Icon
                                name="minus"
                                size={16}
                                color={isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"}
                                weight="bold"
                              />
                            </TouchableOpacity>
                            <View style={styles.numberDisplay}>
                              <Text
                                variant="h4"
                                color="primary"
                                style={styles.numberText}
                              >
                                {formData.tasksPerDayRange.max}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.numberPickerButton, !isSubscribed && styles.disabledButton]}
                              onPress={() => {
                                if (isSubscribed && formData.tasksPerDayRange.max < 10) {
                                  updateField('tasksPerDayRange', {
                                    ...formData.tasksPerDayRange,
                                    max: formData.tasksPerDayRange.max + 1,
                                  });
                                }
                              }}
                              disabled={!isSubscribed}
                            >
                              <Icon
                                name="plus"
                                size={16}
                                color={isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"}
                                weight="bold"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Preferred Days */}
                  <View style={styles.section}>
                    <Text
                      variant="h4"
                      color="primary"
                      style={styles.sectionTitle}
                    >
                      Preferred days
                    </Text>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.sectionSubtitle}
                    >
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
                            formData.preferredDays.includes(day.value) &&
                              styles.dayOptionActive,
                          ]}
                          onPress={() => {
                            const newDays = formData.preferredDays.includes(
                              day.value
                            )
                              ? formData.preferredDays.filter(
                                  (d) => d !== day.value
                                )
                              : [...formData.preferredDays, day.value];
                            updateField('preferredDays', newDays);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            variant="body"
                            color={
                              formData.preferredDays.includes(day.value)
                                ? 'primary'
                                : 'secondary'
                            }
                            style={[
                              styles.dayOptionText,
                              formData.preferredDays.includes(day.value) &&
                                styles.dayOptionTextActive,
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
                    <Text
                      variant="h4"
                      color="primary"
                      style={styles.sectionTitle}
                    >
                      Preferred times
                    </Text>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.sectionSubtitle}
                    >
                      Choose up to 3 time ranges that work for you
                    </Text>
                    {formData.preferredTimeRanges.map((range, index) => (
                      <View key={index} style={styles.timeRangeCard}>
                        <View style={styles.timeRangeHeader}>
                          <Icon
                            name={
                              index === 0
                                ? 'sun'
                                : index === 1
                                  ? 'sun-horizon'
                                  : 'moon'
                            }
                            size={20}
                            color="#FFFF68"
                            weight="fill"
                          />
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.timeRangeLabel}
                          >
                            {index === 0
                              ? 'Morning'
                              : index === 1
                                ? 'Afternoon'
                                : 'Evening'}
                          </Text>
                        </View>
                        <View style={styles.timeInputs}>
                          <View style={styles.timePickerContainer}>
                            <TouchableOpacity
                              style={styles.timePickerButton}
                              onPress={() => {
                                if (range.start_hour > 0) {
                                  const newRanges = [
                                    ...formData.preferredTimeRanges,
                                  ];
                                  newRanges[index].start_hour =
                                    range.start_hour - 1;
                                  updateField('preferredTimeRanges', newRanges);
                                }
                              }}
                            >
                              <Icon
                                name="minus"
                                size={14}
                                color="#FFFF68"
                                weight="bold"
                              />
                            </TouchableOpacity>
                            <View style={styles.timeDisplay}>
                              <Text
                                variant="h4"
                                color="primary"
                                style={styles.timeText}
                              >
                                {range.start_hour.toString().padStart(2, '0')}
                                :00
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.timePickerButton}
                              onPress={() => {
                                if (range.start_hour < range.end_hour - 1) {
                                  const newRanges = [
                                    ...formData.preferredTimeRanges,
                                  ];
                                  newRanges[index].start_hour =
                                    range.start_hour + 1;
                                  updateField('preferredTimeRanges', newRanges);
                                }
                              }}
                            >
                              <Icon
                                name="plus"
                                size={14}
                                color="#FFFF68"
                                weight="bold"
                              />
                            </TouchableOpacity>
                          </View>

                          <Text
                            variant="body"
                            color="secondary"
                            style={styles.timeSeparator}
                          >
                            To
                          </Text>

                          <View style={styles.timePickerContainer}>
                            <TouchableOpacity
                              style={styles.timePickerButton}
                              onPress={() => {
                                if (range.end_hour > range.start_hour + 1) {
                                  const newRanges = [
                                    ...formData.preferredTimeRanges,
                                  ];
                                  newRanges[index].end_hour =
                                    range.end_hour - 1;
                                  updateField('preferredTimeRanges', newRanges);
                                }
                              }}
                            >
                              <Icon
                                name="minus"
                                size={14}
                                color="#FFFF68"
                                weight="bold"
                              />
                            </TouchableOpacity>
                            <View style={styles.timeDisplay}>
                              <Text
                                variant="h4"
                                color="primary"
                                style={styles.timeText}
                              >
                                {range.end_hour.toString().padStart(2, '0')}
                                :00
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.timePickerButton}
                              onPress={() => {
                                if (range.end_hour < 24) {
                                  const newRanges = [
                                    ...formData.preferredTimeRanges,
                                  ];
                                  newRanges[index].end_hour = Math.min(24, range.end_hour + 1);
                                  updateField('preferredTimeRanges', newRanges);
                                }
                              }}
                            >
                              <Icon
                                name="plus"
                                size={14}
                                color="#FFFF68"
                                weight="bold"
                              />
                            </TouchableOpacity>
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
                            label: `Range ${newRanges.length + 1}`,
                          });
                          updateField('preferredTimeRanges', newRanges);
                        }}
                      >
                        <Icon
                          name="plus"
                          size={16}
                          color="#FFFF68"
                          weight="bold"
                        />
                        <Text
                          variant="body"
                          color="primary"
                          style={styles.addTimeRangeText}
                        >
                          Add Time Range
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>

                {/* Modal Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowAdvancedSettings(false)}
                    activeOpacity={0.8}
                  >
                    <Text
                      variant="body"
                      color="primary"
                      style={styles.modalCancelButtonText}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={handleSaveAdvancedSettings}
                    activeOpacity={0.8}
                  >
                    <Text
                      variant="body"
                      color="primary"
                      style={styles.modalSaveButtonText}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Modal>

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
                  <Text
                    variant="body"
                    color="primary"
                    style={[
                      styles.navButtonText,
                      styles.navButtonTextBlack,
                      { textAlign: 'center' },
                    ]}
                  >
                    Continue
                  </Text>
                  <Icon
                    name="arrow-right"
                    size={20}
                    color="#000000"
                    weight="bold"
                  />
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
                  <Icon
                    name="arrow-left"
                    size={20}
                    color="#FFFFFF"
                    weight="bold"
                  />
                  <Text
                    variant="body"
                    color="primary"
                    style={styles.stepBackButtonText}
                  >
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
            totalSteps={40}
            goalTitle={formData.title}
            goalDescription={formData.description}
            planDurationDays={formData.planDurationDays}
            preferredTimeRanges={formData.preferredTimeRanges}
            preferredDays={formData.preferredDays}
            stage={loadingStep <= 20 ? 'outline' : 'tasks'}
            onStop={async () => {
              // Mark as cancelled FIRST
              isCancelledRef.current = true;
              console.log('🛑 User clicked Stop button - cancelling process');
              
              // Stop the loading process
              if (loadingInterval) {
                clearInterval(loadingInterval);
                setLoadingInterval(null);
              }
              setIsCreatingPlan(false);
              setLoadingStep(1);

              // If we have a created goal, mark it as failed to prevent it from showing
              if (createdGoalId) {
                console.log(
                  '🛑 User stopped plan generation for goal:',
                  createdGoalId
                );
                
                // Update goal status to failed so it won't appear in the dashboard
                try {
                  await supabase
                    .from('goals')
                    .update({ 
                      status: 'failed',
                      error_message: 'User cancelled plan generation'
                    })
                    .eq('id', createdGoalId);
                  
                  console.log('✅ Marked cancelled goal as failed');
                } catch (error) {
                  console.error('Error updating cancelled goal:', error);
                }
              }
              
              // Clear progress
              await clearProgress();
            }}
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
            taskCount={successData.taskCount || 21} // Fallback to 21 if no data
            rewardCount={successData.rewardCount || 5} // Fallback to 5 if no data
            iconName={successData.iconName || 'star'} // Fallback to star if no data
            color={successData.color || '#FFFF68'} // Fallback to yellow if no data
            onStartJourney={handleStartJourney}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
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
    paddingTop: 20,
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
  // New styles for plan customization
  section: {
    marginBottom: 24,
  },
  firstSection: {
    paddingTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  subscriptionIcon: {
    marginRight: 4,
  },
  disabledDropdown: {
    opacity: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  disabledCard: {
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sectionSubtitle: {
    marginBottom: 12,
  },
  fieldSpacing: {
    marginBottom: 20,
  },
  surpriseMeInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 6,
    paddingHorizontal: 8,
  },
  surpriseMeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFF68',
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
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
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
    textAlign: 'left',
    flex: 1,
  },
  stepDescription: {
    textAlign: 'left',
    lineHeight: 22,
    maxWidth: '100%',
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
  },
  stepCardContent: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFF68',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  stepNumberText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
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
    backgroundColor: colors.background.primary,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors.background.primary,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  modalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalCloseButton: {
    padding: 8,
    marginRight: -8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors.background.primary,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalCancelButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#FFFF68',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFF68',
  },
  modalSaveButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#000000',
  },
});
