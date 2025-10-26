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
      <View 
        style={[
          styles.container,
          { 
            opacity: isActive ? 1 : 0.5,
            backgroundColor: isActive ? 'rgba(255, 255, 104, 0.08)' : 'rgba(255, 255, 255, 0.05)',
            borderColor: isActive ? 'rgba(255, 255, 104, 0.25)' : 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
          }
        ]}
      >
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            { 
              backgroundColor: isActive ? theme.colors.yellow[500] : 'rgba(255, 255, 255, 0.1)' 
            }
          ]}>
            <Icon 
              name={getRewardIcon(reward.type) as any}
              size={18}
              color={isActive ? '#000000' : 'rgba(255, 255, 255, 0.3)'}
              weight="fill"
            />
          </View>
          
          <View style={styles.content}>
            <Text 
              variant="h4" 
              style={[
                styles.title,
                { 
                  color: isActive ? theme.colors.text.primary : theme.colors.text.secondary,
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 2,
                }
              ]}
            >
              {reward.title}
            </Text>
            
            {reward.points_value && reward.points_value > 0 && (
              <Text 
                variant="caption" 
                style={[
                  styles.pointsText,
                  { 
                    color: isActive ? theme.colors.yellow[500] : 'rgba(255, 255, 104, 0.4)',
                    fontSize: 11,
                  }
                ]}
              >
                +{reward.points_value} points
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {reward.description && (
          <Text 
            variant="body" 
            color="secondary"
            style={[
              styles.description,
              { 
                fontSize: 12,
                marginTop: 8,
                opacity: isActive ? 0.8 : 0.5,
              }
            ]}
          >
            {reward.description}
          </Text>
        )}

        {/* Status and progress info */}
        {(reward.type === 'daily' && todayProgress && !reward.unlocked) || reward.day_offset !== undefined || reward.unlocked || hasProgress ? (
          <View style={styles.statusRow}>
            {reward.type === 'daily' && todayProgress && !reward.unlocked ? (
              <View style={styles.statusInfo}>
                <Icon name="target" size={12} color={theme.colors.text.tertiary} />
                <Text variant="caption" color="tertiary" style={{ fontSize: 11 }}>
                  Today: {todayProgress.completed}/{todayProgress.total} tasks
                </Text>
              </View>
            ) : reward.day_offset !== undefined ? (
              <View style={styles.statusInfo}>
                <Icon name="calendar" size={12} color={theme.colors.text.tertiary} />
                <Text variant="caption" color="tertiary" style={{ fontSize: 11 }}>
                  {reward.day_offset === 2 ? 'After 3 days' : 
                   reward.day_offset === 6 ? 'After 1 week' :
                   reward.day_offset === 13 ? 'After 2 weeks' :
                   reward.day_offset === 20 ? 'After 3 weeks' :
                   `Day ${reward.day_offset + 1}`}
                </Text>
              </View>
            ) : null}
            
            {reward.unlocked && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={12} color={theme.colors.yellow[500]} weight="fill" />
                <Text variant="caption" style={[styles.completedText, { color: theme.colors.yellow[500], fontSize: 11 }]}>
                  Unlocked
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  pointsText: {
    fontWeight: '600',
  },
  description: {
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontWeight: '600',
  },
});
