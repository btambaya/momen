/**
 * Momen — Date formatting utilities
 */

/** Format ISO date as "3 MAY 2026" style for display */
export function formatDateDisplay(isoDate: string): string {
  const d = new Date(isoDate);
  return d
    .toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
}

/** Format ISO date as "20260503" for filenames */
export function formatDateFilename(isoDate: string): string {
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
