/**
 * Truncate a string to maxLength characters, appending an ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Format a language pair as "source → target".
 */
export function langPair(source: string, target: string): string {
  return `${source} → ${target}`;
}
