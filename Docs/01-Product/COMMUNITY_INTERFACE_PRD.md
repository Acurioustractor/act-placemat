# Community Interface PRD: Transform Tech Theater into Community Power

## Problem Statement

**Current State**: The ACT frontend is a developer monitoring dashboard with animated brain icons - completely useless to communities seeking independence.

**Required State**: A community empowerment platform that gives communities control over their data, stories, and path to independence from ACT.

**Gap**: 100% of community-facing functionality is missing while all the data and APIs exist.

## Core Mission

Replace the current "tech theater" frontend with actual community empowerment tools that serve **community ownership** rather than institutional convenience.

## Available Assets (PROVEN REAL DATA)

### Data Sources
- **Supabase**: Community stories, projects, relationships
- **Notion**: 55+ real projects, people, organizations, opportunities
- **LinkedIn**: 20,398+ contacts (299 high-value strategic relationships)
- **Gmail**: 1,000+ contacts with relationship intelligence
- **Xero & Stripe**: Real financial data, revenue tracking, payout status
- **Google Calendar**: Meeting intelligence, contact relationships
- **AI Providers**: OpenAI, Anthropic, Perplexity models powering automation & analysis

### Working APIs (48 Actual)
- **Community Data**: `/api/stories`, `/api/themes`, `/api/organizations`, `/api/storytellers`, `/api/homepage`
- **Dashboard (Real Data)**: `/api/dashboard/real-projects`, `/api/dashboard/real-contacts`, `/api/dashboard/real-community-overview`, `/api/dashboard/real-recent-activity`
- **CRM & Contacts**: `/api/crm/metrics`, `/api/crm/linkedin-contacts`, `/api/crm/linkedin-analytics`, `/api/linkedin-network`
- **Financial Sovereignty**: `/api/v1/financial/status`, `/api/v1/financial/transactions`, `/api/v1/financial/transactions/sync`, `/api/v1/financial/reports/summary`, `/api/v1/financial/reports/cashflow`, `/api/v1/financial/rules`
- **Business Intelligence & Concierge**: `/api/business-dashboard`, `/api/business-intelligence`, `/api/ask`, `/api/grants-opportunities`
- **Voice & Automation**: `/api/notion-ai-agent/capture/voice`, `/api/notion-ai-agent/capture/text`, `/api/notion-ai-agent/sync/to-notion`, `/api/notion-ai-agent/automations/opportunities`
- **System Health & Sovereignty**: `/api/health`, `/api/integrations/status`, `/api/admin/system-status`, `/api/database/health`, `/api/migration/status`
- **Data Portability & Compliance**: `/api/integrations/sync`, `/api/compliance`

## Required Features

### 1. Community Dashboard (Replace current "Intelligence Dashboard")

**What communities need instead of system metrics:**

#### **Community Project Showcase**
- **Data Source**: Supabase database (synced from Notion - 55+ real projects)
- **API**: `/api/dashboard/real-projects`
- **Interface**: Grid of project cards with real media, impact metrics, progress status
- **Community Control**: Communities can edit, hide, or export their project data

#### **Revenue Transparency Dashboard**
- **Data Source**: Xero financial data
- **API**: `/api/business-dashboard`
- **Interface**: Revenue flow visualization showing 40% community share
- **Community Control**: Export financial reports, track independence progress

#### **Relationship Intelligence for Communities**
- **Data Source**: LinkedIn contacts, CRM data
- **API**: `/api/crm/linkedin-contacts`, `/api/linkedin-network`
- **Interface**: Network map showing community connections and collaboration opportunities
- **Community Control**: Control who sees their relationships, export contact data

### 2. Story Management System (NEW - Replace "Real-time Insights")

#### **Community Story Control**
- **Data Source**: Supabase community stories
- **API**: `/api/stories`, `/api/themes`
- **Interface**:
  - Story submission with consent tracking
  - AI-powered categorization with community approval
  - Dynamic permissions (community controls who sees what)
  - Story export tools

