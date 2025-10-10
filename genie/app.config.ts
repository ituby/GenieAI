import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
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
  scheme: 'genie',
  plugins: [
    'expo-localization',
  ],
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: 'https://mabekpsigcgnszmudxjt.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYmVrcHNpZ2NnbnN6bXVkeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODk4NzIsImV4cCI6MjA3NTY2NTg3Mn0.h0qYEwo1V_unuHSRsxjkwmGLHWdQiY79F-mknqOkppk',
    EXPO_PUBLIC_APP_ENV: 'development',
    EXPO_PUBLIC_SCHEME: 'genie',
    EXPO_PUBLIC_GOOGLE_AI_API_KEY: 'AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4',
    eas: {
      projectId: 'your-eas-project-id',
    },
  },
});
