import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text, Card, Icon, FloatingBottomNav } from '../components';
import { Button } from '../components/primitives/Button';
import { GoalCard } from '../components/domain/GoalCard';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GoalWithProgress } from '../types/goal';
import { colors } from '../theme/colors';

interface MyPlansScreenProps {
  onBack: () => void;
  onGoalPress?: (goal: GoalWithProgress) => void;
  onHomePress?: () => void;
  onDailyGoalsPress?: () => void;
  onCreatePress?: () => void;
}

export const MyPlansScreen: React.FC<MyPlansScreenProps> = ({ 
  onBack, 
  onGoalPress, 
  onHomePress, 
  onDailyGoalsPress, 
  onCreatePress 
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { activeGoals, loading, fetchGoals, deleteGoal } = useGoalStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalMenu, setShowGoalMenu] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchGoals(user.id);
    }
  }, [user?.id, fetchGoals]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchGoals(user.id);
    }
    setRefreshing(false);
  };

  const handleGoalPress = (goal: GoalWithProgress) => {
    if (onGoalPress) {
      onGoalPress(goal);
    }
  };

  const handleGoalEdit = (goalId: string) => {
    setShowGoalMenu(goalId);
  };

  const handleEditGoal = (goalId: string) => {
    setShowGoalMenu(null);
    // TODO: Navigate to edit goal screen or show edit modal
    console.log('Edit goal:', goalId);
  };

  const handleDeleteGoal = (goalId: string) => {
    setShowGoalMenu(null);
    setGoalToDelete(goalId);
    setShowDeleteModal(true);
    setDeleteConfirmationText('');
  };

  const confirmDeleteGoal = async () => {
    console.log('confirmDeleteGoal called');
    const trimmedText = deleteConfirmationText.toLowerCase().trim();
    console.log('Trimmed text:', trimmedText);
    console.log('goalToDelete:', goalToDelete);
    
    if (trimmedText !== "delete it") {
      console.log('Text does not match, returning');
      return;
    }
    
    if (!goalToDelete) {
      console.log('No goal to delete, returning');
      return;
    }
    
    console.log('Text matches, proceeding with deletion');
    setShowDeleteModal(false);
    setDeleteConfirmationText('');
    
    try {
      console.log('Calling deleteGoal with:', goalToDelete);
      await deleteGoal(goalToDelete);
      console.log('deleteGoal completed successfully');
      
      if (user?.id) {
        console.log('Refreshing goals for user:', user.id);
        await fetchGoals(user.id);
        console.log('Goals refreshed');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setGoalToDelete(null);
    }
  };

  return (
    <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          My Plans
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[400]}
          />
        }
      >
        {/* Stats Card */}
        <Card variant="gradient" padding="md" style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderWithIcon}>
              <Icon
                name="target"
                size={20}
                color={theme.colors.text.primary}
                weight="fill"
              />
              <Text variant="h4">Plans Overview</Text>
            </View>
          </View>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {activeGoals.length}
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Active Plans
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {activeGoals.filter(goal => goal.completion_percentage >= 100).length}
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Completed
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h2" style={styles.statNumber}>
                {Math.round(activeGoals.reduce((sum, goal) => sum + goal.completion_percentage, 0) / (activeGoals.length || 1))}%
              </Text>
              <Text variant="caption" color="secondary" style={styles.statLabel}>
                Avg Progress
              </Text>
            </View>
          </View>
        </Card>

        {/* Plans List */}
        <View style={styles.section}>
          {activeGoals.length === 0 ? (
            <Card variant="gradient" padding="lg" style={styles.emptyStateCard}>
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="target"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">All Plans</Text>
              </View>
              <View style={styles.emptyStateContent}>
                <Icon
                  name="target"
                  size={48}
                  color="rgba(255, 255, 255, 0.6)"
                  weight="fill"
                />
                <Text variant="h3" style={styles.emptyStateTitle}>
                  No Plans Yet
                </Text>
                <Text variant="body" color="secondary" style={styles.emptyStateDescription}>
                  Create your first plan to start your journey towards your goals
                </Text>
              </View>
            </Card>
          ) : (
            <Card variant="gradient" padding="md" style={styles.plansListCard}>
              <View style={styles.sectionHeaderWithIcon}>
                <Icon
                  name="target"
                  size={20}
                  color="#FFFF68"
                  weight="fill"
                />
                <Text variant="h4">All Plans</Text>
              </View>
              <View style={styles.plansList}>
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onPress={() => handleGoalPress(goal)}
                    onEdit={() => handleGoalEdit(goal.id)}
                  />
                ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
      </View>

      {/* Goal Overflow Menu */}
      {showGoalMenu && (
        <View style={styles.goalMenuOverlay}>
          <TouchableOpacity
            style={styles.goalMenuOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowGoalMenu(null)}
          />
          <View style={styles.goalMenu}>
            <View style={styles.goalMenuHeader}>
              <Text variant="h4">Goal Options</Text>
              <Button variant="ghost" onPress={() => setShowGoalMenu(null)}>
                <Icon
                  name="check-circle"
                  size={20}
                  color={theme.colors.text.secondary}
                />
              </Button>
            </View>
            <View style={styles.goalMenuContent}>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => handleDeleteGoal(showGoalMenu)}
                rightIcon={<Icon name="trash" size={20} color="#FF0000" />}
                style={[
                  styles.goalMenuButton,
                  { backgroundColor: '#FF000010' },
                ]}
              >
                <Text style={{ color: '#FF0000' }}>Delete Goal</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <Icon name="warning" size={24} color="#FF4444" weight="fill" />
              <Text variant="h3" style={styles.deleteModalTitle}>
                Delete Plan
              </Text>
            </View>
            <Text variant="body" color="secondary" style={styles.deleteModalDescription}>
              This action cannot be undone. All tasks and progress will be permanently deleted.
            </Text>
            <Text variant="body" color="secondary" style={styles.deleteModalWarning}>
              Type "Delete It" to confirm deletion:
            </Text>
            <TextInput
              style={styles.deleteModalInput}
              value={deleteConfirmationText}
              onChangeText={(text) => {
                console.log('Input text:', JSON.stringify(text));
                console.log('Trimmed text:', JSON.stringify(text.toLowerCase().trim()));
                console.log('Expected:', JSON.stringify("delete it"));
                console.log('Match:', text.toLowerCase().trim() === "delete it");
                setDeleteConfirmationText(text);
              }}
              placeholder="Delete It"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.deleteModalActions}>
              <Button
                variant="ghost"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                  setGoalToDelete(null);
                }}
                style={styles.deleteModalCancelButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={confirmDeleteGoal}
                disabled={(() => {
                  const trimmed = deleteConfirmationText.toLowerCase().trim();
                  const expected = "delete it";
                  const isMatch = trimmed === expected;
                  console.log('Button disabled check:');
                  console.log('  Input:', JSON.stringify(deleteConfirmationText));
                  console.log('  Trimmed:', JSON.stringify(trimmed));
                  console.log('  Expected:', JSON.stringify(expected));
                  console.log('  Match:', isMatch);
                  console.log('  Disabled:', !isMatch);
                  return !isMatch;
                })()}
                style={[
                  styles.deleteModalConfirmButton,
                  deleteConfirmationText.toLowerCase().trim() !== "delete it" && styles.deleteModalConfirmButtonDisabled
                ]}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav
        onHomePress={onHomePress || (() => {})}
        onMyPlansPress={() => {}}
        onDailyGoalsPress={onDailyGoalsPress || (() => {})}
        onCreatePress={onCreatePress || (() => {})}
        activeTab="plans"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  statsCard: {
    margin: 20,
    marginBottom: 16,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  plansListCard: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  plansList: {
    gap: 4,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  goalMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 2000,
  },
  goalMenuOverlayTouchable: {
    flex: 1,
  },
  goalMenu: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -120,
    marginLeft: -150,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 2,
    borderColor: '#FFFF68',
  },
  goalMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFF68',
  },
  goalMenuContent: {
    gap: 8,
  },
  goalMenuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  deleteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  deleteModalTitle: {
    color: '#FF4444',
    fontWeight: '700',
  },
  deleteModalDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteModalWarning: {
    marginBottom: 8,
    fontWeight: '600',
  },
  deleteModalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#FF4444',
  },
  deleteModalConfirmButtonDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    opacity: 0.5,
  },
});
