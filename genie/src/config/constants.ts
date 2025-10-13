export const APP_CONFIG = {
  name: 'Genie',
  version: '1.0.1',
  description: 'Your personal growth companion',
  tagline: 'Your wish becomes your daily plan',
} as const;

export const GOAL_CATEGORIES = [
  'lifestyle',
  'career',
  'mindset',
  'character',
  'custom',
] as const;

export const GOAL_STATUSES = ['active', 'completed', 'paused'] as const;

export const TASK_TIMES = ['morning', 'afternoon', 'evening'] as const;

export const NOTIFICATION_TYPES = [
  'task_reminder',
  'goal_milestone',
  'daily_summary',
  'motivation',
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
] as const;