#### **Consent Dashboard**
- **Data Source**: Privacy compliance data
- **API**: `/api/compliance`
- **Interface**: Communities can see all consent given, revoke permissions, export data usage logs

### 3. Data Sovereignty Tools (NEW - Replace "Neural Networks")

#### **Community Data Export**
- **Data Source**: All integrated data sources
- **API**: `/api/integrations/sync`, `/api/database/health`
- **Interface**: One-click export of all community data in multiple formats (JSON, CSV, PDF)
- **Community Control**: Complete data portability for platform independence

#### **Beautiful Obsolescence Tracker**
- **Data Source**: System health, integration status, community progress
- **API**: `/api/integrations/status`, `/api/admin/system-status`
- **Interface**: Progress tracker showing community readiness for independence
- **Metrics**: Data sovereignty %, local capacity %, technology transfer progress

### 4. Community Network Platform (NEW - Replace "Data Streams")

#### **Global Community Connections**
- **Data Source**: Cross-community relationship data
- **API**: `/api/crm/linkedin-contacts`, `/api/linkedin-network`
- **Interface**: Connect communities worldwide without ACT control
- **Community Control**: Communities control their visibility and connections

#### **Impact Visualization**
- **Data Source**: Financial flows, project outcomes, network effects
- **API**: `/api/business-dashboard`, `/api/dashboard/real-projects`
- **Interface**: Visual mapping of community impact and interconnections
- **Community Control**: Communities control how their impact is displayed

### 5. Financial Sovereignty Workspace (EXPANDED FROM BLUEPRINT)

#### **Treasury Overview**
- **Data Source**: Xero transactions, Stripe settlements, Supabase budget data
- **API**: `/api/v1/financial/status`, `/api/v1/financial/reports/summary`, `/api/v1/financial/reports/cashflow`
- **Interface**: Community-first cashflow, reserves, and runway dashboard with Beautiful Obsolescence metrics (e.g., community revenue share)
- **Community Control**: Switchable views for local treasurers, export-ready summaries for community boards

#### **Community Ledger Control**
- **Data Source**: Unified financial ledger synced via `/api/v1/financial/transactions/sync`
- **API**: `/api/v1/financial/transactions`, `/api/v1/financial/transactions/sync`, `/api/v1/financial/rules`
- **Interface**: Transaction review queue, consent-aware categorisation, rules editor honoring community-defined policies
- **Community Control**: Community-led approval workflows, budget tagging, independence-ready export packages

### 6. Voice-to-Action Console (NEW COMMUNITY AUTOMATION LAYER)

#### **Instant Voice Capture**
- **Data Source**: Mobile voice input, meeting recordings, leader memos
- **API**: `/api/notion-ai-agent/capture/voice`, `/api/notion-ai-agent/capture/text`
- **Interface**: Single-tap capture, playback, transcription confidence, cultural consent prompts
- **Community Control**: Leaders decide routing (project, campaign, archive) and manage retention windows

#### **Automation & Sync Hub**
- **Data Source**: Notion workspace, Supabase tasks, Gmail threads
- **API**: `/api/notion-ai-agent/sync/to-notion`, `/api/notion-ai-agent/automations/opportunities`
- **Interface**: Drag-and-drop automation builder, recurring check-ins, AI-suggested opportunities awaiting community approval
- **Community Control**: Every automation toggled by community admins, exportable playbooks for handover

### 7. Democratic Governance & Handover Toolkit (BLUEPRINT-ALIGNED EXPANSION)

#### **Sovereignty Monitor**
- **Data Source**: Platform integration health, migration readiness, database diagnostics
- **API**: `/api/admin/system-status`, `/api/integrations/status`, `/api/database/health`, `/api/migration/status`
- **Interface**: Readiness matrix showing data custody, integration stability, and independence blockers
- **Community Control**: Communities set their own thresholds, trigger alerts, and schedule handover rehearsals

