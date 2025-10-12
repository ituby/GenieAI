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
          
          <View style={styles.iconContainer}>
            <Icon 
              name={getRewardIcon(reward.type) as any}
              size={24}
              color={isActive ? getRewardColor(reward.type) : theme.colors.text.tertiary}
              weight={isActive ? 'fill' : 'regular'}
            />
          </View>
        </View>
        
        {(reward.type === 'daily' && todayProgress && !reward.unlocked) || reward.day_offset !== undefined || reward.unlocked || hasProgress ? (
          <View style={styles.dayInfo}>
            <View style={styles.dayInfoLeft}>
              {reward.type === 'daily' && todayProgress && !reward.unlocked ? (
                <>
                  <Icon name="target" size={12} color={theme.colors.text.tertiary} />
                  <Text variant="caption" color="tertiary">
                    Today: {todayProgress.completed}/{todayProgress.total} tasks completed
                  </Text>
                </>
              ) : reward.day_offset !== undefined ? (
                <>
                  <Icon name="calendar" size={12} color={theme.colors.text.tertiary} />
                  <Text variant="caption" color="tertiary">
                    {reward.day_offset === 2 ? 'After 3 days' : 
                     reward.day_offset === 6 ? 'After 1 week' :
                     reward.day_offset === 13 ? 'After 2 weeks' :
                     reward.day_offset === 20 ? 'After 3 weeks' :
                     `Day ${reward.day_offset + 1}`}
                  </Text>
                </>
              ) : null}
            </View>
            
            <View style={styles.statusIcons}>
              {reward.unlocked && (
                <View style={styles.completedBadge}>
                  <Icon name="trophy" size={14} color={theme.colors.yellow[500]} weight="fill" />
                  <Text variant="caption" style={[styles.completedText, { color: theme.colors.yellow[500] }]}>
                    Completed
                  </Text>
                </View>
              )}
              
              {hasProgress && (
                <View style={styles.progressBadge}>
                  <Icon name="clock" size={20} color={theme.colors.yellow[500]} weight="fill" />
                </View>
              )}
            </View>
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
    marginLeft: 12,
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
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
