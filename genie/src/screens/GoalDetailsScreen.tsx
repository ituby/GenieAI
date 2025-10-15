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

  const getCategoryIcon = (category: string, iconName?: string) => {
    // Use AI-selected icon if available
    if (iconName) {
      return iconName;
    }

    // Fallback to category-based icons
    const icons = {
      lifestyle: 'heart',
      career: 'briefcase',
      mindset: 'brain',
      character: 'star',
      custom: 'target',
    };
    return icons[category as keyof typeof icons] || icons.custom;
  };

  const getGoalColor = (goalColor?: string) => {
    // Use AI-selected color if available
    if (goalColor) {
      // Check if it's already a hex color
      if (goalColor.startsWith('#')) {
        return goalColor;
      }

      // Map color names to hex values
      const colorMap = {
        yellow: '#FFFF68',
        green: '#00FF88',
        red: '#FF4444',
        blue: '#4488FF',
        orange: '#FF8844',
        purple: '#8844FF',
        pink: '#FF4488',
        cyan: '#44FFFF',
        lime: '#88FF44',
        magenta: '#FF44FF',
      };
      return colorMap[goalColor as keyof typeof colorMap] || colorMap.yellow;
    }

    // Fallback to neutral colors when no AI color is provided
    return theme.colors.text.secondary;
  };

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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Absolute Header */}
      <View style={styles.absoluteHeader}>
        <Button
          variant="ghost"
          onPress={onBack}
          leftIcon={
            <Ionicons
              name="arrow-back"
              size={18}
              color="#FFFFFF"
            />
          }
        >
          Back
        </Button>
        <View style={styles.headerSpacer} />
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
                    { backgroundColor: getGoalColor(currentGoal.color) + '20' },
                  ]}
                >
                  <Icon
                    name={
                      getCategoryIcon(
                        currentGoal.category,
                        currentGoal.icon_name
                      ) as any
                    }
                    size={24}
                    color={getGoalColor(currentGoal.color)}
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
                      { color: getGoalColor(currentGoal.color) },
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
                No tasks yet
              </Text>
              <Text
                variant="body"
                color="secondary"
                style={styles.emptyDescription}
              >
                Genie will create a personalized 21-day plan with daily tasks
              </Text>
              <LinearGradient
                colors={['#FFFF68', '#FFFFFF']}
                style={styles.createPlanGradientBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity style={styles.createPlanButton}>
                  <Icon name="brain" size={18} color="#FFFFFF" />
                  <Text style={styles.createPlanText}>Create Plan</Text>
                </TouchableOpacity>
              </LinearGradient>
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
                        onComplete={() => handleToggleTask(task.id, true)}
                        onIncomplete={() => handleToggleTask(task.id, false)}
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
    paddingTop: 20, // Top safe area padding
  },
  scrollView: {
    flex: 1,
    paddingTop: 60, // Space for absolute header
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area padding
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  headerSpacer: {
    flex: 1,
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
  },
  pointsText: {
    color: '#FFFF68',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
