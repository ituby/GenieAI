import { NOTIFICATION_TYPES } from '../config/constants';

export type NotificationType = typeof NOTIFICATION_TYPES[number];

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
  data?: {
    type: NotificationType;
    goal_id?: string;
    task_id?: string;
    [key: string]: any;
  };
}

export interface ScheduledNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduled_for: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
}
