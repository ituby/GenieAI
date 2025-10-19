import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// i18n removed
import { Button, Text, Card, Icon, CustomRefreshControl } from '../components';
import { useTheme } from '../theme/index';
import { TaskWithGoal } from '../types/task';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { getCategoryColor } from '../config/categoryConfig';

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

  // Parse description to extract search suggestions
  const parseDescription = (description: string) => {
    const searchRegex = /\[SEARCH:(.*?)\|(.*?)\]/g;
    const parts: Array<{
      type: 'text' | 'search';
      content: string;
      title?: string;
      keywords?: string;
    }> = [];
    let lastIndex = 0;
    let match;

    while ((match = searchRegex.exec(description)) !== null) {
      // Add text before the search
      if (match.index > lastIndex) {
        const textBefore = description.substring(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add the search
      parts.push({
        type: 'search',
        content: match[0],
        title: match[1],
        keywords: match[2],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < description.length) {
      const remainingText = description.substring(lastIndex).trim();
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    // If no searches found, return the whole description as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: description });
    }

    return parts;
  };

  const handleSearchPress = async (keywords: string) => {
    try {
      // Build Google search URL with the keywords
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keywords)}`;

      const canOpen = await Linking.canOpenURL(searchUrl);
      if (canOpen) {
        await Linking.openURL(searchUrl);
      } else {
        Alert.alert('Error', 'Cannot open search');
      }
    } catch (error) {
      console.error('Error opening search:', error);
      Alert.alert('Error', 'Failed to open search');
    }
  };

  const handleRefresh = async () => {
    setShowRefreshLoader(true);

    try {
      await Promise.all([fetchTaskDetails(), fetchPointsEarned()]);
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

  // Get category-based color
  const categoryColor = getCategoryColor(taskData.goal.category);

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
        setTaskData((prev) => ({
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
        completed: !updatedSubtasks[subtaskIndex].completed,
      };

      const completedCount = updatedSubtasks.filter(
        (subtask) => subtask.completed
      ).length;

      const { error } = await supabase
        .from('goal_tasks')
        .update({
          subtasks: updatedSubtasks,
          subtasks_completed: completedCount,
        })
        .eq('id', taskData.id);

      if (error) throw error;

      setTaskData((prev) => ({
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon
              name="arrow-left"
              size={20}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <Text variant="h3" style={styles.headerTitle}>
            Task Details
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
                    { color: categoryColor },
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
            <View style={styles.descriptionContent}>
              {parseDescription(taskData.description).map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <Text
                      key={index}
                      variant="body"
                      color="secondary"
                      style={styles.description}
                    >
                      {part.content}
                    </Text>
                  );
                } else if (
                  part.type === 'search' &&
                  part.title &&
                  part.keywords
                ) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchButton}
                      onPress={() => handleSearchPress(part.keywords!)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name="magnifying-glass"
                        size={18}
                        color="#FFFF68"
                        weight="bold"
                      />
                      <Text style={styles.searchText}>{part.title}</Text>
                      <Icon
                        name="caret-right"
                        size={14}
                        color="#FFFF68"
                        weight="bold"
                      />
                    </TouchableOpacity>
                  );
                }
                return null;
              })}
            </View>
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
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.timeText}
                  >
                    {taskData.time_allocation_minutes || 30} minutes
                  </Text>
                </View>
              </View>

              {/* Time restriction message */}
              {!canCompleteTask && (
                <View style={styles.timeRestrictionMessage}>
                  <Icon name="clock" size={16} color="#FFFF68" />
                  <Text
                    variant="caption"
                    color="secondary"
                    style={styles.timeRestrictionText}
                  >
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
                      !canCompleteTask && styles.subtaskDisabled,
                    ]}
                    onPress={() =>
                      canCompleteTask && handleSubtaskToggle(index)
                    }
                    disabled={!canCompleteTask}
                  >
                    <View style={styles.subtaskContent}>
                      <View
                        style={[
                          styles.checkbox,
                          subtask.completed && [
                            styles.checkboxChecked,
                            { backgroundColor: '#FFFF68' },
                          ],
                        ]}
                      >
                        {subtask.completed && (
                          <Icon name="check" size={12} color="#000000" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.subtaskTitle,
                          { color: theme.colors.text.primary },
                          subtask.completed && styles.subtaskTitleCompleted,
                        ]}
                      >
                        {subtask.title}
                      </Text>
                      <Text
                        style={[
                          styles.subtaskTime,
                          { color: theme.colors.text.secondary },
                        ]}
                      >
                        {subtask.estimated_minutes}min
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <Text
                  variant="caption"
                  color="secondary"
                  style={styles.progressText}
                >
                  {taskData.subtasks_completed || 0} of{' '}
                  {taskData.total_subtasks || taskData.subtasks.length}{' '}
                  completed
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${((taskData.subtasks_completed || 0) / (taskData.total_subtasks || taskData.subtasks.length)) * 100}%`,
                        backgroundColor: '#FFFF68',
                      },
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
          {!taskData.completed &&
            taskData.subtasks &&
            taskData.subtasks.length > 0 && (
              <Card
                variant="gradient"
                padding="md"
                style={{ marginBottom: 16, opacity: 0.7 }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
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
  scrollView: {
    flex: 1,
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
  descriptionContent: {
    gap: 12,
  },
  description: {
    lineHeight: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFF68',
    gap: 10,
    marginTop: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFF68',
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
