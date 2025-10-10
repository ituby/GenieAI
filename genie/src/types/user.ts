export interface User {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  language: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  timezone: string;
  language: string;
  notification_preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  enabled: boolean;
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  motivational_enabled: boolean;
}
