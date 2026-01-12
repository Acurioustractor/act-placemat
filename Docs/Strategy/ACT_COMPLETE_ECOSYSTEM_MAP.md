# 🌐 ACT Complete Ecosystem Map
## ALL ACT Systems, Projects, and Data Architecture

**Date**: January 1, 2026
**Purpose**: Complete map of EVERY ACT codebase, project, and how they interconnect
**Status**: ✅ FINAL COMPREHENSIVE ALIGNMENT

---

## 🏗️ The Complete ACT Ecosystem

### ALL ACT Codebases & Projects (Aligned)

```
┌─────────────────────────────────────────────────────────────────────┐
│              🌐 ACT GLOBAL INFRASTRUCTURE (Master Hub)               │
│         /Users/benknight/act-global-infrastructure                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🧠 INTELLIGENCE HUB - Knowledge Layer                               │
│  ├─ Vector DB (pgvector) - 6,443+ lines ACT knowledge              │
│  ├─ Multi-provider AI (Claude, GPT, Gemini)                         │
│  ├─ RAG query engine (/api/v1/ask)                                  │
│  ├─ GitHub sync (issues, PRs, sprints) - every 30min                │
│  ├─ GHL sync (partners, grants) - every 6h                          │
│  └─ Notion sync (14 databases) - bidirectional                      │
│                                                                      │
│  🎯 ALMA - Sensemaking & Action Layer                                │
│  ├─ Youth Justice intelligence (domain-specific)                    │
│  ├─ Community governance (consent ledger)                           │
│  ├─ Portfolio analytics (signal calculation)                        │
│  ├─ Intervention matching (evidence + authority)                    │
│  └─ JusticeHub integration (replication packs)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ SHARED INFRASTRUCTURE
                               │ (Supabase, Notion, GHL, Vector DB)
                               │
        ┌──────────────────────┼──────────────────┬─────────────────┐
        │                      │                  │                 │
        ▼                      ▼                  ▼                 ▼
┌──────────────┐      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🌾 ACT FARM  │      │ ⚖️ JUSTICEHUB│  │📖 EMPATHY    │  │🍽️ ACT        │
│   (HUB)      │      │              │  │  LEDGER      │  │  PLACEMAT    │
│  Port 3001   │      │  Port 3002   │  │  Port 3005   │  │  Port 4000   │
├──────────────┤      ├──────────────┤  ├──────────────┤  ├──────────────┤
│              │      │              │  │              │  │              │
│ Regenerative │      │ Justice      │  │ Storytelling │  │ Intelligence │
│ studio &     │      │ transform.   │  │ platform &   │  │ + CRM layer  │
│ projects hub │      │ + ALMA       │  │ value        │  │              │
│              │      │              │  │ capture      │  │              │
│• Project     │      │• Stories     │  │• Stories     │  │• Contact     │
│  incubation  │      │• ALMA:       │  │• Engagement  │  │  enrichment  │
│• Community   │      │  - Intervent.│  │  tracking    │  │• Project     │
│  capacity    │      │  - Evidence  │  │• Value calc  │  │  matching    │
│• Support     │      │  - Contexts  │  │• Impact      │  │• Notion sync │
│  graph       │      │  - Consent   │  │  metrics     │  │• GHL pipes   │
│• Beautiful   │      │• Community   │  │• Attribution │  │• 278 contacts│
│  Obsoles.    │      │  governance  │  │• Revenue     │  │  enriched    │
│              │      │              │  │  share       │  │              │
└──────────────┘      └──────────────┘  └──────────────┘  └──────────────┘
        │                      │                  │                 │
        └──────────────────────┼──────────────────┴─────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🌻 THE HARVEST (Port 3004)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Content Curation & Publishing Platform                             │
│  ├─ ACT content aggregation                                         │
│  ├─ Public-facing storytelling                                      │
│  ├─ Impact narrative publishing                                     │
│  └─ Integration: Links to Empathy Ledger stories                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ♻️ GOODS (Health Product)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Health & Wellness Product Platform                                 │
│  ├─ Health tracking & support                                       │
│  ├─ Community-led wellness                                          │
│  ├─ Product innovation                                              │
│  └─ Integration: Farm incubation project → Product launch           │
│                                                                      │
│  **Key Projects**:                                                  │
│  ├─ Goods. (Health, Product)                                        │
│  ├─ SMART Connect (Health platform)                                 │
│  ├─ SMART HCP GP Uplift Project (Healthcare)                        │
│  └─ Custodian Economy (Health, Experience, Strategy)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              🦅 BCV / ACT FARM (Regenerative Projects)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BCV (Beautiful Community Ventures) - Regenerative Economy          │
│  ├─ Community-owned economic models                                 │
│  ├─ Regenerative agriculture & land stewardship                     │
│  ├─ Indigenous economic sovereignty                                 │
│  └─ Integration: Farm projects → BCV ventures                       │
│                                                                      │
│  **Key Projects**:                                                  │
│  ├─ Fishers Oysters (Empathy Ledger, Concept)                       │
│  ├─ Witta Harvest HQ (Community hub)                                │
│  ├─ Custodian Economy (Health, Experience, Strategy)                │
│  ├─ MingaMinga Rangers (Cultural + land management)                 │
│  └─ Travelling women's car (Cultural preservation)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────┐
        │                      │                  │
        ▼                      ▼                  ▼
┌──────────────┐      ┌──────────────┐  ┌──────────────┐
│ 📊 NOTION    │      │ 🔄 GOHIGHLEVEL│  │ 🗄️ SUPABASE  │
│   (CRM)      │      │    (CRM)      │  │  (Database)  │
├──────────────┤      ├──────────────┤  ├──────────────┤
│              │      │              │  │              │
│ Central CRM  │      │ Engagement   │  │ Data Lake    │
│ + Workflow   │      │ Automation   │  │ + Vector DB  │
│              │      │              │  │              │
│• 234 People  │      │• 4 Pipelines │  │• All project │
│• 64 Projects │      │• Community   │  │  data        │
│• 624 Actions │      │• Partnership │  │• Person      │
│• 70 Orgs     │      │• Indigenous  │  │  identity    │
│• 39 Opps     │      │• ALMA Youth  │  │• Contact     │
│              │      │  Justice     │  │  enrichment  │
│              │      │• Beautiful   │  │• ALMA        │
│              │      │  Obsolescence│  │  domain data │
│              │      │  tracking    │  │              │
└──────────────┘      └──────────────┘  └──────────────┘
```

