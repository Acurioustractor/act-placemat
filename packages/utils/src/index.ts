// Shared utility functions for ACT Placemat

/**
 * Format a date to Australian format (DD/MM/YYYY)
 */
export const formatDateAustralian = (date: Date): string => {
  return date.toLocaleDateString('en-AU');
};

/**
 * Capitalise the first letter of a string
 */
export const capitalise = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generate a URL-friendly slug from a string
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Life OS Utilities

/**
 * Calculate streak count for a habit based on history
 */
export const calculateStreak = (
  history: Array<{ date: string; completed: boolean }>
): number => {
  if (history.length === 0) return 0;

  // Sort by date descending
  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const entry of sortedHistory) {
    if (entry.completed) {
      streak++;
    } else if (entry.date !== today) {
      // Don't break streak if today isn't completed yet
      break;
    }
  }

  return streak;
};

/**
 * Generate date string in YYYY-MM-DD format
 */
export const formatDateISO = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0]!;
};

/**
 * Check if a date is today
 */
export const isToday = (dateString: string): boolean => {
  return dateString === formatDateISO();
};

/**
 * Get days until a target date
 */
export const getDaysUntil = (targetDate: Date): number => {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate completion percentage for goals with milestones
 */
export const calculateGoalProgress = (
  milestones: Array<{ completed: boolean }>
): number => {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
};

/**
 * Generate a unique ID (simple implementation)
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get Australian timezone offset
 */
export const getAustralianTime = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
};
