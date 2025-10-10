import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
// import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, Card, Icon } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { GoalCard } from '../components/domain/GoalCard';
import { ProgressRing } from '../components/domain/ProgressRing';
import { RewardCard } from '../components/domain/RewardCard';
import { useTheme } from '../theme/index';
import { useAuthStore } from '../store/useAuthStore';
import { useGoalStore } from '../store/useGoalStore';
import { GoalsService } from '../features/goals/services/goals.service';
import { testDatabaseConnection, createTestUser, createSampleGoals } from '../utils/testConnection';
import { supabase } from '../services/supabase/client';
import { NewGoalScreen } from './NewGoalScreen';
import { GoalDetailsScreen } from './GoalDetailsScreen';
import { GoalWithProgress, Reward } from '../types/goal';

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { activeGoals, loading, fetchGoals, updateGoal } = useGoalStore();
  const [aiConnected, setAiConnected] = React.useState<boolean | null>(null);
  const [showNewGoal, setShowNewGoal] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<GoalWithProgress | null>(null);
  const [recentRewards, setRecentRewards] = React.useState<Reward[]>([]);
  const [showSideMenu, setShowSideMenu] = React.useState(false);
  const [showGoalMenu, setShowGoalMenu] = React.useState<string | null>(null);
  
  // Animation for button border
  const borderAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      fetchGoals(user.id);
      fetchRecentRewards();
    }
    testAIConnection();
  }, [user?.id]);

  const fetchRecentRewards = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select(`
          *,
          goal:goals(id, title, category)
        `)
        .eq('unlocked', true)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentRewards(data || []);
    } catch (error) {
      console.error('Error fetching recent rewards:', error);
    }
  };

  const testAIConnection = async () => {
    try {
      const response = await supabase.functions.invoke('generate-plan', {
        body: { test: true }
      });
      setAiConnected(response.error ? false : true);
    } catch (error) {
      console.error('AI connection test failed:', error);
      setAiConnected(false);
    }
  };

  useEffect(() => {
    // Test AI connection on component mount
    const testAI = async () => {
      console.log('🧪 Starting AI connection test...');
      const isConnected = await GoalsService.testAIConnection();
      console.log('🧪 AI connection result:', isConnected);
      setAiConnected(isConnected);
    };
    testAI();
  }, []);

  const handleRefresh = () => {
    if (user?.id) {
      fetchGoals(user.id);
    }
  };

  const handleEditGoal = (goalId: string) => {
    setShowGoalMenu(null);
    // TODO: Implement edit goal functionality
    console.log('Edit goal:', goalId);
  };

  const handleDeleteGoal = async (goalId: string) => {
    setShowGoalMenu(null);
    
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await updateGoal(goalId, { status: 'paused' });
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
      ]
    );
  };

  const handleTestDatabase = async () => {
    console.log('🧪 Running database tests...');
    
    // Test connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      alert('Database connection failed!');
      return;
    }
    
    alert('Database connection successful! ✅');
  };

  const handleCreateTestData = async () => {
    if (!user?.id) {
      alert('Please login first');
      return;
    }
    
    console.log('🧪 Creating test data...');
    
    // Create sample goals for current user
    const goals = await createSampleGoals(user.id);
    if (goals.length > 0) {
      alert(`Created ${goals.length} sample goals! ✅`);
      handleRefresh(); // Refresh the goals list
    } else {
      alert('Failed to create sample goals ❌');
    }
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const startBorderAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startBorderAnimation();
  }, []);

  const handleGoalCreated = () => {
    setShowNewGoal(false);
    if (user?.id) {
      fetchGoals(user.id);
    }
  };

  if (showNewGoal) {
    return (
      <NewGoalScreen
        onGoalCreated={handleGoalCreated}
        onBack={() => setShowNewGoal(false)}
      />
    );
  }

  if (selectedGoal) {
    return (
      <GoalDetailsScreen
        goal={selectedGoal}
        onBack={() => setSelectedGoal(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Absolute Header */}
      <View style={styles.absoluteHeader}>
        <View style={styles.headerLeft}>
          <Button variant="ghost">
            <Icon name="bell" size={20} color={theme.colors.text.secondary} />
          </Button>
        </View>
        
        <View style={styles.headerCenter}>
          <Image 
            source={require('../../assets/LogoSymbol.webp')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerRight}>
          <Button variant="ghost" onPress={() => setShowSideMenu(true)}>
            <Ionicons name="menu" size={20} color={theme.colors.text.secondary} />
          </Button>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.purple[400]}
          />
        }
      >

        {/* Content Header */}
        <View style={styles.contentHeader}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text variant="h2" style={styles.greeting}>
                {t('dashboard.greeting', { name: getUserName() })}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="target" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
            </View>
            <ProgressRing 
              progress={activeGoals.length > 0 ? (activeGoals.reduce((sum, goal) => sum + goal.completion_percentage, 0) / activeGoals.length) : 0}
              size={60}
              strokeWidth={4}
              showPercentage={false}
            >
              <Text variant="h4" color="purple">
                {activeGoals.length}
              </Text>
            </ProgressRing>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              {t('dashboard.activeGoals')}
            </Text>
          </Card>

          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="fire" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
            </View>
            <ProgressRing 
              progress={0}
              size={60}
              strokeWidth={4}
              showPercentage={false}
            >
              <Text variant="h4" color="secondary">
                0
              </Text>
            </ProgressRing>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Day Streak
            </Text>
          </Card>

          <Card variant="gradient" padding="md" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="clipboard-text" size={20} color="rgba(255, 255, 255, 0.8)" weight="fill" />
            </View>
            <ProgressRing 
              progress={0}
              size={60}
              strokeWidth={4}
              showPercentage={false}
            >
              <Text variant="h4" color="secondary">
                {activeGoals.reduce((sum, goal) => sum + goal.total_tasks, 0)}
              </Text>
            </ProgressRing>
            <Text variant="caption" color="secondary" style={styles.statLabel}>
              Today's Tasks
            </Text>
          </Card>
        </View>

        {/* Create Goal Section */}
        {activeGoals.length === 0 ? (
          <View style={styles.section}>
            <Card variant="default" padding="lg" style={styles.createGoalCard}>
              <View style={styles.createGoalContent}>
                <View style={[styles.createGoalIcon, { backgroundColor: theme.colors.purple[400] + '20' }]}>
                  <Icon 
                    name="target" 
                    size={48} 
                    color={theme.colors.purple[400]} 
                    weight="fill"
                  />
                </View>
                
                <Text variant="h2" style={styles.createGoalTitle}>
                  Create Your First Goal
                </Text>
                
                <Text variant="body" color="secondary" style={styles.createGoalDescription}>
                  Tell Genie what you want to achieve, and we'll create a personalized 21-day plan with daily tasks, rewards, and smart notifications.
                </Text>
                
                 <Animated.View
                   style={[
                     styles.glassButtonContainer,
                     {
                       borderColor: borderAnimation.interpolate({
                         inputRange: [0, 0.5, 1],
                         outputRange: ['#A855F7', '#EC4899', '#A855F7'], // Purple to pink to purple
                       }),
                       borderWidth: borderAnimation.interpolate({
                         inputRange: [0, 0.5, 1],
                         outputRange: [1, 2, 1], // Thinner to thicker to thinner
                       }),
                       shadowOpacity: borderAnimation.interpolate({
                         inputRange: [0, 0.5, 1],
                         outputRange: [0.2, 0.4, 0.2], // Shadow intensity animation
                       }),
                       shadowRadius: borderAnimation.interpolate({
                         inputRange: [0, 0.5, 1],
                         outputRange: [8, 12, 8], // Shadow radius animation
                       }),
                     },
                   ]}
                 >
                  <TouchableOpacity
                    style={styles.glassButton}
                    onPress={() => setShowNewGoal(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.glassButtonContent}>
                      <Icon name="sparkle" size={20} color="#FFFFFF" weight="fill" />
                      <Text style={styles.glassButtonText}>Begin Your Transformation</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Card>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">Goals</Text>
              <View style={styles.glassButtonContainer}>
                <TouchableOpacity
                  style={[styles.glassButton, styles.smallGlassButton]}
                  onPress={() => setShowNewGoal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.glassButtonContent}>
                    <Icon name="sparkle" size={14} color="#FFFFFF" weight="fill" />
                    <Text style={[styles.glassButtonText, styles.smallGlassButtonText]}>Add Goal</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Active Goals Section - Only show if there are goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">Active Goals</Text>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </View>
            
            <View style={styles.goalsList}>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={() => setSelectedGoal(goal)}
                  onEdit={() => setShowGoalMenu(goal.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Today's Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Today's Tasks</Text>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </View>

          <Card variant="gradient" padding="md" style={styles.todayTasksCard}>
            <View style={styles.todayTasksIconContainer}>
              <Icon name="calendar" size={24} color="rgba(255, 255, 255, 0.8)" weight="fill" />
            </View>
            <ProgressRing 
              progress={0}
              size={80}
              strokeWidth={6}
              showPercentage={false}
            >
              <Text variant="h2" color="secondary">
                0
              </Text>
            </ProgressRing>
            <Text variant="body" color="secondary" style={styles.todayTasksLabel}>
              Tasks Today
            </Text>
            <Text variant="caption" color="tertiary" style={styles.todayTasksDescription}>
              Create your first goal to get personalized daily tasks
            </Text>
          </Card>
        </View>

        {/* Recent Rewards Section */}
        {recentRewards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">Recent Rewards</Text>
              <Icon name="trophy" size={20} color={theme.colors.purple[400]} />
            </View>
            
            <View style={styles.rewardsList}>
              {recentRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  onPress={() => {
                    Alert.alert(reward.title, reward.description);
                  }}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>

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
                <Icon name="check-circle" size={20} color={theme.colors.text.secondary} />
              </Button>
            </View>
            <View style={styles.goalMenuContent}>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => handleEditGoal(showGoalMenu)}
                leftIcon={<Icon name="gear" size={20} color={theme.colors.text.secondary} />}
                style={styles.goalMenuButton}
              >
                Edit Goal
              </Button>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => handleDeleteGoal(showGoalMenu)}
                leftIcon={<Icon name="circle" size={20} color={theme.colors.status.error} />}
                style={[styles.goalMenuButton, { backgroundColor: theme.colors.status.error + '10' }]}
              >
                <Text style={{ color: theme.colors.status.error }}>Delete Goal</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Side Menu */}
      {showSideMenu && (
        <View style={styles.sideMenuOverlay}>
          <TouchableOpacity 
            style={styles.sideMenuOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowSideMenu(false)}
          />
          <View style={styles.sideMenuShadow} />
          <View style={styles.sideMenu}>
            <View style={styles.sideMenuHeader}>
              <Text variant="h3">Menu</Text>
              <Button variant="ghost" onPress={() => setShowSideMenu(false)}>
                <Icon name="check-circle" size={20} color={theme.colors.text.secondary} />
              </Button>
            </View>
            <View style={styles.sideMenuContent}>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => {
                  setShowSideMenu(false);
                }}
                leftIcon={<Icon name="user" size={20} color={theme.colors.text.secondary} />}
                style={styles.sideMenuButton}
              >
                Profile
              </Button>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => {
                  setShowSideMenu(false);
                }}
                leftIcon={<Icon name="gear" size={20} color={theme.colors.text.secondary} />}
                style={styles.sideMenuButton}
              >
                Settings
              </Button>
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => {
                  setShowSideMenu(false);
                }}
                leftIcon={<Icon name="check-circle" size={20} color={theme.colors.text.secondary} />}
                style={styles.sideMenuButton}
              >
                Help & Support
              </Button>
              <View style={styles.sideMenuDivider} />
              <Button 
                variant="ghost" 
                fullWidth 
                onPress={() => {
                  setShowSideMenu(false);
                  signOut();
                }}
                leftIcon={<Icon name="sign-out" size={20} color={theme.colors.status.error} />}
                style={[styles.sideMenuButton, { backgroundColor: theme.colors.status.error + '10' }]}
              >
                <Text style={{ color: theme.colors.status.error }}>Logout</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Top safe area padding
  },
  scrollView: {
    flex: 1,
    paddingTop: 100, // Space for absolute header
  },
  scrollContent: {
    paddingBottom: 20,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area padding
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  contentHeader: {
    padding: 20,
    paddingTop: 40, // Extra padding above greeting
    paddingBottom: 0,
  },
      headerLogo: {
        width: 48,
        height: 48,
      },
  greetingRow: {
    alignItems: 'center',
  },
  greetingText: {
    alignItems: 'center',
  },
  greeting: {
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    marginTop: 12,
    textAlign: 'center',
  },
  statIconContainer: {
    marginBottom: 12,
  },
  todayTasksIconContainer: {
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAction: {
    minWidth: 160,
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalDescription: {
    marginBottom: 12,
  },
  goalProgress: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
      createGoalCard: {
        alignItems: 'center',
        paddingVertical: 60,
        borderWidth: 2,
        borderColor: '#A855F7', // purple[400]
        backgroundColor: 'transparent',
      },
      createGoalContent: {
        alignItems: 'center',
        maxWidth: 300,
      },
      createGoalIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      },
      createGoalTitle: {
        textAlign: 'center',
        marginBottom: 16,
      },
      createGoalDescription: {
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
      },
      glassButtonContainer: {
        borderRadius: 12,
        shadowColor: '#A855F7',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      },
      glassButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderWidth: 0, // Remove inner border
      },
      glassButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      },
      glassButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
      },
      smallGlassButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
      },
      smallGlassButtonText: {
        fontSize: 14,
      },
      todayTasksCard: {
        alignItems: 'center',
        paddingVertical: 20,
      },
      todayTasksLabel: {
        textAlign: 'center',
        marginTop: 16,
      },
      todayTasksDescription: {
        textAlign: 'center',
        lineHeight: 20,
      },
  rewardsList: {
    gap: 0,
  },
  sideMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Subtle overlay with transparency
    zIndex: 2000,
  },
  sideMenuOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2001,
  },
  sideMenuShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // White shadow layer
    zIndex: 2002,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Subtle black with transparency
    paddingTop: 100, // Safe area padding
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#FFFFFF', // White shadow
    shadowOffset: {
      width: -8,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border
    zIndex: 2003,
  },
  sideMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border with transparency
  },
  sideMenuContent: {
    gap: 8,
  },
  sideMenuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  sideMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle white divider with transparency
    marginVertical: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Same as side menu
    borderRadius: 16,
    padding: 24,
    shadowColor: '#FFFFFF', // White shadow like side menu
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border
  },
  goalMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle white border
  },
  goalMenuContent: {
    gap: 8,
  },
  goalMenuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
