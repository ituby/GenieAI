import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';
import { GoalWithProgress } from '../../../types/goal';
import { getCategoryColor, getCategoryIcon } from '../../../config/categoryConfig';

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

  // Check if goal is still loading (active but no tasks yet)
  const isLoading = goal.status === 'active' && goal.total_tasks === 0;

  // Animation for loading dots
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isLoading) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => animateDots());
      };

      const animateText = () => {
        Animated.sequence([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => animateText());
      };

      animateDots();
      animateText();
    }
  }, [isLoading, dot1Opacity, dot2Opacity, dot3Opacity, textOpacity]);

  // Get category-based color and icon
  const categoryColor = getCategoryColor(goal.category);
  const categoryIcon = getCategoryIcon(goal.category);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        variant="gradient"
        padding="md"
        style={[
          styles.container,
          hasTimeReachedTasks && styles.timeReachedContainer,
        ]}
      >
        {isLoading ? (
          /* Loading State - Minimal with only placeholders */
          <View style={styles.loadingState}>
            {/* Header with title placeholder and icon placeholder */}
            <View style={styles.loadingHeader}>
              <View style={styles.loadingTitleContainer}>
                <View style={styles.placeholderTitle} />
                <View
                  style={[
                    styles.placeholderTitle,
                    { width: '40%', height: 12 },
                  ]}
                />
              </View>
              <View style={styles.placeholderIcon} />
            </View>

            {/* Placeholder for description */}
            <View style={styles.placeholderDescription} />
            <View style={[styles.placeholderDescription, { width: '70%' }]} />

            {/* Animated loading dots and text */}
            <View style={styles.loadingDotsContainer}>
              <View style={styles.loadingDots}>
                <Animated.View
                  style={[
                    styles.loadingDot,
                    {
                      backgroundColor: theme.colors.text.tertiary,
                      opacity: dot1Opacity,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.loadingDot,
                    {
                      backgroundColor: theme.colors.text.tertiary,
                      opacity: dot2Opacity,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.loadingDot,
                    {
                      backgroundColor: theme.colors.text.tertiary,
                      opacity: dot3Opacity,
                    },
                  ]}
                />
              </View>

              {/* Animated text on the same row */}
              <View style={styles.loadingTextContainer}>
                <Animated.Text
                  style={[styles.loadingTextAnimated, { opacity: textOpacity }]}
                >
                  Creating your tasks...
                </Animated.Text>
              </View>
            </View>
          </View>
        ) : (
          /* Normal State */
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <View style={styles.titleText}>
                  <Text variant="h4" numberOfLines={1} style={styles.title}>
                    {goal.title}
                  </Text>
                  <Text
                    variant="caption"
                    style={[
                      styles.category,
                      { color: categoryColor },
                    ]}
                  >
                    {goal.category.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Icon
                  name={categoryIcon as any}
                  size={20}
                  color={categoryColor}
                />
              </View>
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
                      backgroundColor: categoryColor,
                    },
                  ]}
                />
              </View>

              {/* Streak */}
              {goal.current_streak > 0 && (
                <View style={styles.streakContainer}>
                  <Icon
                    name="fire"
                    size={12}
                    color={theme.colors.status.success}
                  />
                  <Text
                    variant="caption"
                    color="success"
                    style={styles.streakText}
                  >
                    {goal.current_streak} day streak
                  </Text>
                </View>
              )}
            </View>

            {/* Status and Actions */}
            <View style={styles.statusAndActionsContainer}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      goal.status === 'active'
                        ? theme.colors.primary[500] + '20'
                        : theme.colors.text.disabled + '20',
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={goal.status === 'active' ? 'success' : 'disabled'}
                  style={styles.statusText}
                >
                  {goal.status === 'active'
                    ? 'Active'
                    : goal.status === 'completed'
                      ? 'Completed'
                      : 'Paused'}
                </Text>
              </View>

              {onEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                  <Icon
                    name="dots-three"
                    size={16}
                    color={theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
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
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  statusAndActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAnimation: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  loadingText: {
    textAlign: 'center',
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: 'flex-start',
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 12,
  },
  loadingTitleContainer: {
    flex: 1,
    gap: 8,
  },
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderTitle: {
    height: 20,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  placeholderDescription: {
    height: 16,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    marginBottom: 6,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  loadingTextContainer: {
    paddingLeft: 8,
  },
  loadingTextAnimated: {
    fontSize: 13,
    color: '#FFFF68',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
