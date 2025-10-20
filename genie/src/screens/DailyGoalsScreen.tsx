import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
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
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={styles.absoluteHeader}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text variant="h3" style={styles.title} numberOfLines={1}>
              Daily Goals
            </Text>
          </View>

          <View style={styles.headerRight} />
        </View>

        {/* Stats - Absolute Position */}
        <View style={styles.statsContainer}>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>{completedTasksCount}</Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>{todaysTasksCount - completedTasksCount}</Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>{getCompletionPercentage()}%</Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>Progress</Text>
            </View>
          </View>
        </View>

        {/* Divider - Absolute Position */}
        <View style={styles.dividerBelow} />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary[400]} />
          }
        >

          {/* Section Header */}
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderWithIcon}>
              <Icon name="clipboard-text" size={20} color="#FFFF68" weight="fill" />
              <Text variant="h4">Today's Tasks</Text>
            </View>
          </View>

          {/* Content */}
          {todaysTasksCount === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="calendar" size={48} color="rgba(255, 255, 255, 0.6)" weight="fill" />
              <Text variant="h3" style={styles.emptyStateTitle}>No Tasks Today</Text>
              <Text variant="body" color="secondary" style={styles.emptyStateDescription}>
                Create your first plan to get personalized daily tasks
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {todaysTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  allTasks={todaysTasks}
                  onPress={() => handleTaskPress(task)}
                />
              ))}
            </View>
          )}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 28, 36, 0.8)',
    minHeight: 110,
    overflow: 'hidden',
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingTop: 180,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  statsContainer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(26, 28, 36, 1)',
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
  dividerBelow: {
    position: 'absolute',
    top: 175,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 99,
  },
  section: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  tasksListCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tasksList: {
    gap: 12,
  },
  emptyStateCard: {
    marginHorizontal: 0,
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
  sectionHeaderContainer: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  itemsList: {
    gap: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 280,
    alignSelf: 'center',
    paddingVertical: 40,
  },
});
