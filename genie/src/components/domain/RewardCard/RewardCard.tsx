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
}

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  onPress,
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
        return theme.colors.blue[500];
      case 'milestone':
        return theme.colors.purple[500];
      case 'completion':
        return theme.colors.status.success;
      default:
        return theme.colors.text.secondary;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card 
        variant={reward.unlocked ? 'gradient' : 'default'} 
        padding="md" 
        style={[
          styles.container,
          { 
            opacity: reward.unlocked ? 1 : 0.6,
            borderColor: reward.unlocked ? getRewardColor(reward.type) : theme.colors.border.primary,
            borderWidth: 1,
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon 
              name={getRewardIcon(reward.type) as any}
              size={24}
              color={reward.unlocked ? getRewardColor(reward.type) : theme.colors.text.tertiary}
              weight={reward.unlocked ? 'fill' : 'regular'}
            />
          </View>
          
          <View style={styles.content}>
            <Text 
              variant="h4" 
              style={[
                styles.title,
                { color: reward.unlocked ? theme.colors.text.primary : theme.colors.text.secondary }
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
        </View>
        
        {reward.day_offset !== undefined && (
          <View style={styles.dayInfo}>
            <Icon name="calendar" size={12} color={theme.colors.text.tertiary} />
            <Text variant="caption" color="tertiary">
              יום {reward.day_offset + 1}
            </Text>
          </View>
        )}
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
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
});
