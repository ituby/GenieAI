import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, Card, Icon } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '../components/domain/TaskItem';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { useTheme } from '../theme/index';
import { GoalWithProgress, Reward } from '../types/goal';
import { TaskWithGoal, DailyTasks } from '../types/task';
import { supabase } from '../services/supabase/client';

interface GoalDetailsScreenProps {
  goal: GoalWithProgress;
  onBack?: () => void;
}

export const GoalDetailsScreen: React.FC<GoalDetailsScreenProps> = ({
  goal,
  onBack,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tasks, setTasks] = useState<TaskWithGoal[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTasks[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchRewards();
  }, [goal.id]);

  const organizeTasksByDay = (tasks: TaskWithGoal[]): DailyTasks[] => {
    const tasksByDate = new Map<string, TaskWithGoal[]>();
    
    tasks.forEach(task => {
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
        const completedCount = tasks.filter(task => task.completed).length;
        return {
          date,
          tasks: tasks.sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime()),
          completed_count: completedCount,
          total_count: tasks.length
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
        .select(`
          *,
          goal:goals(id, title, category)
        `)
        .eq('goal_id', goal.id)
        .order('run_at', { ascending: true });

      if (error) throw error;
      const tasksData = data || [];
      setTasks(tasksData);
      setDailyTasks(organizeTasksByDay(tasksData));
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

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('goal_tasks')
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !completed, completed_at: !completed ? new Date().toISOString() : undefined }
          : task
      );
      setTasks(updatedTasks);
      setDailyTasks(organizeTasksByDay(updatedTasks));

      // Check for unlocked rewards after task completion
      if (!completed) {
        checkUnlockedRewards();
      }
    } catch (error) {
      console.error('Error updating task:', error);
        Alert.alert('Error', 'Unable to update task');
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
      character: 'sparkle',
      custom: 'target',
    };
    return icons[category as keyof typeof icons] || icons.custom;
  };

  const getGoalColor = (category: string, aiColor?: string) => {
    // Use AI-selected color if available
    if (aiColor) {
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
      return colorMap[aiColor as keyof typeof colorMap] || colorMap.yellow;
    }
    
    // Fallback to neutral colors when no AI color is provided
    return theme.colors.text.secondary;
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Function to limit first line to 3 words
  const formatTitle = (title: string) => {
    const words = title.split(' ');
    if (words.length <= 3) {
      return title;
    }
    
    const firstLine = words.slice(0, 3).join(' ');
    const secondLine = words.slice(3).join(' ');
    return `${firstLine}\n${secondLine}`;
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
        day: 'numeric' 
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
      // Check milestone rewards (every 7 days)
      const milestoneRewards = rewards.filter(r => r.type === 'milestone' && !r.unlocked);
      for (const reward of milestoneRewards) {
        if (reward.day_offset !== undefined && completedTasks > reward.day_offset) {
          await supabase
            .from('rewards')
            .update({ 
              unlocked: true, 
              unlocked_at: new Date().toISOString() 
            })
            .eq('id', reward.id);
          
          // Update local state
          setRewards(prev => prev.map(r => 
            r.id === reward.id 
              ? { ...r, unlocked: true, unlocked_at: new Date().toISOString() }
              : r
          ));
          
          // Show celebration
          Alert.alert('🎉 Reward Unlocked!', reward.title);
        }
      }

      // Check completion reward
      const completionReward = rewards.find(r => r.type === 'completion' && !r.unlocked);
      if (completionReward && completedTasks === totalTasks) {
        await supabase
          .from('rewards')
          .update({ 
            unlocked: true, 
            unlocked_at: new Date().toISOString() 
          })
          .eq('id', completionReward.id);
        
        // Update local state
        setRewards(prev => prev.map(r => 
          r.id === completionReward.id 
            ? { ...r, unlocked: true, unlocked_at: new Date().toISOString() }
            : r
        ));
        
        // Show celebration
        Alert.alert('🏆 Goal Completed!', completionReward.title);
      }
    } catch (error) {
      console.error('Error checking unlocked rewards:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Absolute Header */}
      <View style={styles.absoluteHeader}>
        <Button 
          variant="ghost" 
          onPress={onBack}
          leftIcon={<Ionicons name="arrow-back" size={18} color={theme.colors.text.secondary} />}
          >
            Back
          </Button>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchTasks}
            tintColor={theme.colors.yellow[500]}
          />
        }
      >

        {/* Goal Info Card */}
        <View style={styles.content}>
          <Card variant="gradient" padding="lg" style={styles.goalInfoCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: getGoalColor(goal.category, goal.color) + '20' }]}>
                  <Icon 
                    name={getCategoryIcon(goal.category, goal.icon_name) as any}
                    size={24}
                    color={getGoalColor(goal.category, goal.color)}
                  />
                </View>
                <View>
                  <Text variant="h4" style={styles.goalTitle}>
                    {formatTitle(goal.title)}
                  </Text>
                  <Text variant="caption" style={[styles.categoryText, { color: getGoalColor(goal.category, goal.color) }]}>
                    {goal.category.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <ProgressRing
                progress={progressPercentage}
                size={60}
                strokeWidth={4}
              />
            </View>

            <Text variant="body" color="secondary" style={styles.goalDescription}>
              {goal.description}
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
                  {goal.current_streak}
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
            <Button 
              variant="ghost" 
              size="sm"
              leftIcon={<Icon name="brain" size={16} color={theme.colors.text.secondary} />}
              onPress={() => {
                  Alert.alert(
                    'Update Plan',
                    'Genie will create a new plan based on your progress. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Update', onPress: () => {
                      // TODO: Implement plan update logic
                      console.log('Updating plan for goal:', goal.id);
                    }}
                  ]
                );
              }}
              >
                Update Plan
              </Button>
          </View>

          {dailyTasks.length === 0 ? (
            <Card variant="default" padding="lg" style={styles.emptyState}>
                <Text variant="h4" style={styles.emptyTitle}>
                  No tasks yet
                </Text>
                <Text variant="body" color="secondary" style={styles.emptyDescription}>
                  Genie will create a personalized 21-day plan with daily tasks
                </Text>
              <Button 
                variant="primary" 
                style={styles.emptyAction}
                leftIcon={<Icon name="brain" size={18} color={theme.colors.text.primary} />}
              >
                Create Plan
              </Button>
            </Card>
          ) : (
            <View style={styles.dailyTasksContainer}>
              {dailyTasks.map((dayTasks) => (
                <View key={dayTasks.date} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text variant="h4" style={styles.dayTitle}>
                        {formatDate(dayTasks.date)}
                      </Text>
                      <Text variant="caption" color="tertiary" style={styles.dayNumber}>
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
                              backgroundColor: theme.colors.status.success
                            }
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
                        onToggleComplete={() => handleToggleTask(task.id, task.completed)}
                        onPress={() => console.log('Task details:', task.id)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Rewards Section */}
        {rewards.length > 0 && (
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">Rewards ({rewards.filter(r => r.unlocked).length}/{rewards.length})</Text>
              <Icon name="trophy" size={20} color={theme.colors.yellow[500]} />
            </View>

            <View style={styles.rewardsList}>
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  onPress={() => {
                    if (reward.unlocked) {
                      Alert.alert(reward.title, reward.description);
                    }
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 100, // Space for absolute header
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerSpacer: {
    flex: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40, // Extra padding above content
    marginBottom: 24,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
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
});