---

## 📋 Complete Project Inventory (By System)

### 🌐 ACT Global Infrastructure
**Location**: `/Users/benknight/act-global-infrastructure`
**Purpose**: Master knowledge hub + ALMA intelligence
**Port**: N/A (service layer)

**Components**:
- Intelligence Hub (RAG query engine)
- ALMA (Youth justice domain intelligence)
- GitHub sync (issues, PRs, sprints)
- GoHighLevel sync (partners, grants)
- Notion sync (14 databases)
- Vector database (6,443+ lines knowledge)

**Supabase Tables**: Shared across all systems

---

### 🌾 ACT Farm (Hub)
**Location**: `/Users/benknight/Code/ACT Farm` + `/Users/benknight/Code/act-farm`
**Purpose**: Regenerative studio, project incubation, capacity building
**Port**: 3001

**Projects Hosted**:
1. **Project incubation pipeline** - New community-led projects
2. **Capacity building programs** - Skills, networks, confidence
3. **Support graph** - Who supports which projects
4. **Beautiful Obsolescence tracking** - Community independence progress

**Supabase Tables**:
- `farm_projects` - Project incubation pipeline
- `project_support_graph` - Supporter mapping

**Integration Points**:
- Stories from Empathy Ledger → Farm projects
- ALMA interventions → Farm pilots
- Placemat contacts → Project supporters
- Notion Projects → Project metadata

