import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notifications';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('🔔 Initializing notifications...');
        
        // Initialize notification service only once
        if (!isInitialized) {
          await notificationService.initialize();
        }
        
        // Get current token
        const token = notificationService.getCurrentPushToken();
        setPushToken(token);
        
        // Check if notifications are enabled
        const enabled = await notificationService.areNotificationsEnabled();
        setIsEnabled(enabled);
        
        setIsInitialized(true);
        console.log('✅ Notifications initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loops
      }
    };

    if (!isInitialized) {
      initializeNotifications();
    }
  }, [isInitialized]);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        const token = await notificationService.registerForPushNotifications();
        setPushToken(token);
        setIsEnabled(true);
      }
      return granted;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  const sendTestNotification = async (userId?: string): Promise<void> => {
    try {
      if (!pushToken) {
        throw new Error('No push token available');
      }

      if (!userId) {
        throw new Error('User ID is required for test notification');
      }

      await notificationService.sendPushNotification(
        userId,
        'Test Notification',
        'This is a test notification from Genie!',
        { screen: 'dashboard' }
      );
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      throw error;
    }
  };

  const scheduleTaskReminder = async (
    taskTitle: string,
    scheduledTime: Date,
    taskId: string
  ): Promise<string> => {
    try {
      const notificationId = await notificationService.scheduleLocalNotification(
        `Task Reminder: ${taskTitle}`,
        'Time to complete your task!',
        {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledTime,
        },
        { 
          screen: 'task-details',
          taskId,
          type: 'task_reminder'
        }
      );

      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling task reminder:', error);
      throw error;
    }
  };

  const cancelTaskReminder = async (notificationId: string): Promise<void> => {
    try {
      await notificationService.cancelNotification(notificationId);
    } catch (error) {
      console.error('❌ Error cancelling task reminder:', error);
      throw error;
    }
  };

  return {
    isInitialized,
    pushToken,
    isEnabled,
    requestPermissions,
    sendTestNotification,
    scheduleTaskReminder,
    cancelTaskReminder,
  };
};
