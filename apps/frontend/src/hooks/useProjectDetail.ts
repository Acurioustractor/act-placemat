/**
 * useProjectDetail - Project Detail Hook
 *
 * @deprecated Use hooks from './project-detail' instead
 * This file re-exports from the project-detail/ module for backward compatibility.
 *
 * Fetches comprehensive data for a single project from multiple sources:
 * - Base data from ALL_PROJECTS (local)
 * - Contacts from Supabase (via Command Center API)
 * - Stories from Empathy Ledger v2 API
 * - Communications from Supabase (via Command Center API)
 * - Project intelligence from Command Center API
 *
 * Usage:
 *   const { data, loading, error } = useProjectDetail('ACT-JH')
 */

// Re-export from the new project-detail/ module
export * from './project-detail'
