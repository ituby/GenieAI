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
import { useTranslation } from 'react-i18next';
import { Button, Text, Card, Icon } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/index';
import { TaskWithGoal } from '../types/task';
import { supabase } from '../services/supabase/client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskDetailsScreenProps {
  task: TaskWithGoal;
  onBack?: () => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({
  task,
  onBack,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [taskData, setTaskData] = useState<TaskWithGoal>(task);

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
      setTaskData(prev => ({
        ...prev,
        completed: markAsCompleted,
        completed_at: markAsCompleted ? new Date().toISOString() : undefined
      }));

      Alert.alert(
        'Success',
        markAsCompleted ? 'Task marked as completed!' : 'Task marked as not completed!'
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Unable to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    // Refresh task data if needed
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
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
          <TouchableOpacity 
            onPress={onBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={theme.colors.yellow[500]}
            />
          }
        >
        {/* Task Header Card */}
        <Card variant="gradient" padding="lg" style={styles.headerCard}>
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <Text variant="h2" color="primary-color" style={[styles.taskTitle, { color: getGoalColor(taskData.goal.color) }]}>
                {taskData.title}
              </Text>
              <View style={styles.taskMeta}>
                <View style={styles.timeInfo}>
                  <Icon 
                    name={getTimeOfDayIcon(taskData.run_at) as any}
                    size={20}
                    color={theme.colors.yellow[500]}
                  />
                  <Text variant="h4" color="primary-color" style={styles.timeText}>
                    {formatTime(taskData.run_at)}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {getTimeOfDayText(taskData.run_at)}
                  </Text>
                </View>
                <Text variant="caption" color="tertiary" style={styles.dateText}>
                  {formatDate(taskData.run_at)}
                </Text>
              </View>
            </View>
            
            {/* Status Badge */}
            {taskData.completed ? (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.status.success + '20' }]}>
                <Icon name="check" size={16} color={theme.colors.status.success} weight="fill" />
                <Text variant="caption" style={[styles.statusText, { color: theme.colors.status.success }]}>
                  Completed
                </Text>
              </View>
            ) : !canCompleteTask ? (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.text.disabled + '20' }]}>
                <Icon name="clock" size={16} color={theme.colors.text.disabled} weight="fill" />
                <Text variant="caption" style={[styles.statusText, { color: theme.colors.text.disabled }]}>
                  Waiting
                </Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.yellow[500] + '20' }]}>
                <Icon name="clock" size={16} color={theme.colors.yellow[500]} weight="fill" />
                <Text variant="caption" style={[styles.statusText, { color: theme.colors.yellow[500] }]}>
                  Ready
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Description Card */}
        <Card variant="gradient" padding="lg" style={styles.descriptionCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Description
          </Text>
          <Text variant="body" color="secondary" style={styles.description}>
            {taskData.description}
          </Text>
        </Card>

        {/* Goal Info Card */}
        <Card variant="gradient" padding="lg" style={styles.goalCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Related Goal
          </Text>
          <View style={styles.goalInfo}>
            <Icon name="target" size={20} color="#FFFFFF" />
            <Text variant="h4" color="primary-color" style={styles.goalTitle}>
              {taskData.goal.title}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        {!taskData.completed && canCompleteTask && (
          <View style={styles.actionButtons}>
            <LinearGradient
              colors={['#FFFF68', '#FFDD00']}
              style={styles.completedButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                onPress={() => handleToggleTask(true)}
                style={styles.completedButton}
                disabled={isLoading}
              >
                <Icon name="check" size={18} color="#000000" weight="fill" />
                <Text style={styles.completedButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
            </LinearGradient>

            <TouchableOpacity
              onPress={() => handleToggleTask(false)}
              style={styles.notCompletedButton}
              disabled={isLoading}
            >
              <View style={styles.notCompletedButtonContent}>
                <Icon name="x" size={18} color="#FFFFFF" weight="fill" />
                <Text style={styles.notCompletedButtonText}>Mark as Not Completed</Text>
              </View>
            </TouchableOpacity>
          </View>
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
  actionButtons: {
    gap: 12,
  },
  completedButtonGradient: {
    borderRadius: 16,
    padding: 2,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  notCompletedButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notCompletedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    backgroundColor: 'transparent',
  },
  notCompletedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
