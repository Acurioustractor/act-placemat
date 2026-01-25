/**
 * Intelligence Utilities
 *
 * Utility functions for the Intelligence Center component.
 * Contains helper functions for styling, formatting, and data transformation.
 */

import { resolveCommandCenterUrl } from '../../config/env';

/**
 * API base URL for the Intelligence API (port 3456)
 */
export const API_BASE = resolveCommandCenterUrl('/api');

/**
 * Get autonomy level configuration
 */
export function getAutonomyLabel(level: number): { label: string; color: string } {
  switch (level) {
    case 1:
      return { label: 'Manual', color: 'bg-red-100 text-red-700' };
    case 2:
      return { label: 'Supervised', color: 'bg-yellow-100 text-yellow-700' };
    case 3:
      return { label: 'Autonomous', color: 'bg-green-100 text-green-700' };
    default:
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-700' };
  }
}

/**
 * Get color classes based on priority level
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'normal':
      return 'bg-blue-100 text-blue-700';
    case 'low':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get color configuration based on relationship temperature
 */
export function getTemperatureColor(temp: number): { bg: string; text: string; light: string } {
  if (temp >= 80) {
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' };
  }
  if (temp >= 50) {
    return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100' };
  }
  return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' };
}

/**
 * Get trend icon based on relationship trend
 */
export function getTrendIcon(trend: string | null): string {
  switch (trend) {
    case 'rising':
      return '↗️';
    case 'falling':
      return '↘️';
    case 'stable':
      return '→';
    default:
      return '';
  }
}

/**
 * Calculate days since a given date
 */
export function getDaysSince(date: string | null): number | null {
  if (!date) {
    return null;
  }
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  return days;
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format a datetime for display
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Format time only
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString();
}

/**
 * Format duration in milliseconds to seconds
 */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return 'N/A';
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

/**
 * Calculate success rate percentage
 */
export function calculateSuccessRate(success: number, count: number): string {
  if (count === 0) {
    return 'N/A';
  }
  return `${Math.round((success / count) * 100)}%`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Get relative time description
 */
export function getRelativeTime(days: number): string {
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days < 60) {
    return '1 month ago';
  }
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sort array of objects by key
 */
export function sortByKey<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter array by multiple criteria
 */
export function filterByCriteria<T>(arr: T[], criteria: Partial<Record<keyof T, unknown>>): T[] {
  return arr.filter((item) => {
    return Object.entries(criteria).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      return item[key as keyof T] === value;
    });
  });
}

/**
 * Group array by key
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
