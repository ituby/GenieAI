import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Text, Card, Icon } from '../components';
import { Button } from '../components/primitives/Button';
import { Ionicons } from '@expo/vector-icons';
import { GoalCard } from '../components/domain/GoalCard';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { TaskItem } from '../components/domain/TaskItem';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GoalsService } from '../features/goals/services/goals.service';
import { testDatabaseConnection, createTestUser, createSampleGoals } from '../utils/testConnection';
import { supabase } from '../services/supabase/client';
import { PushTokenService } from '../services/notifications/pushToken.service';
import { NewGoalScreen } from './NewGoalScreen';
import { GoalDetailsScreen } from './GoalDetailsScreen';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { HelpSupportScreen } from './HelpSupportScreen';
import { GoalWithProgress, Reward } from '../types/goal';
import { TaskWithGoal } from '../types/task';

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { activeGoals, loading, fetchGoals, updateGoal, deleteGoal } = useGoalStore();
  const [aiConnected, setAiConnected] = React.useState<boolean | null>(null);
  const [showNewGoal, setShowNewGoal] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<GoalWithProgress | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<TaskWithGoal | null>(null);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showHelpSupport, setShowHelpSupport] = React.useState(false);
  const [recentRewards, setRecentRewards] = React.useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = React.useState(0);
  const [showSideMenu, setShowSideMenu] = React.useState(false);
  const [showGoalMenu, setShowGoalMenu] = React.useState<string | null>(null);
  const [todaysTasksCount, setTodaysTasksCount] = React.useState<number>(0);
  const [todaysTasks, setTodaysTasks] = React.useState<TaskWithGoal[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = React.useState(false);
  const [userTokens, setUserTokens] = React.useState({
    used: 2,
    remaining: 1,
    total: 3,
    isSubscribed: false,
    monthlyTokens: 0,
  });
  
  // Animation for button border
  const borderAnimation = useRef(new Animated.Value(0)).current;
  // Animation for Add Goal button
  const addGoalAnimation = useRef(new Animated.Value(0)).current;
  // Animation for Genie logo
  const genieOpacity = useRef(new Animated.Value(1)).current;

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

  // Start Genie logo animation loop
  useEffect(() => {
    const runAnimationCycle = () => {
      // Fade in
      Animated.timing(genieOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Stay visible for 10 seconds
        setTimeout(() => {
          // Fade out
          Animated.timing(genieOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            // Wait 3 seconds then start next cycle
            setTimeout(runAnimationCycle, 3000);
          });
        }, 10000);
      });
    };
    
    // Start first cycle
    runAnimationCycle();
  }, []);

  const fetchRecentRewards = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select(`
          *,
          goal:goals(id, title, category)
        `)
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
      
      const total = data?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;
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
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { data, error } = await supabase
        .from('goal_tasks')
        .select(`
          id,
          title,
          description,
          run_at,
          completed,
          completed_at,
          goal_id,
          created_at,
          updated_at,
          goals!inner(
            id,
            title,
            category,
            user_id,
            color
          )
        `)
        .eq('goals.user_id', user.id)
        .gte('run_at', startOfDay.toISOString())
        .lt('run_at', endOfDay.toISOString())
        .order('run_at', { ascending: true });

      if (error) throw error;
      
      // Transform data to match TaskWithGoal interface
      const transformedTasks: TaskWithGoal[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        run_at: task.run_at,
        completed: task.completed,
        completed_at: task.completed_at,
        goal_id: task.goal_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        goal: {
          id: (task.goals as any).id,
          title: (task.goals as any).title,
          category: (task.goals as any).category
        }
      }));
      
      setTodaysTasksCount(transformedTasks.length);
      setTodaysTasks(transformedTasks);
      console.log('📅 Today\'s tasks:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
      setTodaysTasksCount(0);
      setTodaysTasks([]);
    }
  };

  const testAIConnection = async () => {
    try {
      const response = await supabase.functions.invoke('generate-plan', {
        body: { test: true }
      });
      setAiConnected(response.error ? false : true);
    } catch (error) {
      console.error('AI connection test failed:', error);
      setAiConnected(false);
    }
  };

  // Removed automatic AI connection test to prevent unnecessary API calls

  const handleRefresh = () => {
    if (user?.id) {
      fetchGoals(user.id);
      fetchTodaysTasks();
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
                // Note: We intentionally do NOT restore tokens when deleting goals
                // This prevents users from gaming the system by creating/deleting goals
              }
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
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
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
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
          await supabase
            .from('user_tokens')
            .insert({
              user_id: user.id,
              tokens_used: 1,
              tokens_remaining: 2,
              total_tokens: 3,
              is_subscribed: false,
            });
        }

        // Update local state
        setUserTokens(prev => ({
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
      alert('You have used all your free plans. Please subscribe to continue creating goals.');
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
          completed_at: markAsCompleted ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      // Update local state
      setTodaysTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, completed: markAsCompleted, completed_at: markAsCompleted ? new Date().toISOString() : undefined }
            : task
        )
      );
      
      // Refresh tasks count
      fetchTodaysTasks();

      // Update rewards after task completion
      if (markAsCompleted) {
        try {
          const { error: rewardError } = await supabase.functions.invoke('update-rewards', {
            body: {
              goal_id: todaysTasks.find(t => t.id === taskId)?.goal_id,
              task_id: taskId,
              task_completed: true
            }
          });

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
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Absolute Header */}
      <View style={styles.absoluteHeader}>
        {/* Blur overlay */}
        <View style={styles.blurOverlay} />
        {/* Additional blur effect */}
        <View style={styles.blurEffect} />
        {/* Extra blur layers */}
        <View style={styles.blurEffect2} />
        <View style={styles.blurEffect3} />
        <View style={styles.headerLeft}>
          <Button variant="ghost" onPress={() => setShowNotifications(true)}>
            <Icon name="bell" size={20} color={theme.colors.text.secondary} />
          </Button>
        </View>
        
        <View style={styles.headerCenter}>
          <Animated.Image 
            source={require('../../assets/LogoSymbol.webp')} 
            style={[
              styles.headerLogo,
              {
                opacity: genieOpacity,
              }
            ]}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerRight}>
          <Button variant="ghost" onPress={() => setShowSideMenu(true)}>
            <Ionicons name="menu" size={20} color={theme.colors.text.secondary} />
          </Button>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.yellow[500]}
          />
        }
      >

        {/* Content Header */}
        <View style={styles.contentHeader}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text variant="h2" style={styles.greeting}>
                {t('dashboard.greeting', { name: getUserName() })}
              </Text>
              <Text variant="body" style={styles.motivationalText}>
                Every step forward is progress
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Rate Card */}
        <View style={styles.sectionCompact}>
          <Card variant="gradient" padding="md" style={styles.usageRateCard}>
            <View style={styles.usageRateHeader}>
              <View style={styles.usageRateTitleContainer}>
                <Icon name="chart-bar" size={20} color="#FFFF68" weight="fill" />
                <Text variant="h4" style={styles.usageRateTitle}>Usage Rate</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.purchaseTokensButton,
                  !userTokens.isSubscribed && styles.purchaseTokensButtonDisabled
                ]}
                disabled={!userTokens.isSubscribed}
                activeOpacity={userTokens.isSubscribed ? 0.8 : 1}
              >
                  <Icon 
                    name="crown" 
                    size={16} 
                    color={userTokens.isSubscribed ? "#FFFF68" : "rgba(255, 255, 104, 0.4)"} 
                    weight="fill" 
                  />
                <Text style={[
                  styles.purchaseTokensText,
                  !userTokens.isSubscribed && styles.purchaseTokensTextDisabled
                ]}>
                  Add Tokens
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.usageRateContent}>
              <View style={styles.usageRateStats}>
                <View style={styles.usageRateStat}>
                  <Text variant="h2" style={styles.usageRateNumber}>{userTokens.used}</Text>
                  <Text variant="caption" color="secondary" style={styles.usageRateLabel}>Used</Text>
                </View>
                <View style={styles.usageRateDivider} />
                <View style={styles.usageRateStat}>
                  <Text variant="h2" style={styles.usageRateNumber}>{userTokens.remaining}</Text>
                  <Text variant="caption" color="secondary" style={styles.usageRateLabel}>Remaining</Text>
                </View>
              </View>
              <View style={styles.usageRateProgress}>
                <View style={styles.usageRateProgressBar}>
                  <View style={[styles.usageRateProgressFill, { width: `${(userTokens.used / userTokens.total) * 100}%` }]} />
                </View>
                <Text variant="caption" color="tertiary" style={styles.usageRateProgressText}>
                  {userTokens.used} of {userTokens.total} {userTokens.isSubscribed ? 'monthly' : 'free'} plans used
                </Text>
              </View>
              {!userTokens.isSubscribed && (
                <View style={styles.subscriptionPrompt}>
                  <Text variant="caption" color="secondary" style={styles.subscriptionText}>
                    {userTokens.remaining === 0 
                      ? 'Upgrade to continue creating goals' 
                      : 'Upgrade for unlimited goals and advanced features'
                    }
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
              <Icon name="target" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
            </View>
            <View style={styles.statProgressContainer}>
              <ProgressRing 
                progress={activeGoals.length > 0 ? (activeGoals.reduce((sum, goal) => sum + goal.completion_percentage, 0) / activeGoals.length) : 0}
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
              {t('dashboard.activeGoals')}
            </Text>
          </Card>

          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="fire" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
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
              <Icon name="clipboard-text" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
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
              <Icon name="trophy" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
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
                <View style={[styles.createGoalIcon, { backgroundColor: theme.colors.yellow[500] + '20' }]}>
                  <Icon 
                    name="target" 
                    size={48} 
                    color={theme.colors.yellow[500]} 
                    weight="fill"
                  />
                </View>
                
                <Text variant="h2" style={styles.createGoalTitle}>
                  Create Your First Goal
                </Text>
                
                <Text variant="body" color="secondary" style={styles.createGoalDescription}>
                  Tell Genie what you want to achieve, and we'll create a personalized 21-day plan with daily tasks, rewards, and smart notifications.
                </Text>
                
                 <Animated.View
                   style={[
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
                         <Icon name="star" size={20} color="#FFFFFF" weight="fill" />
                         <Text style={styles.createGoalButtonText}>Begin Your Transformation</Text>
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
              <LinearGradient
                colors={['#FFFF68', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addGoalButtonGradient}
              >
                <TouchableOpacity
                  onPress={checkTokensAndCreateGoal}
                  activeOpacity={0.8}
                  style={styles.addGoalButton}
                >
                  <View style={styles.addGoalButtonContent}>
                    <Icon name="sparkle" size={16} color="#FFFFFF" weight="fill" />
                    <Text style={styles.addGoalButtonText}>Add Goal</Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        )}

        {/* Today's Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4">Today's Tasks</Text>
            <Button variant="ghost" size="xs">
              View All
            </Button>
          </View>

          {todaysTasksCount === 0 ? (
            <Card variant="gradient" padding="md" style={styles.todayTasksCard}>
              <View style={styles.todayTasksIconContainer}>
                <Icon name="calendar" size={24} color="rgba(255, 255, 255, 0.8)" weight="fill" />
              </View>
              <View style={styles.todayTasksNumberContainer}>
                <Text variant="h2" color="secondary">
                  0
                </Text>
              </View>
              <Text variant="body" color="secondary" style={styles.todayTasksLabel}>
                Tasks Today
              </Text>
              <Text variant="caption" color="tertiary" style={styles.todayTasksDescription}>
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
              <Icon name="trophy" size={20} color={theme.colors.text.secondary} />
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
                <Icon name="check-circle" size={20} color={theme.colors.text.secondary} />
              </Button>
            </View>
            <View style={styles.goalMenuContent}>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => handleEditGoal(showGoalMenu)}
                leftIcon={<Icon name="gear" size={20} color={theme.colors.text.secondary} />}
                style={styles.goalMenuButton}
              >
                Edit Goal
              </Button>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => handleDeleteGoal(showGoalMenu)}
                leftIcon={<Icon name="trash" size={20} color="#FF0000" />}
                style={[styles.goalMenuButton, { backgroundColor: '#FF000010' }]}
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
            <View style={styles.sideMenuHeader}>
              <Text variant="h4">Menu</Text>
              <Button variant="ghost" onPress={() => setShowSideMenu(false)}>
                <Icon name="x" size={20} color="#FFFF68" />
              </Button>
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
              <View style={styles.sideMenuDivider} />
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => {
                  setShowSideMenu(false);
                  signOut();
                }}
                leftIcon={<Icon name="sign-out" size={20} color={theme.colors.status.error} />}
                style={[styles.sideMenuButton, { backgroundColor: theme.colors.status.error + '10' }]}
              >
                <Text style={{ color: theme.colors.status.error }}>Logout</Text>
              </Button>
            </View>
            <View style={styles.sideMenuFooter}>
              <Text style={styles.sideMenuFooterText}>© 2024 GenieAI • Version 1.0.0</Text>
            </View>
          </View>
        </View>
      )}

      {/* Task Details Screen */}
      {selectedTask && (
        <TaskDetailsScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
        />
      )}

      {/* Notifications Screen */}
      {showNotifications && (
        <NotificationsScreen
          onBack={() => setShowNotifications(false)}
        />
      )}

      {/* Profile Screen */}
      {showProfile && (
        <ProfileScreen
          onBack={() => setShowProfile(false)}
        />
      )}

      {/* Settings Screen */}
      {showSettings && (
        <SettingsScreen
          onBack={() => setShowSettings(false)}
        />
      )}

      {/* Help & Support Screen */}
      {showHelpSupport && (
        <HelpSupportScreen
          onBack={() => setShowHelpSupport(false)}
        />
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3" style={styles.modalTitle}>Upgrade to Premium</Text>
              <TouchableOpacity 
                onPress={() => setShowSubscriptionModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Icon name="crown" size={48} color="#FFFF68" weight="fill" />
              </View>
              
              <Text variant="h4" style={styles.modalSubtitle}>
                Unlock Unlimited Goals
              </Text>
              
              <Text variant="body" color="secondary" style={styles.modalDescription}>
                Get unlimited goal creation, advanced AI insights, and priority support with our premium subscription.
              </Text>
              
              <View style={styles.modalFeatures}>
                <View style={styles.modalFeature}>
                  <Icon name="check" size={16} color="#FFFF68" weight="fill" />
                  <Text variant="body" color="secondary" style={styles.modalFeatureText}>
                    Unlimited goal creation
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Icon name="check" size={16} color="#FFFF68" weight="fill" />
                  <Text variant="body" color="secondary" style={styles.modalFeatureText}>
                    Advanced AI insights
                  </Text>
                </View>
                <View style={styles.modalFeature}>
                  <Icon name="check" size={16} color="#FFFF68" weight="fill" />
                  <Text variant="body" color="secondary" style={styles.modalFeatureText}>
                    Priority support
                  </Text>
                </View>
              </View>
              
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
                
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowSubscriptionModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
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
    paddingTop: 80, // Reduced space for absolute header
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
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
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
    padding: 20,
    paddingTop: 10, // Reduced padding above greeting
    paddingBottom: 0,
  },
      headerLogo: {
        width: 48,
        height: 48,
      },
  greetingRow: {
    alignItems: 'center',
  },
  greetingText: {
    alignItems: 'center',
  },
  greeting: {
    marginBottom: 4,
  },
  motivationalText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  statCard: {
    width: 120,
    height: 120,
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
    width: 120,
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
    alignItems: 'center',
  },
  scoreCard: {
    width: 392, // Same width as 3 stat cards (120*3 + 16*2 gaps)
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
  sectionCompact: {
    paddingHorizontal: 20,
    marginBottom: 8,
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
        paddingVertical: 60,
        borderWidth: 1,
        borderColor: '#FFFF68', // Official yellow
        backgroundColor: 'transparent',
      },
      createGoalContent: {
        alignItems: 'center',
        maxWidth: 300,
      },
      createGoalButtonGradient: {
        borderRadius: 12,
        padding: 2,
        width: '100%',
      },
      createGoalButton: {
        borderRadius: 10,
        paddingVertical: 16,
        paddingHorizontal: 20,
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
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
      },
      usageRateCard: {
        marginBottom: 0,
      },
      usageRateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
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
        gap: 16,
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
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      },
      createGoalTitle: {
        textAlign: 'center',
        marginBottom: 16,
      },
      createGoalDescription: {
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
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
        width: '90%',
        alignSelf: 'center',
        marginBottom: 20,
      },
      addGoalButton: {
        borderRadius: 23,
        paddingVertical: 16,
        paddingHorizontal: 12,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  sideMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border with transparency
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
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 4,
  },
  sideMenuFooterText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
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
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
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
    lineHeight: 22,
    marginBottom: 24,
  },
  modalFeatures: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  modalFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalFeatureText: {
    flex: 1,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalSubscribeButton: {
    backgroundColor: '#FFFF68',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubscribeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
});
