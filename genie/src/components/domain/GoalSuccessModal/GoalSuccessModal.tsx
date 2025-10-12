import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../primitives';
import { useTheme } from '../../../theme';
import { Icon } from '../../primitives';

interface GoalSuccessModalProps {
  visible: boolean;
  taskCount: number;
  rewardCount: number;
  iconName?: string;
  color?: string;
  onStartJourney: () => void;
}

export const GoalSuccessModal: React.FC<GoalSuccessModalProps> = ({
  visible,
  taskCount,
  rewardCount,
  iconName,
  color,
  onStartJourney,
}) => {
  const theme = useTheme();
  const [celebrationAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Celebration animation
      Animated.sequence([
        Animated.timing(celebrationAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnimation, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

    }
  }, [visible, celebrationAnimation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer]}>
          <View style={[styles.modal, { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>

            {/* Logo with celebration animation */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: celebrationAnimation }],
                },
              ]}
            >
              <Image
                source={require('../../../../assets/LogoSymbol.webp')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Success content */}
            <View style={styles.content}>
              <Text variant="h3" style={[styles.title, { color: '#FFFFFF' }]}>
                Your Goal is Ready!
              </Text>
              
              <Text variant="body" style={[styles.subtitle, { color: '#FFFFFF', opacity: 0.8 }]}>
                Genie has created your personalized 21-day journey with{' '}
                <Text style={{ color: '#FFFF68', fontWeight: '600' }}>
                  {taskCount} daily tasks
                </Text>
                ,{' '}
                <Text style={{ color: '#FFFF68', fontWeight: '600' }}>
                  {rewardCount} rewards
                </Text>
                , and smart notifications to keep you motivated!
              </Text>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Icon name="check-circle" size={24} color="#FFFF68" weight="fill" />
                  <Text variant="caption" style={[styles.statText, { color: '#FFFFFF', opacity: 0.8 }]}>
                    {taskCount} Tasks
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Icon name="trophy" size={24} color="#FFFF68" weight="fill" />
                  <Text variant="caption" style={[styles.statText, { color: '#FFFFFF', opacity: 0.8 }]}>
                    {rewardCount} Rewards
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Icon name="bell" size={24} color="#FFFF68" weight="fill" />
                  <Text variant="caption" style={[styles.statText, { color: '#FFFFFF', opacity: 0.8 }]}>
                    Smart Alerts
                  </Text>
                </View>
              </View>
            </View>

            {/* Action button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={onStartJourney}
              activeOpacity={0.8}
            >
              <View style={styles.startButtonContent}>
                <Text style={styles.startButtonText}>Let's do it</Text>
                <Icon name="arrow-right" size={18} color="#000000" weight="bold" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFF68',
    padding: 2,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modal: {
    width: '100%',
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 70,
    height: 70,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#FFFF68',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
