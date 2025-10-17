import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
  
  // Check if goal is still loading (active but no tasks yet)
  const isLoading = goal.status === 'active' && goal.total_tasks === 0;
  
  // Animation for loading dots
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  
  // Calculate estimated time based on goal duration
  useEffect(() => {
    if (isLoading && goal.duration_days) {
      // Estimate: 1-2 minutes per week of plan
      const weeks = Math.ceil(goal.duration_days / 7);
      const estimatedMinutes = Math.max(weeks * 1.5, 2); // Minimum 2 minutes
      setEstimatedTime(estimatedMinutes * 60); // Convert to seconds
      setTimeRemaining(estimatedMinutes * 60);
    }
  }, [isLoading, goal.duration_days]);
  
  // Timer countdown
  useEffect(() => {
    if (isLoading && estimatedTime > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isLoading, estimatedTime]);
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
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
      
      animateDots();
    }
  }, [isLoading, dot1Opacity, dot2Opacity, dot3Opacity]);

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
        {isLoading ? (
          /* Loading State - Minimal with only placeholders */
          <View style={styles.loadingState}>
            {/* Placeholder for icon */}
            <View style={styles.placeholderIcon} />
            
            {/* Placeholder for title */}
            <View style={styles.placeholderTitle} />
            
            {/* Placeholder for description */}
            <View style={styles.placeholderDescription} />
            <View style={[styles.placeholderDescription, { width: '70%' }]} />
            
            {/* Animated loading dots */}
            <View style={styles.loadingDotsContainer}>
              <View style={styles.loadingDots}>
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: theme.colors.text.tertiary,
                    opacity: dot1Opacity
                  }
                ]} />
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: theme.colors.text.tertiary,
                    opacity: dot2Opacity
                  }
                ]} />
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: theme.colors.text.tertiary,
                    opacity: dot3Opacity
                  }
                ]} />
              </View>
            </View>
            
            {/* Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                {formatTime(timeRemaining)}
              </Text>
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
                    {goal.title.split(' ').slice(0, 6).join(' ')}
                    {goal.title.split(' ').length > 6 && '...'}
                  </Text>
                  <Text 
                    variant="caption" 
                    style={[styles.category, { color: getGoalColor(goal.color) }]}
                  >
                    {goal.category.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.iconContainer, { backgroundColor: getGoalColor(goal.color) + '20' }]}>
                <Icon 
                  name={getCategoryIcon(goal.category, goal.icon_name) as any}
                  size={20}
                  color={getGoalColor(goal.color)}
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

            {/* Status and Edit Button */}
            <View style={styles.statusAndEditContainer}>
              {/* Status - Left side */}
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
              
              {/* Edit Button - Right side */}
              {onEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                  <Icon name="dots-three" size={16} color={theme.colors.text.tertiary} />
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
    fontSize: 20,
    fontWeight: '600',
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  statusAndEditContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
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
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
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
    alignItems: 'center',
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timerContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
});
