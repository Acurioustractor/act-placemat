/**
 * Operations Module Index
 *
 * Unified exports for all operations dashboard hooks.
 * Provides backward compatibility with the original useOperationsData.ts.
 */

// Types
export * from './types'

// Data fetching hooks
export { useProjects } from './useProjects'
export { useStories } from './useStories'
export { useContacts, useAllContacts } from './useContacts'
export { useCalendar, useCalendarToday } from './useCalendar'
export { useEmails, useDashboardStats } from './useEmails'

// ============================================
// Backward Compatibility
// ============================================

/**
 * @deprecated Use individual hooks instead
 * Combined operations data hook (original useOperationsData pattern)
 * Note: This exports the individual hooks - use the specific hooks for better tree-shaking
 */

// Re-export all as useOperationsData for compatibility
export {
  useProjects as useProjectsData,
  useStories as useStoriesData,
  useContacts as useContactsData,
  useAllContacts,
  useCalendar as useCalendarData,
  useCalendarToday,
  useEmails as useEmailsData,
  useDashboardStats,
} from './useEmails'

// ============================================
// Project helpers (re-exported from useProjects)
// ============================================

export type { Project, ProjectStats } from './types'
