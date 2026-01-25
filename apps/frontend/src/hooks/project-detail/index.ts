/**
 * Project Detail Module Index
 *
 * Unified exports for project detail hooks.
 * Provides backward compatibility with the original useProjectDetail.ts.
 */

// Types
export * from './types'

// Main hook
export { useProjectDetail } from './useProjectDetail'

// Re-export helper
export { getProjectByCode } from './useProjectDetail'
