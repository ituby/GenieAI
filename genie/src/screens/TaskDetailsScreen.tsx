import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// i18n removed
import { Button, Text, Card, Icon, CustomRefreshControl } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/index';
import { TaskWithGoal } from '../types/task';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskDetailsScreenProps {
  task: TaskWithGoal;
  onBack?: () => void;
  onTaskUpdate?: () => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({
  task,
  onBack,
  onTaskUpdate,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshLoader, setShowRefreshLoader] = useState(false);
  const [taskData, setTaskData] = useState<TaskWithGoal>(task);
  const [pointsEarned, setPointsEarned] = useState(0);

  const formatTime = (runAt: string) => {
    try {
      return format(new Date(runAt), 'HH:mm', { locale: he });
    } catch {
      return '';
    }
  };

  const formatDate = (runAt: string) => {
    try {
      return format(new Date(runAt), 'dd/MM/yyyy', { locale: he });
    } catch {
      return '';
    }
  };

  const handleRefresh = async () => {
    setShowRefreshLoader(true);
    
    try {
      await Promise.all([
        fetchTaskDetails(),
        fetchPointsEarned(),
      ]);
    } catch (error) {
      console.error('Error refreshing task data:', error);
    }
    
    // Hide loader after 3 seconds
    setTimeout(() => {
      setShowRefreshLoader(false);
    }, 3000);
  };

  const getTimeOfDayIcon = (runAt: string) => {
    const hour = new Date(runAt).getHours();
    if (hour < 12) return 'sun';
    if (hour < 18) return 'sun';
    return 'moon';
  };

  const getTimeOfDayText = (runAt: string) => {
    const hour = new Date(runAt).getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const getGoalColor = (goalColor?: string) => {
    if (goalColor) {
      // If it's already a hex color, return it directly
      if (goalColor.startsWith('#')) {
        return goalColor;
      }
      
      // Otherwise, map color names to hex values
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
    return theme.colors.yellow[500];
  };

  const isTaskTimeReached = (runAt: string) => {
    const now = new Date();
    const taskTime = new Date(runAt);
    return now >= taskTime;
  };

  const canCompleteTask = isTaskTimeReached(taskData.run_at);

  const fetchTaskDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_tasks')
        .select('*')
        .eq('id', taskData.id)
        .single();

      if (error) throw error;

      if (data) {
        setTaskData(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  const fetchPointsEarned = async () => {
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .eq('goal_id', taskData.goal_id)
          .single();

        setPointsEarned(data?.points || 0);
      } catch (error) {
        console.log('Points fetch failed:', error);
        setPointsEarned(0);
      }
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    fetchPointsEarned();
  }, [user?.id, taskData.goal_id]);

  const handleToggleTask = async (markAsCompleted: boolean) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('goal_tasks')
        .update({
          completed: markAsCompleted,
          completed_at: markAsCompleted ? new Date().toISOString() : null,
        })
        .eq('id', taskData.id);

      if (error) throw error;

      // Update local state
      setTaskData((prev) => ({
        ...prev,
        completed: markAsCompleted,
        completed_at: markAsCompleted ? new Date().toISOString() : undefined,
      }));

      // Update points system
      try {
        const action = markAsCompleted ? 'complete' : 'incomplete';
        await supabase.functions.invoke('update-points', {
          body: {
            goal_id: taskData.goal_id,
            task_id: taskData.id,
            user_id: user?.id,
            action: action,
          },
        });

        // Refresh points display
        fetchPointsEarned();
      } catch (pointsError) {
        console.error('Error updating points:', pointsError);
        // Don't fail the task update if points update fails
      }

      // Notify parent component to refresh data
      onTaskUpdate?.();

      Alert.alert(
        'Success',
        markAsCompleted
          ? 'Task marked as completed!'
          : 'Task marked as not completed!'
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Unable to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubtaskToggle = async (subtaskIndex: number) => {
    try {
      if (!taskData.subtasks) return;
      
      const updatedSubtasks = [...taskData.subtasks];
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        completed: !updatedSubtasks[subtaskIndex].completed
      };
      
      const completedCount = updatedSubtasks.filter(subtask => subtask.completed).length;
      
      const { error } = await supabase
        .from('goal_tasks')
        .update({
          subtasks: updatedSubtasks,
          subtasks_completed: completedCount,
        })
        .eq('id', taskData.id);

      if (error) throw error;

      setTaskData(prev => ({
        ...prev,
        subtasks: updatedSubtasks,
        subtasks_completed: completedCount,
      }));

      // If all subtasks are completed, show completion option
      if (completedCount === updatedSubtasks.length && !taskData.completed) {
        // Auto-complete the main task
        await handleToggleTask(true);
      }
      
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error updating subtask:', error);
      Alert.alert('Error', 'Failed to update subtask');
    }
  };

  const onRefresh = async () => {
    // Refresh task data if needed
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        {/* Absolute Header */}
        <View style={styles.absoluteHeader}>
          {/* Blur overlay */}
          <View style={styles.blurOverlay} />
          {/* Additional blur effect */}
          <View style={styles.blurEffect} />
          {/* Extra blur layers */}
          <View style={styles.blurEffect2} />
          <View style={styles.blurEffect3} />
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
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
          <CustomRefreshControl
            refreshing={showRefreshLoader}
            onRefresh={handleRefresh}
            tintColor={theme.colors.yellow[500]}
          />
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
          {/* Task Header Card */}
          <Card variant="gradient" padding="lg" style={styles.headerCard}>
            <View style={styles.taskHeader}>
              <View style={styles.taskTitleContainer}>
                <Text
                  variant="h2"
                  color="primary-color"
                  style={[
                    styles.taskTitle,
                    { color: getGoalColor(taskData.goal.color) },
                  ]}
                >
                  {taskData.title}
                </Text>
                <View style={styles.taskMeta}>
                  <View style={styles.timeInfo}>
                    <Icon
                      name={getTimeOfDayIcon(taskData.run_at) as any}
                      size={20}
                      color={theme.colors.yellow[500]}
                    />
                    <Text
                      variant="h4"
                      color="primary-color"
                      style={styles.timeText}
                    >
                      {formatTime(taskData.run_at)}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {getTimeOfDayText(taskData.run_at)}
                    </Text>
                  </View>
                  <Text
                    variant="caption"
                    color="tertiary"
                    style={styles.dateText}
                  >
                    {formatDate(taskData.run_at)}
                  </Text>
                </View>
              </View>

              {/* Status Badge */}
              {taskData.completed ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors.status.success + '20' },
                  ]}
                >
                  <Icon
                    name="check"
                    size={16}
                    color={theme.colors.status.success}
                    weight="fill"
                  />
                  <Text
                    variant="caption"
                    style={[
                      styles.statusText,
                      { color: theme.colors.status.success },
                    ]}
                  >
                    Completed
                  </Text>
                </View>
              ) : !canCompleteTask ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors.text.disabled + '20' },
                  ]}
                >
                  <Icon
                    name="clock"
                    size={16}
                    color={theme.colors.text.disabled}
                    weight="fill"
                  />
                  <Text
                    variant="caption"
                    style={[
                      styles.statusText,
                      { color: theme.colors.text.disabled },
                    ]}
                  >
                    Waiting
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors.yellow[500] + '20' },
                  ]}
                >
                  <Icon
                    name="clock"
                    size={16}
                    color={theme.colors.yellow[500]}
                    weight="fill"
                  />
                  <Text
                    variant="caption"
                    style={[
                      styles.statusText,
                      { color: theme.colors.yellow[500] },
                    ]}
                  >
                    Ready
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Description Card */}
          <Card variant="gradient" padding="lg" style={styles.descriptionCard}>
            <Text
              variant="h4"
              color="primary-color"
              style={styles.sectionTitle}
            >
              Description
            </Text>
            <Text variant="body" color="secondary" style={styles.description}>
              {taskData.description}
            </Text>
          </Card>

          {/* Subtasks Card */}
          {taskData.subtasks && taskData.subtasks.length > 0 && (
            <Card variant="gradient" padding="lg" style={styles.subtasksCard}>
              <View style={styles.subtasksHeader}>
                <Text
                  variant="h4"
                  color="primary-color"
                  style={styles.sectionTitle}
                >
                  Subtasks
                </Text>
                <View style={styles.timeAllocation}>
                  <Icon name="clock" size={16} color="#FFFFFF" />
                  <Text variant="caption" color="secondary" style={styles.timeText}>
                    {taskData.time_allocation_minutes || 30} minutes
                  </Text>
                </View>
              </View>
              
              {/* Time restriction message */}
              {!canCompleteTask && (
                <View style={styles.timeRestrictionMessage}>
                  <Icon name="clock" size={16} color="#FFFF68" />
                  <Text variant="caption" color="secondary" style={styles.timeRestrictionText}>
                    Task will be available at {formatTime(taskData.run_at)}
                  </Text>
                </View>
              )}
              
              <View style={styles.subtasksList}>
                {taskData.subtasks.map((subtask, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.subtaskItem,
                      subtask.completed && styles.subtaskCompleted,
                      !canCompleteTask && styles.subtaskDisabled
                    ]}
                    onPress={() => canCompleteTask && handleSubtaskToggle(index)}
                    disabled={!canCompleteTask}
                  >
                    <View style={styles.subtaskContent}>
                      <View style={[
                        styles.checkbox,
                        subtask.completed && [styles.checkboxChecked, { backgroundColor: '#FFFF68' }]
                      ]}>
                        {subtask.completed && (
                          <Icon name="check" size={12} color="#000000" />
                        )}
                      </View>
                      <Text style={[
                        styles.subtaskTitle,
                        { color: theme.colors.text.primary },
                        subtask.completed && styles.subtaskTitleCompleted
                      ]}>
                        {subtask.title}
                      </Text>
                      <Text style={[styles.subtaskTime, { color: theme.colors.text.secondary }]}>
                        {subtask.estimated_minutes}min
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <Text variant="caption" color="secondary" style={styles.progressText}>
                  {taskData.subtasks_completed || 0} of {taskData.total_subtasks || taskData.subtasks.length} completed
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${((taskData.subtasks_completed || 0) / (taskData.total_subtasks || taskData.subtasks.length)) * 100}%`,
                        backgroundColor: '#FFFF68'
                      }
                    ]} 
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Goal Info Card */}
          <Card variant="gradient" padding="lg" style={styles.goalCard}>
            <Text
              variant="h4"
              color="primary-color"
              style={styles.sectionTitle}
            >
              Related Goal
            </Text>
            <View style={styles.goalInfo}>
              <Icon name="target" size={20} color="#FFFFFF" />
              <Text variant="h4" color="primary-color" style={styles.goalTitle}>
                {taskData.goal.title}
              </Text>
            </View>
          </Card>

          {/* Auto-completion message */}
          {!taskData.completed && taskData.subtasks && taskData.subtasks.length > 0 && (
            <Card variant="gradient" padding="md" style={{ marginBottom: 16, opacity: 0.7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="info" size={16} color="#FFFF68" />
                <Text variant="caption" color="secondary" style={{ flex: 1 }}>
                  Complete all subtasks to automatically finish this task
                </Text>
              </View>
            </Card>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
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
  backButton: {
    padding: 8,
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
  scrollView: {
    flex: 1,
    paddingTop: 110,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    marginBottom: 8,
  },
  taskMeta: {
    gap: 4,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    marginRight: 8,
  },
  dateText: {
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  description: {
    lineHeight: 24,
  },
  goalCard: {
    marginBottom: 24,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalTitle: {
    flex: 1,
  },
  // Subtasks styles
  subtasksCard: {
    marginBottom: 16,
  },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeAllocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtasksList: {
    gap: 12,
    marginBottom: 16,
  },
  subtaskItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtaskCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  subtaskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  subtaskTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Time restriction styles
  timeRestrictionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  timeRestrictionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFF68',
  },
  subtaskDisabled: {
    opacity: 0.5,
  },
});