#### **Decision & Consent Records**
- **Data Source**: Compliance guidance, financial rules votes, forthcoming democracy endpoints
- **API**: `/api/compliance`, `/api/v1/financial/rules`, *(future: `/api/democracy/*` for consensus tools)*
- **Interface**: Transparent decision logs, consent histories, and exportable governance packets aligned with Indigenous data protocols
- **Community Control**: Communities author governance protocols, manage data residency, and initiate Beautiful Obsolescence exit checklists

## Technical Implementation

### Phase 1: Replace Developer Dashboard (Weeks 1-2)
1. **Community Project Showcase**
   - Connect to `/api/dashboard/real-projects`
   - Replace system health cards with project status cards
   - Real project data from Supabase (synced from Notion - 55+ projects)

2. **Revenue Transparency**
   - Connect to `/api/business-dashboard`
   - Replace CPU/memory metrics with revenue flow visualization
   - Show 40% community share tracking

3. **Financial Snapshot Tiles**
   - Pull summary + cashflow via `/api/v1/financial/reports/summary` and `/api/v1/financial/reports/cashflow`
   - Highlight runway, revenue split, sovereignty momentum
   - Wire Beautiful Obsolescence KPIs directly into dashboard hero section

### Phase 2: Add Story Management (Weeks 3-4)
1. **Story Control Interface**
   - Connect to `/api/stories`, `/api/themes`
   - Community story submission and management
   - Consent tracking and permissions

2. **Data Privacy Dashboard**
   - Connect to `/api/compliance`
   - Show all data usage and permissions
   - One-click consent revocation

### Phase 3: Data Sovereignty Tools (Weeks 5-6)
1. **Data Export Tools**
   - Connect to `/api/integrations/sync`, `/api/database/health`, `/api/v1/financial/transactions/export`
   - Orchestrate one-click export bundles with configurable formats (JSON, CSV, PDF)
   - Log export events to compliance ledger for community auditing

2. **Independence Tracker**
   - Connect to `/api/integrations/status`, `/api/admin/system-status`
   - Track community readiness for complete independence
   - Beautiful obsolescence progress metrics

### Phase 4: Voice & Automation Delivery (Weeks 7-8)
1. **Voice Capture Rollout**
   - Integrate `/api/notion-ai-agent/capture/voice` and `/api/notion-ai-agent/capture/text`
   - Ship mobile-first capture UI with consent prompts
   - Store transcription metadata in Supabase for community oversight

2. **Automation Builder MVP**
   - Connect to `/api/notion-ai-agent/sync/to-notion` & `/api/notion-ai-agent/automations/opportunities`
   - Build workflow composer with community approvals, exportable automation templates

### Phase 5: Governance & Handover (Weeks 9-10)
1. **Sovereignty Monitor Panel**
   - Visualize `/api/admin/system-status`, `/api/integrations/status`, `/api/migration/status`
   - Surface blockers + recommended actions for independence

2. **Decision Log & Rule Voting**
   - Record compliance updates from `/api/compliance`
   - Manage community financial rules via `/api/v1/financial/rules`
   - Prepare scaffolding for upcoming `/api/democracy/*` endpoints (consensus + handover scripts)

### Phase 6: Community Network (Weeks 11-12)
1. **Global Connections**
   - Connect to `/api/crm/linkedin-contacts`, `/api/linkedin-network`
   - Community-to-community networking
   - ACT-free interaction platform

2. **Impact Visualization**
   - Connect to `/api/business-dashboard`, `/api/dashboard/real-projects`
   - Visual impact mapping
   - Community-controlled narrative

## Success Metrics

### Technical Metrics
- **Real Data Integration**: 100% of frontend uses real community data (no fake metrics)
- **Community Control**: 100% of data exportable by communities
- **API Coverage**: All 48 actual APIs accessible through community interface
- **Financial Accuracy**: `/api/v1/financial/*` parity with Xero ledgers, <1% reconciliation variance
- **Automation Reliability**: Voice capture + sync success rate > 98%

### Community Empowerment Metrics
- **Data Sovereignty**: Communities can export all their data in <5 minutes
- **Story Control**: Communities control 100% of how their stories are displayed
- **Independence Progress**: Clear tracking toward Beautiful Obsolescence
- **Network Effect**: Communities can connect without ACT intermediation
- **Voice Activation**: 70% of leadership captures routed through community-designed automations
- **Governance Adoption**: 100% of significant decisions logged with community-approved protocols