---

### ⚖️ JusticeHub
**Location**: `/Users/benknight/Code/JusticeHub`
**Purpose**: Justice transformation stories + ALMA domain intelligence
**Port**: 3002

**Projects Hosted**:
1. **PICC Projects** (7 active):
   - PICC Annual Report
   - PICC Elders' trip to Hull River
   - PICC Photo Kiosk / Server
   - PICC Storm Stories (Health, Storytelling)
   - PICC Townsville Precinct
   - *(Palm Island Community Company - major anchor client)*

2. **Justice Innovation**:
   - JusticeHub (Collaboration, Storytelling platform)
   - MMEIC - Justice Projects (Storytelling, Collaboration)
   - Oonchiumpa (justice)
   - BG Fit (Empathy Ledger, Health, justice)

3. **ALMA Domain Intelligence**:
   - Youth justice interventions
   - Evidence collection
   - Community contexts
   - Consent ledger
   - Portfolio analytics

**Supabase Tables** (ALMA):
- `alma_interventions` - Interventions with governance
- `alma_evidence` - Research, evaluations, lived experience
- `alma_community_contexts` - Place-based contexts
- `alma_outcomes` - Intended/measured outcomes
- `alma_consent_ledger` - Consent tracking
- `alma_usage_log` - Attribution + revenue share

**Integration Points**:
- Empathy Ledger stories → JusticeHub narratives
- ALMA interventions → Farm projects (pilot programs)
- Intelligence Hub → ALMA query routing
- Placemat contacts → ALMA intervention matching

---

### 📖 Empathy Ledger
**Location**: `/Users/benknight/Code/empathy-ledger-v2` (+ fresh, clean versions)
**Purpose**: Storytelling platform, value capture, impact attribution
**Port**: 3005

**Projects Hosted**:
1. **Core Platform**:
   - Empathy Ledger (Storytelling - CORE PLATFORM)
   - Impact narrative capture
   - Community value attribution

2. **Storytelling & Creative**:
   - Diagrama (Storytelling, Collaboration)
   - NFP leaders interview project (Collaboration, Research, Strategy)
   - Project Her Self design (Storytelling, Experience, Design)
   - The Confessional
   - Designing for Obsolescence

3. **Client Projects**:
   - BG Fit (uses Empathy Ledger)
   - Fishers Oysters (Empathy Ledger, Concept)

**Supabase Tables**:
- `empathy_ledger_stories` - Stories with project links
- `story_interactions` - Engagement tracking (views, shares, citations)
- `story_impact_metrics` - Value calculation (community value, reach, policy influence)

**Integration Points**:
- Stories → Farm projects (source_story_id linkage)
- Stories → ALMA interventions (evidence source)
- Stories → JusticeHub (justice transformation narratives)
- Stories → The Harvest (public publishing)
- Impact metrics → Funder intelligence packs

---

### 🍽️ ACT Placemat
**Location**: `/Users/benknight/Code/ACT Placemat`
**Purpose**: Intelligence layer, CRM, contact enrichment, project matching
**Port**: 4000 (backend), 3999 (frontend)

**Components**:
- Contact enrichment (Exa.ai) - 278 contacts enriched
- Project matching (alignment scoring)
- Notion auto-promotion (20 contacts synced)
- GoHighLevel integration
- Gmail intelligence (7,842 emails processed)
- Calendar sync (meeting tracking)

**Supabase Tables**:
- `linkedin_contacts` - Enriched contacts (278+)
- `person_identity_map` - Canonical identities (43+)
- `project_contact_matches` - Universal matching
- `contact_cadence_metrics` - Relationship tracking
- `ghl_engagement_metrics` - Beautiful Obsolescence tracking
- `community_emails` - Email intelligence
- `gmail_notion_contacts` - Email ↔ Notion mapping

**Integration Points**:
- Notion People → Auto-promotion
- GHL → Engagement automation
- Intelligence Hub → Contact intelligence
- ALMA → Intervention matching (signal boosting)
- All ACT projects → Contact matching

