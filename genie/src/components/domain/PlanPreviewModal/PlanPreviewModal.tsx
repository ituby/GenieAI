import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from '../../primitives';
import { useTheme } from '../../../theme';
import { Icon } from '../../primitives';

interface Milestone {
  week: number;
  title: string;
  description: string;
  tasks: number;
}

interface PlanPreviewModalProps {
  visible: boolean;
  milestones: Milestone[];
  goalTitle: string;
  planOutline?: Array<{ title: string; description: string }>;
  onApprove: () => void;
  onTryAgain: () => void;
}

export const PlanPreviewModal: React.FC<PlanPreviewModalProps> = ({
  visible,
  milestones,
  goalTitle,
  planOutline,
  onApprove,
  onTryAgain,
}) => {
  const theme = useTheme();
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [slideAnimation] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnimation.setValue(0);
      slideAnimation.setValue(50);
    }
  }, [visible, fadeAnimation, slideAnimation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            },
          ]}
        >
          <View
            style={[styles.modal, { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text variant="h4" style={[styles.title, { color: '#FFFFFF' }]}>
                Plan Confirmation
              </Text>
            </View>

            {/* Outline or Milestones */}
            <ScrollView
              style={styles.milestonesContainer}
              showsVerticalScrollIndicator={false}
            >
              {(planOutline && planOutline.length > 0
                ? planOutline
                : milestones.map((m) => ({
                    title: m.title,
                    description: m.description,
                  }))
              ).map((section, index) => (
                <View
                  key={`${section.title}-${index}`}
                  style={styles.milestoneCard}
                >
                  <Text
                    variant="h4"
                    style={[styles.milestoneTitle, { color: '#FFFFFF' }]}
                  >
                    {section.title}
                  </Text>

                  <Text
                    variant="body"
                    style={[
                      styles.milestoneDescription,
                      { color: '#FFFFFF', opacity: 0.8 },
                    ]}
                  >
                    {section.description}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Approve Button */}
            <TouchableOpacity
              style={styles.approveButton}
              onPress={onApprove}
              activeOpacity={0.8}
            >
              <View style={styles.approveButtonContent}>
                <Icon
                  name="check-circle"
                  size={20}
                  color="#000000"
                  weight="fill"
                />
                <Text style={styles.approveButtonText}>Approve Plan</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Try Again Button - Outside modal */}
        <TouchableOpacity
          style={styles.tryAgainTextButton}
          onPress={onTryAgain}
          activeOpacity={0.7}
        >
          <Text style={styles.tryAgainTextButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 60,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    height: height * 0.75,
    borderRadius: 20,
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
    height: '100%',
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 35,
    height: 35,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  milestonesContainer: {
    flex: 1,
    marginBottom: 12,
  },
  milestoneCard: {
    backgroundColor: 'rgba(255, 255, 104, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 104, 0.2)',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekBadge: {
    backgroundColor: '#FFFF68',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  weekText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  taskCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskCountText: {
    color: '#FFFF68',
    fontSize: 12,
    fontWeight: '500',
  },
  milestoneTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  milestoneDescription: {
    lineHeight: 18,
    fontSize: 13,
  },
  tryAgainTextButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tryAgainTextButtonText: {
    color: '#FFFF68',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  approveButton: {
    backgroundColor: '#FFFF68',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#FFFF68',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  approveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
