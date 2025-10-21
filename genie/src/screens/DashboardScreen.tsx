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
} from 'react-native';
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
import { Text, Card, Icon, Badge, FloatingBottomNav } from '../components';
import { dataLoadingService } from '../services/dataLoadingService';
import { CustomRefreshControl } from '../components/primitives/CustomRefreshControl';
import { Button } from '../components/primitives/Button';
import { TalkWithGenieButton } from '../components/primitives/TalkWithGenieButton';
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
import { PushTokenService } from '../services/notifications/pushToken.service';
import { NewGoalScreen } from './NewGoalScreen';
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
  const {
    activeGoals,
    loading,
    fetchGoals,
    updateGoal,
    deleteGoal,
    refreshGoal,
  } = useGoalStore();
  const { unreadCount, refreshCount } = useNotificationCount();
  const [aiConnected, setAiConnected] = React.useState<boolean | null>(null);
  const [showNewGoal, setShowNewGoal] = React.useState(false);
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
  const [recentRewards, setRecentRewards] = React.useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = React.useState(0);
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
  const [userTokens, setUserTokens] = React.useState({
    used: 0,
    remaining: 0,
    total: 0,
    isSubscribed: false,
    monthlyTokens: 100,
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
              // Auto-open NewGoalScreen to show approval modal
              // NewGoalScreen will handle the restoration, not Dashboard
              setShowNewGoal(true);
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
              // (creating state is handled by NewGoalScreen's restoreProgress)
              setShowNewGoal(true);
            }
          } catch (err) {
            console.error('Error checking for pending goals:', err);
          }
        })();
      }
    };

    initializeDashboard();
  }, [user?.id]);

  // Auto-refresh mechanism for goals that are loading (active but no tasks)
  useEffect(() => {
    if (!user?.id) return;

    const checkForLoadingGoals = async () => {
      const loadingGoals = activeGoals.filter(
        (goal) => goal.status === 'active' && goal.total_tasks === 0
      );

      if (loadingGoals.length > 0) {
        console.log(
          `🔄 Found ${loadingGoals.length} loading goals, refreshing...`
        );

        // Refresh each loading goal
        for (const goal of loadingGoals) {
          await refreshGoal(goal.id);
        }

        // Also refresh today's tasks to show new tasks
        console.log("🔄 Refreshing today's tasks after goal update");
        fetchTodaysTasks();
      }
    };

    // Check immediately
    checkForLoadingGoals();

    // Set up polling every 5 seconds for loading goals
    // This continues until all goals have tasks loaded
    const interval = setInterval(checkForLoadingGoals, 5000);

    return () => clearInterval(interval);
  }, [user?.id, activeGoals, refreshGoal]);

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
        });
      } else {
        // User doesn't have tokens record yet, set defaults
        setUserTokens({
          used: 0,
          remaining: 3,
          total: 3,
          isSubscribed: false,
          monthlyTokens: 100,
        });
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
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
    setShowNewGoal(false);
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
    if (userTokens.remaining <= 0) {
      // Show appropriate modal based on subscription status
      if (userTokens.isSubscribed) {
        setShowTokenPurchaseModal(true);
      } else {
        setShowSubscriptionModal(true);
      }
      return;
    }
    setShowNewGoal(true);
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
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  if (showNewGoal) {
    return (
      <NewGoalScreen
        onGoalCreated={handleGoalCreated}
        onBack={() => setShowNewGoal(false)}
      />
    );
  }

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
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
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
                  !userTokens.isSubscribed &&
                    styles.purchaseTokensButtonDisabled,
                ]}
                disabled={!userTokens.isSubscribed}
                activeOpacity={userTokens.isSubscribed ? 0.8 : 1}
                onPress={() => setShowTokenPurchaseModal(true)}
              >
                <Text
                  style={[
                    styles.purchaseTokensText,
                    !userTokens.isSubscribed &&
                      styles.purchaseTokensTextDisabled,
                  ]}
                >
                  Add Tokens
                </Text>
                <Icon
                  name="coins"
                  size={16}
                  color={
                    userTokens.isSubscribed
                      ? '#FFFF68'
                      : 'rgba(255, 255, 104, 0.4)'
                  }
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

          <View style={styles.greetingButtonContainer}>
            <AnimatedLinearGradient
              colors={
                userTokens.remaining <= 0 && !userTokens.isSubscribed
                  ? ['#FF6B6B', '#FF8E8E', '#FF6B6B']
                  : ['#FFFF68', '#FFFF68', '#FFFF68']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addGoalButtonGradient}
            >
              <TouchableOpacity
                onPress={checkTokensAndCreateGoal}
                activeOpacity={0.8}
                style={[
                  styles.addGoalButton,
                  userTokens.remaining <= 0 &&
                    userTokens.isSubscribed &&
                    styles.addGoalButtonDisabled,
                ]}
              >
                <View style={styles.addGoalButtonContent}>
                  <Text
                    style={[
                      styles.addGoalButtonText,
                      userTokens.remaining <= 0 &&
                        !userTokens.isSubscribed && { color: '#FFFFFF' },
                      userTokens.remaining <= 0 &&
                        userTokens.isSubscribed && { opacity: 0.5 },
                    ]}
                  >
                    {userTokens.remaining <= 0 && !userTokens.isSubscribed
                      ? 'Subscribe now to talk with Genie'
                      : 'Talk with Genie'}
                  </Text>
                  <Icon
                    name={
                      userTokens.remaining <= 0 && !userTokens.isSubscribed
                        ? 'crown'
                        : 'sparkle'
                    }
                    size={16}
                    color={
                      userTokens.remaining <= 0 && !userTokens.isSubscribed
                        ? '#FFFFFF'
                        : userTokens.remaining <= 0 && userTokens.isSubscribed
                          ? 'rgba(255, 255, 104, 0.5)'
                          : '#FFFF68'
                    }
                    weight="fill"
                  />
                </View>
              </TouchableOpacity>
            </AnimatedLinearGradient>
          </View>
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
                          size={16}
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
            <View style={styles.sideMenuGreetingButton}>
              <TalkWithGenieButton
                onPress={() => {
                  closeSideMenu();
                  checkTokensAndCreateGoal();
                }}
                size="medium"
              />
            </View>
            <View style={styles.sideMenuContent}>
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
                © 2024 GenieAI • Version 1.0.0
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

      {/* Token Purchase Modal (native) */}
      {showTokenPurchaseModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Icon name="coins" size={24} color="#FFFF68" weight="fill" />
                <Text variant="h3" style={styles.modalTitle}>
                  Purchase Tokens
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTokenPurchaseModal(false);
                    setCustomTokenAmount('');
                    setCustomTokenPrice(0);
                    setSelectedPackage(null);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Icon
                    name="x"
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Token Packages Section */}
                <View style={styles.tokenPackagesSection}>
                  <Text variant="h4" style={styles.sectionTitle}>
                    Choose Package
                  </Text>
                  <View style={styles.tokenOptions}>
                    <TouchableOpacity
                      style={[
                        styles.tokenOption,
                        selectedPackage === 100 && styles.tokenOptionSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedPackage(100);
                        setCustomTokenAmount('100');
                        setCustomTokenPrice(4.99);
                      }}
                    >
                      <View style={styles.tokenOptionContent}>
                        <View style={styles.tokenOptionLeft}>
                          <Text variant="h4" style={styles.tokenAmount}>
                            100 Tokens
                          </Text>
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.tokenDescription}
                          >
                            ~1 detailed goal
                          </Text>
                        </View>
                        <Text variant="h3" style={styles.tokenPrice}>
                          $4.99
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tokenOption,
                        selectedPackage === 500 && styles.tokenOptionSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedPackage(500);
                        setCustomTokenAmount('500');
                        setCustomTokenPrice(19.99);
                      }}
                    >
                      <View style={styles.popularBadge}>
                        <Text variant="caption" style={styles.popularText}>
                          POPULAR
                        </Text>
                      </View>
                      <View style={styles.tokenOptionContent}>
                        <View style={styles.tokenOptionLeft}>
                          <Text variant="h4" style={styles.tokenAmount}>
                            500 Tokens
                          </Text>
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.tokenDescription}
                          >
                            ~7 detailed goals
                          </Text>
                        </View>
                        <Text variant="h3" style={styles.tokenPrice}>
                          $19.99
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tokenOption,
                        selectedPackage === 1000 && styles.tokenOptionSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedPackage(1000);
                        setCustomTokenAmount('1000');
                        setCustomTokenPrice(34.99);
                      }}
                    >
                      <View style={styles.tokenOptionContent}>
                        <View style={styles.tokenOptionLeft}>
                          <Text variant="h4" style={styles.tokenAmount}>
                            1000 Tokens
                          </Text>
                          <Text
                            variant="caption"
                            color="secondary"
                            style={styles.tokenDescription}
                          >
                            ~14 detailed goals • Best value
                          </Text>
                        </View>
                        <Text variant="h3" style={styles.tokenPrice}>
                          $34.99
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Custom Token Amount Input */}
                <View style={styles.customTokenSection}>
                  <Text variant="h4" style={styles.sectionTitle}>
                    Custom Amount
                  </Text>
                  <View style={styles.customTokenInputContainer}>
                    <TextInput
                      style={styles.customTokenInput}
                      value={customTokenAmount}
                      onChangeText={handleCustomTokenChange}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.customTokenLabel}
                    >
                      tokens
                    </Text>
                  </View>
                  {customTokenPrice > 0 && (
                    <View style={styles.customTokenPriceContainer}>
                      <Text variant="h3" style={styles.customTokenPrice}>
                        ${customTokenPrice.toFixed(2)}
                      </Text>
                      <Text
                        variant="caption"
                        color="secondary"
                        style={styles.customTokenPriceLabel}
                      >
                        Total Price
                      </Text>
                    </View>
                  )}
                </View>

                {/* Purchase Button Section */}
                <View style={styles.purchaseSection}>
                  <TouchableOpacity
                    style={styles.purchaseButton}
                    activeOpacity={0.8}
                    onPress={() => {
                      // TODO: Implement purchase logic
                      setShowTokenPurchaseModal(false);
                      alert('Purchase feature coming soon!');
                    }}
                  >
                    <Icon
                      name="credit-card"
                      size={20}
                      color="#000000"
                      weight="fill"
                    />
                    <Text variant="h4" style={styles.purchaseButtonText}>
                      Complete Purchase
                    </Text>
                  </TouchableOpacity>

                  {/* Description */}
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.purchaseDescription}
                  >
                    1 token = 1 task • ~70 tokens per goal • Non-refundable
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
                  Unlock the full potential of Genie with unlimited goals,
                  advanced AI features, premium rewards, and exclusive benefits.
                </Text>

                <View style={styles.modalFeatures}>
                  <View style={styles.modalFeature}>
                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.modalFeatureText}
                    >
                      Unlimited goal creation
                    </Text>
                    <Icon
                      name="arrows-clockwise"
                      size={16}
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
                      Advanced AI insights & analytics
                    </Text>
                    <Icon
                      name="brain"
                      size={16}
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
                      Update plan feature
                    </Text>
                    <Icon
                      name="arrow-clockwise"
                      size={16}
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
                      Premium rewards & achievements
                    </Text>
                    <Icon
                      name="trophy"
                      size={16}
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
                      Priority customer support
                    </Text>
                    <Icon
                      name="headset"
                      size={16}
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
                      Early access to new features
                    </Text>
                    <Icon
                      name="sparkle"
                      size={16}
                      color="#FFFF68"
                      weight="fill"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSubscribeButton}
                onPress={() => {
                  // TODO: Implement subscription logic
                  setShowSubscriptionModal(false);
                  alert('Subscription feature coming soon!');
                }}
              >
                <Text style={styles.modalSubscribeButtonText}>
                  Subscribe Now - $9.99/month
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
        onCreatePress={checkTokensAndCreateGoal}
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
    backgroundColor: 'rgba(26, 28, 36, 0.8)', // Dark blue instead of black, matching background color
    minHeight: 110, // Increased minimum height
    overflow: 'hidden',
  },
  dashboardSloganCard: {
    marginBottom: 16,
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
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalActions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
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
