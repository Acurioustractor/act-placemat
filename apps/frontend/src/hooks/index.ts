/**
 * ACT Intelligence Platform - Hooks Index
 *
 * Central export point for all custom React hooks.
 * Organized by domain for better tree-shaking and maintainability.
 *
 * STRUCTURE:
 * - goals/      - Goal management hooks
 * - brain/      - Brain center hooks (2026 goals, ecosystem, moon cycle)
 * - command-center/ - Relationship intelligence, agents, proposals
 * - operations/ - Projects, stories, contacts, calendar, emails
 * - subscriptions/ - Subscription tracker hooks
 * - project-detail/ - Single project detail hook
 * - common/     - Reusable utility hooks
 */

// ============================================
// Common Utility Hooks
// ============================================

export * from './common'

// ============================================
// Goals Module
// ============================================

export * from './goals'

// ============================================
// Brain Center Module
// ============================================

export * from './brain'

// ============================================
// Command Center Module
// ============================================

export * from './command-center'

// ============================================
// Operations Module
// ============================================

export * from './operations'

// ============================================
// Subscriptions Module
// ============================================

export * from './subscriptions'

// ============================================
// Project Detail Module
// ============================================

export * from './project-detail'

// ============================================
// Original Hook Files (Backward Compatibility)
// ============================================

// These re-exports maintain backward compatibility with existing imports
// Components can continue using: import { useGoals } from '../hooks'
// while the actual implementation is now in the goals/ module

// Original useGoals.ts exports
export {
  useGoals,
  useGoalUpdate,
  useGoalHistory,
  useGoalDetails,
  useGoalMetrics,
  useGoalMove,
  useGoalReorder,
  useCalendarGoals,
  createGoal,
  deleteGoal,
} from './goals'

// Original useBrainCenter.ts exports
export {
  useGoals2026,
  useEcosystem,
  useMoonCycle,
  useBrainCenter,
} from './brain'

// Original useCommandCenter.ts exports
export {
  useRelationships,
  useLCAAStages,
  useAttentionRequired,
  useAgents,
  useProposals,
  useTasks,
  useKnowledgeStats,
  useCommandCenter,
  type Relationship,
  type RelationshipHealth,
  type Agent,
  type Proposal,
  type Task,
  type KnowledgeStats,
} from './command-center'

// Original useOperationsData.ts exports
export {
  useProjects,
  useStories,
  useContacts,
  useAllContacts,
  useCalendar,
  useCalendarToday,
  useEmails,
  useDashboardStats,
  type Project,
  type Story,
  type Contact,
  type CalendarEvent,
  type Email,
} from './operations'

// Original useSubscriptions.ts exports (React Query hooks)
export {
  useSubscriptions,
  useSubscription,
  useSubscriptionSummary,
  useOutstandingInvoices,
  usePaymentCalendar,
  useCostByAccount,
  useCostByVendor,
  useConsolidationProgress,
  useDiscoverSubscriptions,
  useReconcileSubscriptions,
  useUpdateSubscription,
  useUpdateConsolidationStatus,
} from './subscriptions'

// Original useProjectDetail.ts exports
export {
  useProjectDetail,
  getProjectByCode,
  type ProjectDetailData,
  type ProjectContact,
  type ProjectStory,
  type ProjectCommunication,
  type ProjectUpdate,
  type ProjectNotionPage,
} from './project-detail'

// ============================================
// Other Existing Hooks
// ============================================

export { useRealData } from './useRealData'
export { useNavigate } from './useNavigate'
export { useMigration } from './useMigration'

// ============================================
// Types Re-exports
// ============================================

// Goal types
export type {
  Goal,
  GoalUpdate,
  GoalMetrics,
  GoalDetails,
  Goal2026,
  LaneData,
  GoalsSummary,
} from './goals/types'

// Brain center types
export type {
  EcosystemSite,
  CategoryData,
  EcosystemHealth,
  MoonPhaseData,
} from './brain/types'

// Command center types
export type {
  LCAAStageData,
} from './command-center/types'

// Operations types
export type {
  ProjectStats,
  StoryStats,
  ContactStats,
  UnifiedContact,
  UnifiedContactStats,
  CalendarInfo,
  CalendarStats,
  EmailAccount,
  EmailStats,
  DashboardStats,
} from './operations/types'

// Project detail types
export type {
  ProjectIntelligence,
} from './project-detail/types'
