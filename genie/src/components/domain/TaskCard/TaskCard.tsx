import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Icon } from '../../primitives';
import { Task, Subtask } from '../../../types/task';
import { useTheme } from '../../../theme';
import { cleanDescription } from '../../../utils/descriptionUtils';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onSubtaskToggle: (taskId: string, subtaskIndex: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onSubtaskToggle,
}) => {
  const theme = useTheme();
  const [showSubtasks, setShowSubtasks] = useState(true);

  const allSubtasksCompleted = task.subtasks?.every(subtask => subtask.completed) || false;
  const completedSubtasks = task.subtasks?.filter(subtask => subtask.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const handleCompleteTask = () => {
    if (allSubtasksCompleted) {
      onComplete(task.id);
    }
  };

  const formatTime = (dateString: string, customTime?: string) => {
    // 🚨 FIX: Use custom_time if available (exact time user wants)
    if (customTime) {
      return customTime;
    }
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card variant="default" padding="md" style={styles.container}>
      {/* Task Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {task.title}
          </Text>
          <View style={styles.timeContainer}>
            <Icon name="clock" size={14} color={theme.colors.text.secondary} />
            <Text style={[styles.time, { color: theme.colors.text.secondary }]}>
              {formatTime(task.run_at, task.custom_time)} • {formatDate(task.run_at)}
            </Text>
          </View>
        </View>
        
        {/* Time Allocation Badge */}
        {task.time_allocation_minutes && (
          <View style={[styles.timeBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.timeBadgeText, { color: theme.colors.background.primary }]}>
              {task.time_allocation_minutes}min
            </Text>
          </View>
        )}
      </View>

      {/* Task Description */}
      <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
        {cleanDescription(task.description)}
      </Text>

      {/* Subtasks Section */}
      {task.subtasks && task.subtasks.length > 0 && (
        <View style={styles.subtasksContainer}>
          <TouchableOpacity 
            style={styles.subtasksHeader}
            onPress={() => setShowSubtasks(!showSubtasks)}
          >
            <Text style={[styles.subtasksTitle, { color: theme.colors.text.primary }]}>
              Subtasks ({completedSubtasks}/{totalSubtasks})
            </Text>
            <Icon 
              name={showSubtasks ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={theme.colors.text.secondary} 
            />
          </TouchableOpacity>

          {showSubtasks && (
            <View style={styles.subtasksList}>
              {task.subtasks.map((subtask, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subtaskItem,
                    subtask.completed && styles.subtaskCompleted
                  ]}
                  onPress={() => onSubtaskToggle(task.id, index)}
                >
                  <View style={styles.subtaskContent}>
                    <View style={[
                      styles.checkbox,
                      subtask.completed && [styles.checkboxChecked, { backgroundColor: theme.colors.primary }]
                    ]}>
                      {subtask.completed && (
                        <Icon name="check" size={12} color={theme.colors.background.primary} />
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
          )}
        </View>
      )}

      {/* Complete Task Button */}
      {allSubtasksCompleted && !task.completed && (
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCompleteTask}
        >
          <Text style={[styles.completeButtonText, { color: theme.colors.background.primary }]}>
            Complete Task
          </Text>
          <Icon name="check" size={16} color={theme.colors.background.primary} />
        </TouchableOpacity>
      )}

      {/* Completed State */}
      {task.completed && (
        <View style={[styles.completedBadge, { backgroundColor: theme.colors.success }]}>
          <Icon name="check" size={16} color={theme.colors.background.primary} />
          <Text style={[styles.completedText, { color: theme.colors.background.primary }]}>
            Completed
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  subtasksContainer: {
    marginBottom: 16,
  },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtasksTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtasksList: {
    gap: 8,
  },
  subtaskItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  subtaskCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
