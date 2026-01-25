/**
 * Time Module - Unified Time-Based Views
 *
 * Consolidated time view components:
 * - TimeView: Unified component handling day/week/month/year views
 * - useTimeView: Hook for time view state management
 *
 * Usage:
 *   import { TimeView } from '@/components/dashboard/time'
 *
 * Backward compatibility:
 *   import { DailyView, WeeklyView, MonthlyView, YearlyView } from '@/components/dashboard'
 *   // These are re-exported from TimeView for compatibility
 */

// Types
export * from './types'

// Main component
export { TimeView } from './TimeView'

// Legacy view exports for backward compatibility
export { TimeView as DailyView } from './TimeView'
export { TimeView as WeeklyView } from './TimeView'
export { TimeView as MonthlyView } from './TimeView'
export { TimeView as YearlyView } from './TimeView'
