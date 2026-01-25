# ACT Intelligence Platform - Sidebar Status

## Current Status (2026-01-25)

### OPERATIONS (11 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Brain Center** | `/api/goals/2026`, `/api/ecosystem`, `/api/moon-cycle/current` | ✓ Working | ACTBrainCenter.tsx |
| **Overview** | `/api/goals/summary`, `/api/ecosystem/health-summary` | ✓ Fixed | IntelligenceOverview.tsx (NEW) |
| **Projects** | `/api/projects/notion`, `/api/projects/enriched` | In Progress | ProjectsTab.tsx |
| **Goals** | `/api/goals/2026` | In Progress | GoalsDashboard.tsx |
| **Goods Wiki** | `/api/knowledge/stats` | ✓ Connected | ContentTab.tsx |
| **Content** | `/api/communications/recent` | ✓ Connected | ContentTab.tsx |
| **Contacts** | `/api/relationships/health` | ✓ Fixed | EnrichedContactsDashboard.tsx |
| **Calendar** | `/api/calendar/events` | In Progress | CalendarTab.tsx |
| **Opportunities** | `/api/scouts/alta` | ✓ Fixed | Opportunities.tsx |
| **Finance** | Port 4000 (not on 3456) | Needs Work | FinanceTab.tsx |
| **Subscriptions** | Not available on 3456 | Needs Work | SubscriptionsTab.tsx |

### INTELLIGENCE (3 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Intelligence** | `/api/agents`, `/api/communications/recent`, `/api/knowledge/stats` | ✓ Working | Intelligence.tsx |
| **Relationships** | `/api/relationships/health` | ✓ Connected | Intelligence.tsx |
| **Agent Approvals** | `/api/agents/proposals` | ✓ Connected | Intelligence.tsx |

### EXPLORE (3 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Visualisations** | `/api/ecosystem/health-summary` | ✓ Connected | Intelligence.tsx |
| **Time Visuals** | `/api/moon-cycle/current` | ✓ Connected | TimeVisualsTab.tsx |
| **Research** | `/api/scouts` | ✓ Connected | ScoutsTab.tsx |

### DEV (1 item)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Development** | `/api/infrastructure`, `/api/codebases`, `/api/database` | ✓ Connected | DevelopmentTab.tsx |

## Changes Made

1. **IntelligenceOverview.tsx** (NEW) - Overview dashboard using port 3456
2. **Dashboard.tsx** - Updated to use IntelligenceOverview
3. **Intelligence.utils.ts** - Fixed API_BASE to use resolveCommandCenterUrl
4. **EnrichedContactsDashboard.tsx** - Fixed to use port 3456
5. **Opportunities.tsx** - Fixed to use port 3456

## Next Steps (Phase 2)

1. Add financial endpoints to port 3456
2. Add subscriptions endpoints to port 3456
3. Fix FinanceTab.tsx and SubscriptionsTab.tsx
4. Add goal summary endpoint for better overview
5. Create unified intelligence learning system
