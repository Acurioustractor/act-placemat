/**
 * useBrainCenter - Brain Center Data Hooks
 *
 * @deprecated Use hooks from './brain' instead
 * This file re-exports from the brain/ module for backward compatibility.
 *
 * Connects ACT Brain Center components to the Command Center API (port 3456):
 * - 2026 Goals (by Lane, Type, Status)
 * - Ecosystem sites with health monitoring
 * - Moon cycle with LCAA alignment
 *
 * USAGE:
 *   const { goals, lanes, summary, loading } = useGoals2026()
 *   const { sites, categories, health } = useEcosystem()
 *   const { phase, act, next } = useMoonCycle()
 *   const brainCenter = useBrainCenter() // combined
 */

// Re-export from the new brain/ module
export * from './brain'

// Also re-export types for convenience
export type {
  Goal2026,
  LaneData,
  GoalsSummary,
  EcosystemSite,
  CategoryData,
  EcosystemHealth,
  MoonPhaseData,
  UseGoals2026Options,
  UseEcosystemOptions,
} from './brain/types'
