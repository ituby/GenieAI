import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';
import { GoalWithProgress } from '../../../types/goal';

export interface GoalCardProps {
  goal: GoalWithProgress;
  onPress?: () => void;
  onEdit?: () => void;
  hasTimeReachedTasks?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onEdit,
  hasTimeReachedTasks = false,
}) => {
  const theme = useTheme();

  const getGoalColor = (goalColor?: string) => {
    // Use AI-selected color if available
    if (goalColor) {
      // Check if it's already a hex color
      if (goalColor.startsWith('#')) {
        return goalColor;
      }
      
      // Map color names to hex values
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
    
    // Fallback to neutral colors when no AI color is provided
    return theme.colors.text.secondary;
  };

  const getCategoryIcon = (category: string, iconName?: string) => {
    // Use AI-selected icon if available
    if (iconName) {
      return iconName;
    }
    
    // Fallback to category-based icons
    const icons = {
      lifestyle: 'heart',
      career: 'briefcase',
      mindset: 'brain',
      character: 'star',
      custom: 'target',
    };
    return icons[category as keyof typeof icons] || icons.custom;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card 
        variant="gradient" 
        padding="md" 
        style={[
          styles.container,
          hasTimeReachedTasks && styles.timeReachedContainer
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: getGoalColor(goal.color) + '20' }]}>
                  <Icon 
                    name={getCategoryIcon(goal.category, goal.icon_name) as any}
                    size={20}
                    color={getGoalColor(goal.color)}
                  />
                </View>
            <View style={styles.titleText}>
              <Text variant="h4" numberOfLines={1} style={styles.title}>
                {goal.title}
              </Text>
                  <Text 
                    variant="caption" 
                    style={[styles.category, { color: getGoalColor(goal.color) }]}
                  >
                    {goal.category.toUpperCase()}
                  </Text>
            </View>
          </View>
          
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
              <Icon name="dots-three" size={16} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <Text 
          variant="body" 
          color="secondary" 
          numberOfLines={2} 
          style={styles.description}
        >
          {goal.description}
        </Text>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text variant="caption" color="tertiary">
              {goal.completed_tasks}/{goal.total_tasks} tasks
            </Text>
            <Text variant="caption" color="primary-color">
              {Math.round(goal.completion_percentage)}%
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${goal.completion_percentage}%`,
                  backgroundColor: getGoalColor(goal.color),
                },
              ]}
            />
          </View>

          {/* Streak */}
          {goal.current_streak > 0 && (
            <View style={styles.streakContainer}>
              <Icon name="fire" size={12} color={theme.colors.status.success} />
              <Text variant="caption" color="success" style={styles.streakText}>
                {goal.current_streak} day streak
              </Text>
            </View>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: goal.status === 'active' ? theme.colors.primary[500] + '20' : theme.colors.text.disabled + '20' }
          ]}>
            <Text 
              variant="caption" 
              color={goal.status === 'active' ? 'success' : 'disabled'}
              style={styles.statusText}
            >
              {goal.status === 'active' ? 'Active' : goal.status === 'completed' ? 'Completed' : 'Paused'}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleText: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 4,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  streakText: {
    marginLeft: 4,
  },
  statusContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeReachedContainer: {
    borderColor: '#FFFF68',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
  },
});
