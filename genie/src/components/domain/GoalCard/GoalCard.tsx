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
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onEdit,
}) => {
  const theme = useTheme();

  const getCategoryColor = (category: string) => {
    const colors = {
      lifestyle: theme.colors.blue[500],
      career: theme.colors.purple[500],
      mindset: theme.colors.green[500],
      character: theme.colors.purple[400],
      custom: theme.colors.text.secondary,
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      lifestyle: 'heart',
      career: 'briefcase',
      mindset: 'brain',
      character: 'sparkle',
      custom: 'target',
    };
    return icons[category as keyof typeof icons] || icons.custom;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card variant="gradient" padding="md" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(goal.category) + '20' }]}>
              <Icon 
                name={getCategoryIcon(goal.category) as any}
                size={20}
                color={getCategoryColor(goal.category)}
              />
            </View>
            <View style={styles.titleText}>
              <Text variant="h4" numberOfLines={1} style={styles.title}>
                {goal.title}
              </Text>
              <Text 
                variant="caption" 
                style={[styles.category, { color: getCategoryColor(goal.category) }]}
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
              {goal.completed_tasks}/{goal.total_tasks} משימות
            </Text>
            <Text variant="caption" color="purple">
              {Math.round(goal.completion_percentage)}%
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${goal.completion_percentage}%`,
                  backgroundColor: getCategoryColor(goal.category),
                },
              ]}
            />
          </View>

          {/* Streak */}
          {goal.current_streak > 0 && (
            <View style={styles.streakContainer}>
              <Icon name="fire" size={12} color={theme.colors.status.success} />
              <Text variant="caption" color="success" style={styles.streakText}>
                {goal.current_streak} ימים ברצף
              </Text>
            </View>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: goal.status === 'active' ? theme.colors.green[500] + '20' : theme.colors.text.disabled + '20' }
          ]}>
            <Text 
              variant="caption" 
              color={goal.status === 'active' ? 'success' : 'disabled'}
              style={styles.statusText}
            >
              {goal.status === 'active' ? 'פעיל' : goal.status === 'completed' ? 'הושלם' : 'מושהה'}
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
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
