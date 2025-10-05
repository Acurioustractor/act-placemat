# ACT Alignment Workshop — Virtual Runthrough & Frontend Blueprint

## 1. Session Context
- **Reference compass**: `ACT_MASTER_ALIGNMENT_OVERVIEW.md` highlights the need to validate the master brief, confirm residency design, and lock invitees (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:106-111`).
- **Operating philosophy**: Beautiful Obsolescence and locked values ensure every decision moves power to community ownership (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:10-23`).

## 2. Agenda (120 minutes)
1. **Welcome & Purpose Reset (10 min)** — Reaffirm temporary-by-design posture and success metrics of irrelevance (`ACT_MASTER_PHILOSOPHY_2025.md:31-87`).
2. **Systems & Data Alignment (25 min)** — Walk through current knowledge graph inputs, Supabase caches, and communication feeds to ensure shared understanding of source fidelity (`ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md:8-160`).
3. **Portfolio Signal Review (25 min)** — Review the 64-project snapshot, thematic clusters, and revenue/ opportunity pipelines (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:40-50`).
4. **Place-Based Deep Dive — Witta Region (25 min)** — Surface current assets, protocols, and experiments tied to Witta Harvest HQ & Seed House Witta (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:54-71`; `.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:2543-2578`; `NOTION_SUPABASE_SUMMARY.md:121-158`).
5. **Residency Design Sprint (20 min)** — Co-design objectives, invitees, and success indicators grounded in Rocket Booster cadence (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:62-93`; `ROCKET_BOOSTER_FRAMEWORK.md:20-32`).
6. **Gaps, Risks, and Data Needs (10 min)** — Document unresolved questions and required schema updates before residency execution (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:97-103`).
7. **Frontend Enablement Alignment (5 min)** — Map workshop outcomes to the Knowledge Wiki UI roadmap (`FRONTEND_REDESIGN_PLAN.md:41-189`).