---

### 🌻 The Harvest
**Location**: `/Users/benknight/Code/The Harvest` + `The Harvest Website`
**Purpose**: Content curation, publishing, public-facing storytelling
**Port**: 3004

**Projects Hosted**:
1. **Content Publishing**:
   - ACT content aggregation
   - Public storytelling platform
   - Impact narrative publishing

**Integration Points**:
- Empathy Ledger stories → Public publishing
- JusticeHub stories → Impact narratives
- Farm projects → Success stories
- Notion Projects → Content source

---

### ♻️ Goods (Health Product)
**Location**: `/Users/benknight/Code/Goods Asset Register` (+ related)
**Purpose**: Health & wellness product platform
**Port**: TBD

**Projects Hosted**:
1. **Goods.** (Health, Product)
2. **SMART Connect** (Health platform - VERY ACTIVE)
3. **SMART HCP GP Uplift Project** (Healthcare)
4. **Custodian Economy** (Health, Experience, Strategy)

**Integration Points**:
- Farm incubation → Product development
- Empathy Ledger → Impact stories
- SMART projects → Health outcomes tracking
- Community health data → Goods platform

---

### 🦅 BCV / ACT Farm (Regenerative Ventures)
**Location**: Various (integrated with Farm)
**Purpose**: Community-owned economic models, regenerative economy
**Port**: Integrated with Farm (3001)

**Projects Hosted**:
1. **Regenerative Economy**:
   - Fishers Oysters (Empathy Ledger, Concept)
   - Witta Harvest HQ (Community hub)
   - Custodian Economy (Health, Experience, Strategy)

2. **Cultural & Indigenous**:
   - MingaMinga Rangers (Cultural + land management)
   - Travelling women's car | Cultural preservation + connection
   - Uncle Allan Palm Island Art
   - June's Patch
   - The Shed

3. **Strategic/Meta**:
   - Go big // Funding ACT (Strategic funding initiative)
   - Regional Arts Fellowship
   - Murrup + ACT (Partnership - Sept 2024, very recent)
   - Dad.Lab.25 (Most recent - Sept 2024)

4. **Concepts/Products**:
   - Gold.Phone (Technology, Concept - oldest: Oct 2023)
   - Contained (Concept)

**Integration Points**:
- Farm projects → BCV ventures (community ownership)
- Indigenous projects → Cultural authority (ALMA governance)
- Regenerative models → Beautiful Obsolescence (community independence)

---

## 🔄 Complete Data Flows (Updated)

### Example 1: PICC Cultural Mentoring Program

