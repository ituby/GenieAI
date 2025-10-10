import Constants from 'expo-constants';

// For development, we'll use the values directly from the config
const env = {
  EXPO_PUBLIC_SUPABASE_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 'https://mabekpsigcgnszmudxjt.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYmVrcHNpZ2NnbnN6bXVkeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODk4NzIsImV4cCI6MjA3NTY2NTg3Mn0.h0qYEwo1V_unuHSRsxjkwmGLHWdQiY79F-mknqOkppk',
  EXPO_PUBLIC_APP_ENV: Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_ENV || 'development',
  EXPO_PUBLIC_SCHEME: Constants.expoConfig?.extra?.EXPO_PUBLIC_SCHEME || 'genie',
  EXPO_PUBLIC_GOOGLE_AI_API_KEY: Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_AI_API_KEY || 'AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4',
  
  // Google AI Studio Project Details
  GOOGLE_PROJECT_NAME: 'GENIE',
  GOOGLE_PROJECT_ID: 'gen-lang-client-0970742163',
  GOOGLE_PROJECT_NUMBER: '488624480471',
};

export default env;
