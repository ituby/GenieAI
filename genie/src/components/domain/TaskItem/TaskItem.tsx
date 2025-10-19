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
import { cleanDescription } from '../../../utils/descriptionUtils';
import { getCategoryColor } from '../../../config/categoryConfig';

export interface TaskItemProps {
  task: TaskWithGoal;
  onExpire?: () => void;
  onPress?: () => void;
  allTasks?: TaskWithGoal[];
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onExpire,
  onPress,
  allTasks = [],
}) => {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const truncateWords = (text: string, maxWords: number) => {
    const words = (text || '').trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + ' ...';
  };

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

  // Get category-based color
  const categoryColor = getCategoryColor(task.goal.category);

  const getTaskPoints = (intensity?: string) => {
    // All tasks are worth 10 points regardless of intensity
    return 10;
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

    // For future tasks, only show the next upcoming task as available for reading
    if (allTasks.length === 0) return true;

    const upcomingTasks = allTasks
      .filter((t) => !t.completed && new Date(t.run_at) > now)
      .sort(
        (a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
      );

    if (upcomingTasks.length === 0) return true;

    // Only the closest upcoming task should be available for reading
    const closestTask = upcomingTasks[0];
    return closestTask.id === task.id;
  };

  const canCompleteTask = isTaskTimeReached(task.run_at);
  const isTaskAvailableForReadingValue = isTaskAvailableForReading();
  
  // Check if task time has been reached for yellow highlighting
  const isTaskTimeReachedForHighlight = isTaskTimeReached(task.run_at);

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
          !isTaskAvailableForReadingValue && styles.disabledContainer,
          isTaskTimeReachedForHighlight && !task.completed && styles.timeReachedContainer,
        ]}
      >
        <View style={styles.content}>
          {/* Task Content */}
          <View style={styles.taskContent}>
            {/* Header */}
            <View style={styles.taskHeader}>
              <Text
                variant="h4"
                numberOfLines={1}
                style={[
                  styles.taskTitle,
                  task.completed && styles.completedText,
                  { color: categoryColor },
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
                  color={canCompleteTask ? undefined : 'tertiary'}
                  style={
                    canCompleteTask
                      ? { color: '#FFFF68', fontWeight: '600' }
                      : undefined
                  }
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
                task.completed && styles.completedText,
              ]}
            >
              {cleanDescription(task.description)}
            </Text>

            {/* Goal Info */}
            <View style={styles.goalInfo}>
              <Text
                variant="caption"
                color="primary-color"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {truncateWords(task.goal.title, 6)}
              </Text>
              <Text
                variant="caption"
                color="tertiary"
                style={{ textAlign: 'right' }}
              >
                • {getTimeOfDayText(task.run_at)}
              </Text>
            </View>

            {/* Bottom Row - Status and Points */}
            <View style={styles.bottomRow}>
              {/* Status Badge - Left Side */}
              {task.completed ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors.status.success + '20' },
                  ]}
                >
                  <Icon
                    name="check"
                    size={14}
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
                    size={14}
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
                <View style={styles.emptySpace} />
              )}

              {/* Points Display - Right Side */}
              <View style={styles.pointsContainer}>
                <Icon name="trophy" size={12} color="#FFFF68" weight="fill" />
                <Text variant="caption" style={styles.pointsText}>
                  +{getTaskPoints(task.intensity)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>


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
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    minHeight: 24,
  },
  emptySpace: {
    flex: 1,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    marginBottom: 12,
    lineHeight: 20,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeReachedContainer: {
    borderColor: '#FFFF68',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
  },
});
