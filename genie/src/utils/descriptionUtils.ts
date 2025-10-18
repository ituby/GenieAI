/**
 * Utility functions for handling task descriptions with search tags
 */

/**
 * Removes [SEARCH:...] tags from description text
 * Used for displaying clean descriptions in lists and previews
 *
 * @param description - The task description that may contain search tags
 * @returns Clean description without search tags
 *
 * @example
 * cleanDescription("Learn basics. [SEARCH:Tutorial|keywords]")
 * // Returns: "Learn basics."
 */
export function cleanDescription(description: string): string {
  if (!description) return '';

  // Remove [SEARCH:...] tags
  return (
    description
      .replace(/\[SEARCH:.*?\|.*?\]/g, '')
      .trim()
      // Clean up any double spaces that might result
      .replace(/\s+/g, ' ')
  );
}

/**
 * Extracts search suggestions from description
 * Used in TaskDetailsScreen to display search buttons
 *
 * @param description - The task description that may contain search tags
 * @returns Array of search suggestions with title and keywords
 */
export function extractSearchSuggestions(description: string): Array<{
  title: string;
  keywords: string;
}> {
  if (!description) return [];

  const searchRegex = /\[SEARCH:(.*?)\|(.*?)\]/g;
  const suggestions: Array<{ title: string; keywords: string }> = [];
  let match;

  while ((match = searchRegex.exec(description)) !== null) {
    suggestions.push({
      title: match[1],
      keywords: match[2],
    });
  }

  return suggestions;
}
