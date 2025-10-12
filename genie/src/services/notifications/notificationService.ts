import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../supabase/client';
import { getCurrentUser } from '../supabase/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  id: string;
  user_id: string;
  expo_token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check if running on physical device
      if (Platform.OS === 'web') {
        console.warn('⚠️ Push notifications not supported on web');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission not granted');
        return false;
      }

      console.log('✅ Push notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we already have a token
      if (this.expoPushToken) {
        console.log('📱 Using existing push token:', this.expoPushToken);
        return this.expoPushToken;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Check if running on simulator or web
      if (Platform.OS === 'web' || (Platform.OS === 'ios' && __DEV__)) {
        console.warn('⚠️ Push notifications not supported on web/simulator');
        return null;
      }

      // Skip push token registration in development/simulator
      if (__DEV__) {
        console.warn('⚠️ Skipping push token registration in development mode');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync();

      this.expoPushToken = token.data;
      console.log('📱 Expo push token:', this.expoPushToken);

      // Save token to Supabase
      await this.savePushTokenToDatabase(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      // Don't throw error, just return null to prevent app crash
      return null;
    }
  }

  /**
   * Save push token to Supabase database
   */
  private async savePushTokenToDatabase(token: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('⚠️ No authenticated user for push token registration');
        return;
      }

      const platform = Platform.OS as 'ios' | 'android';

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('expo_token', token)
        .single();

      if (existingToken) {
        console.log('📱 Push token already exists in database');
        return;
      }

      // Insert new token
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: user.id,
          expo_token: token,
          platform,
        });

      if (error) {
        console.error('❌ Error saving push token:', error);
        throw error;
      }

      console.log('✅ Push token saved to database');
    } catch (error) {
      console.error('❌ Error in savePushTokenToDatabase:', error);
      throw error;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger,
      });

      console.log('📅 Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('❌ Notification cancelled:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('❌ All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification via Supabase Edge Function
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('push-dispatcher', {
        body: {
          user_id: userId,
          title,
          body,
          data,
        },
      });

      if (error) {
        console.error('❌ Error sending push notification:', error);
        throw error;
      }

      console.log('📤 Push notification sent successfully');
    } catch (error) {
      console.error('❌ Error in sendPushNotification:', error);
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
      // Handle foreground notification
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      if (data?.screen) {
        // Navigate to specific screen based on data
        console.log('🧭 Navigate to:', data.screen);
      }
    });
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('🔔 Notification service already initialized');
        return;
      }

      console.log('🔔 Initializing notification service...');
      
      // Set up listeners
      this.setupNotificationListeners();
      
      // Register for push notifications
      await this.registerForPushNotifications();
      
      this.isInitialized = true;
      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      // Don't throw error to prevent app crash
    }
  }
}

export const notificationService = new NotificationService();
