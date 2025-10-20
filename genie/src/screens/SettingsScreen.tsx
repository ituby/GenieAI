import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/index';
import { Text } from '../components/primitives/Text';
import { Card } from '../components/primitives/Card';
import { Icon } from '../components/primitives/Icon';
import { Button } from '../components/primitives/Button';
import { Switch } from '../components/primitives/Switch';
import { Dropdown } from '../components/primitives/Dropdown';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { useNotifications } from '../hooks/useNotifications';

export const SettingsScreen: React.FC<{ onBack: () => void }> = ({
  onBack,
}) => {
  const theme = useTheme();
  const { user, signOut, deleteAccount } = useAuthStore();
  const {
    isInitialized,
    pushToken,
    isEnabled,
    requestPermissions,
    sendTestNotification,
  } = useNotifications();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [language, setLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserSettings();
    }
  }, [user?.id]);

  const fetchUserSettings = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('timezone, language')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setTimezone(data.timezone || 'UTC');
        setLanguage(data.language || 'en');
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserSettings();
    setRefreshing(false);
  };

  const updateLanguage = async (newLanguage: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          language: newLanguage,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setLanguage(newLanguage);
      setShowLanguageModal(false);
      Alert.alert('Success', 'Language updated successfully');
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update language');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            console.log('✅ User signed out successfully');
          } catch (error) {
            console.error('❌ Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteConfirmationText('');
  };

  const confirmDeleteAccount = async () => {
    const trimmedText = deleteConfirmationText.toLowerCase().trim();
    
    if (trimmedText !== "delete it") {
      return;
    }
    
    setShowDeleteModal(false);
    setDeleteConfirmationText('');
    
    try {
      console.log('🗑️ User confirmed account deletion');
      await deleteAccount();
      console.log('✅ Account deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      Alert.alert('Error', error.message || 'Failed to delete account');
    }
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        {/* Absolute Header */}
        <View style={styles.absoluteHeader}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>
              Settings
            </Text>
          </View>

          <View style={styles.headerRight}>{/* Empty for balance */}</View>
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
          {/* Push Notifications */}
          <Card variant="gradient" padding="lg" style={styles.settingsCard}>
            <Text
              variant="h4"
              color="primary-color"
              style={styles.sectionTitle}
            >
              Push Notifications
            </Text>
            <View style={styles.settingsList}>
              <View style={styles.settingItemRow}>
                <View style={styles.settingInfo}>
                  <Text variant="body" color="primary-color">
                    Enable Notifications
                  </Text>
                  <Text variant="caption" color="secondary">
                    {isEnabled ? 'Notifications are enabled' : 'Notifications are disabled'}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={async (value) => {
                    if (value) {
                      const granted = await requestPermissions();
                      if (!granted) {
                        Alert.alert('Error', 'Failed to enable notifications. Please check your device settings.');
                      }
                    }
                  }}
                />
              </View>
              {isEnabled && pushToken && (
                <View style={styles.infoRow}>
                  <Text variant="body" color="secondary">
                    Status:
                  </Text>
                  <Text variant="body" color="primary-color" style={styles.infoValue}>
                    ✓ Registered
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Test Notifications */}
          {isEnabled && pushToken && (
            <Card variant="gradient" padding="lg" style={styles.settingsCard}>
              <Text
                variant="h4"
                color="primary-color"
                style={styles.sectionTitle}
              >
                Test Notifications
              </Text>
              <View style={styles.settingsList}>
                <Text variant="body" color="secondary" style={styles.testDescription}>
                  Send a test notification to verify that notifications are working correctly.
                </Text>
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

          {/* Preferences */}
          <Card variant="gradient" padding="lg" style={styles.settingsCard}>
            <Text
              variant="h4"
              color="primary-color"
              style={styles.sectionTitle}
            >
              Preferences
            </Text>
            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text variant="body" color="primary-color">
                    Timezone
                  </Text>
                  <Text variant="caption" color="secondary">
                    {timezone} (Auto-detected from device)
                  </Text>
                </View>
                <Icon
                  name="info"
                  size={16}
                  color={theme.colors.text.disabled}
                />
              </View>
              <View style={styles.settingItemColumn}>
                <Text variant="body" color="primary-color" style={styles.dropdownLabel}>
                  Language
                </Text>
                <Dropdown
                  options={[
                    { label: 'English', value: 'en' },
                    { label: 'עברית', value: 'he' },
                    { label: 'العربية', value: 'ar' },
                    { label: 'Español', value: 'es' },
                    { label: 'Français', value: 'fr' },
                    { label: 'Deutsch', value: 'de' },
                  ]}
                  value={language}
                  onValueChange={async (value) => {
                    await updateLanguage(value);
                  }}
                  placeholder="Select language"
                />
              </View>
            </View>
          </Card>

          {/* Account Actions */}
          <Card variant="gradient" padding="lg" style={styles.settingsCard}>
            <Text
              variant="h4"
              color="primary-color"
              style={styles.sectionTitle}
            >
              Account
            </Text>
            <View style={styles.settingsList}>
              <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
                <Icon name="trash" size={20} color={theme.colors.status.error} />
                <View style={styles.dangerButtonInfo}>
                  <Text variant="body" style={{ color: theme.colors.status.error, fontWeight: '600' }}>
                    Delete Account
                  </Text>
                  <Text variant="caption" color="secondary">
                    Permanently delete your account and all data
                  </Text>
                </View>
                <Icon
                  name="caret-right"
                  size={16}
                  color={theme.colors.status.error}
                />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <Icon name="sign-out" size={20} color={theme.colors.status.error} />
            <Text variant="body" color="error" style={styles.signOutText}>
              Sign Out
            </Text>
          </TouchableOpacity>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModal}>
              <View style={styles.deleteModalHeader}>
                <Icon name="warning" size={24} color="#FF4444" weight="fill" />
                <Text variant="h3" style={styles.deleteModalTitle}>
                  Delete Account
                </Text>
              </View>

              <Text variant="body" color="secondary" style={styles.deleteModalDescription}>
                This action cannot be undone. All your data, goals, and progress will be permanently deleted.
              </Text>

              <Text variant="body" color="secondary" style={styles.deleteModalWarning}>
                Type "Delete It" to confirm deletion:
              </Text>

              <TextInput
                style={styles.deleteModalInput}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
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
                  }}
                  style={styles.deleteModalCancelButton}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={confirmDeleteAccount}
                  disabled={deleteConfirmationText.toLowerCase().trim() !== "delete it"}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
    paddingTop: 80,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 28, 36, 0.8)',
    minHeight: 110,
    overflow: 'hidden',
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
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingItemColumn: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 4,
  },
  dropdownLabel: {
    marginBottom: 4,
  },
  settingInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoValue: {
    fontWeight: '600',
  },
  testDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  testButton: {
    marginTop: 8,
  },
  enableButton: {
    marginTop: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    gap: 12,
  },
  dangerButtonInfo: {
    flex: 1,
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
  deleteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  deleteModal: {
    backgroundColor: '#1A1C24',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
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
    fontWeight: 'bold',
  },
  deleteModalDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteModalWarning: {
    marginBottom: 12,
    fontWeight: '600',
  },
  deleteModalInput: {
    backgroundColor: '#2A2C36',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#FF4444',
  },
  deleteModalConfirmButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.5,
  },
  editModal: {
    backgroundColor: '#1A1C24',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#FFFF68',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  editModalTitle: {
    color: '#FFFF68',
    fontWeight: 'bold',
  },
  editModalDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  editModalInput: {
    backgroundColor: '#2A2C36',
    borderWidth: 1,
    borderColor: '#FFFF68',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalCancelButton: {
    flex: 1,
  },
  editModalConfirmButton: {
    flex: 1,
  },
});
