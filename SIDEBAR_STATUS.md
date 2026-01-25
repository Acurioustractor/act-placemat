# ACT Intelligence Platform - Sidebar Status

## Current Status (2026-01-25) - Phase 2 Complete!

### OPERATIONS (11 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Brain Center** | `/api/goals/2026`, `/api/ecosystem`, `/api/moon-cycle/current` | Working | ACTBrainCenter.tsx |
| **Overview** | `/api/goals/summary`, `/api/ecosystem/health-summary` | Fixed | IntelligenceOverview.tsx (NEW) |
| **Projects** | `/api/projects/notion`, `/api/projects/enriched` | In Progress | ProjectsTab.tsx |
| **Goals** | `/api/goals/2026` | Working | GoalsDashboard.tsx |
| **Goods Wiki** | `/api/knowledge/stats` | Connected | ContentTab.tsx |
| **Content** | `/api/communications/recent` | Connected | ContentTab.tsx |
| **Contacts** | `/api/relationships/health` | Fixed | EnrichedContactsDashboard.tsx |
| **Calendar** | `/api/calendar/events` | In Progress | CalendarTab.tsx |
| **Opportunities** | `/api/scouts/alta` | Fixed | Opportunities.tsx |
| **Finance** | `/api/financial/summary`, `/api/bookkeeping/progress` | Complete | FinanceTab.tsx (NEW) |
| **Subscriptions** | `/api/subscriptions` | Complete | SubscriptionsTab.tsx (NEW) |

### INTELLIGENCE (3 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Intelligence** | `/api/agents`, `/api/communications/recent`, `/api/knowledge/stats` | Working | Intelligence.tsx |
| **Relationships** | `/api/relationships/health` | Connected | Intelligence.tsx |
| **Agent Approvals** | `/api/agents/proposals` | Connected | Intelligence.tsx |

### EXPLORE (3 items)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Visualisations** | `/api/ecosystem/health-summary` | Connected | Intelligence.tsx |
| **Time Visuals** | `/api/moon-cycle/current` | Connected | TimeVisualsTab.tsx |
| **Research** | `/api/scouts` | Connected | ScoutsTab.tsx |

### DEV (1 item)

| Sidebar Item | API Endpoint | Status | Component |
|-------------|--------------|--------|-----------|
| **Development** | `/api/infrastructure`, `/api/codebases`, `/api/database` | Connected | DevelopmentTab.tsx |

## Phase 2 Changes

### Backend (Port 3456) - api-server.mjs

**New Financial Endpoints:**
- `GET /api/financial/summary` - Cash position, transactions, monthly summary
- `GET /api/financial/transactions` - Recent transactions with limit param
- `GET /api/bookkeeping/progress` - Checklist progress, overdue invoices
- `POST /api/bookkeeping/chase-invoice/:id` - Chase single invoice
- `POST /api/bookkeeping/chase-all` - Chase all overdue invoices

**New Subscriptions Endpoints:**
- `GET /api/subscriptions` - All subscriptions with costs
- `GET /api/subscriptions/summary` - Monthly/yearly totals

### Frontend - Phase 2

**FinanceTab.tsx (NEW)**
- Cash position card (net, receivable, payable)
- Monthly summary (revenue, expenses, net)
- Bookkeeping progress with checklist
- Recent transactions list
- Overdue invoices with "Chase All" button
- GST owed and next BAS due cards

**SubscriptionsTab.tsx (NEW)**
- Monthly totals in USD and AUD
- Yearly projections
- Subscriptions grouped by category (AI, Development, Database, Hosting, Accounting)
- Category spending breakdown visualization

## Next Steps (Phase 3)

1. Add `/api/projects` endpoint to port 3456 for ProjectsTab
2. Add `/api/calendar/events` integration for CalendarTab
3. Add `/api/goals/:id/update` for interactive goal editing
4. Create unified intelligence learning system
5. Add real Xero integration for financial data