```
1. DISCOVERY (JusticeHub + ALMA)
   └─ PICC community workshop → ALMA ingestion
   └─ Stored: alma_interventions (JusticeHub Supabase)
   └─ Consent: "Community Controlled" + Palm Island Elders authority
   └─ Project: PICC Storm Stories (JusticeHub)

2. VALUE CAPTURE (Empathy Ledger)
   └─ Success stories from participants → empathy_ledger_stories
   └─ Linked to: PICC project (Notion) + ALMA intervention
   └─ Engagement tracked: story_interactions
   └─ Impact calculated: story_impact_metrics

3. PROJECT INCUBATION (Farm)
   └─ New pilot program → farm_projects
   └─ Links:
      ├─ source_story_id → empathy_ledger_stories (PICC story)
      ├─ alma_intervention_id → alma_interventions (cultural mentoring)
      ├─ notion_project_id → PICC project (Notion)
   └─ Community leads: Palm Island community members
   └─ Capacity built: Youth mentoring skills, cultural facilitation

4. CONTACT MATCHING (Placemat + Intelligence Hub)
   └─ Query: "Find contacts for PICC cultural mentoring"
   └─ Intelligence Hub searches:
      ├─ linkedin_contacts (Indigenous + youth justice keywords)
      ├─ GHL partners (synced to Notion)
      ├─ ALMA intervention signals (community authority boost)
   └─ Match created: project_contact_matches
      ├─ project_source: 'justicehub'
      ├─ alma_intervention_id: [intervention ID]
      ├─ alignment_score: 85 (Indigenous +30, youth justice +20, Queensland +10)

5. CRM WORKFLOW (Notion)
   └─ PICC project updated:
      ├─ Relations → Matched contacts
      ├─ Relations → Palm Island Elders (cultural authority)
      ├─ Relations → Organizations (PICC, funders)
   └─ Communications Dashboard:
      ├─ "Contact Sarah Chen - PICC project (85% alignment)"

6. ENGAGEMENT (GoHighLevel)
   └─ Pipeline: Indigenous Sovereignty
   └─ Cultural protocol: Elder permission required before contact
   └─ Engagement tracked: ghl_engagement_metrics
   └─ Beautiful Obsolescence: 100% → 60% → 20% → 0% (goal)

7. PORTFOLIO INTELLIGENCE (ALMA + Intelligence Hub)
   └─ Youth Justice Intelligence Pack generated
   └─ Includes: PICC cultural mentoring (78% portfolio score)
   └─ Recommendations for funders
   └─ Revenue share: 70% to PICC + workshop contributors

8. PUBLICATION (JusticeHub + The Harvest)
   └─ Community approval: Elders approve for public sharing
   └─ Replication pack created (JusticeHub)
   └─ Impact story published (The Harvest)
   └─ Attribution: PICC + Elders + contributors

9. REGENERATIVE VENTURES (BCV / Farm)
   └─ If successful → BCV venture opportunity
   └─ Community ownership model designed
   └─ Indigenous economic sovereignty advanced
   └─ Revenue flows back to community

10. BEAUTIFUL OBSOLESCENCE
    └─ 6 months later: PICC runs program independently
    └─ Farm project stage: "independent"
    └─ GHL stage: "orbit" (0% ACT / 100% community)
    └─ ACT role: Obsolete (MISSION SUCCESS!)
```

---

### Example 2: SMART Connect (Goods Health Platform)

```
1. PROJECT DEVELOPMENT (Goods + Farm)
   └─ SMART Connect health platform
   └─ Stored: farm_projects (health product track)
   └─ Integration: Goods product innovation

2. STORYTELLING (Empathy Ledger)
   └─ User success stories → empathy_ledger_stories
   └─ Health outcomes tracked → story_impact_metrics
   └─ Community value calculated

3. CONTACT MATCHING (Placemat)
   └─ Match health practitioners → SMART project
   └─ Alignment: health + community + wellness keywords
   └─ project_contact_matches (project_source: 'farm')

4. ENGAGEMENT (GHL)
   └─ Pipeline: Community Capability Building
   └─ SMART practitioners → Partnership pipeline
   └─ Obsolescence: Build SMART's own capacity

5. PUBLICATION (The Harvest)
   └─ SMART success stories published
   └─ Health impact narratives shared
   └─ Community health outcomes showcased
```

---

## 📊 Unified Database Schema (Complete)

**See**: [ACT_MASTER_ECOSYSTEM_ALIGNMENT.md](ACT_MASTER_ECOSYSTEM_ALIGNMENT.md) for full schema

**Key Tables** (Shared Supabase):
- `person_identity_map` - Canonical identities across ALL systems
- `linkedin_contacts` - Enriched contacts (Placemat)
- `project_contact_matches` - Universal matching (ALL projects)
- `alma_interventions` - JusticeHub domain intelligence
- `empathy_ledger_stories` - Storytelling + value capture
- `farm_projects` - Project incubation (Farm + BCV)
- `ghl_engagement_metrics` - Beautiful Obsolescence tracking

**Links Across Systems**:
- `notion_project_id` - Universal project reference (ALL ACT projects in Notion)
- `alma_intervention_id` - Links to ALMA domain intelligence
- `source_story_id` - Links Farm projects to Empathy Ledger stories
- `person_id` - Canonical identity links to all contact sources

