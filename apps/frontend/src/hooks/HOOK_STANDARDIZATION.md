# Hook Standardization Summary

## Overview

The custom hooks in the ACT Intelligence Platform frontend have been refactored from monolithic files into a modular, single-responsibility structure following the `use[Resource][Action]` naming convention.

## New Directory Structure

```
apps/frontend/src/hooks/
├── common/                      # Shared utility hooks
│   ├── index.ts
│   ├── useApi.ts                # Generic API fetch + mutation hooks
│   ├── useAsync.ts              # Async operation management
│   ├── useDebounce.ts           # Debounce + throttle utilities
│   └── useLocalStorage.ts       # Persistent localStorage state
│
├── goals/                       # Goal management hooks
│   ├── index.ts
│   ├── types.ts
│   ├── useGoalsData.ts          # Data fetching (useGoals)
│   ├── useGoalsState.ts         # State management
│   ├── useGoalsActions.ts       # CRUD actions
│   ├── useGoalHistory.ts        # History tracking
│   └── useGoalMetrics.ts        # Metrics/key results
│
├── brain/                       # Brain center hooks
│   ├── index.ts
│   ├── types.ts
│   ├── useGoals2026.ts          # 2026 goals data
│   ├── useEcosystem.ts          # Ecosystem sites
│   └── useMoonCycle.ts          # Moon cycle data
│
├── command-center/              # Command center hooks
│   ├── index.ts
│   ├── types.ts
│   ├── useRelationships.ts      # Relationship intelligence
│   ├── useAgents.ts             # Agent management
│   └── useKnowledge.ts          # Knowledge layer stats
│
├── operations/                  # Operations dashboard hooks
│   ├── index.ts
│   ├── types.ts
│   ├── useProjects.ts           # Projects data
│   ├── useStories.ts            # Stories (Empathy Ledger)
│   ├── useContacts.ts           # Contacts data
│   ├── useCalendar.ts           # Calendar events
│   └── useEmails.ts             # Gmail data
│
├── subscriptions/               # Subscription tracker hooks
│   ├── index.ts
│   ├── types.ts
│   ├── useSubscriptionState.ts  # React Query read hooks
│   └── useSubscriptionActions.ts # React Query mutations
│
├── project-detail/              # Single project detail hook
│   ├── index.ts
│   ├── types.ts
│   └── useProjectDetail.ts
│
├── index.ts                     # Main export aggregator
├── useGoals.ts                  # Backward compat (re-exports)
├── useBrainCenter.ts            # Backward compat (re-exports)
├── useCommandCenter.ts          # Backward compat (re-exports)
├── useOperationsData.ts         # Backward compat (re-exports)
├── useSubscriptions.ts          # Backward compat (re-exports)
├── useProjectDetail.ts          # Backward compat (re-exports)
├── useMigration.ts
├── useNavigate.ts
└── useRealData.ts
```

## Hook Patterns Implemented

### Data Fetching Hooks
```typescript
// Data fetching - returns { data, loading, error, refetch }
export function useGoalsData(options) { ... }

// Query with filtering - returns { data, loading, error, refetch }
export function useRelationships(options) { ... }
```

### State Management Hooks
```typescript
// State management - no API calls
export function useGoalsState(goals: Goal[]) { ... }
```

### Action/Mutation Hooks
```typescript
// Actions - returns { action, loading, error }
export function useGoalUpdate() { ... }
```

### Specialized Hooks
```typescript
// History, metrics, etc.
export function useGoalHistory(goalId: string | null) { ... }
```

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| useGoals.ts | 10 functions in 1 file | 6 focused files |
| useOperationsData.ts | 32KB, 8 functions | 5 focused files |
| useCommandCenter.ts | 15KB, 8 functions | 3 focused files |
| Common hooks | 0 | 4 utility files |

## Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `use[Resource]Data` | `useProjectsData` | Data fetching |
| `use[Resource]State` | `useGoalsState` | State management |
| `use[Resource]Actions` | `useGoalsActions` | CRUD operations |
| `use[Resource][Feature]` | `useGoalHistory` | Specialized features |
| `use[Resource]` | `useProjects` | Combined (simple cases only) |

## Backward Compatibility

All original exports are preserved through re-exports:

```typescript
// Old import still works
import { useGoals, useGoalUpdate, useGoalHistory } from '../hooks'

// New import pattern also works
import { useGoalsData, useGoalsActions, useGoalHistory } from '../hooks/goals'
```

## Migration Guide

### Old to New Import Patterns

```typescript
// BEFORE (still works)
import { useGoals, useGoalUpdate, useGoalHistory } from '../hooks'

// AFTER (recommended for new code)
import { useGoalsData, useGoalUpdate, useGoalHistory } from '../hooks/goals'
```

## TypeScript Types

All hooks include proper TypeScript types with JSDoc documentation:

- Interface definitions in `types.ts` files
- Generic type parameters where applicable
- Return type exports for component usage

## Next Steps for Consumers

1. **New components**: Use hooks from specific modules (e.g., `../hooks/goals`)
2. **Existing components**: No changes required - imports still work
3. **Refactoring**: Consider migrating to specific hooks for better tree-shaking
