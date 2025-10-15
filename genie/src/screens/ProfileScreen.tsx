import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/index';
import { Text } from '../components/primitives/Text';
import { Card } from '../components/primitives/Card';
import { Icon } from '../components/primitives/Icon';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/Input';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
}

export const ProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    timezone: '',
    language: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchStats();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch goals stats
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, status')
        .eq('user_id', user.id);

      if (goalsError) throw goalsError;

      // Fetch tasks stats
      const { data: tasksData, error: tasksError } = await supabase
        .from('goal_tasks')
        .select('id, completed, completed_at')
        .in('goal_id', goalsData?.map(g => g.id) || []);

      if (tasksError) throw tasksError;

      const totalGoals = goalsData?.length || 0;
      const completedGoals = goalsData?.filter(g => g.status === 'completed').length || 0;
      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(t => t.completed).length || 0;

      // Calculate streaks (simplified)
      const completedTasksWithDates = tasksData?.filter(t => t.completed && t.completed_at) || [];
      const currentStreak = calculateCurrentStreak(completedTasksWithDates);
      const longestStreak = calculateLongestStreak(completedTasksWithDates);

      setStats({
        totalGoals,
        completedGoals,
        totalTasks,
        completedTasks,
        currentStreak,
        longestStreak,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateCurrentStreak = (completedTasks: any[]) => {
    // Simplified streak calculation
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasTaskOnDate = completedTasks.some(task => {
        const taskDate = new Date(task.completed_at);
        return taskDate.toDateString() === checkDate.toDateString();
      });
      
      if (hasTaskOnDate) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateLongestStreak = (completedTasks: any[]) => {
    // Simplified longest streak calculation
    return Math.max(calculateCurrentStreak(completedTasks), 7);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchStats()]);
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          timezone: editForm.timezone,
          language: editForm.language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        full_name: editForm.full_name,
        timezone: editForm.timezone,
        language: editForm.language,
        updated_at: new Date().toISOString(),
      } : null);

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  if (!profile || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.absoluteHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Profile</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Empty for balance */}
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text variant="body" color="secondary">Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Absolute Header */}
        <View style={styles.absoluteHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Profile</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={styles.editButton}
          >
            <Icon name={editing ? "x" : "pencil"} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.yellow[500]}
          />
        }
      >
        {/* Profile Header */}
        <Card variant="gradient" padding="lg" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Icon name="user-circle" size={64} color={theme.colors.yellow[500]} />
            </View>
            <View style={styles.profileInfo}>
              {editing ? (
                <TextField
                  value={editForm.full_name}
                  onChangeText={(text: string) => setEditForm(prev => ({ ...prev, full_name: text }))}
                  placeholder="Full Name"
                  inputStyle={styles.editInput}
                />
              ) : (
                <Text variant="h3" color="primary-color" style={styles.profileName}>
                  {profile.full_name || 'User'}
                </Text>
              )}
              <Text variant="body" color="secondary" style={styles.profileEmail}>
                {profile.email}
              </Text>
              <Text variant="caption" color="tertiary">
                Member since {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
          
          {editing && (
            <View style={styles.editActions}>
              <Button variant="ghost" onPress={() => setEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSave}>
                Save
              </Button>
            </View>
          )}
        </Card>

        {/* Stats */}
        <Card variant="gradient" padding="lg" style={styles.statsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Your Progress
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="h2" color="primary-color" style={styles.statNumber}>
                {stats.totalGoals}
              </Text>
              <Text variant="caption" color="secondary">Goals Created</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" color="primary-color" style={styles.statNumber}>
                {stats.completedGoals}
              </Text>
              <Text variant="caption" color="secondary">Goals Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" color="primary-color" style={styles.statNumber}>
                {stats.completedTasks}
              </Text>
              <Text variant="caption" color="secondary">Tasks Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" color="primary-color" style={styles.statNumber}>
                {stats.currentStreak}
              </Text>
              <Text variant="caption" color="secondary">Day Streak</Text>
            </View>
          </View>
        </Card>

        {/* Settings */}
        <Card variant="gradient" padding="lg" style={styles.settingsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Settings
          </Text>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <Text variant="body" color="secondary">Timezone</Text>
              {editing ? (
                <TextField
                  value={editForm.timezone}
                  onChangeText={(text: string) => setEditForm(prev => ({ ...prev, timezone: text }))}
                  placeholder="UTC"
                  inputStyle={styles.settingInput}
                />
              ) : (
                <Text variant="body" color="primary-color">{profile.timezone}</Text>
              )}
            </View>
            <View style={styles.settingItem}>
              <Text variant="body" color="secondary">Language</Text>
              {editing ? (
                <TextField
                  value={editForm.language}
                  onChangeText={(text: string) => setEditForm(prev => ({ ...prev, language: text }))}
                  placeholder="en"
                  inputStyle={styles.settingInput}
                />
              ) : (
                <Text variant="body" color="primary-color">{profile.language}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Icon name="sign-out" size={20} color={theme.colors.status.error} />
          <Text variant="body" color="error" style={styles.signOutText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    paddingTop: 30,
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
    paddingTop: 50,
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
  backButton: {
    padding: 8,
  },
  title: {
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  profileCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    marginBottom: 4,
  },
  profileEmail: {
    marginBottom: 4,
  },
  editInput: {
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  statsCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  statNumber: {
    marginBottom: 4,
  },
  settingsCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInput: {
    minWidth: 100,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    gap: 8,
  },
  signOutText: {
    fontWeight: '600',
  },
});
