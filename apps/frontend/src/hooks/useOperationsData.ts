/**
 * useOperationsData - Operations Dashboard Data Hooks
 *
 * @deprecated Use hooks from './operations' instead
 * This file re-exports from the operations/ module for backward compatibility.
 *
 * Connects the ACT Operations dashboard to real data sources:
 * - Projects: Notion via Supabase
 * - Stories: Empathy Ledger
 * - Contacts: LinkedIn imports + Notion
 * - Calendar: Google Calendar via backend
 * - Emails: Gmail via workspace API
 */

// Re-export from the new operations/ module
export * from './operations'

// Also re-export types for convenience
export type {
  Project,
  ProjectStats,
  Story,
  StoryStats,
  Storyteller,
  Contact,
  ContactStats,
  UnifiedContact,
  UnifiedContactStats,
  CalendarEvent,
  CalendarInfo,
  CalendarStats,
  Email,
  EmailAccount,
  EmailStats,
  DashboardStats,
} from './operations/types'
