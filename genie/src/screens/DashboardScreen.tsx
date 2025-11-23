import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// i18n removed
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import Svg from 'react-native-svg';
import {
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Text, Card, Icon, Badge, FloatingBottomNav, TextField, Dropdown, AILoadingModal, PlanPreviewModal } from '../components';
import { TokenPurchaseModal } from '../components/domain/TokenPurchaseModal';
import { paymentService } from '../services/paymentService';
import { usePaymentNotifications } from '../hooks/usePaymentNotifications';
import { checkRecentPaymentStatus, checkRecentSubscriptionStatus } from '../utils/paymentUtils';
import { usePopupContext } from '../contexts/PopupContext';
import { dataLoadingService } from '../services/dataLoadingService';
import { CustomRefreshControl } from '../components/primitives/CustomRefreshControl';
import { Button } from '../components/primitives/Button';
import { Ionicons } from '@expo/vector-icons';
import { GoalCard, GoalCardProps } from '../components/domain/GoalCard';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { TaskItem } from '../components/domain/TaskItem';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GoalsService } from '../features/goals/services/goals.service';
import {
  testDatabaseConnection,
  createTestUser,
  createSampleGoals,
} from '../utils/testConnection';
import { supabase } from '../services/supabase/client';
import * as Linking from 'expo-linking';
import { PushTokenService } from '../services/notifications/pushToken.service';
import { GoalDetailsScreen } from './GoalDetailsScreen';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { HelpSupportScreen } from './HelpSupportScreen';
import { SubscriptionScreen } from './SubscriptionScreen';
import { MyPlansScreen } from './MyPlansScreen';
import { DailyGoalsScreen } from './DailyGoalsScreen';
import { GoalWithProgress, Reward } from '../types/goal';
import { TaskWithGoal } from '../types/task';
import { useNotificationCount } from '../hooks/useNotificationCount';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Layout constants for evenly sized stat cards
const WINDOW_WIDTH = Dimensions.get('window').width;
const STATS_HORIZONTAL_PADDING = 20; // matches styles.statsContainer paddingHorizontal
const STATS_GAP = 16; // matches styles.statsContainer gap
const STATS_PER_ROW = 3;
const STAT_CARD_SIZE = Math.floor(
  (WINDOW_WIDTH -
    STATS_HORIZONTAL_PADDING * 2 -
    STATS_GAP * (STATS_PER_ROW - 1)) /
    STATS_PER_ROW
);

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  
  // Initialize payment notifications
  usePaymentNotifications();
  const { showAlert } = usePopupContext();
  const {
    activeGoals,
    loading,
    fetchGoals,
    updateGoal,
    deleteGoal,
    refreshGoal,
    createGoal,
  } = useGoalStore();
  const { unreadCount, refreshCount } = useNotificationCount();
  const [aiConnected, setAiConnected] = React.useState<boolean | null>(null);
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = React.useState(false);
  const [advancedSettings, setAdvancedSettings] = React.useState({
    planDurationDays: 21,
    tasksPerDayRange: { min: 3, max: 5 },
    preferredTimeRanges: [
      { start_hour: 8, end_hour: 12, label: 'Morning' },
      { start_hour: 14, end_hour: 18, label: 'Afternoon' },
      { start_hour: 19, end_hour: 23, label: 'Evening' },
    ],
    preferredDays: [1, 2, 3, 4, 5, 6],
  });
  const [isCreatingPlan, setIsCreatingPlan] = React.useState(false);
  const [showPlanPreview, setShowPlanPreview] = React.useState(false);
  const [planData, setPlanData] = React.useState<any>(null);
  const [createdGoalId, setCreatedGoalId] = React.useState<string | null>(null);
  const [isApprovingPlan, setIsApprovingPlan] = React.useState(false);
  const [selectedGoal, setSelectedGoal] =
    React.useState<GoalWithProgress | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<TaskWithGoal | null>(
    null
  );
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showHelpSupport, setShowHelpSupport] = React.useState(false);
  const [showSubscription, setShowSubscription] = React.useState(false);
  const [showMyPlans, setShowMyPlans] = React.useState(false);
  const [showDailyGoals, setShowDailyGoals] = React.useState(false);
  const [recentRewards, setRecentRewards] = React.useState<Reward[]>(() => {
    const cachedData = dataLoadingService.getCachedData();
    return cachedData?.recentRewards || [];
  });
  const [totalPoints, setTotalPoints] = React.useState(() => {
    const cachedData = dataLoadingService.getCachedData();
    return cachedData?.totalPoints || 0;
  });
  const [showSideMenu, setShowSideMenu] = React.useState(false);
  const sideMenuAnimation = useRef(new Animated.Value(0)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;

  // Side menu animation functions
  const openSideMenu = () => {
    setShowSideMenu(true);
    Animated.parallel([
      Animated.timing(overlayAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(sideMenuAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSideMenu = () => {
    Animated.parallel([
      Animated.timing(overlayAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(sideMenuAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSideMenu(false);
    });
  };
  const [showGoalMenu, setShowGoalMenu] = React.useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] =
    React.useState('');
  const [goalToDelete, setGoalToDelete] = React.useState<string | null>(null);
  const [todaysTasksCount, setTodaysTasksCount] = React.useState<number>(0);
  const [todaysTasks, setTodaysTasks] = React.useState<TaskWithGoal[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] =
    React.useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] =
    React.useState(false);
  const [customTokenAmount, setCustomTokenAmount] = React.useState('');
  const [customTokenPrice, setCustomTokenPrice] = React.useState(0);
  const [selectedPackage, setSelectedPackage] = React.useState<number | null>(
    null
  );
  const [genieInputText, setGenieInputText] = React.useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);
  const [userTokens, setUserTokens] = React.useState(() => {
    // Try to get cached data on initial render to avoid showing red button
    const cachedData = dataLoadingService.getCachedData();
    if (cachedData?.userTokens) {
      console.log('📊 Initializing Dashboard with cached tokens data');
      return cachedData.userTokens;
    }
    return {
      used: 0,
      remaining: 0,
      total: 0,
      isSubscribed: false,
      monthlyTokens: 100,
      notificationsMuted: false,
    };
  });
  const [showRefreshLoader, setShowRefreshLoader] = React.useState(false);
  const [refreshBreathingAnimation] = useState(new Animated.Value(1));
  const [headerLogoBreathingAnimation] = useState(new Animated.Value(1));
  const PROGRESS_KEY = 'genie:new-goal-progress';

  // Animation for button border
  const borderAnimation = useRef(new Animated.Value(0)).current;
  // Animation for Add Goal button
  const addGoalAnimation = useRef(new Animated.Value(0)).current;
  // Animation for gradient movement
  const gradientAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initializeDashboard = async () => {
      if (user?.id) {
        // First try to use pre-loaded data from splash screen
        const preloadedData = dataLoadingService.getCachedData();

        if (preloadedData) {
          console.log('📊 Using pre-loaded data from splash screen');

          // Update all stores with pre-loaded data
          const {
            goals,
            activeGoals,
            todaysTasks,
            todaysTasksCount,
            totalPoints,
            recentRewards,
            userTokens,
          }: {
            goals: any[];
            activeGoals: any[];
            todaysTasks: TaskWithGoal[];
            todaysTasksCount: number;
            totalPoints: number;
            recentRewards: Reward[];
            userTokens: {
              used: number;
              remaining: number;
              total: number;
              isSubscribed: boolean;
              monthlyTokens: number;
            };
          } = preloadedData;

          // Update goal store
          useGoalStore.setState({
            goals,
            activeGoals,
            loading: false,
            error: null,
          });

          // Update local state
          setTodaysTasks(todaysTasks);
          setTodaysTasksCount(todaysTasksCount);
          setTotalPoints(totalPoints);
          setRecentRewards(recentRewards);
          setUserTokens(userTokens);

          console.log('✅ Dashboard initialized with pre-loaded data');
        } else {
          console.log('📊 No pre-loaded data found, loading fresh data');
          // Fallback to loading data if not pre-loaded
          fetchGoals(user.id);
          fetchRecentRewards();
          fetchTodaysTasks();
          fetchTotalPoints();
          fetchUserTokens();
        }

        // Setup push notifications
        PushTokenService.setupPushNotifications(user.id);
        
        // Check for recent payment status and show notifications
        setTimeout(async () => {
          try {
            const paymentResult = await checkRecentPaymentStatus(user.id);
            if (paymentResult) {
              showAlert(paymentResult.message, paymentResult.success ? 'Payment Success' : 'Payment Error');
            }
            
            const subscriptionResult = await checkRecentSubscriptionStatus(user.id);
            if (subscriptionResult) {
              showAlert(subscriptionResult.message, 'Subscription Active');
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 2000); // Wait 2 seconds after dashboard loads

        // Check if there are pending goals (paused status = waiting for approval)
        (async () => {
          try {
            // First check database for paused goals
            const { data: pendingGoals, error } = await supabase
              .from('goals')
              .select('id, title, status, created_at')
              .eq('user_id', user.id)
              .eq('status', 'paused')
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && pendingGoals && pendingGoals.length > 0) {
              console.log(
                '📋 Found pending goal waiting for approval:',
                pendingGoals[0].id
              );
              // Goal creation is now handled directly from dashboard
              // Goal creation is now handled directly from dashboard
              return;
            }

            // If no pending goals in DB, check AsyncStorage for in-progress state
            const raw = await AsyncStorage.getItem(PROGRESS_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (
              saved &&
              saved.userId === user.id &&
              saved.state !== 'creating'
            ) {
              // Only auto-open for preview/success states, not creating
              // Goal creation is now handled directly from dashboard
              // Pending goals will be handled in the goal creation flow
            }
          } catch (err) {
            console.error('Error checking for pending goals:', err);
          }
        })();
      }
    };

    initializeDashboard();
  }, [user?.id]);

  // Auto-refresh mechanism for goals that are loading (active but no tasks OR still generating)
  // Stop polling for failed goals - let user retry manually
  // This continues to work even after app refresh/restart
  // Continues polling until ALL tasks are generated (all weeks) based on plan_duration_days
  useEffect(() => {
    if (!user?.id) return;

    const checkForLoadingGoals = async () => {
      // Get fresh activeGoals from store to ensure we have latest data
      // This ensures we always check the most up-to-date goals, even after refresh
      const currentActiveGoals = useGoalStore.getState().activeGoals;
      
      // Calculate expected total tasks for each goal and check if generation is complete
      const loadingGoals = currentActiveGoals.filter((goal) => {
        if (goal.status !== 'active') return false;
        
        // Always poll if no tasks yet
        if (goal.total_tasks === 0) return true;
        
        // Calculate expected total tasks using the same formula as generate-tasks function
        // This must match the calculation in generate-tasks/index.ts exactly
        const maxTasks = goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;
        const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
        const tasksPerDay = Math.min(maxTasks, availableTimeSlots);
        const daysPerWeek = goal.preferred_days?.length || 7;
        const planDurationDays = goal.plan_duration_days || 21;
        
        // Calculate total tasks week by week (same as generate-tasks function)
        const totalWeeks = Math.ceil(planDurationDays / 7);
        let expectedTotalTasks = 0;
        
        for (let week = 1; week <= totalWeeks; week++) {
          const startDay = (week - 1) * 7 + 1;
          const endDay = Math.min(week * 7, planDurationDays);
          const daysInThisWeek = endDay - startDay + 1;
          const workingDaysInWeek = Math.ceil((daysInThisWeek / 7) * daysPerWeek);
          const tasksInThisWeek = workingDaysInWeek * tasksPerDay;
          expectedTotalTasks += tasksInThisWeek;
        }
        
        // Continue polling if we haven't reached the expected total yet
        // This ensures we keep listening until ALL tasks are generated (all weeks)
        const currentTasks = goal.total_tasks || 0;
        const isStillGenerating = currentTasks < expectedTotalTasks;
        
        return isStillGenerating;
      });

      if (loadingGoals.length > 0) {
        // Refresh each loading goal to get latest task count
        for (const goal of loadingGoals) {
          await refreshGoal(goal.id);
        }

        // Also refresh today's tasks to show new tasks
        fetchTodaysTasks();
      }
    };

    // Check immediately on mount/refresh
    checkForLoadingGoals();

    // Set up polling every 5 seconds for loading goals
    // This continues until all goals have tasks loaded or are marked as failed
    // The interval will restart automatically when activeGoals changes (after refresh)
    const interval = setInterval(checkForLoadingGoals, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, activeGoals, refreshGoal, fetchTodaysTasks]);

  // Breathing animation for refresh loader
  useEffect(() => {
    if (showRefreshLoader) {
      refreshBreathingAnimation.setValue(1);

      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(refreshBreathingAnimation, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(refreshBreathingAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      breathing.start();
      return () => {
        breathing.stop();
        refreshBreathingAnimation.setValue(1);
      };
    }
  }, [showRefreshLoader]);

  // Breathing animation for header logo
  useEffect(() => {
    // Set initial value to 1
    headerLogoBreathingAnimation.setValue(1);

    const headerLogoBreathing = Animated.loop(
      Animated.sequence([
        Animated.timing(headerLogoBreathingAnimation, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(headerLogoBreathingAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    headerLogoBreathing.start();
    return () => {
      headerLogoBreathing.stop();
      headerLogoBreathingAnimation.setValue(1);
    };
  }, []);

  // Start Add Goal button animation
  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(addGoalAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(addGoalAnimation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    if (activeGoals.length > 0) {
      startAnimation();
    }
  }, [activeGoals.length, addGoalAnimation]);

  // Start gradient animation on component mount
  useEffect(() => {
    const startGradientAnimation = () => {
      Animated.loop(
        Animated.timing(gradientAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };

    startGradientAnimation();
  }, [gradientAnimation]);

  const fetchRecentRewards = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('rewards')
        .select(
          `
          *,
          goal:goals(id, title, category)
        `
        )
        .eq('unlocked', true)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentRewards(data || []);
    } catch (error) {
      console.error('Error fetching recent rewards:', error);
    }
  };

  const fetchTotalPoints = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id);

      if (error) throw error;

      const total =
        data?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;
      setTotalPoints(total);
    } catch (error) {
      console.error('Error fetching total points:', error);
    }
  };

  const fetchUserTokens = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      if (data) {
        setUserTokens({
          used: data.tokens_used,
          remaining: data.tokens_remaining,
          total: data.total_tokens,
          isSubscribed: data.is_subscribed,
          monthlyTokens: data.monthly_tokens,
          notificationsMuted: data.notifications_muted || false,
        });
      } else {
        // User doesn't have tokens record yet, set defaults
        setUserTokens({
          used: 0,
          remaining: 3,
          total: 3,
          isSubscribed: false,
          monthlyTokens: 100,
          notificationsMuted: false,
        });
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
  };

  // Load user preferences when modal opens
  useEffect(() => {
    const loadAdvancedSettings = async () => {
      if (showAdvancedSettingsModal && user?.id) {
        try {
          const { data: prefs, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && prefs) {
            setAdvancedSettings({
              planDurationDays: prefs.plan_duration_days || 21,
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
            });
          }
        } catch (error) {
          console.error('Error loading advanced settings:', error);
        }
      }
    };
    loadAdvancedSettings();
  }, [showAdvancedSettingsModal, user?.id]);

  const handleSaveAdvancedSettings = async () => {
    if (!user?.id) {
      setShowAdvancedSettingsModal(false);
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const userTimezone = userData?.timezone || 'UTC';

      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            plan_duration_days: advancedSettings.planDurationDays,
            tasks_per_day_min: advancedSettings.tasksPerDayRange.min,
            tasks_per_day_max: advancedSettings.tasksPerDayRange.max,
            preferred_time_ranges: advancedSettings.preferredTimeRanges,
            preferred_days: advancedSettings.preferredDays,
            timezone: userTimezone,
          },
          { onConflict: 'user_id' }
        );

      if (prefsError) {
        console.warn('⚠️ Failed to save advanced settings:', prefsError);
        Alert.alert('Error', 'Failed to save settings');
      } else {
        console.log('✅ Advanced settings saved');
        setShowAdvancedSettingsModal(false);
        Alert.alert('Success', 'Settings saved successfully');
      }
    } catch (error) {
      console.warn('⚠️ Error saving advanced settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const fetchTodaysTasks = async () => {
    if (!user?.id) return;

    try {
      // If user has no goals, clear tasks immediately
      const { data: userGoals } = await supabase
        .from('goals')
        .select('id, status')
        .eq('user_id', user.id);
      if (!userGoals || userGoals.length === 0) {
        setTodaysTasksCount(0);
        setTodaysTasks([]);
        return;
      }

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const { data, error } = await supabase
        .from('goal_tasks')
        .select(
          `
          id,
          title,
          description,
          run_at,
          completed,
          completed_at,
          goal_id,
          intensity,
          created_at,
          updated_at,
          goals!inner(
            id,
            title,
            category,
            user_id,
            color,
            status
          )
        `
        )
        .eq('goals.user_id', user.id)
        .eq('goals.status', 'active')
        .eq('completed', false) // Only show incomplete tasks
        .gte('run_at', startOfDay.toISOString())
        .lt('run_at', endOfDay.toISOString())
        .order('run_at', { ascending: true });

      if (error) throw error;

      // Transform data to match TaskWithGoal interface
      const transformedTasks: TaskWithGoal[] = (data || []).map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        run_at: task.run_at,
        completed: task.completed,
        completed_at: task.completed_at,
        goal_id: task.goal_id,
        intensity: task.intensity,
        created_at: task.created_at,
        updated_at: task.updated_at,
        goal: {
          id: (task.goals as any).id,
          title: (task.goals as any).title,
          category: (task.goals as any).category,
          color: (task.goals as any).color,
        },
      }));

      // Sort tasks by time - closest time first
      const now = new Date();
      const sortedTasks = transformedTasks.sort((a, b) => {
        const timeA = new Date(a.run_at).getTime();
        const timeB = new Date(b.run_at).getTime();
        const nowTime = now.getTime();

        // If both tasks are in the past, sort by time (closest first)
        if (timeA <= nowTime && timeB <= nowTime) {
          return timeB - timeA; // Closest past time first
        }

        // If both tasks are in the future, sort by time (closest first)
        if (timeA > nowTime && timeB > nowTime) {
          return timeA - timeB; // Closest future time first
        }

        // If one is past and one is future, past tasks come first
        if (timeA <= nowTime) return -1;
        if (timeB <= nowTime) return 1;

        return 0;
      });

      setTodaysTasksCount(sortedTasks.length);
      setTodaysTasks(sortedTasks);
      console.log("📅 Today's tasks:", data?.length || 0);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
      setTodaysTasksCount(0);
      setTodaysTasks([]);
    }
  };

  // Function to check if a goal has any tasks that have reached their time
  const hasGoalTasksTimeReached = (goalId: string) => {
    return todaysTasks.some((task) => {
      const now = new Date();
      const taskTime = new Date(task.run_at);
      return task.goal_id === goalId && now >= taskTime && !task.completed;
    });
  };

  const testAIConnection = async () => {
    try {
      const response = await supabase.functions.invoke('generate-plan', {
        body: { test: true },
      });
      setAiConnected(response.error ? false : true);
    } catch (error) {
      console.error('AI connection test failed:', error);
      setAiConnected(false);
    }
  };

  // Removed automatic AI connection test to prevent unnecessary API calls

  const handleRefresh = () => {
    setShowRefreshLoader(true);

    // Clear cache to force fresh data load
    dataLoadingService.clearCache();

    if (user?.id) {
      fetchGoals(user.id);
      fetchTodaysTasks();
      fetchUserTokens(); // Add this to refresh tokens data
      fetchTotalPoints(); // Add this to refresh points data
      fetchRecentRewards(); // Add this to refresh rewards data
    }

    // Hide loader after 3 seconds
    setTimeout(() => {
      setShowRefreshLoader(false);
    }, 3000);
  };

  const calculateTokenPrice = (amount: number): number => {
    if (amount >= 1 && amount <= 10) {
      return amount * 1.0; // $1 per token
    } else if (amount > 10 && amount <= 20) {
      return amount * 0.8; // $0.8 per token
    } else if (amount > 20 && amount <= 100) {
      return amount * 0.6; // $0.6 per token
    }
    return amount * 1.0; // Default to $1 per token
  };

  const handleCustomTokenChange = (text: string) => {
    setCustomTokenAmount(text);
    setSelectedPackage(null); // Clear package selection when typing custom amount
    const amount = parseInt(text) || 0;
    if (amount > 0 && amount <= 100) {
      const price = calculateTokenPrice(amount);
      setCustomTokenPrice(price);
    } else {
      setCustomTokenPrice(0);
    }
  };

  const handleEditGoal = (goalId: string) => {
    setShowGoalMenu(null);
    // TODO: Implement edit goal functionality
    console.log('Edit goal:', goalId);
  };

  const handleDeleteGoal = (goalId: string) => {
    setShowGoalMenu(null);
    setGoalToDelete(goalId);
    setShowDeleteModal(true);
    setDeleteConfirmationText('');
  };

  const confirmDeleteGoal = async () => {
    const trimmedText = deleteConfirmationText.toLowerCase().trim();

    if (trimmedText !== 'delete it') {
      return;
    }

    if (!goalToDelete) {
      return;
    }

    setShowDeleteModal(false);
    setDeleteConfirmationText('');

    try {
      await deleteGoal(goalToDelete);
      if (user?.id) {
        fetchGoals(user.id);
        fetchTodaysTasks();
        fetchTotalPoints();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setGoalToDelete(null);
    }
  };

  const handleTestDatabase = async () => {
    console.log('🧪 Running database tests...');

    // Test connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      alert('Database connection failed!');
      return;
    }

    alert('Database connection successful! ✅');
  };

  const handleCreateTestData = async () => {
    if (!user?.id) {
      alert('Please login first');
      return;
    }

    console.log('🧪 Creating test data...');

    // Create sample goals for current user
    const goals = await createSampleGoals(user.id);
    if (goals.length > 0) {
      alert(`Created ${goals.length} sample goals! ✅`);
      handleRefresh(); // Refresh the goals list
    } else {
      alert('Failed to create sample goals ❌');
    }
  };

  const getUserName = () => {
    return (
      user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    );
  };

  const startBorderAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startBorderAnimation();
  }, []);

  const handleGoalCreated = async () => {
    // Tokens are deducted server-side by the Edge Function; just refresh UI
    if (user?.id) {
      try {
        await fetchUserTokens();
        fetchGoals(user.id);
        fetchTodaysTasks();
        fetchTotalPoints();
      } catch (error) {
        console.error('Error refreshing after goal creation:', error);
      }
    }
  };

  const checkTokensAndCreateGoal = () => {
    // This function is no longer used - goal creation is done from dashboard chat
    // Keeping for backward compatibility with navigation
  };

  const handleSubscribeClick = () => {
    setShowSubscriptionModal(true);
  };

  const handleToggleTask = async (taskId: string, markAsCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('goal_tasks')
        .update({
          completed: markAsCompleted,
          completed_at: markAsCompleted ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTodaysTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: markAsCompleted,
                completed_at: markAsCompleted
                  ? new Date().toISOString()
                  : undefined,
              }
            : task
        )
      );

      // Update points system
      try {
        const task = todaysTasks.find((t) => t.id === taskId);
        if (task) {
          const action = markAsCompleted ? 'complete' : 'incomplete';
          await supabase.functions.invoke('update-points', {
            body: {
              goal_id: task.goal_id,
              task_id: taskId,
              user_id: user?.id,
              action: action,
            },
          });

          // Refresh total points display
          fetchTotalPoints();
        }
      } catch (pointsError) {
        console.error('Error updating points:', pointsError);
        // Don't fail the task update if points update fails
      }

      // Refresh tasks count
      fetchTodaysTasks();

      // Update rewards after task completion
      if (markAsCompleted) {
        try {
          const { error: rewardError } = await supabase.functions.invoke(
            'update-rewards',
            {
              body: {
                goal_id: todaysTasks.find((t) => t.id === taskId)?.goal_id,
                task_id: taskId,
                task_completed: true,
              },
            }
          );

          if (rewardError) {
            console.error('Error updating rewards:', rewardError);
          }
        } catch (rewardError) {
          console.error('Error calling update-rewards function:', rewardError);
        }
      }

      // Check if user completed all first day tasks and is not subscribed
      if (markAsCompleted && user?.id) {
        try {
          const task = todaysTasks.find((t) => t.id === taskId);
          if (task) {
            // Check if user is subscribed
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('is_subscribed, notifications_muted')
        .eq('user_id', user.id)
        .single();

      const isSubscribed = tokenData?.is_subscribed || false;
      const notificationsMuted = tokenData?.notifications_muted || false;

      // Check if we already showed the modal for this goal (prevent showing multiple times)
      const modalShownKey = `subscription_modal_shown_${task.goal_id}`;
      const modalAlreadyShown = await AsyncStorage.getItem(modalShownKey);

      // Only check if user is not subscribed, notifications are not already muted, and modal wasn't shown yet
      if (!isSubscribed && !notificationsMuted && !modalAlreadyShown) {
              // Get goal start date
              const { data: goalData } = await supabase
                .from('goals')
                .select('start_date, created_at')
                .eq('id', task.goal_id)
                .single();

              if (goalData) {
                const goalStartDate = new Date(goalData.start_date || goalData.created_at);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                goalStartDate.setHours(0, 0, 0, 0);

                // Check if this is the first day (start date is today or yesterday)
                const daysDiff = Math.floor((today.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
                const isFirstDay = daysDiff === 0 || daysDiff === 1;

                if (isFirstDay) {
                  // Get all tasks for this goal on the first day
                  const firstDayStart = new Date(goalStartDate);
                  const firstDayEnd = new Date(goalStartDate);
                  firstDayEnd.setDate(firstDayEnd.getDate() + 1);

                  const { data: firstDayTasks } = await supabase
                    .from('goal_tasks')
                    .select('id, completed')
                    .eq('goal_id', task.goal_id)
                    .gte('run_at', firstDayStart.toISOString())
                    .lt('run_at', firstDayEnd.toISOString());

                  if (firstDayTasks) {
                    const allCompleted = firstDayTasks.every((t: any) => t.completed);
                    const hasTasks = firstDayTasks.length > 0;

                    if (allCompleted && hasTasks) {
                      // Mark that we showed the modal for this goal
                      await AsyncStorage.setItem(modalShownKey, 'true');
                      
                      // Show subscription modal
                      console.log('🎯 User completed all first day tasks - showing subscription modal');
                      setShowSubscriptionModal(true);
                      
                      // Mute notifications for this user
                      await supabase
                        .from('user_tokens')
                        .update({
                          notifications_muted: true,
                          notifications_muted_at: new Date().toISOString(),
                        })
                        .eq('user_id', user.id);
                      
                      // Update local state
                      setUserTokens(prev => ({
                        ...prev,
                        notificationsMuted: true,
                      }));
                      
                      console.log('🔇 Notifications muted for non-subscribed user');
                    }
                  }
                }
              }
            }
          }
        } catch (checkError) {
          console.error('Error checking first day completion:', checkError);
          // Don't block task completion if this check fails
        }
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };


  if (selectedGoal) {
    return (
      <GoalDetailsScreen
        goal={selectedGoal}
        onBack={() => setSelectedGoal(null)}
        onGoalUpdate={(updatedGoal) => {
          setSelectedGoal(updatedGoal);
          // Refresh goals from the store to get updated data
          if (user?.id) {
            fetchGoals(user.id);
            fetchTotalPoints(); // Update total points when goal is updated
          }
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Absolute Header */}
      <View style={styles.absoluteHeader}>
        <BlurView 
          intensity={Platform.OS === 'android' ? 5 : 20} 
          style={StyleSheet.absoluteFillObject} 
        />
        <View style={styles.headerLeft}>
          <Button variant="ghost" onPress={() => setShowNotifications(true)}>
            <View style={styles.notificationIconContainer}>
              <Icon
                name="bell"
                size={20}
                color={
                  unreadCount > 0
                    ? theme.colors.yellow[500]
                    : theme.colors.text.secondary
                }
              />
              <Badge
                count={unreadCount}
                size="small"
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
          </Button>
        </View>

        <View style={styles.headerCenter}>
          <Animated.View
            style={[
              styles.headerLogoContainer,
              {
                transform: [{ scale: headerLogoBreathingAnimation }],
              },
            ]}
          >
            <Image
              source={require('../../assets/LogoSymbol.webp')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <View style={styles.headerRight}>
          <Button variant="ghost" onPress={openSideMenu}>
            <Ionicons
              name="menu"
              size={20}
              color={theme.colors.text.secondary}
            />
          </Button>
        </View>
      </View>

      {/* Custom Refresh Animation */}
      {showRefreshLoader && (
        <View style={styles.refreshLoaderContainer}>
          <Animated.View
            style={[
              styles.refreshLoaderImage,
              {
                transform: [{ scale: refreshBreathingAnimation }],
              },
            ]}
          >
            <Image
              source={require('../../assets/LogoSymbol.webp')}
              style={styles.refreshLoaderLogo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={showRefreshLoader}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            title=""
            titleColor="transparent"
            progressViewOffset={50}
          />
        }
      >
        {/* Content Header */}
        <View style={styles.contentHeader}>
          {/* Dashboard Slogan Card */}
          <Card
            variant="gradient"
            padding="md"
            style={styles.dashboardSloganCard}
          >
            <View style={styles.dashboardSloganHeader}>
              <Text variant="h4" style={styles.dashboardSloganText}>
                What's your wish?
              </Text>
              <Icon name="sparkle" size={20} color="#FFFF68" weight="fill" />
            </View>
            <Text variant="body" style={styles.dashboardSloganSubtext}>
              Tell me what you want to learn, achieve, change, or build. I'll
              create a personalized plan with daily tasks, rewards, and smart
              notifications to help you crush it.
            </Text>
          </Card>

          {/* Genie Chat Input */}
          <Card variant="gradient" padding="md" style={styles.genieChatCard}>
            <TextField
              value={genieInputText}
              onChangeText={setGenieInputText}
              placeholder="What's your wish? Tell me what you want to achieve..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              containerStyle={styles.genieInputContainer}
              inputStyle={styles.genieInput}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            {/* Advanced Settings Button */}
            <TouchableOpacity
              style={styles.genieAdvancedSettingsButton}
              onPress={() => {
                setShowAdvancedSettingsModal(true);
              }}
              activeOpacity={0.8}
            >
              <Icon
                name="sliders"
                size={18}
                color="rgba(255, 255, 255, 0.5)"
                weight="regular"
              />
              <Text
                style={styles.genieAdvancedSettingsText}
              >
                Advanced Settings
              </Text>
              <Icon
                name="caret-right"
                size={14}
                color="rgba(255, 255, 255, 0.5)"
                weight="regular"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (!genieInputText.trim()) {
                  return;
                }

                if (!user?.id) {
                  Alert.alert('Error', 'Please log in to create a goal');
                  return;
                }

                // Check tokens first
                if (userTokens.remaining <= 0 && !userTokens.isSubscribed) {
                  setShowSubscriptionModal(true);
                  return;
                }

                try {
                  setIsCreatingPlan(true);

                  // Create the goal with temporary values - AI will determine category and title
                  const goal = await createGoal({
                    user_id: user.id,
                    title: 'New Goal', // Temporary - AI will update this
                    description: genieInputText.trim(),
                    category: 'custom', // Temporary - AI will update this
                    status: 'paused',
                    start_date: new Date().toISOString().split('T')[0],
                    icon_name: 'star', // Temporary - AI will update this
                    color: '#FFFF68', // Temporary - AI will update this
                    plan_duration_days: advancedSettings.planDurationDays,
                    preferred_time_ranges: advancedSettings.preferredTimeRanges,
                    preferred_days: advancedSettings.preferredDays,
                    tasks_per_day_min: advancedSettings.tasksPerDayRange.min,
                    tasks_per_day_max: advancedSettings.tasksPerDayRange.max,
                  });

                  console.log('✅ Goal created:', goal.id);
                  setCreatedGoalId(goal.id);

                  // Get device timezone
                  const calendars = Localization.getCalendars();
                  const deviceTimezone = calendars[0]?.timeZone || 'UTC';
                  const deviceNow = new Date();

                  // Generate AI plan outline - AI will determine category and title from description
                  const outlineResponse = await supabase.functions.invoke(
                    'generate-plan',
                    {
                      body: {
                        user_id: user.id,
                        goal_id: goal.id,
                        description: genieInputText.trim(), // Only send description - AI will determine category and title
                        intensity: 'medium',
                        timezone: deviceTimezone,
                        device_now_iso: deviceNow.toISOString(),
                        device_timezone: deviceTimezone,
                        language: 'en',
                        stage: 'outline',
                        plan_duration_days: advancedSettings.planDurationDays,
                        preferred_time_ranges: advancedSettings.preferredTimeRanges,
                        preferred_days: advancedSettings.preferredDays.length > 0 ? advancedSettings.preferredDays : undefined,
                        tasks_per_day_min: advancedSettings.tasksPerDayRange.min,
                        tasks_per_day_max: advancedSettings.tasksPerDayRange.max,
                      },
                    }
                  );

                  // Check for errors - could be in error field or data field with success: false
                  const hasError = outlineResponse.error || 
                                  (outlineResponse.data && outlineResponse.data.success === false);
                  
                  if (hasError) {
                    // Get status from multiple possible locations - FunctionsHttpError has context.status
                    const errorObj = outlineResponse.error as any;
                    const responseObj = outlineResponse.response as any;
                    
                    const errorStatus = errorObj?.context?.status || 
                                       responseObj?.status ||
                                       errorObj?.status || 
                                       errorObj?.code;
                    
                    console.log('❌ Error detected:', { 
                      errorStatus, 
                      errorContextStatus: errorObj?.context?.status,
                      responseStatus: responseObj?.status,
                      hasError: !!outlineResponse.error
                    });
                    
                    // Check for token errors - status 402 means insufficient tokens
                    const isTokenError = errorStatus === 402;
                    
                    if (isTokenError) {
                      console.log('💰 Token error detected (402), showing purchase modal');
                      setIsCreatingPlan(false);
                      
                      // Clean up the goal that was created
                      if (createdGoalId) {
                        try {
                          await deleteGoal(createdGoalId);
                        } catch (e) {
                          console.error('Error deleting goal:', e);
                        }
                        setCreatedGoalId(null);
                      }
                      
                      // Show appropriate modal based on subscription status
                      if (userTokens.isSubscribed) {
                        // Subscribed user needs to buy more tokens
                        console.log('💰 Showing token purchase modal for subscribed user');
                        setShowTokenPurchaseModal(true);
                      } else {
                        // Non-subscribed user should see subscription modal
                        console.log('💰 Showing subscription modal for non-subscribed user');
                        setShowSubscriptionModal(true);
                      }
                      
                      return;
                    }
                    
                    // For other errors, show alert
                    const errorMessage = errorObj?.message || 
                                       errorObj?.error || 
                                       'An error occurred while generating your plan. Please try again.';
                    
                    console.log('❌ Non-token error:', errorMessage);
                    Alert.alert('Error', errorMessage);
                    setIsCreatingPlan(false);
                    
                    // Clean up goal on other errors too
                    if (createdGoalId) {
                      try {
                        await deleteGoal(createdGoalId);
                      } catch (e) {
                        console.error('Error deleting goal:', e);
                      }
                      setCreatedGoalId(null);
                    }
                    
                    return;
                  }

                  // Parse the outline response
                  const outlineData = outlineResponse.data;
                  if (outlineData?.plan_outline) {
                    const milestones = outlineData.plan_outline.map((milestone: any, index: number) => ({
                      week: index + 1,
                      title: milestone.title || `Week ${index + 1}`,
                      description: milestone.description || '',
                      tasks: 0,
                    }));

                    setPlanData({
                      milestones,
                      goalTitle: outlineData.title || 'New Goal', // Use AI-generated title
                      subcategory: outlineData.subcategory || null,
                      marketingDomain: outlineData.marketing_domain || null,
                      planOutline: outlineData.plan_outline || [],
                    });

                    setIsCreatingPlan(false);
                    setShowPlanPreview(true);
                  } else {
                    throw new Error('No plan outline received');
                  }

                  // Clear the field
                  setGenieInputText('');

                  // Refresh goals
                  if (user.id) {
                    fetchGoals(user.id);
                    fetchUserTokens();
                  }
                } catch (error: any) {
                  console.error('Error creating goal:', error);
                  setIsCreatingPlan(false);
                  Alert.alert(
                    'Error',
                    error.message || 'Failed to create goal. Please try again.'
                  );
                }
              }}
              disabled={userTokens.remaining <= 0 && userTokens.isSubscribed}
              activeOpacity={0.8}
              style={[
                styles.genieSendButton,
                (userTokens.remaining <= 0 && userTokens.isSubscribed) && styles.genieSendButtonDisabled
              ]}
            >
              <Text
                style={[
                  styles.genieSendButtonText,
                  userTokens.remaining <= 0 && !userTokens.isSubscribed && { color: '#FFFFFF' },
                  userTokens.remaining <= 0 && userTokens.isSubscribed && { opacity: 0.5 },
                ]}
              >
                Ask Genie
              </Text>
              <Icon
                name="sparkle"
                size={18}
                color={
                  userTokens.remaining <= 0 && !userTokens.isSubscribed
                    ? '#FFFFFF'
                    : userTokens.remaining <= 0 && userTokens.isSubscribed
                      ? 'rgba(255, 255, 104, 0.5)'
                      : '#FFFF68'
                }
                weight="fill"
              />
            </TouchableOpacity>
            {userTokens.remaining <= 0 && !userTokens.isSubscribed && (
              <View style={styles.genieChatFooter}>
                <Text variant="caption" color="secondary" style={styles.genieChatFooterText}>
                  Subscribe to continue creating goals
                </Text>
              </View>
            )}
          </Card>

          {/* Usage Rate Card */}
          <Card variant="gradient" padding="md" style={styles.usageRateCard}>
            <View style={styles.usageRateHeader}>
              <View style={styles.usageRateTitleContainer}>
                <Icon
                  name="chart-bar"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4" style={styles.usageRateTitle}>
                  Usage Rate
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.purchaseTokensButton,
                ]}
                disabled={false}
                activeOpacity={0.8}
                onPress={() => setShowTokenPurchaseModal(true)}
              >
                <Text
                  style={[
                    styles.purchaseTokensText,
                  ]}
                >
                  Add Tokens
                </Text>
                <Icon
                  name="coins"
                  size={16}
                  color="#FFFF68"
                  weight="fill"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.usageRateContent}>
              <View style={styles.usageRateStats}>
                <View style={styles.usageRateStat}>
                  <Text variant="h2" style={styles.usageRateNumber}>
                    {userTokens.used}
                  </Text>
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.usageRateLabel}
                  >
                    Used
                  </Text>
                </View>
                <View style={styles.usageRateDivider} />
                <View style={styles.usageRateStat}>
                  <Text variant="h2" style={styles.usageRateNumber}>
                    {userTokens.remaining}
                  </Text>
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.usageRateLabel}
                  >
                    Remaining
                  </Text>
                </View>
              </View>
              <View style={styles.usageRateProgress}>
                <View style={styles.usageRateProgressBar}>
                  <View
                    style={[
                      styles.usageRateProgressFill,
                      {
                        width: `${(userTokens.used / (userTokens.used + userTokens.remaining)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={styles.usageRateProgressText}
                >
                  {userTokens.used} of {userTokens.used + userTokens.remaining}{' '}
                  total tokens used
                </Text>
              </View>
              {!userTokens.isSubscribed && (
                <View style={styles.subscriptionPrompt}>
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.subscriptionText}
                  >
                    {userTokens.remaining === 0
                      ? 'Upgrade to continue creating goals'
                      : 'Upgrade for unlimited goals and advanced features'}
                  </Text>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={handleSubscribeClick}
                  >
                    <Icon name="crown" size={14} color="#000000" />
                    <Text style={styles.subscribeButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon
                name="target"
                size={20}
                color="rgba(255, 255, 255, 0.8)"
                weight="fill"
              />
            </View>
            <View style={styles.statProgressContainer}>
              <ProgressRing
                progress={
                  activeGoals.length > 0
                    ? activeGoals.reduce(
                        (sum, goal) => sum + goal.completion_percentage,
                        0
                      ) / activeGoals.length
                    : 0
                }
                size={40}
                strokeWidth={3}
                showPercentage={false}
              >
                <Text variant="h4" style={{ color: '#FFFFFF' }}>
                  {activeGoals.length}
                </Text>
              </ProgressRing>
            </View>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Active Plans
            </Text>
          </Card>

          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon
                name="clipboard-text"
                size={20}
                color="rgba(255, 255, 255, 0.8)"
                weight="fill"
              />
            </View>
            <View style={styles.statProgressContainer}>
              <ProgressRing
                progress={0}
                size={40}
                strokeWidth={3}
                showPercentage={false}
              >
                <Text variant="h4" style={{ color: '#FFFFFF' }}>
                  {todaysTasksCount}
                </Text>
              </ProgressRing>
            </View>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Daily Tasks
            </Text>
          </Card>

          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon
                name="fire"
                size={20}
                color="rgba(255, 255, 255, 0.8)"
                weight="fill"
              />
            </View>
            <View style={styles.statProgressContainer}>
              <ProgressRing
                progress={0}
                size={40}
                strokeWidth={3}
                showPercentage={false}
              >
                <Text variant="h4" style={{ color: '#FFFFFF' }}>
                  0
                </Text>
              </ProgressRing>
            </View>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Day Streak
            </Text>
          </Card>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCardContainer}>
          <Card variant="gradient" padding="md" style={styles.scoreCard}>
            <View style={styles.statIconContainer}>
              <Icon
                name="trophy"
                size={20}
                color="rgba(255, 255, 255, 0.8)"
                weight="fill"
              />
            </View>
            <View style={styles.scoreProgressContainer}>
              <ProgressRing
                progress={Math.min(totalPoints / 200, 1)}
                size={60}
                strokeWidth={4}
                showPercentage={false}
              >
                <Text variant="h3" style={{ color: '#FFFFFF' }}>
                  {totalPoints}
                </Text>
              </ProgressRing>
            </View>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Total Score
            </Text>
          </Card>
        </View>

        {/* Create Goal Section - Only show if there are no goals */}
        {activeGoals.length === 0 && (
          <View style={styles.section}>
            <Card variant="default" padding="lg" style={styles.createGoalCard}>
              <View style={styles.createGoalContent}>
                <Text variant="h4" style={styles.createGoalTitle}>
                  Genie
                </Text>

                <Text
                  variant="caption"
                  color="secondary"
                  style={styles.createGoalDescription}
                >
                  Tell me what you want to learn, achieve, change, or build.
                  I'll create a personalized plan with daily tasks, rewards, and
                  smart notifications to help you crush it.
                </Text>

                <Animated.View
                  style={[
                    styles.createGoalButtonContainer,
                    {
                      transform: [
                        {
                          scale: borderAnimation.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.02, 1],
                          }),
                        },
                      ],
                      opacity: borderAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.9, 1, 0.9],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#FFFF68', '#FFFF68']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createGoalButtonGradient}
                  >
                    <TouchableOpacity
                      onPress={checkTokensAndCreateGoal}
                      activeOpacity={0.8}
                      style={styles.createGoalButton}
                    >
                      <View style={styles.createGoalButtonContent}>
                        <Text style={styles.createGoalButtonText}>
                          Talk with Genie
                        </Text>
                        <Icon
                          name="sparkle"
                          size={14}
                          color="#FFFFFF"
                          weight="fill"
                        />
                      </View>
                    </TouchableOpacity>
                  </LinearGradient>
                </Animated.View>
              </View>
            </Card>
          </View>
        )}

        {/* Active Goals Section - Only show if there are goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Card
              variant="gradient"
              padding="md"
              style={styles.activePlansCard}
            >
              <View style={styles.sectionHeaderWithIcon}>
                <Icon name="target" size={20} color="#FFFF68" weight="fill" />
                <Text variant="h4">Active Plans</Text>
              </View>
              <View style={styles.goalsList}>
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onPress={() => setSelectedGoal(goal)}
                    onEdit={() => setShowGoalMenu(goal.id)}
                    hasTimeReachedTasks={hasGoalTasksTimeReached(goal.id)}
                    onContinueCreatingTasks={async () => {
                      // Check tokens first
                      const { data: tokenData } = await supabase
                        .from('user_tokens')
                        .select('tokens_remaining')
                        .eq('user_id', user?.id)
                        .single();
                      
                      const currentTokens = tokenData?.tokens_remaining || 0;
                      
                      if (currentTokens <= 0) {
                        // Show token purchase modal
                        setShowTokenPurchaseModal(true);
                        return;
                      }
                      
                      // Continue task generation
                      try {
                        const deviceNow = new Date();
                        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                        
                        // Calculate which week to continue from
                        const totalWeeks = Math.ceil((goal.plan_duration_days || 21) / 7);
                        const { count: existingTaskCount } = await supabase
                          .from('goal_tasks')
                          .select('*', { count: 'exact', head: true })
                          .eq('goal_id', goal.id);
                        
                        // Estimate which week we're on based on existing tasks
                        const maxTasks = goal.tasks_per_day_max || 3;
                        const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
                        const tasksPerDay = Math.min(maxTasks, availableTimeSlots);
                        const daysPerWeek = goal.preferred_days?.length || 7;
                        const tasksPerWeek = Math.ceil((7 / 7) * daysPerWeek) * tasksPerDay;
                        const currentWeek = Math.min(
                          Math.floor((existingTaskCount || 0) / tasksPerWeek) + 1,
                          totalWeeks
                        );
                        
                        // Update goal status to active
                        await supabase
                          .from('goals')
                          .update({
                            status: 'active',
                            error_message: null,
                          })
                          .eq('id', goal.id);
                        
                        // Call generate-tasks function
                        const tasksResponse = await supabase.functions.invoke('generate-tasks', {
                          body: {
                            user_id: user?.id,
                            goal_id: goal.id,
                            device_now_iso: deviceNow.toISOString(),
                            device_timezone: deviceTimezone,
                            week_number: currentWeek,
                          },
                        });
                        
                        if (tasksResponse.error) {
                          const errorMessage = tasksResponse.error.message || '';
                          const isTokenError = tasksResponse.error.status === 402 || 
                                              errorMessage.includes('tokens');
                          
                          if (isTokenError) {
                            setShowTokenPurchaseModal(true);
                          } else {
                            Alert.alert('Error', errorMessage || 'Failed to continue creating tasks');
                          }
                        } else {
                          // Refresh goals to show updated status
                          if (user?.id) {
                            fetchGoals(user.id);
                          }
                        }
                      } catch (error) {
                        console.error('Error continuing task creation:', error);
                        Alert.alert('Error', 'Failed to continue creating tasks. Please try again.');
                      }
                    }}
                  />
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Today's Tasks Section */}
        <View style={[styles.section, styles.todayTasksSection]}>
          {todaysTasksCount === 0 ? (
            <Card variant="gradient" padding="md" style={styles.todayTasksCard}>
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="clipboard-text"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">Today's Tasks</Text>
              </View>
              <View style={styles.todayTasksNumberContainer}>
                <Text variant="h2" color="secondary">
                  0
                </Text>
              </View>
              <Text
                variant="body"
                color="secondary"
                style={styles.todayTasksLabel}
              >
                Tasks Today
              </Text>
              <Text
                variant="caption"
                color="tertiary"
                style={styles.todayTasksDescription}
              >
                Create your first goal to get personalized daily tasks
              </Text>
            </Card>
          ) : (
            <Card
              variant="gradient"
              padding="md"
              style={styles.todayTasksListCard}
            >
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="clipboard-text"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">Today's Tasks</Text>
              </View>
              <View style={styles.todayTasksList}>
                {todaysTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    allTasks={todaysTasks}
                    onPress={() => {
                      // Navigate to task details
                      setSelectedTask(task);
                    }}
                  />
                ))}
              </View>
            </Card>
          )}
        </View>

        {/* Recent Rewards Section */}
        {recentRewards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h4">Recent Rewards</Text>
              <Icon
                name="trophy"
                size={20}
                color={theme.colors.text.secondary}
              />
            </View>

            <View style={styles.rewardsList}>
              {recentRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  onPress={() => {
                    Alert.alert(reward.title, reward.description);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Goal Overflow Menu */}
      {showGoalMenu && (
        <View style={styles.goalMenuOverlay}>
          <TouchableOpacity
            style={styles.goalMenuOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowGoalMenu(null)}
          />
          <View style={styles.goalMenu}>
            <View style={styles.goalMenuHeader}>
              <Text variant="h4">Goal Options</Text>
              <Button variant="ghost" onPress={() => setShowGoalMenu(null)}>
                <Icon
                  name="check-circle"
                  size={20}
                  color={theme.colors.text.secondary}
                />
              </Button>
            </View>
            <View style={styles.goalMenuContent}>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => handleDeleteGoal(showGoalMenu)}
                rightIcon={<Icon name="trash" size={20} color="#FF0000" />}
                style={[
                  styles.goalMenuButton,
                  { backgroundColor: '#FF000010' },
                ]}
              >
                <Text style={{ color: '#FF0000' }}>Delete Goal</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Side Menu */}
      {showSideMenu && (
        <Animated.View
          style={[
            styles.sideMenuOverlay,
            {
              opacity: overlayAnimation,
            },
          ]}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity
            style={styles.sideMenuOverlayTouchable}
            activeOpacity={1}
            onPress={closeSideMenu}
          />
          <View style={styles.sideMenuShadow} />
          <Animated.View
            style={[
              styles.sideMenu,
              {
                transform: [
                  {
                    translateX: sideMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0], // Slide in from right
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Profile Image - Above Header */}
            <View style={styles.sideMenuProfileSection}>
              <View style={styles.sideMenuProfileImage}>
                <Image
                  source={require('../../assets/LogoSymbol.webp')}
                  style={styles.sideMenuProfileLogo}
                  resizeMode="contain"
                />
              </View>
              <Button
                variant="ghost"
                onPress={closeSideMenu}
                style={styles.sideMenuCloseButton}
              >
                <Icon name="x" size={20} color="#FFFFFF" />
              </Button>
            </View>

            {/* Greeting Text */}
            <View style={styles.sideMenuGreetingSection}>
              <Text variant="h4" style={styles.sideMenuGreetingTitle}>
                Hello, {getUserName()}
              </Text>
            </View>

            <View style={styles.sideMenuHeader}>
              {/* Header content can go here if needed */}
            </View>
            <View style={styles.sideMenuContent}>
              {/* My Plans */}
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  closeSideMenu();
                  setShowMyPlans(true);
                }}
                rightIcon={<Icon name="target" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                My Plans
              </Button>
              {/* Daily Goals */}
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  closeSideMenu();
                  setShowDailyGoals(true);
                }}
                rightIcon={<Icon name="calendar" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Daily Goals
              </Button>
              {/* Profile */}
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  closeSideMenu();
                  setShowProfile(true);
                }}
                rightIcon={<Icon name="user" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Profile
              </Button>
              {/* Settings */}
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  closeSideMenu();
                  setShowSettings(true);
                }}
                rightIcon={<Icon name="gear" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Settings
              </Button>
              {/* My Subscription - only if subscribed */}
              {userTokens.isSubscribed && (
                <Button
                  variant="ghost"
                  fullWidth
                  onPress={() => {
                    closeSideMenu();
                    setShowSubscription(true);
                  }}
                  rightIcon={<Icon name="crown" size={20} color="#FFFF68" />}
                  style={styles.sideMenuButton}
                >
                  My Subscription
                </Button>
              )}
              {/* Help & Support - אחרון לפני Logout (למטה) */}
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  closeSideMenu();
                  setShowHelpSupport(true);
                }}
                rightIcon={<Icon name="headset" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Help & Support
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={async () => {
                  console.log('🔐 Logout button pressed');
                  closeSideMenu();
                  try {
                    await signOut();
                    console.log('✅ Logout completed successfully');
                  } catch (error) {
                    console.error('❌ Logout failed:', error);
                  }
                }}
                rightIcon={
                  <Icon
                    name="sign-out"
                    size={20}
                    color={theme.colors.status.error}
                  />
                }
                style={[
                  styles.sideMenuButton,
                  styles.sideMenuButtonNoBorder,
                  { backgroundColor: theme.colors.status.error + '10' },
                ]}
              >
                <Text style={{ color: theme.colors.status.error }}>Logout</Text>
              </Button>
            </View>
            <View style={styles.sideMenuFooter}>
              <Text style={styles.sideMenuFooterText}>
                © 2025-2026 GenieApp • Version 1.0.3
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Task Details Screen */}
      {selectedTask && (
        <TaskDetailsScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onTaskUpdate={() => {
            // Refresh data when task is updated
            if (user?.id) {
              fetchTotalPoints();
              fetchTodaysTasks();
            }
          }}
        />
      )}

      {/* Notifications Screen */}
      {showNotifications && (
        <NotificationsScreen
          onBack={() => setShowNotifications(false)}
          onNotificationRead={refreshCount}
        />
      )}

      {/* Profile Screen */}
      {showProfile && <ProfileScreen onBack={() => setShowProfile(false)} />}

      {/* Settings Screen */}
      {showSettings && <SettingsScreen onBack={() => setShowSettings(false)} />}

      {/* Help & Support Screen */}
      {showHelpSupport && (
        <HelpSupportScreen onBack={() => setShowHelpSupport(false)} />
      )}

      {/* Subscription Screen */}
      {showSubscription && (
        <SubscriptionScreen
          onBack={() => setShowSubscription(false)}
          onAddTokens={() => {
            // Ensure token modal is on top: close subscription, then open
            setShowSubscription(false);
            requestAnimationFrame(() => setShowTokenPurchaseModal(true));
          }}
        />
      )}

      {/* My Plans Screen */}
      {showMyPlans && (
        <MyPlansScreen
          onBack={() => setShowMyPlans(false)}
          onGoalPress={(goal) => {
            setShowMyPlans(false);
            setSelectedGoal(goal);
          }}
          onHomePress={() => setShowMyPlans(false)}
          onDailyGoalsPress={() => {
            setShowMyPlans(false);
            setShowDailyGoals(true);
          }}
          onCreatePress={() => {
            setShowMyPlans(false);
            checkTokensAndCreateGoal();
          }}
        />
      )}

      {/* Daily Goals Screen */}
      {showDailyGoals && (
        <DailyGoalsScreen
          onBack={() => setShowDailyGoals(false)}
          onTaskPress={(task) => {
            setShowDailyGoals(false);
            setSelectedTask(task);
          }}
          onHomePress={() => setShowDailyGoals(false)}
          onMyPlansPress={() => {
            setShowDailyGoals(false);
            setShowMyPlans(true);
          }}
          onCreatePress={() => {
            setShowDailyGoals(false);
            checkTokensAndCreateGoal();
          }}
        />
      )}

      {/* AI Loading Modal */}
      <AILoadingModal
        visible={isCreatingPlan}
        step={1}
        message="Creating your personalized plan..."
      />

      {/* Plan Preview Modal */}
      {showPlanPreview && planData && createdGoalId && (
        <PlanPreviewModal
          visible={showPlanPreview}
          onClose={() => {
            setShowPlanPreview(false);
            setPlanData(null);
            setCreatedGoalId(null);
            setIsApprovingPlan(false);
          }}
          onApprove={async () => {
            if (!user?.id || !createdGoalId || isApprovingPlan) return;

            try {
              setIsApprovingPlan(true);
              
              // Update goal status to active immediately
              await updateGoal(createdGoalId, { status: 'active' });

              // Close modal immediately - loading will be shown in goal card
              setShowPlanPreview(false);
              setPlanData(null);
              setCreatedGoalId(null);
              setIsApprovingPlan(false);

              // Refresh goals immediately to show loading state in goal card
              await fetchGoals(user.id);
              fetchUserTokens();
              fetchTodaysTasks();
              fetchTotalPoints();

              // Generate tasks in the background (non-blocking)
              // The goal card will show loading state automatically (status='active' && total_tasks=0)
              supabase.functions.invoke(
                'generate-tasks',
                {
                  body: {
                    user_id: user.id,
                    goal_id: createdGoalId,
                    week_number: 1,
                    device_now_iso: new Date().toISOString(),
                    device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                }
              )
              .then((response: any) => {
                if (response.error) {
                  console.error('Error generating tasks:', response.error);
                  const errorMessage = response.error.message || 'Failed to generate tasks';
                  const errorStatus = response.error.status || response.error.context?.status;
                  
                  // Check if it's a token error
                  if (errorStatus === 402 || errorMessage.includes('tokens') || errorMessage.includes('Insufficient')) {
                    // Update goal with error message
                    updateGoal(createdGoalId, {
                      status: 'paused',
                      error_message: errorMessage,
                    }).then(() => {
                      fetchGoals(user.id);
                      // Show token modal
                      if (userTokens.isSubscribed) {
                        setShowTokenPurchaseModal(true);
                      } else {
                        setShowSubscriptionModal(true);
                      }
                    });
                  } else {
                    // Update goal with error message
                    updateGoal(createdGoalId, {
                      status: 'paused',
                      error_message: errorMessage,
                    }).then(() => {
                      fetchGoals(user.id);
                    });
                  }
                } else {
                  // Success - refresh goals to show updated task count
                  console.log('Task generation started successfully');
                  fetchGoals(user.id);
                }
              })
              .catch((error: any) => {
                console.error('Error generating tasks:', error);
                // Update goal with error message
                updateGoal(createdGoalId, {
                  status: 'paused',
                  error_message: error.message || 'Failed to generate tasks',
                }).then(() => {
                  fetchGoals(user.id);
                });
              });
            } catch (error: any) {
              console.error('Error approving plan:', error);
              setIsApprovingPlan(false);
              Alert.alert('Error', error.message || 'Failed to approve plan');
            }
          }}
          onReject={async () => {
            if (!createdGoalId) return;
            
            try {
              // Delete the goal if user rejects
              await deleteGoal(createdGoalId);
              setShowPlanPreview(false);
              setPlanData(null);
              setCreatedGoalId(null);
              
              if (user?.id) {
                fetchGoals(user.id);
                fetchUserTokens();
              }
            } catch (error: any) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }}
          goalTitle={planData.goalTitle}
          milestones={planData.milestones}
          isApproving={isApprovingPlan}
        />
      )}

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        visible={showTokenPurchaseModal}
        onClose={() => setShowTokenPurchaseModal(false)}
        onSuccess={() => {
          // Refresh token data after successful purchase
          fetchUserTokens();
        }}
      />

      {/* Advanced Settings Modal */}
      <Modal
        visible={showAdvancedSettingsModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAdvancedSettingsModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0C12' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' }}>
            <View style={{ width: 24 }} />
            <Text variant="h3" color="primary" style={{ color: '#FFFF68', fontWeight: '700' }}>
              Advanced Settings
            </Text>
            <TouchableOpacity
              onPress={() => setShowAdvancedSettingsModal(false)}
              activeOpacity={0.8}
            >
              <Icon name="x" size={24} color="#FFFF68" weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Plan Duration */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                {!userTokens.isSubscribed && (
                  <Icon name="crown" size={16} color="#FFFF68" weight="fill" style={{ marginRight: 8 }} />
                )}
                <Text variant="h4" color="primary" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Plan duration
                </Text>
              </View>
              <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 12 }}>
                {userTokens.isSubscribed 
                  ? 'How long should your plan last?'
                  : '3 weeks plan available. Subscribe to customize duration.'}
              </Text>
              {userTokens.isSubscribed ? (
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
                  value={advancedSettings.planDurationDays.toString()}
                  onValueChange={(value) =>
                    setAdvancedSettings(prev => ({ ...prev, planDurationDays: parseInt(value) }))
                  }
                  placeholder="Select duration"
                />
              ) : (
                <View style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="body" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    3 weeks (21 days)
                  </Text>
                  <Icon name="lock" size={16} color="rgba(255, 255, 255, 0.3)" weight="fill" />
                </View>
              )}
            </View>

            {/* Tasks Per Day Range */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                {!userTokens.isSubscribed && (
                  <Icon name="crown" size={16} color="#FFFF68" weight="fill" style={{ marginRight: 8 }} />
                )}
                <Text variant="h4" color="primary" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Tasks per day
                </Text>
              </View>
              <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 12 }}>
                {userTokens.isSubscribed 
                  ? 'Choose your daily task range'
                  : 'Default range (3-5 tasks). Subscribe to customize.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8 }}>
                    From:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (userTokens.isSubscribed && advancedSettings.tasksPerDayRange.min > 1) {
                          setAdvancedSettings(prev => ({
                            ...prev,
                            tasksPerDayRange: { ...prev.tasksPerDayRange, min: prev.tasksPerDayRange.min - 1 }
                          }));
                        }
                      }}
                      disabled={!userTokens.isSubscribed}
                      style={{ padding: 8, backgroundColor: userTokens.isSubscribed ? 'rgba(255, 255, 104, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: 8 }}
                    >
                      <Icon name="minus" size={16} color={userTokens.isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"} weight="bold" />
                    </TouchableOpacity>
                    <Text variant="h4" color="primary" style={{ color: '#FFFFFF', minWidth: 40, textAlign: 'center' }}>
                      {advancedSettings.tasksPerDayRange.min}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (userTokens.isSubscribed && advancedSettings.tasksPerDayRange.min < advancedSettings.tasksPerDayRange.max - 1) {
                          setAdvancedSettings(prev => ({
                            ...prev,
                            tasksPerDayRange: { ...prev.tasksPerDayRange, min: prev.tasksPerDayRange.min + 1 }
                          }));
                        }
                      }}
                      disabled={!userTokens.isSubscribed}
                      style={{ padding: 8, backgroundColor: userTokens.isSubscribed ? 'rgba(255, 255, 104, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: 8 }}
                    >
                      <Icon name="plus" size={16} color={userTokens.isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"} weight="bold" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8 }}>
                    To:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (userTokens.isSubscribed && advancedSettings.tasksPerDayRange.max > advancedSettings.tasksPerDayRange.min + 1) {
                          setAdvancedSettings(prev => ({
                            ...prev,
                            tasksPerDayRange: { ...prev.tasksPerDayRange, max: prev.tasksPerDayRange.max - 1 }
                          }));
                        }
                      }}
                      disabled={!userTokens.isSubscribed}
                      style={{ padding: 8, backgroundColor: userTokens.isSubscribed ? 'rgba(255, 255, 104, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: 8 }}
                    >
                      <Icon name="minus" size={16} color={userTokens.isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"} weight="bold" />
                    </TouchableOpacity>
                    <Text variant="h4" color="primary" style={{ color: '#FFFFFF', minWidth: 40, textAlign: 'center' }}>
                      {advancedSettings.tasksPerDayRange.max}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (userTokens.isSubscribed && advancedSettings.tasksPerDayRange.max < 10) {
                          setAdvancedSettings(prev => ({
                            ...prev,
                            tasksPerDayRange: { ...prev.tasksPerDayRange, max: prev.tasksPerDayRange.max + 1 }
                          }));
                        }
                      }}
                      disabled={!userTokens.isSubscribed}
                      style={{ padding: 8, backgroundColor: userTokens.isSubscribed ? 'rgba(255, 255, 104, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: 8 }}
                    >
                      <Icon name="plus" size={16} color={userTokens.isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.3)"} weight="bold" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Preferred Days */}
            <View style={{ marginBottom: 24 }}>
              <Text variant="h4" color="primary" style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: 8 }}>
                Preferred days
              </Text>
              <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 12 }}>
                Select your available days (or leave blank for every day)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
                    onPress={() => {
                      const newDays = advancedSettings.preferredDays.includes(day.value)
                        ? advancedSettings.preferredDays.filter((d) => d !== day.value)
                        : [...advancedSettings.preferredDays, day.value];
                      setAdvancedSettings(prev => ({ ...prev, preferredDays: newDays }));
                    }}
                    activeOpacity={0.8}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: advancedSettings.preferredDays.includes(day.value) ? 'rgba(255, 255, 104, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: advancedSettings.preferredDays.includes(day.value) ? '#FFFF68' : 'rgba(255, 255, 255, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="body" style={{ color: advancedSettings.preferredDays.includes(day.value) ? '#FFFF68' : 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preferred Time Ranges */}
            <View style={{ marginBottom: 24 }}>
              <Text variant="h4" color="primary" style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: 8 }}>
                Preferred times
              </Text>
              <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 12 }}>
                Choose up to 3 time ranges that work for you
              </Text>
              {advancedSettings.preferredTimeRanges.map((range, index) => (
                <View key={index} style={{ marginBottom: 16, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon
                      name={index === 0 ? 'sun' : index === 1 ? 'sun-horizon' : 'moon'}
                      size={20}
                      color="#FFFF68"
                      weight="fill"
                    />
                    <Text variant="caption" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: 8 }}>
                      {index === 0 ? 'Morning' : index === 1 ? 'Afternoon' : 'Evening'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (range.start_hour > 0) {
                            const newRanges = [...advancedSettings.preferredTimeRanges];
                            newRanges[index].start_hour = range.start_hour - 1;
                            setAdvancedSettings(prev => ({ ...prev, preferredTimeRanges: newRanges }));
                          }
                        }}
                        style={{ padding: 8, backgroundColor: 'rgba(255, 255, 104, 0.2)', borderRadius: 8 }}
                      >
                        <Icon name="minus" size={14} color="#FFFF68" weight="bold" />
                      </TouchableOpacity>
                      <Text variant="h4" color="primary" style={{ color: '#FFFFFF', minWidth: 60, textAlign: 'center' }}>
                        {range.start_hour.toString().padStart(2, '0')}:00
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (range.start_hour < range.end_hour - 1) {
                            const newRanges = [...advancedSettings.preferredTimeRanges];
                            newRanges[index].start_hour = range.start_hour + 1;
                            setAdvancedSettings(prev => ({ ...prev, preferredTimeRanges: newRanges }));
                          }
                        }}
                        style={{ padding: 8, backgroundColor: 'rgba(255, 255, 104, 0.2)', borderRadius: 8 }}
                      >
                        <Icon name="plus" size={14} color="#FFFF68" weight="bold" />
                      </TouchableOpacity>
                    </View>
                    <Text variant="body" color="secondary" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      To
                    </Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (range.end_hour > range.start_hour + 1) {
                            const newRanges = [...advancedSettings.preferredTimeRanges];
                            newRanges[index].end_hour = range.end_hour - 1;
                            setAdvancedSettings(prev => ({ ...prev, preferredTimeRanges: newRanges }));
                          }
                        }}
                        style={{ padding: 8, backgroundColor: 'rgba(255, 255, 104, 0.2)', borderRadius: 8 }}
                      >
                        <Icon name="minus" size={14} color="#FFFF68" weight="bold" />
                      </TouchableOpacity>
                      <Text variant="h4" color="primary" style={{ color: '#FFFFFF', minWidth: 60, textAlign: 'center' }}>
                        {range.end_hour.toString().padStart(2, '0')}:00
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (range.end_hour < 24) {
                            const newRanges = [...advancedSettings.preferredTimeRanges];
                            newRanges[index].end_hour = Math.min(24, range.end_hour + 1);
                            setAdvancedSettings(prev => ({ ...prev, preferredTimeRanges: newRanges }));
                          }
                        }}
                        style={{ padding: 8, backgroundColor: 'rgba(255, 255, 104, 0.2)', borderRadius: 8 }}
                      >
                        <Icon name="plus" size={14} color="#FFFF68" weight="bold" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              {advancedSettings.preferredTimeRanges.length < 3 && (
                <TouchableOpacity
                  onPress={() => {
                    const newRanges = [...advancedSettings.preferredTimeRanges];
                    newRanges.push({ start_hour: 9, end_hour: 17, label: `Range ${newRanges.length + 1}` });
                    setAdvancedSettings(prev => ({ ...prev, preferredTimeRanges: newRanges }));
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(255, 255, 104, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 104, 0.3)' }}
                >
                  <Icon name="plus" size={16} color="#FFFF68" weight="bold" />
                  <Text variant="body" color="primary" style={{ color: '#FFFF68', marginLeft: 8, fontWeight: '600' }}>
                    Add Time Range
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Modal Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
            <TouchableOpacity
              onPress={() => setShowAdvancedSettingsModal(false)}
              activeOpacity={0.8}
              style={{ flex: 1, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, alignItems: 'center' }}
            >
              <Text variant="body" color="primary" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveAdvancedSettings}
              activeOpacity={0.8}
              style={{ flex: 1, padding: 16, backgroundColor: '#FFFF68', borderRadius: 12, alignItems: 'center' }}
            >
              <Text variant="body" color="primary" style={{ color: '#000000', fontWeight: '600' }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="crown" size={24} color="#FFFF68" weight="fill" />
              <Text variant="h3" style={styles.modalTitle}>
                Unlock Unlimited Goals
              </Text>
              <TouchableOpacity
                onPress={() => setShowSubscriptionModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.modalDescription}
                >
                  {userTokens.notificationsMuted 
                    ? "Keep your smart Genie notifications active! Subscribe to Genie Premium and never miss a task reminder."
                    : "Join Genie Premium and unlock the full potential with advanced AI features and unlimited access."}
                </Text>

                <View style={styles.modalFeatures}>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      1000 tokens every month - worth $50
                    </Text>
                    <Icon
                      name="coins"
                      size={14}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      Advanced user preferences
                    </Text>
                    <Icon
                      name="gear"
                      size={14}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      Early access to beta features
                    </Text>
                    <Icon
                      name="star"
                      size={14}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      Advanced scoring system
                    </Text>
                    <Icon
                      name="chart-bar"
                      size={14}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      Personal coaching via smart notifications
                    </Text>
                    <Icon
                      name="bell"
                      size={14}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                </View>

                <View style={styles.cancellationInfo}>
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.cancellationText}
                  >
                    Cancel anytime - billing stops immediately for the next month when you cancel your subscription
                  </Text>
                </View>

                {/* Legal Links - Required by Apple for Subscriptions */}
                <View style={styles.legalLinksContainer}>
                  <Text
                    variant="caption"
                    color="tertiary"
                    style={styles.legalLinksTitle}
                  >
                    By subscribing, you agree to our:
                  </Text>
                  <View style={styles.legalLinks}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL('https://askgenie.info/terms')}
                      style={styles.legalLinkButton}
                    >
                      <Text style={styles.legalLinkText}>Terms of Use</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalLinkSeparator}>•</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL('https://askgenie.info/privacy')}
                      style={styles.legalLinkButton}
                    >
                      <Text style={styles.legalLinkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSubscribeButton}
                onPress={async () => {
                  try {
                  setShowSubscriptionModal(false);
                    
                    // Use IAP on mobile, Stripe on web
                    const subscriptionProductId = Platform.OS === 'ios' || Platform.OS === 'android'
                      ? 'com.ituby.genie.ai.premium.monthly'  // IAP Product ID
                      : 'price_1SLUWE9mCMmqa2BSeNa94ig7';     // Stripe Price ID
                    
                    const response = await paymentService.createSubscription(subscriptionProductId);
                    
                    console.log('📱 Subscription response:', JSON.stringify(response, null, 2));
                    
                    if (response.success) {
                      if (response.url) {
                        // Web: open Stripe checkout
                        await paymentService.openCheckout(response.url);
                      } else {
                        // Mobile: IAP handled by listener
                        // requestPurchase should have opened the native purchase dialog
                        // Don't show alert - the native dialog will appear
                        console.log('✅ Subscription request sent - native dialog should be opening');
                      }
                    } else {
                      const errorMsg = response.error || 'Unknown error';
                      console.error('❌ Subscription error:', errorMsg);
                      Alert.alert('Error', `Error creating subscription: ${errorMsg}\n\nPlease check:\n1. Subscription is "Ready to Submit" in App Store Connect\n2. You are signed in with Sandbox Tester\n3. Internet connection is stable`);
                    }
                  } catch (error) {
                    console.error('Error starting subscription:', error);
                    alert('Error starting subscription. Please try again.');
                  }
                }}
              >
                <Text style={styles.modalSubscribeButtonText}>
                  Subscribe Now - $14.99/month
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <Icon name="warning" size={24} color="#FF4444" weight="fill" />
              <Text variant="h3" style={styles.deleteModalTitle}>
                Delete Goal
              </Text>
            </View>
            <Text
              variant="body"
              color="secondary"
              style={styles.deleteModalDescription}
            >
              This action cannot be undone. All tasks and progress will be
              permanently deleted.
            </Text>
            <Text
              variant="body"
              color="secondary"
              style={styles.deleteModalWarning}
            >
              Type "Delete It" to confirm deletion:
            </Text>
            <TextInput
              style={styles.deleteModalInput}
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              placeholder="Delete It"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.deleteModalActions}>
              <Button
                variant="ghost"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                  setGoalToDelete(null);
                }}
                style={styles.deleteModalCancelButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={confirmDeleteGoal}
                disabled={
                  deleteConfirmationText.toLowerCase().trim() !== 'delete it'
                }
                style={[
                  styles.deleteModalConfirmButton,
                  deleteConfirmationText.toLowerCase().trim() !== 'delete it' &&
                    styles.deleteModalConfirmButtonDisabled,
                ]}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav
        onHomePress={() => {
          // Already on home, do nothing or scroll to top
        }}
        onMyPlansPress={() => setShowMyPlans(true)}
        onDailyGoalsPress={() => setShowDailyGoals(true)}
        onCreatePress={() => {}}
        activeTab="home"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Increased top safe area padding
  },
  scrollView: {
    flex: 1,
    paddingTop: 80, // Further reduced space for header
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
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
    paddingTop: 60, // Increased safe area padding
    paddingBottom: 10, // Added padding below header
    backgroundColor: Platform.OS === 'android' ? 'rgba(10, 12, 18, 0.98)' : 'rgba(26, 28, 36, 0.8)', // Much darker on Android
    minHeight: 110, // Increased minimum height
    overflow: 'hidden',
  },
  dashboardSloganCard: {
    marginBottom: 8,
  },
  dashboardSloganHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dashboardSloganText: {
    color: '#FFFFFF',
  },
  dashboardSloganSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  refreshLoaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  refreshLoaderImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshLoaderLogo: {
    width: 60,
    height: 60,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    position: 'relative',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  contentHeader: {
    paddingHorizontal: 16,
    paddingTop: 0, // Removed padding above
    paddingBottom: 12, // Reduced padding below
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    flex: 0,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLogo: {
    width: 40,
    height: 40,
  },
  greetingText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  greetingButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  genieChatCard: {
    marginTop: 8,
    marginBottom: 0,
  },
  genieInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  genieInput: {
    textAlign: 'left',
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  genieSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 104, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    width: '100%',
  },
  genieSendButtonDisabled: {
    opacity: 0.5,
  },
  genieSendButtonText: {
    color: '#FFFF68',
    fontSize: 14,
    fontWeight: '600',
  },
  genieChatFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  genieChatFooterText: {
    fontSize: 11,
    opacity: 0.7,
  },
  genieAdvancedSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  genieAdvancedSettingsText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  greeting: {
    marginBottom: 0,
    textAlign: 'left',
  },
  motivationalText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '400',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    gap: 16,
  },
  statCard: {
    width: STAT_CARD_SIZE,
    height: STAT_CARD_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    textAlign: 'left',
  },
  statCardWrapper: {
    alignItems: 'center',
    width: STAT_CARD_SIZE,
  },
  statIconContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  statProgressContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  todayTasksNumberContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  todayTasksLabel: {
    position: 'absolute',
    bottom: 32,
    left: 12,
    right: 12,
    textAlign: 'left',
  },
  scoreCardContainer: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'stretch',
    paddingHorizontal: 20,
  },
  scoreCard: {
    width: '100%',
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreProgressContainer: {
    position: 'absolute',
    top: '50%',
    right: 12,
    transform: [{ translateY: -12 }],
  },
  todayTasksDescription: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    textAlign: 'left',
  },
  todayTasksList: {
    gap: 6,
  },
  todayTasksListCard: {
    marginBottom: 16,
    paddingBottom: 0,
  },
  activePlansCard: {
    marginBottom: 8,
    paddingBottom: 0,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  todayTasksSection: {
    paddingTop: 4,
  },
  sectionCompact: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAction: {
    minWidth: 160,
  },
  goalsList: {
    gap: 4,
  },
  goalCard: {
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalDescription: {
    marginBottom: 12,
  },
  goalProgress: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  createGoalCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    minHeight: 200,
  },
  createGoalContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  createGoalButtonGradient: {
    borderRadius: 16,
    padding: 2,
    width: '100%',
  },
  createGoalButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGoalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  createGoalButtonContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  usageRateCard: {
    marginBottom: 0,
  },
  usageRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageRateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageRateTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  purchaseTokensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  purchaseTokensText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  purchaseTokensButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchaseTokensTextDisabled: {
    color: 'rgba(255, 255, 104, 0.4)',
  },
  usageRateContent: {
    gap: 12,
  },
  usageRateStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageRateStat: {
    alignItems: 'center',
    flex: 1,
  },
  usageRateNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  usageRateLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  usageRateDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  usageRateProgress: {
    gap: 8,
  },
  usageRateProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageRateProgressFill: {
    height: '100%',
    backgroundColor: '#FFFF68',
    borderRadius: 3,
  },
  usageRateProgressText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.7,
  },
  subscriptionPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  subscriptionText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: '#FFFF68',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subscribeButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  createGoalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  createGoalDescription: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  smallGlassButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  smallGlassButtonText: {
    fontSize: 14,
  },
  addGoalButtonGradient: {
    borderRadius: 25,
    padding: 2,
    width: '95%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  addGoalButton: {
    borderRadius: 23,
    paddingVertical: 16,
    paddingHorizontal: 12,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalButtonDisabled: {
    opacity: 0.6,
  },
  addGoalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayTasksCard: {
    position: 'relative',
    height: 120,
    marginBottom: 16,
    paddingBottom: 0,
  },
  rewardsList: {
    gap: 0,
  },
  sideMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Reduced opacity for blur effect
    zIndex: 2000,
  },
  sideMenuOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2001,
  },
  sideMenuShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'transparent', // Removed yellow divider
    zIndex: 2002,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // More opaque black
    paddingTop: 60, // Reduced safe area padding
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderLeftWidth: 0.5, // Thin yellow line
    borderLeftColor: '#FFFF68',
    zIndex: 2003,
    shadowColor: '#FFFF68', // Yellow glow
    shadowOffset: {
      width: -5,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  sideMenuProfileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  sideMenuProfileImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideMenuGreetingSection: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4,
  },
  sideMenuHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border with transparency
  },
  sideMenuGreeting: {
    flex: 1,
  },
  sideMenuProfileLogo: {
    width: 40,
    height: 40,
  },
  sideMenuGreetingText: {
    alignItems: 'flex-start',
  },
  sideMenuGreetingTitle: {
    color: '#FFFFFF',
    marginBottom: 4,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
  },
  sideMenuCloseButton: {
    // No special positioning needed
  },
  sideMenuGreetingButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sideMenuContent: {
    gap: 8,
  },
  sideMenuButton: {
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sideMenuButtonNoBorder: {
    borderBottomWidth: 0,
    marginTop: 16,
  },
  sideMenuButtonContentOverride: {
    justifyContent: 'space-between',
    width: '100%',
  },
  sideMenuButtonOverride: {
    justifyContent: 'space-between',
  },
  sideMenuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sideMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle white divider with transparency
    marginVertical: 16,
  },
  sideMenuFooter: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
    paddingLeft: 24, // align with side menu horizontal padding
  },
  sideMenuFooterText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'left',
  },
  goalMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 2000,
  },
  goalMenuOverlayTouchable: {
    flex: 1,
  },
  goalMenu: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -120,
    marginLeft: -150,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Same as side menu
    borderRadius: 16,
    padding: 24,
    shadowColor: '#FFFFFF', // White shadow like side menu
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 2,
    borderColor: '#FFFF68', // Yellow border
  },
  goalMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFF68', // Yellow border
  },
  goalMenuContent: {
    gap: 8,
  },
  goalMenuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  // Subscription Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#FFFF68',
    flex: 1,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 12,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  modalFeatures: {
    width: '100%',
    gap: 12,
  },
  modalFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
  },
  modalFeatureText: {
    flex: 1,
    textAlign: 'left',
    fontSize: 13,
    lineHeight: 18,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    paddingBottom: 0,
  },
  modalActions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 104, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: 'auto',
  },
  modalSubscribeButton: {
    backgroundColor: '#FFFF68',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  modalSubscribeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  cancellationInfo: {
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.2)',
  },
  cancellationText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  legalLinksContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  legalLinksTitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legalLinkText: {
    fontSize: 12,
    color: '#FFFF68',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  legalLinkSeparator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  // Token Purchase Modal Styles
  tokenPackagesSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'left',
    fontSize: 16,
  },
  tokenOptions: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
  tokenOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    width: '100%',
    minHeight: 70,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenOptionSelected: {
    borderColor: '#FFFF68',
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    shadowColor: '#FFFF68',
    shadowOpacity: 0.3,
  },
  tokenOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tokenOptionLeft: {
    flex: 1,
    marginRight: 12,
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#FFFF68',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  popularText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tokenAmount: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'left',
    marginBottom: 4,
  },
  tokenPrice: {
    color: '#FFFF68',
    fontWeight: '800',
    fontSize: 22,
    textAlign: 'right',
    minWidth: 80,
  },
  tokenDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    textAlign: 'left',
  },
  // Custom Token Input Styles
  customTokenSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  customTokenInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  customTokenInput: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 120,
    borderWidth: 0,
    flex: 1,
  },
  customTokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    paddingLeft: 4,
  },
  customTokenPriceContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 104, 0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 104, 0.4)',
  },
  customTokenPrice: {
    color: '#FFFF68',
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 4,
  },
  customTokenPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Purchase Section Styles
  purchaseSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchaseButton: {
    backgroundColor: '#FFFF68',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 17,
  },
  purchaseDescription: {
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 11,
    opacity: 0.7,
  },
  deleteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  deleteModalTitle: {
    color: '#FF4444',
    fontWeight: '700',
  },
  deleteModalDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteModalWarning: {
    marginBottom: 8,
    fontWeight: '600',
  },
  deleteModalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#FF4444',
  },
  deleteModalConfirmButtonDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    opacity: 0.5,
  },
});
