# ACT Intelligence Hub – Wireframe Blueprint

This wireframe captures the Phase 1 frontend modules defined in `FRONTEND_REDESIGN_PLAN.md`, showing layout hierarchy, component groupings, and data touchpoints. All views assume desktop first with responsive notes at the end.

---

## Global Shell
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Top Bar (logo + philosophy tagline + obsolescence status)               │
├─────────────────────────────────────────────────────────────────────────┤
│ Secondary Nav Tabs (Morning Brief | Contacts | Projects | Research ...)  │
├─────────────────────────────────────────────────────────────────────────┤
│ Page Content Area                                                        │
│   (Varies per tab; outlined below)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ AI Agent Floating Button (bottom-right) + Slide-in Chat Panel            │
└─────────────────────────────────────────────────────────────────────────┘
```
- **Data sources**: Nav state stored client-side; query parameter `?tab=` persists selection.
- **Cache strategy**: TanStack Query caches payloads per endpoint (`/api/intelligence/*`, `/api/contacts/*`, `/api/real/projects`).
- **Mock mode**: Set `VITE_USE_MOCK_DATA=true` (or rely on automatic fallback) to render cached insight/stub data when backend APIs are offline.

---

## Morning Intelligence Brief
```
┌───────────────────────────────────────────────┐
│ Greeting + Date                               │
├───────────────────────────────────────────────┤
│ Priority Actions (card stack, urgency pill)   │
├───────────────────────────────────────────────┤
│ Grant/Opportunity Highlights (list)           │
├───────────────────────────────────────────────┤
│ Relationship Alerts (contact + suggested act) │
├───────────────────────────────────────────────┤
│ Today’s Schedule (time block list)            │
└───────────────────────────────────────────────┘
```
- **Endpoints**: `/api/intelligence/morning-brief` with fallback stub for demo.
- **Interactions**: CTA buttons open mailto/compose; list items deep link to Contacts or Projects once implemented.
- **State**: loading skeleton, error banner, cached data reused when revisiting tab.

---

## Contact Intelligence Hub
```
┌────────────────────────────────────────────────────────────────┐
│ Header (total contacts + cadence stats)                        │
├────────────────────────────────────────────────────────────────┤
│ Data Quality Notice (info banner)                              │
├────────────────────────────────────────────────────────────────┤
│ Filter Bar                                                     │
│  - Search input (debounced)                                    │
│  - Toggle: has email                                           │
│  - Quick chips (common terms)                                  │
├────────────────────────────────────────────────────────────────┤
│ Two-Column Body                                                │
│  ├─ Left: Contact List (virtualised rows, hover highlight)     │
│  └─ Right: Detail Panel (contact summary, linked orgs/projects)│
└────────────────────────────────────────────────────────────────┘
```
- **Endpoints**: `/api/contacts/stats`, `/api/contacts/search?query=&limit=`.
- **Cache**: Debounced search ensures cached results per query key; stats fetched once.
- **Future hooks**: detail panel expands to show email cadence (Gmail), project intersections (Notion).

---

## Projects Portfolio View (Community Projects component)
```
┌──────────────────────────────────────────────────────────────┐
│ Header (active project count + story/ownership metrics)      │
├──────────────────────────────────────────────────────────────┤
│ Summary Tiles (Active, Ideation, Transferred, Sunsetting)    │
├──────────────────────────────────────────────────────────────┤
│ Active Projects (cards sorted by next milestone)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Cover | Name | Status badge | Themes | Next milestone   │ │
│  │ Linked orgs / places / opportunities chips              │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ Other Projects (accordion or grid)                           │
├──────────────────────────────────────────────────────────────┤
│ Calendar Highlights (if `/api/calendar/events` reachable)    │
└──────────────────────────────────────────────────────────────┘
```
- **Endpoints**: `/api/real/projects`, `/api/intelligence/dashboard`, `/api/calendar/events?limit=`.
- **Data columns**: status, themes, core values, revenue fields (Ready for obsolescence scorecard).
- **Drilldown**: clicking a project routes to full Project Intelligence page (phase 2).

---

## Research (Curious Tractor Deep Dives)
```
┌──────────────────────────────────────────────┐
│ Saved Searches / Topics (left rail)          │
├──────────────────────────────────────────────┤
│ Active Research Thread                       │
│  - Title, summary, AI-generated insights     │
│  - Source cards (url, type, relevance)       │
├──────────────────────────────────────────────┤
│ Actions: Run new query, export summary       │
└──────────────────────────────────────────────┘
```
- **Endpoint**: `/api/research/grants`, `/api/curious-tractor/*`.
- **Notes**: integrate Ask ACT context so research queries pass through same agent with full wiki context.

---

## AI Agent Chat
```
Floating Button → Slide-in Panel
┌──────────────────────────────┐
│ Gradient header (title + x) │
├──────────────────────────────┤
│ Conversation stream          │
├──────────────────────────────┤
│ Suggested prompts (initial)  │
├──────────────────────────────┤
│ Input box + send             │
└──────────────────────────────┘
```
- **Endpoint**: `/api/v2/agent/ask` using `resolveApiUrl`.
- **Context**: message payload should include current tab/state to ground responses.

---

## Navigation & Layout Notes
- Tabs render horizontally, scroll on small widths, with active underline for clarity.
- Top bar emphasises Beautiful Obsolescence statement and community ownership indicator (pull from metrics endpoint).
- Use consistent card components (`ui/Card`, `ui/SectionHeader`) for coherence.

---

## Responsive Considerations
- **≤1024px**: convert two-column contact layout to stacked view (list collapses detail into modal drawer).
- **≤768px**: hide summary tiles in Projects under collapsible accordions; filter bars become drop-down sheets.
- **Floating AI button**: reposition to top-right on mobile to avoid covering tab bar.

---

## Data Alignment Checklist
- Each section references either Notion (via Supabase cache) or external integrations documented in `ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md`.
- TanStack Query keys per endpoint (`morning-brief`, `contacts:list:{query}`, `projects:active`) for cache control.
- Ensure server aggregation endpoints return pagination metadata for future infinite scroll (Contacts, Projects).

---

_Ready for review—update or annotate this blueprint in-place as we iterate on component build-out._
