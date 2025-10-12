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
    'heart', 'leaf', 'sun', 'moon', 'tree',
    'bicycle', 'running', 'music',
    'camera', 'book'
  ],
  career: [
    'briefcase', 'laptop', 'target', 'lightbulb', 'rocket',
    'trophy', 'medal', 'book', 'pencil', 'calculator',
    'users', 'handshake', 'money', 'bank', 'building'
  ],
  mindset: [
    'brain', 'eye', 'heart', 'lightbulb', 'star', 'compass',
    'target', 'shield', 'lock', 'key', 'puzzle', 'infinity', 'atom',
    'peace'
  ],
  character: [
    'user-circle', 'users', 'handshake', 'heart', 'shield',
    'star', 'medal', 'trophy',
    'compass'
  ],
  custom: [
    'star', 'heart', 'lightbulb', 'target', 'rocket', 'trophy', 'medal',
    'tree'
  ],
};

// Function to get icon suggestions for AI
export function getIconSuggestions(category: GoalCategory): string[] {
  return ICON_SUGGESTIONS[category] || ICON_SUGGESTIONS.custom;
}

// Function to get default icon for category
export function getDefaultIcon(category: GoalCategory): string {
  return GOAL_CATEGORY_ICONS[category] || 'star';
}
