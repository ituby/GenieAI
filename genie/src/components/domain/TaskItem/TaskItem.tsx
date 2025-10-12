import React, { useState, useEffect } from 'react';
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
  onExpire?: () => void;
  onPress?: () => void;
  allTasks?: TaskWithGoal[];
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onComplete,
  onIncomplete,
  onExpire,
  onPress,
  allTasks = [],
}) => {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

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

  const getTaskPoints = (intensity?: string) => {
    const intensityMultiplier = intensity === 'easy' ? 1 : intensity === 'medium' ? 2 : 4;
    return 10 * intensityMultiplier; // Base 10 points * multiplier
  };

  const isTaskTimeReached = (runAt: string) => {
    const now = new Date();
    const taskTime = new Date(runAt);
    return now >= taskTime;
  };

  const isTaskAvailableForReading = () => {
    const now = new Date();
    const taskTime = new Date(task.run_at);
    
    // Task is available for reading if its time has been reached
    if (now >= taskTime) return true;
    
    // Check if this is the closest upcoming task among all tasks
    if (allTasks.length === 0) return true;
    
    const upcomingTasks = allTasks
      .filter(t => !t.completed && new Date(t.run_at) > now)
      .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());
    
    if (upcomingTasks.length === 0) return true;
    
    const closestTask = upcomingTasks[0];
    return closestTask.id === task.id;
  };

  const canCompleteTask = isTaskTimeReached(task.run_at);
  const isTaskAvailableForReadingValue = isTaskAvailableForReading();

  // Timer logic for tasks that have passed
  useEffect(() => {
    if (!canCompleteTask || task.completed) return;

    const taskTime = new Date(task.run_at);
    const oneHourLater = new Date(taskTime.getTime() + 60 * 60 * 1000); // 1 hour after task time
    const now = new Date();

    if (now >= oneHourLater) {
      // Task expired - mark as not completed
      setIsExpired(true);
      if (onExpire) {
        onExpire();
      }
      return;
    }

    // Calculate time left
    const timeLeftMs = oneHourLater.getTime() - now.getTime();
    setTimeLeft(Math.floor(timeLeftMs / 1000));

    const timer = setInterval(() => {
      const currentTime = new Date();
      const remainingMs = oneHourLater.getTime() - currentTime.getTime();
      
      if (remainingMs <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        if (onExpire) {
          onExpire();
        }
        clearInterval(timer);
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [canCompleteTask, task.completed, task.run_at, onExpire]);

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity 
      onPress={isTaskAvailableForReadingValue ? onPress : undefined} 
      activeOpacity={isTaskAvailableForReadingValue ? 0.8 : 1}
      disabled={!isTaskAvailableForReadingValue}
    >
      <Card 
        variant={task.completed ? 'default' : 'gradient'} 
        padding="md" 
        style={[
          styles.container,
          task.completed && styles.completedContainer,
          !isTaskAvailableForReadingValue && styles.disabledContainer
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
                      <Text 
                        variant="caption" 
                        color={canCompleteTask ? undefined : "tertiary"}
                        style={canCompleteTask ? { color: '#FFFF68', fontWeight: '600' } : undefined}
                      >
                        {canCompleteTask ? 'Do it now' : formatTime(task.run_at)}
                      </Text>
                      {timeLeft !== null && !isExpired && (
                        <View style={styles.timerContainer}>
                          <Icon name="clock" size={12} color="#FF4444" />
                          <Text variant="caption" style={styles.timerText}>
                            {formatTimeLeft(timeLeft)}
                          </Text>
                        </View>
                      )}
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
            
            {/* Points Display - Bottom Right Corner */}
            <View style={styles.pointsContainer}>
              <Icon name="trophy" size={12} color="#FFFF68" weight="fill" />
              <Text variant="caption" style={styles.pointsText}>
                +{getTaskPoints(task.intensity)}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Completion Status - Below Card */}
      {!task.completed && canCompleteTask && !isExpired && (
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

      {/* Expired Task Message */}
      {!task.completed && isExpired && (
        <View style={styles.expiredMessageContainer}>
          <View style={styles.expiredMessage}>
            <Icon name="x-circle" size={20} color="#FF4444" weight="fill" />
            <Text style={styles.expiredMessageText}>
              This task expired and is counted as not completed
            </Text>
          </View>
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
    borderRadius: 16,
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
    marginBottom: 16,
  },
  completionButton: {
    flex: 1,
    borderRadius: 16,
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
    borderRadius: 16,
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
    position: 'relative',
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
    flexWrap: 'wrap',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  timerText: {
    color: '#FF4444',
    fontWeight: '600',
    fontSize: 10,
  },
  pointsContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  pointsText: {
    color: '#FFFF68',
    fontWeight: '600',
    fontSize: 10,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  expiredText: {
    color: '#FF4444',
    fontWeight: '600',
    fontSize: 10,
  },
  expiredMessageContainer: {
    marginTop: 0,
    marginBottom: 16,
  },
  expiredMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  expiredMessageText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
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
