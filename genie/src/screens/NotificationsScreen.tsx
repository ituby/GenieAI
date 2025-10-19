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
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/index';
import { Text } from '../components/primitives/Text';
import { Card } from '../components/primitives/Card';
import { Icon } from '../components/primitives/Icon';
import { Button } from '../components/primitives/Button';
import { CustomRefreshControl } from '../components/primitives/CustomRefreshControl';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'task_reminder' | 'goal_milestone' | 'daily_summary' | 'motivation' | 'system' | 'achievement';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
  read_at?: string;
}

export const NotificationsScreen: React.FC<{ onBack: () => void; onNotificationRead?: () => void }> = ({ onBack, onNotificationRead }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshLoader, setShowRefreshLoader] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    setShowRefreshLoader(true);
    
    try {
      await fetchNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
    
    // Hide loader after 3 seconds
    setTimeout(() => {
      setShowRefreshLoader(false);
    }, 3000);
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      
      // Notify parent component to refresh notification count
      onNotificationRead?.();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      
      // Notify parent component to refresh notification count
      onNotificationRead?.();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      task_reminder: 'clock',
      goal_milestone: 'trophy',
      daily_summary: 'chart-bar',
      motivation: 'heart',
      system: 'gear',
      achievement: 'star',
    };
    return icons[type as keyof typeof icons] || 'bell';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      task_reminder: theme.colors.yellow[500],
      goal_milestone: theme.colors.status.success,
      daily_summary: theme.colors.primary[500],
      motivation: theme.colors.status.warning,
      system: theme.colors.text.secondary,
      achievement: theme.colors.status.success,
    };
    return colors[type as keyof typeof colors] || theme.colors.text.secondary;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Absolute Header */}
        <View style={styles.absoluteHeader}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text variant="h4" style={styles.title} numberOfLines={1}>Notifications</Text>
          </View>
          
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                <Text variant="caption" color="primary-color">Mark All Read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Custom Refresh Animation */}
      {showRefreshLoader && (
        <CustomRefreshControl
          refreshing={showRefreshLoader}
          onRefresh={handleRefresh}
          tintColor={theme.colors.yellow[500]}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={showRefreshLoader}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            title=""
            titleColor="transparent"
            progressViewOffset={50}
          />
        }
      >
        {/* Unread Count */}
        {unreadCount > 0 && (
          <Card variant="gradient" padding="md" style={styles.countCard}>
            <View style={styles.countContainer}>
              <Icon name="bell" size={20} color={theme.colors.yellow[500]} />
              <Text variant="h4" color="primary-color">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card variant="gradient" padding="lg" style={styles.emptyCard}>
            <View style={styles.emptyContainer}>
              <Icon name="bell-slash" size={48} color={theme.colors.text.disabled} />
              <Text variant="h4" color="secondary" style={styles.emptyTitle}>
                No Notifications
              </Text>
              <Text variant="body" color="tertiary" style={styles.emptyDescription}>
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              variant="default"
              padding="md"
              style={[
                styles.notificationCard,
                !notification.read ? styles.unreadCard : styles.readCard
              ]}
            >
              <TouchableOpacity
                onPress={() => markAsRead(notification.id)}
                style={styles.notificationContent}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name={getNotificationIcon(notification.type) as any}
                      size={20}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text
                      variant="h4"
                      color="primary-color"
                      style={[
                        styles.notificationTitle,
                        !notification.read && styles.unreadText
                      ]}
                    >
                      {notification.title}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteNotification(notification.id)}
                    style={styles.deleteButton}
                  >
                    <Icon name="x" size={16} color={theme.colors.text.disabled} />
                  </TouchableOpacity>
                </View>
                <Text
                  variant="body"
                  color="secondary"
                  style={[
                    styles.notificationBody,
                    !notification.read && styles.unreadText
                  ]}
                >
                  {notification.body}
                </Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
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
  markAllButton: {
    padding: 4,
  },
  countCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyCard: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  unreadCard: {
    backgroundColor: 'rgba(255, 255, 104, 0.15)',
    borderColor: 'rgba(255, 255, 104, 0.3)',
  },
  readCard: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  notificationBody: {
    lineHeight: 20,
  },
});
