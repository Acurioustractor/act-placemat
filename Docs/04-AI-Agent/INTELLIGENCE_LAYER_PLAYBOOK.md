# Intelligence Layer Playbook

## Purpose

Establish a repeatable loop where agents write structured insights back into Supabase and the product surfaces them. Every insight flows through four phases:

1. **Collect** — pull project + location data from Supabase/Notion.
2. **Reason** — run AI logic (Synthesis, Geo Sentinel, Pattern Hunter, Research annotator, DNAGuardian refusal logger).
3. **Persist** — write results into the intelligence tables.
4. **Surface** — read the tables to populate dashboards, Morning Brief, and automation queues.

## Supabase Schema (new tables)

| Table | What it stores | Primary source |
|-------|----------------|----------------|
| `intelligence_briefings` | Weekly field briefings (summary, highlights, metrics) | Synthesis Agent |
| `intelligence_geo_alerts` | Hotspot/decline alerts by region/stage | Geo Sentinel |
| `project_pairings` | Suggested mentor/project pairings with similarity score | Pattern Hunter |
| `project_research` | Auto-annotated research links per project | Research tooling (Perplexity/Tavily) |
| `intelligence_refusals` | Guardrail refusal log (agent, prompt, reason) | DNAGuardian |

See `supabase/migrations/20251121090000_intelligence_layer_tables.sql` for the exact schema.

## Backend API

The new `/api/intelligence` namespace exposes CRUD hooks for agents or human operators:

| Endpoint | Description |
|----------|-------------|
| `GET /api/intelligence/briefings` | Latest briefings (limit 20) |
| `POST /api/intelligence/briefings` | Insert a new briefing (summary + highlights) |
| `GET /api/intelligence/geo-alerts` | Location alerts |
| `POST /api/intelligence/geo-alerts` | Create alert (region, severity, recommendation) |
| `GET /api/intelligence/project-pairings?project_id=` | Pairings filtered by project |
| `POST /api/intelligence/project-pairings` | Store pairing with similarity + metadata |
| `GET /api/intelligence/project-research/:projectId` | Annotated research links |
| `POST /api/intelligence/project-research` | Attach new research entry |
| `GET /api/intelligence/refusals` | Last 100 DNAGuardian refusals |
| `POST /api/intelligence/refusals` | Log a refusal (agent, prompt, reason) |

Agents should call these endpoints after they finish reasoning so the UI stays fresh.

## Agent Routines

### Synthesis Agent
1. Query Supabase (`projects`, `projects_activity_summary`) for autonomy deltas, active counts, upcoming milestones.
2. Build a JSON payload `{ summary, highlights: [...], metrics: {...} }`.
3. POST to `/api/intelligence/briefings`.
4. UI surface: Morning Brief tab pulls latest entry for the header card.

### Geo Sentinel
1. Consume the location view (projects + lat/lng + stage).
2. Compare week-on-week counts per state/region.
3. Insert alerts via `/api/intelligence/geo-alerts` with recommended next steps.
4. UI surface: Direction tab + Geo visualisation callout.

### Pattern Hunter
1. Use pgvector similarity search on `project.aiSummary`.
2. For each match above threshold, write to `/api/intelligence/project-pairings`.
3. UI surface: Projects detail page “Suggested Mentors.”

### Research Tooling
1. When `/api/research` runs, store each source via `/api/intelligence/project-research`.
2. UI surface: Project detail “Related Research” + Visualisations detail modals.

### Intelligence Guardrails
1. DNAGuardian intercepts non-sovereignty queries.
2. POST `{ agent, prompt, reason }` to `/api/intelligence/refusals`.
3. UI surface: Movement lineage/scoreboard shows refusal counts, aiding prompt tuning.

## Workflow Summary

1. **Run agents** (cron, CLI, or button) – they call into `/api/intelligence/...`.
2. **Supabase persists** – tables capture everything for auditing.
3. **Frontend reads** – use Supabase APIs or new backend endpoints to display insights.
4. **Feedback loop** – analysts review the data, adjust prompts/thresholds, repeat.

## How to use today

1. Apply the Supabase migration (`supabase db push` or via Studio).
2. Restart the backend (`npm run dev -- --host`) so `/api/intelligence` is available.
3. Update your agent scripts to POST results to these endpoints.
4. Consume the data in Morning Brief / Direction tabs (e.g., fetch `/api/intelligence/briefings`).
5. Monitor `intelligence_refusals` to refine guardrails.

With this structure in place, every new AI idea slots into the same pattern—collect, reason, persist, surface—keeping intelligence explainable and useful.***
