import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';
import { TaskWithGoal } from '../../../types/task';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface TaskItemProps {
  task: TaskWithGoal;
  onComplete?: () => void;
  onIncomplete?: () => void;
  onPress?: () => void;
  allTasks?: TaskWithGoal[];
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onComplete,
  onIncomplete,
  onPress,
  allTasks = [],
}) => {
  const theme = useTheme();

  const getTimeOfDayIcon = (runAt: string) => {
    const hour = new Date(runAt).getHours();
    if (hour < 12) return 'sun';
    if (hour < 17) return 'sun';
    return 'moon-stars';
  };

  const getTimeOfDayText = (runAt: string) => {
    const hour = new Date(runAt).getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const formatTime = (runAt: string) => {
    try {
      return format(new Date(runAt), 'HH:mm', { locale: he });
    } catch {
      return '';
    }
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

  const isClosestTask = () => {
    if (allTasks.length === 0) return true;
    
    const now = new Date();
    
    // Find the closest upcoming task
    const upcomingTasks = allTasks
      .filter(t => !t.completed && new Date(t.run_at) > now)
      .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());
    
    if (upcomingTasks.length === 0) return true;
    
    const closestTask = upcomingTasks[0];
    return closestTask.id === task.id;
  };

  const canCompleteTask = isTaskTimeReached(task.run_at);
  const isClosestTaskAvailable = isClosestTask();

  return (
    <TouchableOpacity 
      onPress={isClosestTaskAvailable ? onPress : undefined} 
      activeOpacity={isClosestTaskAvailable ? 0.8 : 1}
      disabled={!isClosestTaskAvailable}
    >
      <Card 
        variant={task.completed ? 'default' : 'gradient'} 
        padding="md" 
        style={[
          styles.container,
          task.completed && styles.completedContainer,
          !isClosestTaskAvailable && styles.disabledContainer
        ]}
      >
              <View style={styles.content}>
                {/* Task Content */}
                <View style={styles.taskContent}>
                  {/* Header */}
                  <View style={styles.taskHeader}>
                    <Text 
                      variant="h4" 
                      color="primary-color"
                      numberOfLines={1}
                      style={[
                        styles.taskTitle,
                        task.completed && styles.completedText,
                        { color: getGoalColor(task.goal.color) }
                      ]}
                    >
                      {task.title}
                    </Text>
                    
                    <View style={styles.timeContainer}>
                      <Icon 
                        name={getTimeOfDayIcon(task.run_at) as any}
                        size={16}
                        color={theme.colors.text.secondary}
                      />
                      <Text variant="caption" color="tertiary">
                        {formatTime(task.run_at)}
                      </Text>
                    </View>
                  </View>

            {/* Description */}
            <Text 
              variant="body" 
              color="secondary" 
              numberOfLines={2}
              style={[
                styles.taskDescription,
                task.completed && styles.completedText
              ]}
            >
              {task.description}
            </Text>

            {/* Completion Status */}
                  {task.completed ? (
                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.status.success + '20' }]}>
                      <Icon name="check" size={14} color={theme.colors.status.success} weight="fill" />
                      <Text variant="caption" style={[styles.statusText, { color: theme.colors.status.success }]}>
                        Completed
                      </Text>
                    </View>
            ) : !canCompleteTask ? (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.text.disabled + '20' }]}>
                <Icon name="clock" size={14} color={theme.colors.text.disabled} weight="fill" />
                <Text variant="caption" style={[styles.statusText, { color: theme.colors.text.disabled }]}>
                  Waiting
                </Text>
              </View>
            ) : null}

            {/* Goal Info */}
            <View style={styles.goalInfo}>
              <Text variant="caption" color="primary-color">
                {task.goal.title}
              </Text>
              <Text variant="caption" color="tertiary">
                • {getTimeOfDayText(task.run_at)}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Completion Status - Below Card */}
      {!task.completed && canCompleteTask && isClosestTaskAvailable && (
        <View style={styles.completionButtonsBelow}>
          <TouchableOpacity 
            onPress={onComplete}
            style={styles.completionButton}
          >
            <LinearGradient
              colors={['#FFFF68', '#FFDD00']}
              style={styles.completionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="check" size={14} color="#000000" weight="fill" />
            <Text style={styles.completedButtonText}>Completed</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={onIncomplete}
          style={styles.incompleteButton}
        >
          <View style={styles.incompleteButtonContent}>
            <Icon name="x" size={14} color="#FFFFFF" weight="fill" />
            <Text style={styles.incompleteButtonText}>Not Completed</Text>
          </View>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  completedContainer: {
    opacity: 0.7,
  },
  disabledContainer: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusContainer: {
    marginRight: 12,
    minWidth: 120,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  completionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  completionButtonsBelow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  completionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  completionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    minHeight: 36,
    borderRadius: 12,
  },
  completedButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  incompleteButton: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  incompleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    minHeight: 36,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  incompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    marginRight: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDescription: {
    marginBottom: 8,
    lineHeight: 20,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
