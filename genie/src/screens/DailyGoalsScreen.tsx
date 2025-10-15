import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Icon, FloatingBottomNav } from '../components';
import { Button } from '../components/primitives/Button';
import { TaskItem } from '../components/domain/TaskItem';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabase/client';
import { TaskWithGoal } from '../types/task';

interface DailyGoalsScreenProps {
  onBack: () => void;
  onTaskPress?: (task: TaskWithGoal) => void;
  onHomePress?: () => void;
  onMyPlansPress?: () => void;
  onCreatePress?: () => void;
}

export const DailyGoalsScreen: React.FC<DailyGoalsScreenProps> = ({ 
  onBack, 
  onTaskPress, 
  onHomePress, 
  onMyPlansPress, 
  onCreatePress 
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [todaysTasks, setTodaysTasks] = useState<TaskWithGoal[]>([]);
  const [todaysTasksCount, setTodaysTasksCount] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTodaysTasks();
    }
  }, [user?.id]);

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
        setCompletedTasksCount(0);
        setLoading(false);
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
      setCompletedTasksCount(transformedTasks.filter(task => task.completed).length);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
      setTodaysTasksCount(0);
      setTodaysTasks([]);
      setCompletedTasksCount(0);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTodaysTasks();
    setRefreshing(false);
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

      // Update completed count
      setCompletedTasksCount(prev => 
        markAsCompleted ? prev + 1 : prev - 1
      );

      // Refresh tasks
      await fetchTodaysTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleTaskPress = (task: TaskWithGoal) => {
    if (onTaskPress) {
      onTaskPress(task);
    }
  };

  const getCompletionPercentage = () => {
    if (todaysTasksCount === 0) return 0;
    return Math.round((completedTasksCount / todaysTasksCount) * 100);
  };

  return (
    <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          Daily Goals
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[400]}
          />
        }
      >
        {/* Stats Card */}
        <Card variant="gradient" padding="md" style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderWithIcon}>
              <Icon
                name="calendar"
                size={20}
                color={theme.colors.text.primary}
                weight="fill"
              />
              <Text variant="h4">Today's Progress</Text>
            </View>
          </View>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {completedTasksCount}
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Completed
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {todaysTasksCount - completedTasksCount}
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Remaining
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {getCompletionPercentage()}%
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Progress
              </Text>
            </View>
          </View>
        </Card>

        {/* Tasks List */}
        <View style={styles.section}>
          {todaysTasksCount === 0 ? (
            <Card variant="gradient" padding="lg" style={styles.emptyStateCard}>
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="clipboard-text"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">Today's Tasks</Text>
              </View>
              <View style={styles.emptyStateContent}>
                <Icon
                  name="calendar"
                  size={48}
                  color="rgba(255, 255, 255, 0.6)"
                  weight="fill"
                />
                <Text variant="h3" style={styles.emptyStateTitle}>
                  No Tasks Today
                </Text>
                <Text variant="body" color="secondary" style={styles.emptyStateDescription}>
                  Create your first plan to get personalized daily tasks
                </Text>
              </View>
            </Card>
          ) : (
            <Card variant="gradient" padding="md" style={styles.tasksListCard}>
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="clipboard-text"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">Today's Tasks</Text>
              </View>
              <View style={styles.tasksList}>
                {todaysTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    allTasks={todaysTasks}
                    onPress={() => handleTaskPress(task)}
                  />
                ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
      </View>

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav
        onHomePress={onHomePress || (() => {})}
        onMyPlansPress={onMyPlansPress || (() => {})}
        onDailyGoalsPress={() => {}}
        onCreatePress={onCreatePress || (() => {})}
        activeTab="goals"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  container: {
    flex: 1,
    paddingTop: 50,
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
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  statsCard: {
    margin: 20,
    marginBottom: 16,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tasksListCard: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  tasksList: {
    gap: 6,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