### Beautiful Obsolescence Indicators
- Communities saying: "We don't need ACT's dashboard anymore - we built our own"
- Communities forking the platform for their own use
- 40% of revenue flowing directly to communities automatically
- Zero community complaints about data usage or consent violations

## User Journeys

### Community Leader Morning Workflow
1. **Login** → See their community's projects, not system metrics
2. **Project Status** → Real progress on their initiatives, not CPU usage
3. **Financial Transparency** → Revenue flowing to their community, not API request counts
4. **Voice Capture** → Dictate actions and approve automations from the Voice-to-Action console
5. **Story Management** → Control their narrative, not watch neural network animations
6. **Network Intelligence** → See collaboration opportunities, not developer diagnostics
7. **Sovereignty Check** → Confirm handover readiness via the governance dashboard

### Community Member Data Control
1. **Story Submission** → Add community story with full consent control
2. **Privacy Dashboard** → See exactly how their data is used
3. **Data Export** → Download all their data in multiple formats
4. **Automation Review** → Approve or revoke voice-triggered actions impacting their projects
5. **Independence Tracking** → See progress toward community self-sufficiency

## Acceptance Criteria & Data Contracts

### Community Projects
- Project cards display `name`, `status`, `lastUpdated`, `organization` within 2s of load.
- Empty state renders guidance when `/api/dashboard/real-projects` returns an empty `projects` array.
- CSV/JSON export initiated from UI must call `/api/integrations/sync` and provide download feedback.

### Revenue Transparency
- Tiles pull from `/api/business-dashboard` and `/api/v1/financial/reports/*`; errors fall back to clearly labelled demo data.
- Export buttons trigger `/api/v1/financial/transactions/export` and confirm completion.
- Independence metrics render only when `/api/v1/financial/status` reports `xeroStatus=connected`.

### Story Studio
- `/api/stories` requests respect consent flags (only `consent_level` approved stories rendered).
- Submission modal validates required fields and posts to `/api/stories` with success toast.
- Consent dashboard surfaces counts derived from response payload without hardcoded values.

### Community Network
- Filter controls map directly to `/api/crm/linkedin-contacts` query params (`search`, `strategic_value`, `min_score`).
- Response pagination (`pagination.returned`, `total`) drives UI counts.
- No data state provides actionable copy and CTA.

### Data Sovereignty
- Independence score calculated from `/api/health` + `/api/integrations/status`; missing data surfaces warning badge.
- Export flow aggregates data from `/api/stories`, `/api/dashboard/real-projects`, `/api/dashboard/real-contacts`, `/api/business-dashboard`, `/api/crm/linkedin-contacts` and logs success.

## Testing & Quality Matrix

| Journey / Feature | Automated Coverage | Manual Verification | Notes |
| --- | --- | --- | --- |
| Community leader morning flow (projects → revenue → network → stories → sovereignty) | Playwright e2e spec hitting real APIs | Weekly smoke during data refresh | Validates UX plus API payload integrity |
| Finance officer export | Integration test on `/api/v1/financial/transactions/export` + Playwright export flow | Month-end reconciliation | Confirms Xero connection & download |
| Consent management | Unit test for `/api/stories` controller + Playwright modal submission | Quarterly privacy review | Ensures consent flags respected |
| Network intelligence filters | Playwright filter assertions + API contract test for `/api/crm/linkedin-contacts` | Ad-hoc before outreach campaigns | Checks search, scoring, counts |
| Sovereignty health & export | API contract tests (`/api/admin/system-status`, `/api/integrations/status`) + Playwright export flow | Handover rehearsals | Ensures degraded systems surface alerts |

