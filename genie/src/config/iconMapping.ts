import { GoalCategory } from '../types/goal';

// Complete list of available Phosphor icons for AI to choose from
// Icons are NOT category-specific - AI chooses based on goal content
// Category is selected by the user in the goal creation screen
export const AVAILABLE_ICONS = [
  // People & Human
  'user',
  'user-circle',
  'user-square',
  'users',
  'person-simple-run',
  'person-simple-walk',
  'person-simple-bike',
  'fingerprint',
  'hand-heart',
  
  // Objects & Tools
  'heart',
  'star',
  'target',
  'lightbulb',
  'rocket',
  'trophy',
  'medal',
  'crown',
  'sparkle',
  'compass',
  'shield',
  'key',
  'lock',
  'puzzle-piece',
  'infinity',
  'atom',
  'flask',
  'globe',
  'test-tube',
  
  // Business & Career
  'briefcase',
  'laptop',
  'building',
  'bank',
  'money',
  'coins',
  'credit-card',
  'wallet',
  'chart-line',
  'chart-pie',
  'storefront',
  'handshake',
  
  // Education & Learning
  'book',
  'book-open',
  'graduation-cap',
  'pencil',
  'calculator',
  
  // Nature & Lifestyle
  'leaf',
  'sun',
  'moon',
  'tree',
  'flower',
  'cloud',
  'rainbow',
  'drop',
  'mountains',
  'wave',
  'fire',
  
  // Activities & Hobbies
  'bicycle',
  'music-notes',
  'camera',
  
  // Brain & Mind
  'brain',
  'eye',
  'eye-closed',
  
  // Communication & Time
  'bell',
  'chat-circle',
  'chat-text',
  'paper-plane',
  'calendar',
  'clock',
  'map-pin',
  
  // Other
  'globe-hemisphere-west',
  'thumbs-up',
  'thumbs-down',
  'password',
] as const;

// Fallback icons for each category (used only if AI doesn't provide an icon)
export const FALLBACK_CATEGORY_ICONS: Record<GoalCategory, string> = {
  lifestyle: 'heart',
  career: 'briefcase',
  mindset: 'brain',
  character: 'user-circle',
  custom: 'star',
};

// Function to get all available icons for AI selection
// Icons are NOT filtered by category - AI chooses based on goal content
export function getAllAvailableIcons(): string[] {
  return [...AVAILABLE_ICONS];
}

// Function to get fallback icon for category (used only if AI doesn't provide an icon)
export function getFallbackIcon(category: GoalCategory): string {
  return FALLBACK_CATEGORY_ICONS[category] || 'star';
}

// Legacy function for backward compatibility
// Now returns all icons regardless of category
export function getIconSuggestions(category?: GoalCategory): string[] {
  return getAllAvailableIcons();
}
