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
} from 'react-native';
// i18n removed
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import {
  Svg,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Text, Card, Icon, Badge } from '../components';
import { CustomRefreshControl } from '../components/primitives/CustomRefreshControl';
import { Button } from '../components/primitives/Button';
import { TalkWithGenieButton } from '../components/primitives/TalkWithGenieButton';
import { Ionicons } from '@expo/vector-icons';
import { GoalCard } from '../components/domain/GoalCard';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { TaskItem } from '../components/domain/TaskItem';
import { useTheme } from '../theme/index';
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
import { GoalWithProgress, Reward } from '../types/goal';
import { TaskWithGoal } from '../types/task';
import { useNotificationCount } from '../hooks/useNotificationCount';

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
  const { activeGoals, loading, fetchGoals, updateGoal, deleteGoal } =
    useGoalStore();
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
  const [recentRewards, setRecentRewards] = React.useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = React.useState(0);
  const [showSideMenu, setShowSideMenu] = React.useState(false);
  const [showGoalMenu, setShowGoalMenu] = React.useState<string | null>(null);
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
    monthlyTokens: 0,
  });
  const [showRefreshLoader, setShowRefreshLoader] = React.useState(false);
  const [refreshBreathingAnimation] = useState(new Animated.Value(1));

  // Animation for button border
  const borderAnimation = useRef(new Animated.Value(0)).current;
  // Animation for Add Goal button
  const addGoalAnimation = useRef(new Animated.Value(0)).current;
  // Animation for gradient movement
  const gradientAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      fetchGoals(user.id);
      fetchRecentRewards();
      fetchTodaysTasks();
      fetchTotalPoints();
      fetchUserTokens();

      // Setup push notifications
      PushTokenService.setupPushNotifications(user.id);
    }
  }, [user?.id]);

  // Breathing animation for refresh loader
  useEffect(() => {
    if (showRefreshLoader) {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(refreshBreathingAnimation, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(refreshBreathingAnimation, {
            toValue: 0.9,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      breathing.start();
      return () => breathing.stop();
    }
  }, [showRefreshLoader, refreshBreathingAnimation]);

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
          monthlyTokens: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
  };

  const fetchTodaysTasks = async () => {
    if (!user?.id) return;

    try {
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
            color
          )
        `
        )
        .eq('goals.user_id', user.id)
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

      setTodaysTasksCount(transformedTasks.length);
      setTodaysTasks(transformedTasks);
      console.log("📅 Today's tasks:", data?.length || 0);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
      setTodaysTasksCount(0);
      setTodaysTasks([]);
    }
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

    if (user?.id) {
      fetchGoals(user.id);
      fetchTodaysTasks();
      fetchUserTokens(); // Add this to refresh tokens data
      fetchTotalPoints(); // Add this to refresh points data
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

  const handleDeleteGoal = async (goalId: string) => {
    setShowGoalMenu(null);

    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone. Note: You will not get your token back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goalId);
              if (user?.id) {
                fetchGoals(user.id);
                fetchTodaysTasks();
                // Refresh total points immediately after deleting goal
                fetchTotalPoints();
                // Note: We intentionally do NOT restore tokens when deleting goals
                // This prevents users from gaming the system by creating/deleting goals
              }
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
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

    // Update tokens in database after creating a goal
    if (user?.id) {
      try {
        // Check if user has tokens record
        const { data: existingTokens } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingTokens) {
          // Update existing record
          await supabase
            .from('user_tokens')
            .update({
              tokens_used: existingTokens.tokens_used + 1,
              tokens_remaining: existingTokens.tokens_remaining - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          // Create new record
          await supabase.from('user_tokens').insert({
            user_id: user.id,
            tokens_used: 1,
            tokens_remaining: 2,
            total_tokens: 3,
            is_subscribed: false,
          });
        }

        // Update local state
        setUserTokens((prev) => ({
          ...prev,
          used: prev.used + 1,
          remaining: prev.remaining - 1,
        }));

        fetchGoals(user.id);
        fetchTodaysTasks();
        fetchTotalPoints();
      } catch (error) {
        console.error('Error updating tokens:', error);
      }
    }
  };

  const checkTokensAndCreateGoal = () => {
    if (userTokens.remaining <= 0) {
      // Show subscription modal or upgrade prompt
      alert(
        'You have used all your free plans. Please subscribe to continue creating goals.'
      );
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
          <Image
            source={require('../../assets/LogoType.webp')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          <Button variant="ghost" onPress={() => setShowSideMenu(true)}>
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
          {/* Dashboard Slogan */}
          <View style={styles.dashboardSloganContainer}>
            <Text variant="body" style={styles.dashboardSloganText}>
              Tell me what you're wishing for
            </Text>
          </View>

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
                <Icon
                  name="crown"
                  size={16}
                  color={
                    userTokens.isSubscribed
                      ? '#FFFF68'
                      : 'rgba(255, 255, 104, 0.4)'
                  }
                  weight="fill"
                />
                <Text
                  style={[
                    styles.purchaseTokensText,
                    !userTokens.isSubscribed &&
                      styles.purchaseTokensTextDisabled,
                  ]}
                >
                  Add Tokens
                </Text>
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
                    {userTokens.isSubscribed
                      ? userTokens.monthlyTokens - userTokens.used
                      : userTokens.remaining}
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
                        width: `${(userTokens.used / (userTokens.isSubscribed ? userTokens.monthlyTokens : userTokens.total)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={styles.usageRateProgressText}
                >
                  {userTokens.isSubscribed
                    ? `Used ${userTokens.used} / ${userTokens.monthlyTokens} monthly tokens`
                    : `${userTokens.used} of ${userTokens.total} free plans used`}
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
            <TalkWithGenieButton
              onPress={checkTokensAndCreateGoal}
              size="medium"
            />
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
              Active Goals
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
              Today's Tasks
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
                <View
                  style={[
                    styles.createGoalIcon,
                    { backgroundColor: theme.colors.yellow[500] + '20' },
                  ]}
                >
                  <Icon
                    name="target"
                    size={24}
                    color={theme.colors.yellow[500]}
                    weight="fill"
                  />
                </View>

                <Text variant="h3" style={styles.createGoalTitle}>
                  Genie
                </Text>

                <Text
                  variant="body"
                  color="secondary"
                  style={styles.createGoalDescription}
                >
                  Tell me what you're wishing for, and I'll create a
                  personalized 21-day plan with daily tasks, rewards, and smart
                  notifications.
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
                    colors={['#FFFF68', '#FFFFFF']}
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
                        <Icon
                          name="sparkle"
                          size={16}
                          color="#FFFFFF"
                          weight="fill"
                        />
                        <Text style={styles.createGoalButtonText}>
                          Talk with Genie
                        </Text>
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
            <View style={styles.sectionHeader}>
              <Text variant="h4">Active Goals</Text>
              <Button variant="ghost" size="xs">
                View All
              </Button>
            </View>

            <View style={styles.goalsList}>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={() => setSelectedGoal(goal)}
                  onEdit={() => setShowGoalMenu(goal.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Add Goal Button - Only show if there are goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Animated.View
              style={[
                {
                  transform: [
                    {
                      scale: addGoalAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.02, 1],
                      }),
                    },
                  ],
                  opacity: addGoalAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.9, 1, 0.9],
                  }),
                },
              ]}
            >
              <AnimatedLinearGradient
                colors={
                  userTokens.remaining <= 0
                    ? ['#FF6B6B', '#FF8E8E', '#FF6B6B']
                    : ['#FFFF68', '#FFFFFF', '#FFFF68']
                }
                start={{
                  x: gradientAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  y: 0,
                }}
                end={{
                  x: gradientAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  y: 1,
                }}
                style={styles.addGoalButtonGradient}
              >
                <TouchableOpacity
                  onPress={
                    userTokens.remaining <= 0
                      ? () => setShowSubscriptionModal(true)
                      : checkTokensAndCreateGoal
                  }
                  activeOpacity={0.8}
                  style={styles.addGoalButton}
                >
                  <View style={styles.addGoalButtonContent}>
                    <Icon
                      name={userTokens.remaining <= 0 ? 'crown' : 'sparkle'}
                      size={16}
                      color={userTokens.remaining <= 0 ? '#FFFFFF' : '#FFFF68'}
                      weight="fill"
                    />
                    <Text
                      style={[
                        styles.addGoalButtonText,
                        userTokens.remaining <= 0 && { color: '#FFFFFF' },
                      ]}
                    >
                      {userTokens.remaining <= 0
                        ? 'Subscribe now to talk with Genie'
                        : 'Talk with Genie'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </AnimatedLinearGradient>
            </Animated.View>
          </View>
        )}

        {/* Today's Tasks Section */}
        <View style={[styles.section, styles.todayTasksSection]}>
          <View style={styles.sectionHeader}>
            <Text variant="h4">Today's Tasks</Text>
            <Button variant="ghost" size="xs">
              View All
            </Button>
          </View>

          {todaysTasksCount === 0 ? (
            <Card variant="gradient" padding="md" style={styles.todayTasksCard}>
              <View style={styles.todayTasksIconContainer}>
                <Icon
                  name="calendar"
                  size={24}
                  color="rgba(255, 255, 255, 0.8)"
                  weight="fill"
                />
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
            <View style={styles.todayTasksList}>
              {todaysTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  allTasks={todaysTasks}
                  onComplete={() => handleToggleTask(task.id, true)}
                  onIncomplete={() => handleToggleTask(task.id, false)}
                  onPress={() => {
                    // Navigate to task details
                    setSelectedTask(task);
                  }}
                />
              ))}
            </View>
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
                onPress={() => handleEditGoal(showGoalMenu)}
                leftIcon={
                  <Icon
                    name="gear"
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                }
                style={styles.goalMenuButton}
              >
                Edit Goal
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => handleDeleteGoal(showGoalMenu)}
                leftIcon={<Icon name="trash" size={20} color="#FF0000" />}
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
        <View style={styles.sideMenuOverlay}>
          <TouchableOpacity
            style={styles.sideMenuOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowSideMenu(false)}
          />
          <View style={styles.sideMenuShadow} />
          <View style={styles.sideMenu}>
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
                onPress={() => setShowSideMenu(false)}
                style={styles.sideMenuCloseButton}
              >
                <Icon name="x" size={20} color="#FFFF68" />
              </Button>
            </View>

            {/* Greeting Text */}
            <View style={styles.sideMenuGreetingSection}>
              <Text variant="h4" style={styles.sideMenuGreetingTitle}>
                Hello, {getUserName()}
              </Text>
              <Text variant="body" style={styles.sideMenuGreetingSubtitle}>
                Tell me what you're wishing for
              </Text>
            </View>

            <View style={styles.sideMenuHeader}>
              {/* Header content can go here if needed */}
            </View>
            <View style={styles.sideMenuGreetingButton}>
              <TalkWithGenieButton
                onPress={() => {
                  setShowSideMenu(false);
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
                  setShowSideMenu(false);
                  setShowProfile(true);
                }}
                leftIcon={<Icon name="user" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  setShowSideMenu(false);
                  setShowSettings(true);
                }}
                leftIcon={<Icon name="gear" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  setShowSideMenu(false);
                  setShowHelpSupport(true);
                }}
                leftIcon={<Icon name="question" size={20} color="#FFFF68" />}
                style={styles.sideMenuButton}
              >
                Help & Support
              </Button>
              {userTokens.isSubscribed && (
                <Button
                  variant="ghost"
                  fullWidth
                  onPress={() => {
                    setShowSideMenu(false);
                    setShowSubscription(true);
                  }}
                  leftIcon={<Icon name="crown" size={20} color="#FFFF68" />}
                  style={styles.sideMenuButton}
                >
                  My Subscription
                </Button>
              )}
              <View style={styles.sideMenuDivider} />
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  setShowSideMenu(false);
                  signOut();
                }}
                leftIcon={
                  <Icon
                    name="sign-out"
                    size={20}
                    color={theme.colors.status.error}
                  />
                }
                style={[
                  styles.sideMenuButton,
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
          </View>
        </View>
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
        <SubscriptionScreen onBack={() => setShowSubscription(false)} />
      )}

      {/* Token Purchase Modal */}
      {showTokenPurchaseModal && (
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
                <Icon name="x" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text variant="h4" style={styles.predefinedOptionsTitle}>
                  Predefined Packages
                </Text>

                <View style={styles.tokenOptions}>
                  <TouchableOpacity
                    style={[
                      styles.tokenOption,
                      selectedPackage === 5 && styles.tokenOptionSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedPackage(5);
                      setCustomTokenAmount('5');
                      setCustomTokenPrice(5.0);
                    }}
                  >
                    <View style={styles.tokenOptionHeader}>
                      <Text variant="h4" style={styles.tokenAmount}>
                        5 Tokens
                      </Text>
                      <Text variant="h3" style={styles.tokenPrice}>
                        $5.00
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.tokenDescription}
                    >
                      Perfect for trying out premium features
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tokenOption,
                      selectedPackage === 10 && styles.tokenOptionSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedPackage(10);
                      setCustomTokenAmount('10');
                      setCustomTokenPrice(8.5);
                    }}
                  >
                    <View style={styles.popularBadge}>
                      <Text variant="caption" style={styles.popularText}>
                        POPULAR
                      </Text>
                    </View>
                    <View style={styles.tokenOptionHeader}>
                      <Text variant="h4" style={styles.tokenAmount}>
                        10 Tokens
                      </Text>
                      <Text variant="h3" style={styles.tokenPrice}>
                        $8.50
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.tokenDescription}
                    >
                      Best value for regular users
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tokenOption,
                      selectedPackage === 25 && styles.tokenOptionSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedPackage(25);
                      setCustomTokenAmount('25');
                      setCustomTokenPrice(20.0);
                    }}
                  >
                    <View style={styles.tokenOptionHeader}>
                      <Text variant="h4" style={styles.tokenAmount}>
                        25 Tokens
                      </Text>
                      <Text variant="h3" style={styles.tokenPrice}>
                        $20.00
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.tokenDescription}
                    >
                      Great for power users
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Token Amount Input */}
                <View style={styles.customTokenSection}>
                  <Text variant="h4" style={styles.customTokenTitle}>
                    Custom Amount
                  </Text>
                  <View style={styles.customTokenInputContainer}>
                    <TextInput
                      style={styles.customTokenInput}
                      value={customTokenAmount}
                      onChangeText={handleCustomTokenChange}
                      placeholder="Enter amount (1-100)"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="numeric"
                      maxLength={3}
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

                {/* Purchase Button */}
                <View style={styles.purchaseButtonContainer}>
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
                </View>

                {/* Description */}
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.modalDescription}
                >
                  Each token allows you to create one goal. Tokens are consumed
                  when you create a new goal and cannot be refunded.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
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
                      name="infinity"
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Top safe area padding
  },
  scrollView: {
    flex: 1,
    paddingTop: 80, // Reduced space for header
  },
  scrollContent: {
    paddingBottom: 20,
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
    paddingBottom: 0, // Removed padding below header
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // More opaque background
  },
  dashboardSloganContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 16, // Added padding below slogan
    marginBottom: 8,
  },
  dashboardSloganText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
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
    padding: 16,
    paddingTop: 8, // Further reduced padding above
    paddingBottom: 12, // Reduced padding below
  },
  headerLogo: {
    width: 64,
    height: 64,
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
    marginBottom: 8,
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
    paddingVertical: 16,
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
  todayTasksIconContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
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
    marginTop: 0,
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
    gap: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  todayTasksSection: {
    paddingTop: 24,
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
    gap: 12,
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
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#FFFF68', // Official yellow
    backgroundColor: 'transparent',
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  purchaseTokensText: {
    color: '#FFFF68',
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseTokensButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 104, 0.05)',
    borderColor: 'rgba(255, 255, 104, 0.1)',
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
  createGoalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker overlay
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
    backgroundColor: '#FFFF68', // Yellow divider
    zIndex: 2002,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Subtle black with transparency
    paddingTop: 100, // Safe area padding
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#FFFF68', // Yellow border
    zIndex: 2003,
  },
  sideMenuProfileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
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
    paddingBottom: 20,
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
  sideMenuGreetingSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'left',
  },
  sideMenuCloseButton: {
    // No special positioning needed
  },
  sideMenuGreetingButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sideMenuContent: {
    gap: 8,
  },
  sideMenuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
    padding: 20,
    paddingBottom: 16,
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
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalActions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
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
  tokenOptions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  tokenOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    maxWidth: '30%',
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
    backgroundColor: 'rgba(255, 255, 104, 0.12)',
    shadowColor: '#FFFF68',
    shadowOpacity: 0.2,
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    left: '50%',
    transform: [{ translateX: -18 }],
    backgroundColor: '#FFFF68',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  popularText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tokenOptionHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  tokenAmount: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 2,
  },
  tokenPrice: {
    color: '#FFFF68',
    fontWeight: '800',
    fontSize: 13,
  },
  tokenDescription: {
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  // Custom Token Input Styles
  customTokenSection: {
    width: '100%',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customTokenTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  customTokenInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customTokenInput: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 100,
    borderWidth: 0,
    flex: 1,
  },
  customTokenLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  customTokenPriceContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  customTokenPrice: {
    color: '#FFFF68',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 2,
  },
  customTokenPriceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  predefinedOptionsTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  // Purchase Button Styles
  purchaseButtonContainer: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  purchaseButton: {
    backgroundColor: '#FFFF68',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  purchaseButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 16,
  },
});
