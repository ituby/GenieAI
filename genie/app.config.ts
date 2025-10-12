import { ExpoConfig, ConfigContext } from 'expo/config';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log('🔧 App config loading...');
  console.log('🔧 process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY:', process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY ? `${process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
  console.log('🔧 Available env vars:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')));
  
  return {
  ...config,
  name: 'Genie',
  slug: 'genie-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0B',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.genie.app',
    buildNumber: '1',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0A0A0B',
    },
    package: 'com.genie.app',
    versionCode: 1,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  scheme: process.env.EXPO_PUBLIC_SCHEME || 'genie',
  plugins: [
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#FFFF68',
        defaultChannel: 'default',
      },
    ],
  ],
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mabekpsigcgnszmudxjt.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYmVrcHNpZ2NnbnN6bXVkeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODk4NzIsImV4cCI6MjA3NTY2NTg3Mn0.h0qYEwo1V_unuHSRsxjkwmGLHWdQiY79F-mknqOkppk',
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
    EXPO_PUBLIC_SCHEME: process.env.EXPO_PUBLIC_SCHEME || 'genie',
    EXPO_PUBLIC_GOOGLE_AI_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY || 'AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4',
    GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    GOOGLE_PROJECT_NUMBER: process.env.GOOGLE_PROJECT_NUMBER,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};
};
