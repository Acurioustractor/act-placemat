/**
 * Brain Module Index
 *
 * Unified exports for all brain center hooks.
 * Provides backward compatibility with the original useBrainCenter.ts.
 */

// Types
export * from './types'

// Data fetching hooks
export { useGoals2026 } from './useGoals2026'
export { useEcosystem } from './useEcosystem'
export { useMoonCycle } from './useMoonCycle'

// ============================================
// Backward Compatibility
// ============================================

/**
 * @deprecated Use individual hooks (useGoals2026, useEcosystem, useMoonCycle) instead
 * Combined brain center hook (original useBrainCenter pattern)
 */
export function useBrainCenter() {
  const goalsData = useGoals2026()
  const ecosystemData = useEcosystem()
  const moonData = useMoonCycle()

  const loading = goalsData.loading || ecosystemData.loading || moonData.loading

  return {
    // Goals
    goals: goalsData.goals,
    lanes: goalsData.lanes,
    goalsSummary: goalsData.summary,

    // Ecosystem
    sites: ecosystemData.sites,
    categories: ecosystemData.categories,
    ecosystemHealth: ecosystemData.health,

    // Moon
    moon: moonData,

    // Meta
    loading,
    refetch: () => {
      goalsData.refetch()
      ecosystemData.refetch()
      moonData.refetch()
    },
  }
}
