import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// i18n removed
import { Button, Text, Card, Icon } from '../components';
import { CustomRefreshControl } from '../components/primitives/CustomRefreshControl';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '../components/domain/TaskItem';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { useTheme } from '../theme/index';
import { GoalWithProgress, Reward } from '../types/goal';
import { TaskWithGoal, DailyTasks } from '../types/task';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { getCategoryColor, getCategoryIcon } from '../config/categoryConfig';

interface GoalDetailsScreenProps {
  goal: GoalWithProgress;
  onBack?: () => void;
  onGoalUpdate?: (updatedGoal: GoalWithProgress) => void;
}

export const GoalDetailsScreen: React.FC<GoalDetailsScreenProps> = ({
  goal,
  onBack,
  onGoalUpdate,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskWithGoal[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTasks[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshLoader, setShowRefreshLoader] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithGoal | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [currentGoal, setCurrentGoal] = useState<GoalWithProgress>(goal);
  const [visibleTaskCount, setVisibleTaskCount] = useState<number>(6);
  const [refreshBreathingAnimation] = useState(new Animated.Value(1));
  const [isRetryingTaskGeneration, setIsRetryingTaskGeneration] = useState(false);
  const [goalCreatedAt] = useState(new Date(goal.created_at));

  const handleRefresh = async () => {
    setShowRefreshLoader(true);

    try {
      await Promise.all([
        fetchTasks(),
        fetchRewards(),
        fetchPointsEarned(),
        fetchUpdatedGoal(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }

    // Hide loader after 3 seconds
    setTimeout(() => {
      setShowRefreshLoader(false);
    }, 3000);
  };

  const fetchPointsEarned = async () => {
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .eq('goal_id', goal.id)
          .single();

        setPointsEarned(data?.points || 0);
      } catch (error) {
        console.log('Points fetch failed:', error);
        setPointsEarned(0);
      }
    }
  };

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

  const fetchUpdatedGoal = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('goals')
          .select(
            `
            *,
            goal_tasks (
              id,
              completed
            )
          `
          )
          .eq('id', goal.id)
          .single();

        if (error) throw error;

        const totalTasks = data.goal_tasks?.length || 0;
        const completedTasks =
          data.goal_tasks?.filter((task: any) => task.completed).length || 0;
        const completionPercentage =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const updatedGoal: GoalWithProgress = {
          ...data,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_percentage: completionPercentage,
          current_streak: data.current_streak || 0,
        };

        setCurrentGoal(updatedGoal);
        onGoalUpdate?.(updatedGoal);
      } catch (error) {
        console.error('Error fetching updated goal:', error);
      }
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchRewards();
    checkSubscription();
    fetchPointsEarned();
  }, [goal.id]);

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

  const organizeTasksByDay = (tasks: TaskWithGoal[]): DailyTasks[] => {
    const tasksByDate = new Map<string, TaskWithGoal[]>();

    tasks.forEach((task) => {
      const taskDate = new Date(task.run_at);
      const dateKey = taskDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey)!.push(task);
    });

    // Convert to array and sort by date
    const dailyTasksArray: DailyTasks[] = Array.from(tasksByDate.entries())
      .map(([date, tasks]) => {
        const completedCount = tasks.filter((task) => task.completed).length;
        return {
          date,
          tasks: tasks.sort(
            (a, b) =>
              new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
          ),
          completed_count: completedCount,
          total_count: tasks.length,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return dailyTasksArray;
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goal_tasks')
        .select(
          `
          *,
          goal:goals(id, title, category, color)
        `
        )
        .eq('goal_id', goal.id)
        .order('run_at', { ascending: true });

      if (error) throw error;
      const tasksData = data || [];
      setTasks(tasksData);
      setDailyTasks(organizeTasksByDay(tasksData));

      // Initialize how many tasks to show: at least 6, or up to current + 2
      const ordered = [...tasksData].sort(
        (a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
      );
      const firstIncompleteIndex = ordered.findIndex((t) => !t.completed);
      const targetCount =
        firstIncompleteIndex === -1
          ? ordered.length
          : Math.max(6, Math.min(ordered.length, firstIncompleteIndex + 2));
      setVisibleTaskCount(targetCount);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('goal_id', goal.id)
        .order('day_offset', { ascending: true, nullsFirst: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      // Don't show alert for rewards, as they're not critical
    }
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
      const updatedTasks = tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: markAsCompleted,
              completed_at: markAsCompleted
                ? new Date().toISOString()
                : undefined,
            }
          : task
      );
      setTasks(updatedTasks);
      setDailyTasks(organizeTasksByDay(updatedTasks));

      // Update points system
      try {
        const action = markAsCompleted ? 'complete' : 'incomplete';
        await supabase.functions.invoke('update-points', {
          body: {
            goal_id: goal.id,
            task_id: taskId,
            user_id: user?.id,
            action: action,
          },
        });

        // Refresh points display and goal data
        fetchPointsEarned();
        fetchUpdatedGoal();
      } catch (pointsError) {
        console.error('Error updating points:', pointsError);
        // Don't fail the task update if points update fails
      }

      // Check for unlocked rewards after task completion
      if (markAsCompleted) {
        checkUnlockedRewards();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Unable to update task');
    }
  };

  const handleTaskExpire = async (taskId: string) => {
    try {
      // Update points system for expired task
      await supabase.functions.invoke('update-points', {
        body: {
          goal_id: goal.id,
          task_id: taskId,
          action: 'expire',
        },
      });
    } catch (pointsError) {
      console.error('Error updating points for expired task:', pointsError);
      // Don't show alert, just log the error
    }
  };

  // Get category-based color and icon
  const categoryColor = getCategoryColor(currentGoal.category);
  const categoryIcon = getCategoryIcon(currentGoal.category);

  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  // Compute visible tasks (flattened -> grouped by day)
  const getVisibleDailyTasks = (): DailyTasks[] => {
    const ordered = [...tasks].sort(
      (a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
    );
    const limited = ordered.slice(0, visibleTaskCount);
    return organizeTasksByDay(limited);
  };

  // As the user progresses (completes tasks), automatically extend to current + 2
  useEffect(() => {
    if (tasks.length === 0) return;
    const ordered = [...tasks].sort(
      (a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
    );
    const firstIncompleteIndex = ordered.findIndex((t) => !t.completed);
    const desired =
      firstIncompleteIndex === -1
        ? ordered.length
        : Math.max(6, Math.min(ordered.length, firstIncompleteIndex + 2));
    if (desired > visibleTaskCount) setVisibleTaskCount(desired);
  }, [tasks]);

  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Function to format title into up to 4 lines
  // Lines 1-3 are limited to 4 words each; the 4th line contains the remainder
  const formatTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    const line1 = words.slice(0, 4).join(' ');
    const line2 = words.slice(4, 8).join(' ');
    const line3 = words.slice(8, 12).join(' ');
    const line4 = words.slice(12).join(' ');
    return [line1, line2, line3, line4].filter(Boolean).join('\n');
  };

  // Function to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return 'Today';
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Function to get day number from first task date
  const getDayNumber = (dateString: string) => {
    if (dailyTasks.length === 0) return 1;

    const taskDate = new Date(dateString);
    const firstTaskDate = new Date(dailyTasks[0].date);
    const diffTime = taskDate.getTime() - firstTaskDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const checkUnlockedRewards = async () => {
    try {
      // Call the update-rewards Edge Function
      const { data, error } = await supabase.functions.invoke(
        'update-rewards',
        {
          body: {
            goal_id: goal.id,
          },
        }
      );

      if (error) {
        console.error('Error updating rewards:', error);
        return;
      }

      if (data?.success) {
        // Always refresh rewards to show updated status
        await fetchRewards();

        // Show celebration for newly unlocked rewards
        if (data.updated_rewards > 0) {
          const newlyUnlockedRewards = rewards.filter((r) => !r.unlocked);
          if (newlyUnlockedRewards.length > 0) {
            const latestReward =
              newlyUnlockedRewards[newlyUnlockedRewards.length - 1];
            Alert.alert('🎉 Reward Unlocked!', latestReward.title);
          }
        }
      }
    } catch (error) {
      console.error('Error checking unlocked rewards:', error);
    }
  };

  const handleRetryTaskGeneration = async () => {
    if (!user?.id) return;

    setIsRetryingTaskGeneration(true);
    setLoading(true); // Show loading indicator
    
    try {
      console.log('🔄 Retrying task generation for goal:', goal.id);
      
      // First, reset goal status to 'active' to restart polling
      await supabase
        .from('goals')
        .update({
          status: 'active',
          error_message: null,
        })
        .eq('id', goal.id);
      
      console.log('✅ Goal status reset to active');
      
      // Get device timezone and current time
      const deviceNow = new Date();
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      console.log('📍 Retry with timezone:', deviceTimezone);

      // Call generate-tasks function with timeout handling
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 120000) // 2 minute timeout
      );

      const generatePromise = supabase.functions.invoke('generate-tasks', {
        body: {
          user_id: user.id,
          goal_id: goal.id,
          device_now_iso: deviceNow.toISOString(),
          device_timezone: deviceTimezone,
          device_utc_offset_minutes: -deviceNow.getTimezoneOffset(), // Timezone offset for correct time calculation
          week_number: 1, // Start with week 1
        },
      });

      const result = await Promise.race([generatePromise, timeoutPromise]) as any;

      // Check if it timed out (expected for long-running task generation)
      const isTimeout = result instanceof Error && result.message === 'timeout';

      if (!isTimeout && result.error) {
        console.error('Error retrying task generation:', result.error);
        Alert.alert(
          'Generation Error',
          'Failed to generate tasks. Please check your connection and try again.'
        );
        setLoading(false);
        return;
      }

      console.log('✅ Task generation request sent successfully');
      
      // Poll for tasks with exponential backoff
      let attempts = 0;
      const maxAttempts = 20; // Poll for up to 2 minutes
      
      const pollForTasks = async (): Promise<boolean> => {
        attempts++;
        console.log(`📊 Polling for tasks, attempt ${attempts}/${maxAttempts}`);
        
        const { data: tasksData } = await supabase
          .from('goal_tasks')
          .select('id')
          .eq('goal_id', goal.id);

        const taskCount = tasksData?.length || 0;
        
        if (taskCount > 0) {
          console.log(`✅ Found ${taskCount} tasks!`);
          return true;
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⏰ Max polling attempts reached');
          return false;
        }
        
        // Wait before next attempt (exponential backoff: 2s, 4s, 6s, 8s...)
        await new Promise(resolve => setTimeout(resolve, Math.min(2000 * attempts, 10000)));
        return pollForTasks();
      };

      const tasksFound = await pollForTasks();
      
      // Refresh UI
      await Promise.all([
        fetchTasks(),
        fetchUpdatedGoal(),
        fetchRewards(),
      ]);

      if (tasksFound) {
        Alert.alert(
          'Success! 🎉',
          'Your personalized plan is ready. Tasks have been created based on your preferences.'
        );
      } else {
        Alert.alert(
          'Still Processing',
          'Tasks are being generated in the background. Please refresh in a moment.'
        );
      }

    } catch (error) {
      console.error('Error in retry task generation:', error);
      
      // Even on error, try to refresh to see if tasks were created
      try {
        await fetchTasks();
        await fetchUpdatedGoal();
      } catch (refreshError) {
        console.error('Error refreshing after retry failure:', refreshError);
      }
      
      Alert.alert(
        'Request Sent',
        'Your request was sent. Tasks may take a moment to appear. Please refresh if needed.'
      );
    } finally {
      setIsRetryingTaskGeneration(false);
      setLoading(false);
    }
  };

  // Check if goal was created more than 1 minute ago
  const isGoalOlderThanOneMinute = () => {
    const now = new Date();
    const diffMs = now.getTime() - goalCreatedAt.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    return diffMinutes >= 1;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          Goal Details
        </Text>
        <View style={styles.pointsContainer}>
          <Icon
            name="trophy"
            size={16}
            color={theme.colors.yellow[500]}
            weight="fill"
          />
          <Text style={styles.pointsText}>+{pointsEarned}</Text>
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
        {/* Goal Info Card */}
        <View style={styles.content}>
          <Card variant="gradient" padding="lg" style={styles.goalInfoCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: categoryColor + '20' },
                  ]}
                >
                  <Icon
                    name={categoryIcon as any}
                    size={24}
                    color={categoryColor}
                  />
                </View>
                <View>
                  <Text variant="h4" style={styles.goalTitle} numberOfLines={4}>
                    {formatTitle(currentGoal.title)}
                  </Text>
                  <Text
                    variant="caption"
                    style={[
                      styles.categoryText,
                      { color: categoryColor },
                    ]}
                  >
                    {currentGoal.category.toUpperCase()}
                  </Text>
                </View>
              </View>

              <ProgressRing
                progress={progressPercentage}
                size={60}
                strokeWidth={4}
              />
            </View>

            <Text
              variant="body"
              color="secondary"
              style={styles.goalDescription}
            >
              {currentGoal.description}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="h4" color="success">
                  {completedTasks}
                </Text>
                <Text variant="caption" color="tertiary">
                  Completed
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text variant="h4" color="secondary">
                  {totalTasks - completedTasks}
                </Text>
                <Text variant="caption" color="tertiary">
                  Remaining
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text variant="h4" color="primary-color">
                  {currentGoal.current_streak}
                </Text>
                <Text variant="caption" color="tertiary">
                  Day Streak
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Tasks Section */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Tasks ({totalTasks})</Text>
            {goal.completion_percentage >= 70 && (
              <LinearGradient
                colors={['#FFFF68', '#FFFFFF']}
                style={styles.updatePlanGradientBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (!isSubscribed) {
                      Alert.alert(
                        'Premium Feature',
                        'Extend Plan is available for premium subscribers only. Upgrade to unlock this feature.',
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

                    Alert.alert(
                      'Extend Plan',
                      'Genie will extend your plan based on your progress. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Extend',
                          onPress: () => {
                            // TODO: Implement plan extension logic
                            console.log('Extending plan for goal:', goal.id);
                          },
                        },
                      ]
                    );
                  }}
                  style={[
                    styles.updatePlanButton,
                    !isSubscribed && styles.updatePlanButtonDisabled,
                  ]}
                >
                  <Icon name="crown" size={16} color="#FFFF68" />
                  <Text style={styles.updatePlanText}>Extend Plan</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFF68" />
              <Text variant="body" color="secondary" style={styles.loadingText}>
                Loading tasks...
              </Text>
            </View>
          ) : dailyTasks.length === 0 ? (
            <Card variant="default" padding="lg" style={styles.emptyState}>
              <Text variant="h4" style={styles.emptyTitle}>
                {currentGoal.status === 'failed'
                  ? 'Generation Failed'
                  : 'Your Genie is working on it'}
              </Text>
              <Text
                variant="body"
                color="secondary"
                style={styles.emptyDescription}
              >
                {currentGoal.status === 'failed'
                  ? currentGoal.error_message || "Task generation encountered an issue. Click below to try again with updated settings."
                  : "Creating your personalized plan with daily tasks based on your preferences. This usually takes a moment..."}
              </Text>
              {currentGoal.status === 'failed' && (
                <LinearGradient
                  colors={['#FFFF68', '#FFFFFF']}
                  style={styles.createPlanGradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <TouchableOpacity 
                    style={styles.createPlanButton}
                    onPress={handleRetryTaskGeneration}
                    disabled={isRetryingTaskGeneration}
                  >
                    {isRetryingTaskGeneration ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="arrow-clockwise" size={18} color="#FFFFFF" />
                        <Text style={styles.createPlanText}>Try Again</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              )}
            </Card>
          ) : (
            <View style={styles.dailyTasksContainer}>
              {getVisibleDailyTasks().map((dayTasks) => (
                <View key={dayTasks.date} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text variant="h4" style={styles.dayTitle}>
                        {formatDate(dayTasks.date)}
                      </Text>
                      <Text
                        variant="caption"
                        color="tertiary"
                        style={styles.dayNumber}
                      >
                        Day {getDayNumber(dayTasks.date)}
                      </Text>
                    </View>
                    <View style={styles.dayProgress}>
                      <Text variant="caption" color="success">
                        {dayTasks.completed_count}/{dayTasks.total_count}
                      </Text>
                      <View style={styles.dayProgressBar}>
                        <View
                          style={[
                            styles.dayProgressFill,
                            {
                              width: `${(dayTasks.completed_count / dayTasks.total_count) * 100}%`,
                              backgroundColor: theme.colors.status.success,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.dayTasksList}>
                    {dayTasks.tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        allTasks={tasks}
                        onExpire={() => handleTaskExpire(task.id)}
                        onPress={() => setSelectedTask(task)}
                      />
                    ))}
                  </View>
                </View>
              ))}
              {visibleTaskCount < totalTasks && (
                <TouchableOpacity
                  onPress={() =>
                    setVisibleTaskCount((c) => Math.min(totalTasks, c + 6))
                  }
                  style={{
                    alignSelf: 'center',
                    marginTop: 6,
                    marginBottom: 6,
                    paddingVertical: 4,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{ color: '#FFFFFF', fontSize: 13, opacity: 0.95 }}
                    >
                      Show more
                    </Text>
                    <View style={{ marginTop: 2, opacity: 0.9 }}>
                      <Icon
                        name="caret-down"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Rewards Section */}
        {rewards.length > 0 && (
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">
                Achievements ({rewards.filter((r) => r.unlocked).length}/
                {rewards.length})
              </Text>
              <Icon name="trophy" size={20} color={theme.colors.yellow[500]} />
            </View>

            <View style={styles.rewardsList}>
              {rewards
                .sort((a, b) => {
                  // Sort by unlocked status first
                  if (a.unlocked !== b.unlocked) {
                    return a.unlocked ? -1 : 1;
                  }

                  // Then sort by type and day_offset
                  if (a.type === 'completion' && b.type !== 'completion')
                    return 1;
                  if (b.type === 'completion' && a.type !== 'completion')
                    return -1;

                  if (
                    a.day_offset !== undefined &&
                    b.day_offset !== undefined
                  ) {
                    return a.day_offset - b.day_offset;
                  }

                  // Daily rewards come first
                  if (a.type === 'daily' && b.type !== 'daily') return -1;
                  if (b.type === 'daily' && a.type !== 'daily') return 1;

                  return 0;
                })
                .map((reward) => {
                  // Calculate today's progress for daily rewards
                  const today = new Date().toISOString().split('T')[0];
                  const todayTasks = tasks.filter((t) => {
                    const taskDate = new Date(t.run_at)
                      .toISOString()
                      .split('T')[0];
                    return taskDate === today;
                  });
                  const completedTodayTasks = todayTasks.filter(
                    (t) => t.completed
                  );

                  const todayProgress =
                    reward.type === 'daily'
                      ? {
                          completed: completedTodayTasks.length,
                          total: todayTasks.length,
                        }
                      : undefined;

                  return (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      todayProgress={todayProgress}
                      onPress={() => {
                        if (reward.unlocked) {
                          Alert.alert('🎉 ' + reward.title, reward.description);
                        } else {
                          const progress = rewards.filter(
                            (r) => r.unlocked
                          ).length;
                          const total = rewards.length;
                          Alert.alert(
                            'Locked Achievement',
                            `Complete more tasks to unlock this achievement!\n\nProgress: ${progress}/${total} achievements unlocked`
                          );
                        }
                      }}
                    />
                  );
                })}
            </View>
          </View>
        )}
      </ScrollView>
      {/* Task Details Screen */}
      {selectedTask && (
        <TaskDetailsScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onTaskUpdate={() => {
            // Refresh data when task is updated
            fetchPointsEarned();
            fetchUpdatedGoal();
            fetchTasks();
          }}
        />
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
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    zIndex: 1,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    zIndex: 1,
  },
  pointsText: {
    color: '#FFFF68',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32, // Reduced spacing above sections
    marginBottom: 16, // Tighter spacing below cards
  },
  goalInfoCard: {
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    marginBottom: 8,
  },
  goalTitle: {
    marginBottom: 4,
    lineHeight: 22,
    textAlign: 'left',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  goalDescription: {
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
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
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  emptyAction: {
    minWidth: 160,
  },
  tasksList: {
    gap: 0,
  },
  dailyTasksContainer: {
    gap: 24,
  },
  daySection: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitle: {
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '500',
  },
  dayProgress: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  dayProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dayTasksList: {
    gap: 0,
  },
  rewardsList: {
    gap: 0,
  },
  createPlanGradientBorder: {
    borderRadius: 12,
    padding: 2,
    width: '50%',
    alignSelf: 'center',
  },
  createPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    width: '100%',
  },
  createPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updatePlanGradientBorder: {
    borderRadius: 25,
    padding: 2,
    width: '35%',
  },
  updatePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 23,
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    width: '100%',
  },
  updatePlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updatePlanButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
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
});