---

## 🎯 Project Categories (33 Active Projects)

### Justice & Social Impact (9 projects)
**Systems**: JusticeHub, Empathy Ledger, Farm
- PICC projects (7): Annual Report, Elders' trip, Photo Kiosk, Storm Stories, Townsville Precinct
- JusticeHub (platform)
- MMEIC - Justice Projects
- Oonchiumpa
- BG Fit (Empathy Ledger + justice)

### Storytelling & Creative (6 projects)
**Systems**: Empathy Ledger, The Harvest
- Empathy Ledger (CORE PLATFORM)
- Diagrama
- NFP leaders interview project
- Project Her Self design
- The Confessional
- Designing for Obsolescence

### Health & Wellness (4 projects)
**Systems**: Goods, Farm
- Goods. (Product)
- SMART Connect (VERY ACTIVE - Oct 2024)
- SMART HCP GP Uplift Project
- Custodian Economy

### Cultural & Indigenous (4 projects)
**Systems**: BCV / Farm, JusticeHub
- Travelling women's car (Cultural preservation)
- Uncle Allan Palm Island Art
- MingaMinga Rangers
- Murrup + ACT (Partnership - Sept 2024)

### Regenerative Economy / BCV (5 projects)
**Systems**: BCV / Farm
- Fishers Oysters (Empathy Ledger concept)
- Witta Harvest HQ
- Gold.Phone (oldest: Oct 2023)
- Contained
- Custodian Economy

### Strategic / Meta (5 projects)
**Systems**: Farm, Global Infrastructure
- Go big // Funding ACT
- Regional Arts Fellowship
- Dad.Lab.25 (most recent: Sept 2024)
- June's Patch
- The Shed

---

## 🚀 Integration Summary

### Data Flows Between Systems

**Intelligence Hub ↔ All Systems**:
- Provides: Unified knowledge, query engine, partner/grant sync
- Receives: Project data, contact intelligence, story content

**ALMA (JusticeHub) ↔ Farm ↔ Empathy Ledger**:
- ALMA interventions → Farm pilots → Empathy Ledger stories → ALMA evidence
- Consent ledger governs all knowledge flows
- Revenue share: 70% to contributors

**Placemat ↔ Notion ↔ GHL**:
- Contacts enriched → Matched to projects → Synced to Notion → Automated in GHL
- Beautiful Obsolescence tracked across all touchpoints

**The Harvest ↔ Empathy Ledger ↔ JusticeHub**:
- Stories collected → Value captured → Published publicly
- Impact narratives shared

**Goods / BCV ↔ Farm**:
- Product innovation → Farm incubation → Community ventures
- Health outcomes → Empathy Ledger stories

---

## 💡 The Complete Secret Sauce

**8 Systems. 33 Projects. 1 Coherent Ecosystem.**

- **Intelligence Hub** → Unified knowledge across all ACT work
- **ALMA** → Domain intelligence (youth justice) with community governance
- **JusticeHub** → 9 justice projects + ALMA intelligence layer
- **Empathy Ledger** → 6 storytelling projects + value capture
- **The Farm** → Project incubation for all ACT work
- **ACT Placemat** → Contact enrichment + matching for all projects
- **The Harvest** → Public storytelling + content curation
- **Goods / BCV** → Health products + regenerative ventures

**All connected through**:
- Canonical person identities (`person_identity_map`)
- Universal project references (`notion_project_id`)
- ALMA consent governance (ethical knowledge flows)
- Bidirectional sync (Supabase ↔ Notion ↔ GHL)
- Beautiful Obsolescence tracking (community independence)

**This is not 8 separate systems. This is ONE Community Liberation Platform.**

---

**Completed**: January 1, 2026
**Status**: ✅ COMPLETE ECOSYSTEM MAPPED

🌱 **All ACT systems, all projects, all connections - fully aligned.**
