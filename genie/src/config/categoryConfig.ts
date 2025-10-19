// Category configuration with icons and colors
export const CATEGORY_CONFIG = [
  // First row
  {
    value: 'lifestyle' as const,
    label: 'Lifestyle',
    icon: 'heart',
    color: '#10B981', // green
  },
  {
    value: 'career' as const,
    label: 'Career',
    icon: 'briefcase',
    color: '#3B82F6', // blue
  },
  {
    value: 'mindset' as const,
    label: 'Mindset',
    icon: 'brain',
    color: '#8B5CF6', // purple
  },
  {
    value: 'character' as const,
    label: 'Character',
    icon: 'star',
    color: '#EC4899', // pink
  },
  // Second row
  {
    value: 'goal' as const,
    label: 'Goal',
    icon: 'flag',
    color: '#EF4444', // red
  },
  {
    value: 'learning' as const,
    label: 'Learning',
    icon: 'book',
    color: '#06B6D4', // cyan
  },
  {
    value: 'health' as const,
    label: 'Health',
    icon: 'heartbeat',
    color: '#22C55E', // green
  },
  {
    value: 'finance' as const,
    label: 'Finance',
    icon: 'currency-dollar',
    color: '#84CC16', // lime
  },
  // Third row
  {
    value: 'social' as const,
    label: 'Social',
    icon: 'users',
    color: '#A855F7', // violet
  },
  {
    value: 'fitness' as const,
    label: 'Fitness',
    icon: 'barbell',
    color: '#F97316', // orange
  },
  {
    value: 'creativity' as const,
    label: 'Creativity',
    icon: 'palette',
    color: '#EC4899', // pink
  },
  {
    value: 'custom' as const,
    label: 'Custom',
    icon: 'target',
    color: '#FFFF68', // Genie yellow
  },
] as const;

// Helper functions to get category info
export const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG.find(cat => cat.value === category) || CATEGORY_CONFIG[CATEGORY_CONFIG.length - 1]; // fallback to custom
};

export const getCategoryColor = (category: string) => {
  return getCategoryConfig(category).color;
};

export const getCategoryIcon = (category: string) => {
  return getCategoryConfig(category).icon;
};
