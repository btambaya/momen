/**
 * Simple UUID generator that doesn't depend on crypto.getRandomValues()
 * Works reliably across all React Native environments.
 */

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}