## Health & Alerting Strategy
- Parse `/api/admin/system-status` response each page load; if `overall != healthy`, show banner with component breakdown.
- Log failed API calls to `/api/health` metrics endpoint and surface toast with retry action.
- Add Prometheus gauge for export success/failure tied to `/api/integrations/sync` responses.
- Attach monitoring to `/api/v1/financial/status` to alert when `xeroStatus != connected` for >15 minutes.

## Decision Support Journeys (First Principles)

### Morning Check-In (Community Leader)
1. Open dashboard → confirm active projects and new activity (projects API).
2. Review revenue tiles → verify 40% share on track; download report if variance >5%.
3. Filter network for “high value” relationships with score <0.7 → plan outreach.
4. Skim story submissions awaiting approval → adjust consent.
5. Visit sovereignty tracker → if any integration unhealthy, trigger alert to ACT support.

### Finance Officer Review
1. Check `/api/v1/financial/status` connectivity.
2. Download latest transactions export → reconcile with local books.
3. Review independence metrics; flag communities lacking own revenue streams.
4. Trigger automation suggestions for grant outreach via `/api/notion-ai-agent/automations/opportunities`.

### Communications Lead
1. Export current story set for board update.
2. Use network filters to identify media contacts >90 days idle.
3. Share sovereignty snapshot with stakeholders showing readiness indicators.

## Appendix A: API & Data Contracts
- `/api/dashboard/real-projects` → `{ success, projects: [ { id, name, description, status, organization, lastUpdated } ] }`
- `/api/business-dashboard` → `{ total_revenue, community_share, community_percentage, revenue_streams[], community_distributions[], independence_metrics? }`
- `/api/v1/financial/reports/summary` → `{ summary: { income, expenses, netIncome, transactionCount } }`
- `/api/stories` → `{ stories: [ { id, title, content, consent_level, community, author, created_date } ], total }`
- `/api/crm/linkedin-contacts` → `{ success, data: [ { id, full_name, current_position, current_company, relationship_score, strategic_value, alignment_tags[] } ], pagination: { total, returned, limit, offset } }`
- `/api/integrations/status` → `{ success, status: { integrationName: { healthy: boolean, details } } }`
- `/api/admin/system-status` → `{ success, system: { overall: 'healthy' | 'degraded' | 'down', components: { databases, migration, integrations, platformHealth } } }`
- `/api/integrations/sync` (POST) → `{ success, syncResult, timestamp }`

## What Gets Deleted

### Current "Tech Theater" Features
- ❌ Animated brain icons and holographic text
- ❌ System health monitoring (move to admin panel)
- ❌ CPU/memory usage displays
- ❌ "Neural processing" visualizations
- ❌ API request counters
- ❌ Developer performance metrics
- ❌ Backend diagnostics tools

### Replacement with Community Power
- ✅ Real community project showcases
- ✅ Revenue transparency and community share tracking
- ✅ Story management with consent control
- ✅ Data sovereignty and export tools
- ✅ Beautiful obsolescence progress tracking
- ✅ Community-to-community networking
- ✅ Impact visualization with community control

## Implementation Priority

### Immediate (Week 1)
1. Replace system health cards with community project cards
2. Replace performance metrics with revenue transparency
3. Connect to real community data instead of fake metrics

### High Priority (Weeks 2-4)
1. Story management system with consent tracking
2. Data export tools for community sovereignty
3. Privacy dashboard for community control

### Medium Priority (Weeks 5-8)
1. Beautiful obsolescence tracking
2. Community network platform
3. Impact visualization tools

## Quality Assurance

### Community Validation
- Test with real community leaders, not developers
- Validate with actual community data, not test data
- Ensure all features serve community empowerment, not institutional convenience

### Data Integrity
- All community data exportable and importable
- Zero data loss during community transitions
- Complete audit trail of all data usage

### Beautiful Obsolescence Test
**Ultimate success metric**: Communities can fork this platform and run it themselves without needing ACT at all.

---

**Bottom Line**: Transform the current developer monitoring dashboard into the world's first community empowerment platform that serves community ownership rather than institutional extraction.

The technology exists. The data exists. The APIs exist.

We just need to build the interface that communities need instead of the tech theater they don't.
