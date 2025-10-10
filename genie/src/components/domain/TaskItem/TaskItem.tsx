import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';
import { TaskWithGoal } from '../../../types/task';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface TaskItemProps {
  task: TaskWithGoal;
  onToggleComplete?: () => void;
  onPress?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onPress,
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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card 
        variant={task.completed ? 'default' : 'gradient'} 
        padding="md" 
        style={[
          styles.container,
          task.completed && styles.completedContainer
        ]}
      >
        <View style={styles.content}>
          {/* Checkbox */}
          <TouchableOpacity 
            onPress={onToggleComplete}
            style={[
              styles.checkbox,
              {
                backgroundColor: task.completed 
                  ? theme.colors.green[500] 
                  : 'transparent',
                borderColor: task.completed 
                  ? theme.colors.green[500] 
                  : theme.colors.border.primary,
              }
            ]}
          >
            {task.completed && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          {/* Task Content */}
          <View style={styles.taskContent}>
            {/* Header */}
            <View style={styles.taskHeader}>
              <Text 
                variant="h4" 
                numberOfLines={1}
                style={[
                  styles.taskTitle,
                  task.completed && styles.completedText
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

            {/* Goal Info */}
            <View style={styles.goalInfo}>
              <Text variant="caption" color="purple">
                {task.goal.title}
              </Text>
              <Text variant="caption" color="tertiary">
                • {getTimeOfDayText(task.run_at)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  completedContainer: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
