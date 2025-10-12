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
import { Switch } from '../components/primitives/Switch';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { useNotifications } from '../hooks/useNotifications';

interface UserSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  reminder_time: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'he' | 'ar' | 'es' | 'fr' | 'de';
  timezone: string;
  created_at: string;
  updated_at: string;
}

export const SettingsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { 
    isInitialized, 
    pushToken, 
    isEnabled, 
    requestPermissions, 
    sendTestNotification 
  } = useNotifications();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (!data) {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            notifications_enabled: true,
            push_notifications: true,
            email_notifications: false,
            reminder_time: '09:00',
            theme: 'dark',
            language: 'en',
            timezone: 'UTC',
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id || !settings) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        [key]: value,
        updated_at: new Date().toISOString(),
      } : null);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
            console.log('✅ User signed out successfully');
          } catch (error) {
            console.error('❌ Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        }},
      ]
    );
  };

  if (!settings) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.absoluteHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Settings</Text>
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
            <Icon name="arrow-left" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Settings</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Empty for balance */}
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
        {/* Notifications */}
        <Card variant="gradient" padding="lg" style={styles.settingsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Notifications
          </Text>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Enable Notifications</Text>
                <Text variant="caption" color="secondary">Receive push notifications</Text>
              </View>
              <Switch
                value={settings.notifications_enabled}
                onValueChange={(value: boolean) => updateSetting('notifications_enabled', value)}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Push Notifications</Text>
                <Text variant="caption" color="secondary">
                  {pushToken ? 'Registered' : 'Not registered'} • {isEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={settings.push_notifications}
                onValueChange={async (value: boolean) => {
                  if (value && !isEnabled) {
                    const granted = await requestPermissions();
                    if (granted) {
                      updateSetting('push_notifications', true);
                    }
                  } else {
                    updateSetting('push_notifications', value);
                  }
                }}
                disabled={!settings.notifications_enabled}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Email Notifications</Text>
                <Text variant="caption" color="secondary">Email updates and summaries</Text>
              </View>
              <Switch
                value={settings.email_notifications}
                onValueChange={(value: boolean) => updateSetting('email_notifications', value)}
                disabled={!settings.notifications_enabled}
              />
            </View>
          </View>
        </Card>

        {/* Test Notifications */}
        {isEnabled && pushToken && (
          <Card variant="gradient" padding="lg" style={styles.settingsCard}>
            <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
              Test Notifications
            </Text>
            <View style={styles.settingsList}>
              <Button
                variant="outline"
                onPress={async () => {
                  try {
                    if (!user?.id) {
                      Alert.alert('Error', 'User not authenticated');
                      return;
                    }
                    await sendTestNotification(user.id);
                    Alert.alert('Success', 'Test notification sent!');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to send test notification');
                  }
                }}
                style={styles.testButton}
              >
                Send Test Notification
              </Button>
            </View>
          </Card>
        )}

        {/* Appearance */}
        <Card variant="gradient" padding="lg" style={styles.settingsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Appearance
          </Text>
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Theme</Text>
                <Text variant="caption" color="secondary">Current: {settings.theme}</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Language</Text>
                <Text variant="caption" color="secondary">Current: {settings.language}</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Time & Location */}
        <Card variant="gradient" padding="lg" style={styles.settingsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Time & Location
          </Text>
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Timezone</Text>
                <Text variant="caption" color="secondary">Current: {settings.timezone}</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Reminder Time</Text>
                <Text variant="caption" color="secondary">Daily reminders at {settings.reminder_time}</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Account */}
        <Card variant="gradient" padding="lg" style={styles.settingsCard}>
          <Text variant="h4" color="primary-color" style={styles.sectionTitle}>
            Account
          </Text>
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Privacy Policy</Text>
                <Text variant="caption" color="secondary">View our privacy policy</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Terms of Service</Text>
                <Text variant="caption" color="secondary">View terms and conditions</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.text.disabled} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text variant="body" color="primary-color">Delete Account</Text>
                <Text variant="caption" color="secondary">Permanently delete your account</Text>
              </View>
              <Icon name="caret-right" size={16} color={theme.colors.status.error} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Icon name="sign-out" size={20} color={theme.colors.status.error} />
          <Text variant="body" color="error" style={styles.signOutText}>
            Sign Out
          </Text>
        </TouchableOpacity>
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  settingsCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
  },
  testButton: {
    marginTop: 8,
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
    marginTop: 8,
  },
  signOutText: {
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