## 3. Key Insights Captured
- **Philosophy validation**: Participants confirmed the First-Principles checklist remains fit-for-purpose; explicit call to add Indigenous governance checkpoints to every Witta experiment (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:17-23`, `ACT_MASTER_ALIGNMENT_OVERVIEW.md:61-66`).
- **Data confidence**: Team agreed on using the 10 Notion databases plus Supabase caches as the canonical data graph; flagged need for community ownership % fields before the obsolescence scorecard can render accurately (`ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md:10-133`; `ACT_MASTER_ALIGNMENT_OVERVIEW.md:88-93`).
- **Portfolio focus**: Story sovereignty, youth justice, and economic freedom clusters remain core; require fresher milestone data for BG Fit and JusticeHub before public transparency modules go live (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:47-50`; `.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:1814-2383`).
- **Place-based commitments**: Consensus to treat Witta farm as a residency and prototype site anchored in Decentralised Power, with Seed House Witta acting as operational lead (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:54-71`; `NOTION_SUPABASE_SUMMARY.md:121-158`).

## 4. Residency Invite List (Wave 1)
| Role | Invitee | Rationale & Evidence |
| --- | --- | --- |
| Community Production Lead | **Emma Rodriguez — Seed House Witta** | Operational lead on Witta production ecosystem, maintains Supabase contact profile for the region (`NOTION_SUPABASE_SUMMARY.md:136-158`). |
| Story Sovereignty Partner | **Sandra Phillips (PhD)** | Expressed intent to engage with Witta farm for cultural storytelling collaborations (`Docs/LinkedIn/Bens_data/messages.csv:5-8`). |
| Local Economic Development | **Tim McGee — Sunshine Coast Council** | Oversees regional industry development; presence helps integrate council support (`Docs/LinkedIn/Bens_data/Connections.csv:3597`). |
| Youth Justice Innovation | **BG Fit Leadership Collective** | Active project driving Decentralised Power in youth justice; needs residency time to codify independence metrics (`.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:1814-1838`). |
| Story Network Steward | **PICC - Storm Stories Team** | Active storytelling project aligned with residency knowledge-sharing goals (`.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:2402-2438`). |
| Data & Systems Anchor | **ACT Intelligence Product Squad** | Required to translate residency learnings into Knowledge Wiki modules and scorecard instrumentation (`FRONTEND_REDESIGN_PLAN.md:41-189`; `ACT_MASTER_ALIGNMENT_OVERVIEW.md:88-93`). |

**Outstanding invites**: Identify Indigenous governance representatives local to Witta before finalising roster (action logged in §6).

## 5. Open Gaps & Actions
1. **Indigenous Governance Partner** — Need named Elders/Cultural Authority for Witta engagements; propose preliminary outreach via Seed House Witta network. (*Owner*: Residency coordinator)
2. **Community Ownership Metrics** — Add `community_ownership_pct` field to Notion→Supabase sync before building the scorecard (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:88-93`; `ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md:28-62`).
3. **Milestone Hygiene** — Update milestone dates for BG Fit and MMIEC Justice Projects ahead of public storytelling exports (`.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:1814-2383`).
4. **Residency Logistics** — Document accommodation capacity, accessibility considerations, and local supplier ledger template for the farm experiments (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:69-71`).

## 6. Frontend Implementation Blueprint
### Phase 1 — Intelligence Foundations (Weeks 1-3)
- Ship **Morning Brief**, **Relationships Hub**, and **Projects View** powered by existing APIs (`/api/intelligence/morning-brief`, `/api/contacts/search`, `/api/projects`) to give leadership daily clarity (`FRONTEND_REDESIGN_PLAN.md:41-88`).
- Implement **Command Palette** + unified search indexing Notion Projects/People/Organizations and Supabase contact cadence tables (`ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md:10-133`).
- Add residency-focused lens by surfacing Witta-tagged entities and upcoming milestones (leveraging `Places` relation in projects dataset `.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:2569-2571`).

### Phase 2 — Operational Workbenches (Weeks 4-6)
- Build **Opportunities Pipeline**, **Calendar Intelligence**, and **Gmail Intelligence** modules to align funding, communications, and scheduling with residency outcomes (`FRONTEND_REDESIGN_PLAN.md:92-139`).
- Layer **Data Workbench views** for Projects/People/Opportunities so workshop actions (metadata sprint, cadence review) can be executed in-app (`ACT_MASTER_ALIGNMENT_OVERVIEW.md:88-93`).
- Introduce **Residency Dashboard**: highlight invitees, prep tasks, logistics checklists, and knowledge capture forms (pulling from Notion Tasks/Events tables `ACT_KNOWLEDGE_WIKI_DATA_INVENTORY.md:55-62`).

### Phase 3 — Story & Transparency Modules (Weeks 7-9)
- Launch **Stories & Media workspace** with publish-ready exports for Witta residencies and project case studies (`FRONTEND_REDESIGN_PLAN.md:160-189`).
- Enable **Public/Private toggles** and embed generators for residency transparency, aligned with storytelling projects (`.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem/projects.json:2402-2438`).
- Integrate **Obsolescence Scorecard** once ownership metrics are sync’d (ties to §5 action #2).

### Enablers & Dependencies
- **API Contracts**: Confirm aggregated endpoints for combined timeline feeds (projects + emails + events) before Phase 2.
- **Design System**: Ensure shared component library handles dense data tables and story-rich layouts simultaneously (`FRONTEND_REDESIGN_PLAN.md:41-189`).
- **AI Context Packs**: Update “Ask ACT” prompts to automatically include residency data slices and community ownership stats (leveraging `/api/v2/agent/ask`).

## 7. Immediate Follow-Up Checklist
1. Circulate workshop notes & invite confirmations for sign-off.
2. Kick off metadata sprint focusing on Witta-linked projects (status, milestones, opportunities).
3. Create technical task tickets for Phase 1 frontend stories + ownership metric sync.
4. Schedule Indigenous governance outreach and capture response before residency logistics lock date.

---
*Prepared for leadership alignment and product execution; ready for iteration during live workshop review.*
