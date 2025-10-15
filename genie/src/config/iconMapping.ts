import { GoalCategory } from '../types/goal';

// Phosphor icon mapping for goal categories
export const GOAL_CATEGORY_ICONS: Record<GoalCategory, string> = {
  lifestyle: 'heart',
  career: 'briefcase',
  mindset: 'brain',
  character: 'user-circle',
  custom: 'star',
};

// Additional icon suggestions for AI to choose from based on goal content
export const ICON_SUGGESTIONS: Record<GoalCategory, string[]> = {
  lifestyle: [
    'heart',
    'leaf',
    'sun',
    'moon',
    'tree',
    'bicycle',
    'person-simple-run',
    'person-simple-walk',
    'person-simple-bike',
    'music-notes',
    'camera',
    'book',
    'flower',
    'cloud',
    'rainbow',
    'drop',
    'mountains',
    'wave',
    'fire',
  ],
  career: [
    'briefcase',
    'laptop',
    'target',
    'lightbulb',
    'rocket',
    'trophy',
    'medal',
    'book',
    'pencil',
    'calculator',
    'users',
    'handshake',
    'money',
    'bank',
    'building',
    'coins',
    'credit-card',
    'wallet',
    'chart-line',
    'chart-pie',
    'storefront',
    'graduation-cap',
  ],
  mindset: [
    'brain',
    'eye',
    'heart',
    'lightbulb',
    'star',
    'compass',
    'target',
    'shield',
    'lock',
    'key',
    'puzzle-piece',
    'infinity',
    'atom',
    'flask',
    'globe',
    'test-tube',
    'book-open',
    'graduation-cap',
    'fingerprint',
    'eye-closed',
    'password',
  ],
  character: [
    'user-circle',
    'users',
    'handshake',
    'heart',
    'shield',
    'star',
    'medal',
    'trophy',
    'compass',
    'user',
    'user-square',
    'hand-heart',
    'crown',
    'sparkle',
  ],
  custom: [
    'star',
    'heart',
    'lightbulb',
    'target',
    'rocket',
    'trophy',
    'medal',
    'tree',
    'sparkle',
    'crown',
    'infinity',
    'puzzle-piece',
    'bell',
    'chat-circle',
    'chat-text',
    'paper-plane',
    'calendar',
    'clock',
    'map-pin',
    'globe-hemisphere-west',
    'thumbs-up',
    'thumbs-down',
  ],
};

// Function to get icon suggestions for AI - now returns all icons for all categories
export function getIconSuggestions(category: GoalCategory): string[] {
  // Combine all icons from all categories since all icons are now available for all categories
  const allIcons = new Set<string>();
  Object.values(ICON_SUGGESTIONS).forEach(icons => {
    icons.forEach(icon => allIcons.add(icon));
  });
  return Array.from(allIcons);
}

// Function to get default icon for category
export function getDefaultIcon(category: GoalCategory): string {
  return GOAL_CATEGORY_ICONS[category] || 'star';
}
