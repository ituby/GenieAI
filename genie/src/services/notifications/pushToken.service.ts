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
      // Request permissions first
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

      // Get the push token
      // Note: On iOS simulator, Expo will automatically return a mock token or fail gracefully
      // On real devices (even in __DEV__), this will return a real push token
      let token;
      try {
        token = await Notifications.getExpoPushTokenAsync();
        console.log('📱 Push token received:', token.data);
        
        // Validate that it's a real token (not a simulator/mock token)
        if (token.data && token.data.includes('ExponentPushToken[') && !token.data.includes('simulator')) {
          return token.data;
        } else {
          console.warn('⚠️ Received simulator or invalid token:', token.data);
          return token.data; // Still return it, let the server decide what to do
        }
      } catch (error: any) {
        console.error('❌ Error getting push token:', error);
        
        // If it's a projectId error, this is expected in development without EAS
        if (error.message?.includes('projectId')) {
          console.log('⚠️ Project ID required - this is expected in local development');
          console.log('💡 For real push notifications, build with EAS or use Expo Go on a real device');
          return null;
        }
        
        throw error;
      }
    } catch (error) {
      console.error('❌ Error in registerForPushNotifications:', error);
      return null;
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
