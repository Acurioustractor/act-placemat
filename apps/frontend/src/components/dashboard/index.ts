/**
 * Dashboard Components - Main Export
 *
 * Consolidated dashboard components organized by feature:
 * - goals: Goal management (GoalsDashboard, GoalCard, GoalCalendar, GoalProgress)
 * - projects: Project management (ProjectsList, useProjects)
 * - time: Time-based views (TimeView - unified day/week/month/year)
 * - shared: Reusable components (EmptyState, StatCard, FilterBar)
 *
 * Legacy exports maintained for backward compatibility
 */

// ============================================
// Goals Module
// ============================================
export * from './goals'

// Legacy goals exports (for backward compatibility)
export { GoalsDashboard } from './goals/components/GoalsDashboard'
export { GoalCard } from './goals/components/GoalCard'
export { GoalsCalendarView as GoalCalendar } from './goals/components/GoalCalendar'
export { GoalsProgress } from './goals/components/GoalProgress'
export { useGoals } from './goals/hooks/useGoals'

// ============================================
// Projects Module
// ============================================
export * from './projects'

// Legacy projects exports (for backward compatibility)
export { ProjectsList as ProjectsTab } from './projects/components/ProjectsList'
export { useProjects } from './projects/hooks/useProjects'

// Note: FullProjectPage remains in its original location for now
// as it has extensive tab implementations that should be refactored separately

// ============================================
// Time Module
// ============================================
export * from './time'

// Legacy time view exports (for backward compatibility)
// These now point to TimeView which handles all horizons
export { TimeView as DailyView } from './time'
export { TimeView as WeeklyView } from './time'
export { TimeView as MonthlyView } from './time'
export { TimeView as YearlyView } from './time'

// ============================================
// Shared Components
// ============================================
export * from './shared'

// Re-export shared components for convenience
export { EmptyState, TableEmptyState, CardEmptyState } from './shared/EmptyState'
export { StatCard, CompactStatCard, ProgressStatCard } from './shared/StatCard'
export { FilterBar, FilterChip, FilterChips, SearchInput } from './shared/FilterBar'

// ============================================
// Motion & Interaction
// ============================================
export * from './motion'
export { useReducedMotion, useMotionConfig } from './useReducedMotion'
export { Button, IconButton, LinkButton } from './Button'

// ============================================
// Layout & Navigation
// ============================================
export { TopNav } from './TopNav'
export { MetricsTicker, MetricsCompact } from './MetricsTicker'

// ============================================
// Skeleton Loading
// ============================================
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonTableRow,
  SkeletonTimelineItem,
  SkeletonStoryHero,
  SkeletonMetricsTicker,
  SkeletonLCAACard,
  DashboardSkeleton,
} from './Skeleton'

// ============================================
// Widgets
// ============================================
export { StorytellerWidget } from './StorytellerWidget'
export { TodayWidget } from './TodayWidget'

// ============================================
// Legacy v2/v3 Components
// ============================================
export { CommandBar, useCommandBar } from './CommandBar'
export { StoryHero } from './StoryHero'
export { Presence, PresenceBar } from './Presence'
export { LCAADashboard, LCAACompact } from './LCAADashboard'
export { BeautifulObsolescence, ObsolescenceWidget } from './BeautifulObsolescence'
export { PersonalImpact, ImpactBadge } from './PersonalImpact'
export { ElderReviewQueue, ElderReviewBadge } from './ElderReviewQueue'

// ============================================
// Reflection & Celebration
// ============================================
export { ReflectionPrompt } from './ReflectionPrompt'
export {
  useCelebration,
  CelebrationToast,
  ProgressRing,
  JourneyIndicator,
} from './Celebration'

// ============================================
// Other Tabs
// ============================================
export { FrontendsTab } from './FrontendsTab'
export { DevelopmentTab } from './DevelopmentTab'
export { ActionTab } from './ActionTab'
export { ContentTab } from './ContentTab'
export { CalendarTab } from './CalendarTab'
export { PeopleTab } from './PeopleTab'
export { WikiTab } from './WikiTab'
export { SubscriptionsTab } from './SubscriptionsTab'
export { FinanceTab } from './FinanceTab'
export { StoryTimeline } from './StoryTimeline'
export { SectorsTable } from './SectorsTable'

// ============================================
// Special Components
// ============================================
export { TheShift } from './TheShift'
export { InteractiveCard, CardWithHeader, StatCard as LegacyStatCard } from './InteractiveCard'

// ============================================
// Types
// ============================================
export * from './types'
