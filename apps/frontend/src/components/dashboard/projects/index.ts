/**
 * Projects Module - Unified Projects Functionality
 *
 * Consolidated project components:
 * - ProjectsList: Project list with LCAA wheel and filtering
 * - useProjects: Hook for project state management
 *
 * Usage:
 *   import { ProjectsList, useProjects } from '@/components/dashboard/projects'
 */

// Types
export * from './types'

// Hooks
export { useProjects } from './hooks/useProjects'

// Components
export { ProjectsList } from './components/ProjectsList'

// Legacy exports for backward compatibility
export { ProjectsList as ProjectsTab } from './components/ProjectsList'
