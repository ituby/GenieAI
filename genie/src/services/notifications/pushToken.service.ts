import { supabase } from '../supabase/client';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface PushTokenData {
  user_id: string;
  expo_token: string;
  platform: 'ios' | 'android';
}

export class PushTokenService {
  /**
   * Register for push notifications and save token to database
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on simulator
      const isSimulator = __DEV__ && (Platform.OS === 'ios' || Platform.OS === 'android');
      
      if (isSimulator) {
        console.log('📱 Running on simulator - using development token');
        // Return a mock token for development
        return 'ExponentPushToken[simulator-dev-token]';
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission denied');
        return null;
      }

      // Get the push token - try without projectId first (for development)
      let token;
      try {
        token = await Notifications.getExpoPushTokenAsync();
      } catch (error: any) {
        if (error.message?.includes('projectId')) {
          console.log('⚠️ Project ID required for production - using development token');
          // Return a mock token for development without project ID
          return 'ExponentPushToken[dev-token-no-project-id]';
        }
        throw error;
      }

      console.log('📱 Push token received:', token.data);

      return token.data;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      // Return a fallback token for development
      return 'ExponentPushToken[fallback-dev-token]';
    }
  }

  /**
   * Save push token to database via Edge Function
   */
  static async savePushTokenToDatabase(
    userId: string, 
    expoToken: string
  ): Promise<boolean> {
    try {
      const platform = Platform.OS as 'ios' | 'android';
      
      const { data, error } = await supabase.functions.invoke('save-push-token', {
        body: {
          user_id: userId,
          expo_token: expoToken,
          platform,
        },
      });

      if (error) {
        console.error('❌ Error saving push token:', error);
        return false;
      }

      console.log('✅ Push token saved successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error saving push token:', error);
      return false;
    }
  }

  /**
   * Complete flow: register for notifications and save token
   */
  static async setupPushNotifications(userId: string): Promise<boolean> {
    try {
      console.log('🚀 Setting up push notifications for user:', userId);
      
      // Register for push notifications
      const expoToken = await this.registerForPushNotifications();
      
      if (!expoToken) {
        console.log('❌ Failed to get push token');
        return false;
      }

      console.log('📱 Got push token:', expoToken);

      // Save token to database
      const saved = await this.savePushTokenToDatabase(userId, expoToken);
      
      if (!saved) {
        console.log('❌ Failed to save push token to database');
        return false;
      }

      console.log('✅ Push notifications setup complete');
      return true;
    } catch (error) {
      console.error('❌ Error setting up push notifications:', error);
      return false;
    }
  }

  /**
   * Update push token (useful when token changes)
   */
  static async updatePushToken(userId: string): Promise<boolean> {
    try {
      const expoToken = await this.registerForPushNotifications();
      
      if (!expoToken) {
        return false;
      }

      return await this.savePushTokenToDatabase(userId, expoToken);
    } catch (error) {
      console.error('❌ Error updating push token:', error);
      return false;
    }
  }

  /**
   * Get user's push tokens from database
   */
  static async getUserPushTokens(userId: string) {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error fetching push tokens:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching push tokens:', error);
      return null;
    }
  }
}
