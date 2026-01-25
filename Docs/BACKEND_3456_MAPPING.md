# ACT Intelligence Platform - Backend API Mapping

## THE Backend: http://localhost:3456

All frontend components should ONLY use port 3456.

---

## Sidebar → API Endpoint Mapping

### OPERATIONS (11 items)

| Sidebar Item | API Endpoint | Data |
|-------------|--------------|------|
| **Brain Center** | `/api/goals/2026`, `/api/ecosystem`, `/api/moon-cycle/current` | Goals, ecosystem, moon |
| **Overview** | TBD - need to find/create endpoint | Dashboard summary |
| **Projects** | `/api/projects` | 78 Notion projects |
| **Goals** | `/api/goals/2026` | 2026 goals by lane |
| **Goods Wiki** | `/api/knowledge/stats`? | Knowledge base |
| **Content** | `/api/communications/recent` | Multi-channel comms |
| **Contacts** | `/api/relationships/health` | Relationship data |
| **Calendar** | TBD | Calendar events |
| **Opportunities** | `/api/scouts/alta` | Grant opportunities |
| **Finance** | TBD | Financial data |
| **Subscriptions** | TBD | Subscription data |

### INTELLIGENCE (3 items)

| Sidebar Item | API Endpoint | Data |
|-------------|--------------|------|
| **Intelligence** | `/api/agents`, `/api/communications/recent`, `/api/knowledge/stats` | Agents, comms, knowledge |
| **Relationships** | `/api/relationships/health` | Relationship health |
| **Agent Approvals** | `/api/agents/proposals` | Pending proposals |

### EXPLORE (3 items)

| Sidebar Item | API Endpoint | Data |
|-------------|--------------|------|
| **Visualisations** | TBD | Visualizations |
| **Time Visuals** | `/api/moon-cycle/current` | Moon phases, LCAA |
| **Research** | `/api/scouts` | Scout reports |

### DEV (1 item)

| Sidebar Item | API Endpoint | Data |
|-------------|--------------|------|
| **Development** | `/api/infrastructure`, `/api/codebases`, `/api/database` | Git repos, Docker, DB |

---

## Available API Endpoints (Port 3456)

### Agents & Tasks
```
GET  /api/agents              - List agents with status
GET  /api/agents/active       - Active agents with autonomy levels
GET  /api/agents/proposals    - Pending approvals
GET  /api/agents/activity     - Recent activity (24h)
POST /api/dispatch            - Send message to agents
GET  /api/tasks               - List tasks (filter: status, agent)
POST /api/tasks/:id/execute   - Execute a task
POST /api/tasks/:id/approve   - Approve task
POST /api/tasks/:id/reject    - Reject task
```

### Projects
```
POST /api/projects            - Create project from goal
GET  /api/projects            - List projects
POST /api/projects/:id/work   - Run agents on pending tasks
POST /api/projects/:id/chat   - Chat with project agent
```

### Intelligence & Communications
```
GET  /api/communications/recent - Multi-channel communications
GET  /api/knowledge/stats       - Knowledge base statistics
GET  /api/relationships/health  - Relationship health summary
```

### Scouts
```
GET  /api/scouts               - Overview of all scouts
GET  /api/scouts/bunya         - Project health data
GET  /api/scouts/alta          - Grant opportunities
```

### Search
```
GET  /api/search?q=query&limit=20&types=voice,knowledge,contacts,communications,projects
```

### Brain Center
```
GET  /api/goals/2026           - 2026 goals grouped by Lane
GET  /api/goals/summary        - Goals summary statistics
POST /api/goals/:id/update     - Update goal progress
GET  /api/ecosystem            - ACT ecosystem sites
GET  /api/ecosystem/health-summary - Health scores + alerts
GET  /api/moon-cycle/current   - Moon phase with LCAA
```

### Infrastructure
```
GET  /api/infrastructure       - Claude Code layer
GET  /api/codebases            - Git status of all repos
GET  /api/connectors           - Status of integrations
GET  /api/scripts              - Script inventory
GET  /api/clawdbot             - ClawdBot Docker services
GET  /api/database             - Database table counts
POST /api/heartbeat            - Trigger heartbeat check
```

---

## Missing Endpoints Needed

The following sidebar items need endpoints or components:

1. **Overview/Dashboard** - No unified dashboard endpoint
2. **Goods Wiki** - No dedicated endpoint
3. **Content** - No dedicated endpoint
4. **Calendar** - No dedicated endpoint
5. **Finance** - No dedicated endpoint
6. **Subscriptions** - No dedicated endpoint
7. **Visualisations** - No dedicated endpoint
8. **Research** - No dedicated endpoint

## Plan

Phase 1 (Done):
- ✅ Brain Center - Uses goals/2026, ecosystem, moon-cycle

Phase 2:
- Fix Dashboard to use 3456 (remove 4000 dependency)
- Connect Projects to /api/projects
- Connect Intelligence to agents/communications/knowledge
- Connect Relationships to /api/relationships/health
- Connect Agent Approvals to /api/agents/proposals
- Connect Time Visuals to /api/moon-cycle/current
- Connect Development to /api/infrastructure

Phase 3:
- Build missing endpoints for: Overview, Goods, Content, Calendar, Finance, Subscriptions, Visualisations, Research
