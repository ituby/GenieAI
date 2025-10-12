import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/index';
import { Text } from '../../primitives/Text';
import { Card } from '../../primitives/Card';
import { Icon } from '../../primitives/Icon';
import { Reward } from '../../../types/goal';

export interface RewardCardProps {
  reward: Reward;
  onPress?: () => void;
  todayProgress?: { completed: number; total: number };
}

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  onPress,
  todayProgress,
}) => {
  const theme = useTheme();

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return 'sun';
      case 'milestone':
        return 'trophy';
      case 'completion':
        return 'check-circle';
      default:
        return 'gift';
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'daily':
        return theme.colors.yellow[500];
      case 'milestone':
        return theme.colors.yellow[500];
      case 'completion':
        return theme.colors.yellow[500];
      default:
        return theme.colors.yellow[500];
    }
  };

  // Check if achievement has progress (for locked achievements)
  const hasProgress = !reward.unlocked && todayProgress && todayProgress.completed > 0;
  const isActive = reward.unlocked || hasProgress;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card 
        variant={isActive ? 'gradient' : 'default'} 
        padding="md" 
        style={[
          styles.container,
          { 
            opacity: isActive ? 1 : 0.6,
            borderColor: isActive ? getRewardColor(reward.type) : theme.colors.border.primary,
            borderWidth: 1,
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon 
              name={getRewardIcon(reward.type) as any}
              size={24}
              color={isActive ? getRewardColor(reward.type) : theme.colors.text.tertiary}
              weight={isActive ? 'fill' : 'regular'}
            />
          </View>
          
          <View style={styles.content}>
            <Text 
              variant="h4" 
              style={[
                styles.title,
                { color: isActive ? theme.colors.text.primary : theme.colors.text.secondary }
              ]}
            >
              {reward.title}
            </Text>
            
            <Text 
              variant="body" 
              color="secondary"
              style={styles.description}
            >
              {reward.description}
            </Text>
          </View>
          
          {reward.unlocked && (
            <View style={styles.unlockedBadge}>
              <Icon name="check-circle" size={16} color={theme.colors.status.success} weight="fill" />
            </View>
          )}
          
          {hasProgress && (
            <View style={styles.progressBadge}>
              <Icon name="clock" size={16} color={theme.colors.yellow[500]} weight="fill" />
            </View>
          )}
        </View>
        
        {reward.type === 'daily' && todayProgress && !reward.unlocked ? (
          <View style={styles.dayInfo}>
            <Icon name="target" size={12} color={theme.colors.text.tertiary} />
            <Text variant="caption" color="tertiary">
              Today: {todayProgress.completed}/{todayProgress.total} tasks completed
            </Text>
          </View>
        ) : reward.day_offset !== undefined ? (
          <View style={styles.dayInfo}>
            <Icon name="calendar" size={12} color={theme.colors.text.tertiary} />
            <Text variant="caption" color="tertiary">
              {reward.day_offset === 2 ? 'After 3 days' : 
               reward.day_offset === 6 ? 'After 1 week' :
               reward.day_offset === 13 ? 'After 2 weeks' :
               reward.day_offset === 20 ? 'After 3 weeks' :
               `Day ${reward.day_offset + 1}`}
            </Text>
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
  },
  unlockedBadge: {
    marginLeft: 8,
    paddingTop: 4,
  },
  progressBadge: {
    marginLeft: 8,
    paddingTop: 4,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
});
