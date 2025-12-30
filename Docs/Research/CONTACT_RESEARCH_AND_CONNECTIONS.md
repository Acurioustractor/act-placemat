## Contact Research & Innovative Connection Playbook

### Why this exists
- Backend now enriches every Notion project with intelligence and auto-aligns the best contacts via `projectAlignmentService`
- This playbook captures the always-on research sources and outreach experiments we can trigger directly from the server

### Core Data Sources (always-on)
- **Notion** → canonical project metadata, focus areas, relationship pillars, tags, supporters
- **Supabase**  
  - `linkedin_contacts` → 20.4K enriched individuals with roles, locations, relationship scores  
  - `contact_enrichments` → collaboration potential, alignment tags, AI outreach strategies  
  - `contact_interactions` → Gmail/Calendar-derived touches with sentiment, channels, cadence  
  - `project_intelligence` + `project_contact_alignment` → generated nightly, now store research insights + connection ideas
- **Gmail & Calendar** → pulled through `gmailContactIntelligence` + `calendarContactIntelligence`, used for interaction signals
- **External Research** (all server-side via Free Research AI)  
  - Tavily Search → live company/leader updates  
  - Groq Llama 3.3 → summarises findings into highlights  
  - DuckDuckGo fallback → guarantees basic context even if premium APIs fail
- **Grant / Compliance Feeds** → `grant_opportunities`, `compliance_tracking` tables plus Xero + ACNC exports for funding readiness checks

### Backend Flow (nightly or on-demand)
1. **`POST /api/v3/project-alignment/refresh`**  
   - Pulls Notion projects → stores structured data + embeddings in `project_intelligence`
   - Fetches top contacts + enrichments + interaction signals
   - Scores alignments and writes outreach recommendations to `project_contact_alignment`
2. **Optional Research Boost (`enableResearch: true`)**  
   - For each top match, runs Tavily/Groq research (“\<Contact> partnering with \<Project>”)  
   - Stores summary + highlights + cited sources in `metadata.research_insights`
   - Updates outreach talking points + connection ideas automatically
3. **Serve to Frontend**  
   - `GET /api/v3/project-alignment/projects/:projectId/outreach-plan` returns battle-ready plans for the CRM tabs

### How we keep finding more contact intelligence
- **Interaction Signals**: we now aggregate sentiment, last touch, and preferred channel from `contact_interactions` for each contact before scoring
- **Auto Research Cache**: the backend caches Groq/Tavily responses per `projectId:contactId` so repeated outreach is instant
- **Story Hooks**: research highlights automatically append to `outreach_recommendation.talking_points`, making every email reference a fresh win
- **Community Alignment**: we tag each project with `communities` + `focus_areas`, then intersect with contact interests and location strings
- **Moment Alerts** (next iteration): reuse `business_alerts` + Tavily webhooks to push updates whenever a contact’s org hits the news

### Innovative Connection Patterns now generated
- **Channel Mirroring**: if last positive interaction happened on Calendar, we recommend another invite; if it was email, suggest gratitude voice note
- **Micro-Roundtables**: when enrichment tags overlap with project focus, we propose hosting a themed micro-roundtable
- **On-Country Invitations**: when a project includes communities, we suggest immersions or field visits tied to those locations
- **Story-first Outreach**: research highlights create hooks like “Reference the recent ABC article on \<topic>…”
- **Supporter Triads**: when multiple contacts share a theme, the backend can recommend joint outreach (group intros, salon dinners)

### Immediate Next Experiments
- Turn on `enableResearch` in the nightly cron so every alignment receives live intel
- Extend research queries to include `"<Contact> philanthropy"`, `"<Org> partnership 2025"`, and `"<Org> indigenous collaboration"` for deeper cues
- Capture response outcomes (email replies, meeting accepts) back into `contact_interactions` to continuously improve channel/timing recommendations
- Wire `project_contact_alignment.metadata.connection_ideas` into the CRM UI for one-click outreach drafting

