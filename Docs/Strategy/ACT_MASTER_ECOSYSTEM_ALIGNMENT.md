# ACT Master Ecosystem Alignment
## Unified Data Architecture Across ALL ACT Systems

**Date**: January 1, 2026
**Purpose**: Align ALL ACT codebases into ONE coherent ecosystem
**Status**: ✅ ARCHITECTURE COMPLETE - Ready for Implementation

---

## 🌐 The Complete ACT Ecosystem

### ALL Systems Mapped (Infrastructure + Projects)

```
┌─────────────────────────────────────────────────────────────────────┐
│              ACT GLOBAL INFRASTRUCTURE (Master Hub)                  │
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
│  🎯 ALMA - Sensemaking & Action Layer (NEW)                          │
│  ├─ Youth Justice intelligence (domain-specific)                    │
│  ├─ Community governance (consent ledger)                           │
│  ├─ Portfolio analytics (signal calculation)                        │
│  ├─ Intervention matching (evidence + authority)                    │
│  └─ JusticeHub integration (replication packs)                      │
│                                                                      │
│  📊 UNIFIED DATA SOURCES                                             │
│  ├─ Supabase (PostgreSQL + pgvector)                                │
│  ├─ Notion (14 databases: People, Projects, Actions, etc.)          │
│  ├─ GoHighLevel (CRM: partners, grants, contacts)                   │
│  ├─ GitHub (7 repos: issues, PRs, projects)                         │
│  └─ Knowledge base (LCAA, operations, procedures)                   │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ SHARED INFRASTRUCTURE
                           │ (Supabase, Notion, GHL, Vector DB)
                           │
        ┌──────────────────┼──────────────────┬────────────────────┐
        │                  │                  │                    │
        ▼                  ▼                  ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ACT PLACEMAT │  │  JUSTICEHUB  │  │EMPATHY LEDGER│  │  ACT FARM    │
│ (Port 4000)  │  │  (Port 3002) │  │  (Port 3005) │  │  (Port 3001) │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│              │  │              │  │              │  │              │
│ Intelligence │  │ Justice      │  │ Storytelling │  │ Regenerative │
│ + CRM layer  │  │ stories +    │  │ + value      │  │ projects +   │
│              │  │ ALMA domain  │  │ capture      │  │ incubation   │
│              │  │              │  │              │  │              │
│• Contact     │  │• Stories     │  │• Stories     │  │• Projects    │
│  enrichment  │  │• Intervent-  │  │• Engagement  │  │• Capacity    │
│• Project     │  │  ions        │  │• Value calc  │  │  building    │
│  matching    │  │• Evidence    │  │• Impact      │  │• Community   │
│• Notion sync │  │• Community   │  │  metrics     │  │  leads       │
│• GHL pipes   │  │  contexts    │  │• Attribution │  │• Support     │
│              │  │• Consent     │  │              │  │  graph       │
│Supabase:     │  │              │  │Supabase:     │  │Supabase:     │
│ linkedin_    │  │Supabase:     │  │ empathy_     │  │ farm_        │
│ contacts     │  │ alma_*       │  │ ledger_      │  │ projects     │
│ person_      │  │ tables (6)   │  │ stories      │  │ project_     │
│ identity_map │  │              │  │ story_       │  │ support_     │
│ project_     │  │              │  │ interactions │  │ graph        │
│ contact_     │  │              │  │ story_impact │  │              │
│ matches      │  │              │  │ _metrics     │  │              │
│ ghl_         │  │              │  │              │  │              │
│ engagement_  │  │              │  │              │  │              │
│ metrics      │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │                    │
        │                  │                  │                    │
        └──────────────────┼──────────────────┴────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NOTION (Unified CRM)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  👥 PEOPLE (234+) - Central contact database                         │
│  ├─ Synced from: Placemat (enriched contacts)                       │
│  ├─ Synced from: Intelligence Hub (GHL partners)                    │
│  ├─ Links to: Projects, Organizations, Opportunities                │
│  └─ notion_person_id referenced across ALL systems                  │
│                                                                      │
│  🎯 PROJECTS (64+) - All ACT projects                                │
│  ├─ JusticeHub projects (PICC, etc.)                                │
│  ├─ Empathy Ledger projects                                         │
│  ├─ Farm projects (incubation)                                      │
│  ├─ Placemat projects                                               │
│  └─ notion_project_id referenced across ALL systems                 │
│                                                                      │
│  🏢 ORGANIZATIONS (70+) - Partners & funders                         │
│  💬 COMMUNICATIONS DASHBOARD (234+) - Relationship mgmt              │
│  ✅ ACTIONS (624+) - Daily workflow                                  │
│  💡 OPPORTUNITIES (39+) - Grants & partnerships                      │
│  📍 PLACES (18+) - Geographic tracking                               │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ ENGAGEMENT AUTOMATION
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       GOHIGHLEVEL (CRM)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📋 PIPELINES (Beautiful Obsolescence Model)                         │
│  ├─ Community Capability Building (5 stages)                        │
│  │   Discovery → Ignition → Thrust → Trajectory → Orbit            │
│  ├─ Strategic Partnerships (6 stages)                               │
│  ├─ Indigenous Sovereignty (6 stages with cultural protocol)        │
│  └─ ALMA-Specific: Youth Justice Intervention Matching              │
│                                                                      │
│  🔄 SYNCED DATA                                                      │
│  ├─ Contacts from: Notion People (via Intelligence Hub)             │
│  ├─ Opportunities from: Notion Opportunities                        │
│  ├─ Projects from: Notion Projects                                  │
│  └─ Engagement metrics → Supabase (ghl_engagement_metrics)          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Unified Data Flow: The Complete Cycle

### Example: Youth Justice Intervention Discovery → Community Impact

```
1. DISCOVERY (JusticeHub + ALMA)
   └─ Community workshop in Queensland
   └─ Youth justice intervention documented
   └─ ALMA ingestion service captures with consent
   └─ Stored: alma_interventions table (JusticeHub Supabase)
   └─ Fields: title, description, evidence, community_contexts
   └─ Consent: consent_level = "Community Controlled"
   └─ Authority: cultural_authority = "Palm Island Elders Council"

2. EXTRACTION (ALMA Intelligence)
   └─ AI extracts structured entities:
      ├─ Intervention type: "Cultural mentoring program"
      ├─ Evidence level: "Community-endorsed, emerging evidence"
      ├─ Outcomes: "Reduced recidivism, increased cultural connection"
      ├─ Context: "Indigenous youth, 12-18, Palm Island"
   └─ Portfolio signals calculated:
      ├─ Community authority: 95% (Elder-endorsed)
      ├─ Evidence strength: 65% (pilot data, strong community support)
      ├─ Harm risk: 5% (culturally safe, community-led)
      ├─ Implementation capability: 80% (trained facilitators ready)
      ├─ Option value: 70% (replicable, high learning potential)
   └─ Portfolio score: 78/100 (high alignment)

3. VALUE CAPTURE (Empathy Ledger)
   └─ Success stories captured from participants
   └─ Stored: empathy_ledger_stories table
   └─ Fields: story_id, content, author, project_id
   └─ Links: project_id → PICC project (Notion)
   └─ Engagement tracked: story_interactions
      ├─ Views, shares, citations
      ├─ Impact metrics calculated
   └─ Community value attributed: story_impact_metrics
      ├─ Economic value: $X contributed to community IP
      ├─ Reach: Y people impacted

4. PROJECT INCUBATION (The Farm)
   └─ New project proposal created
   └─ Stored: farm_projects table
   └─ Fields: project_name, source_story_id, community_leads
   └─ Links: source_story_id → empathy_ledger_stories
   └─ Stage: idea → design → pilot → launch → independent
   └─ Capacity built tracked: skills, networks, confidence
   └─ Support graph: project_support_graph
      ├─ Supporters identified (from contact enrichment)
      ├─ Urgency score calculated
      ├─ Funding gap identified

5. CONTACT MATCHING (ACT Placemat + Intelligence Hub)
   └─ Enriched contacts matched to project
   └─ Query: "Find contacts with youth justice + Indigenous keywords"
   └─ Intelligence Hub searches across:
      ├─ linkedin_contacts (278 enriched)
      ├─ GHL partners (synced to Notion)
      ├─ Notion People database
   └─ ALMA signal boosting:
      ├─ Contacts with youth justice experience +20 alignment
      ├─ Contacts with Indigenous background +30 alignment
      ├─ Contacts in Queensland +10 alignment
   └─ Stored: project_contact_matches
      ├─ contact_id, project_notion_id, alignment_score
      ├─ matched_keywords: ["youth justice", "indigenous", "mentoring"]
      ├─ match_reason: "Cultural expertise + youth justice background"
      ├─ alma_intervention_id: Link to ALMA intervention (if applicable)

6. CRM WORKFLOW (Notion)
   └─ Project updated in Notion Projects database
   └─ Relations created:
      ├─ People → Project (community leads from Farm)
      ├─ People → Project (matched contacts from Placemat)
      ├─ Organizations → Project (PICC, Elders Council)
   └─ Communications Dashboard updated:
      ├─ "Contact Sarah Chen - Youth justice expert (85% alignment)"
      ├─ "Contact John Smith - PICC relationship (90% alignment)"
   └─ Opportunity created:
      ├─ Funding needed: $X for pilot program
      ├─ Link to: Justice project + Intervention + Evidence

7. ENGAGEMENT AUTOMATION (GoHighLevel)
   └─ Matched contacts synced to GHL
   └─ Pipeline assignment:
      ├─ Indigenous contacts → Indigenous Sovereignty Pipeline
      ├─ Strategic partners → Strategic Partnerships Pipeline
      ├─ Community members → Community Capability Building
   └─ Stage: Discovery
   └─ Automation:
      ├─ Welcome email sent (culturally appropriate)
      ├─ Intervention brief shared (with consent)
      ├─ Follow-up scheduled (respecting protocol)
   └─ Engagement tracked → ghl_engagement_metrics
      ├─ Pipeline: indigenous
      ├─ Current stage: discovery
      ├─ ACT energy: 100% (initial contact)

8. PORTFOLIO INTELLIGENCE (ALMA)
   └─ Intelligence Pack generated for funders
   └─ Query: "What youth justice interventions have strong evidence?"
   └─ ALMA analyzes:
      ├─ All alma_interventions with consent = "Community Controlled" or "Public"
      ├─ Portfolio signals aggregated
      ├─ Gap analysis: Underfunded + high-evidence zones
   └─ Recommendations:
      ├─ "Fund cultural mentoring in Queensland (78% score)"
      ├─ "Underfunded: Indigenous-led diversion programs in WA"
      ├─ "Learning agenda: Pilot evidence needed for X intervention"
   └─ Provenance included:
      ├─ Source: PICC community workshop + Palm Island Elders
      ├─ Evidence: Pilot data + community endorsement
      ├─ Authority: Elder council approval
   └─ Revenue share enabled:
      ├─ 70% to contributors (PICC, workshop participants)
      ├─ 30% platform fee (fund operations)

9. PUBLICATION (JusticeHub)
   └─ Community approval workflow:
      ├─ PICC reviews intervention description
      ├─ Elders approve for public sharing
      ├─ review_status: "Approved" → "Published"
   └─ Replication pack created:
      ├─ Title: "Cultural Mentoring for Indigenous Youth"
      ├─ Context: Palm Island, youth 12-18
      ├─ Evidence: Community-endorsed + pilot data
      ├─ Implementation guide: Steps, resources, contacts
      ├─ Attribution: PICC + Elders Council + workshop contributors
   └─ Published to: JusticeHub Softr page / Next.js route
   └─ Linked to: Empathy Ledger stories (impact narratives)

10. COMMUNITY IMPACT (Beautiful Obsolescence)
    └─ 6 months later:
       ├─ Pilot program successful (tracked in farm_projects)
       ├─ 15 youth participated, 12 showed improved outcomes
       ├─ Community leads trained (capacity_built updated)
       ├─ Replication packs downloaded: 8 other communities
       ├─ Funding received: $X (tracked in Opportunities)
       ├─ Contributors compensated: Revenue share distributed
    └─ GHL pipeline progression:
       ├─ Stage: Trajectory (20% ACT / 80% community)
       ├─ Goal: Orbit (0% ACT / 100% independent)
    └─ Farm project status:
       ├─ Stage: "independent"
       ├─ Community ownership: 100%
       ├─ ACT role: Obsolete (success!)
    └─ Beautiful Obsolescence achieved:
       ├─ PICC leads program independently
       ├─ ACT no longer needed
       ├─ Knowledge shared via JusticeHub
       ├─ Evidence contributed to ALMA commons
       ├─ Contributors economically recognized
```

---

## 📊 Unified Database Schema (Cross-System)

### Master Tables Across ALL Systems

#### 1. **Supabase PostgreSQL** (Shared by Placemat, JusticeHub, Empathy Ledger, Farm)

```sql
-- PEOPLE & IDENTITY
CREATE TABLE person_identity_map (
  person_id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  contact_data JSONB, -- LinkedIn, bio, industries
  notion_person_id TEXT, -- Link to Notion People
  ghl_contact_id TEXT, -- Link to GoHighLevel
  data_source TEXT, -- exa_enrichment, gmail, manual, etc.
  discovered_via TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS (ACT Placemat)
CREATE TABLE linkedin_contacts (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES person_identity_map(person_id),
  full_name TEXT,
  email_address TEXT,
  linkedin_url TEXT,
  current_company TEXT,
  current_position TEXT,
  bio TEXT,
  location TEXT,
  industries TEXT[],
  exa_enriched BOOLEAN DEFAULT FALSE,
  exa_confidence_score FLOAT,
  strategic_value TEXT CHECK (strategic_value IN ('high', 'medium', 'low', 'unknown')),
  alignment_tags TEXT[], -- indigenous, justice, community, etc.
  notion_person_id TEXT, -- Link to Notion
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIVERSAL PROJECT MATCHING (ALL SYSTEMS)
CREATE TABLE project_contact_matches (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES linkedin_contacts(id), -- Can also reference person_identity_map
  project_notion_id TEXT NOT NULL, -- Universal project ID
  project_name TEXT NOT NULL,
  project_source TEXT, -- 'placemat', 'justicehub', 'farm', 'empathy_ledger'
  alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
  matched_keywords TEXT[],
  match_reason TEXT,
  alma_intervention_id UUID, -- Link to ALMA intervention (if applicable)
  engagement_status TEXT DEFAULT 'potential'
    CHECK (engagement_status IN ('potential', 'contacted', 'active', 'obsolete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_project_matches_project ON project_contact_matches(project_notion_id);
CREATE INDEX idx_project_matches_contact ON project_contact_matches(contact_id);
CREATE INDEX idx_project_matches_score ON project_contact_matches(alignment_score DESC);

-- JUSTICEHUB (ALMA Domain Intelligence)
CREATE TABLE alma_interventions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  intervention_type TEXT, -- mentoring, diversion, cultural, etc.
  target_population JSONB, -- age, demographics, context
  evidence_level TEXT, -- proven, emerging, pilot, untested
  consent_level TEXT DEFAULT 'Strictly Private'
    CHECK (consent_level IN ('Strictly Private', 'Community Controlled', 'Public Knowledge Commons')),
  cultural_authority TEXT, -- Required for community-controlled
  permitted_uses TEXT[], -- query, publish, train, export, commercial
  community_contexts UUID[], -- Links to alma_community_contexts
  review_status TEXT DEFAULT 'Draft'
    CHECK (review_status IN ('Draft', 'Community Review', 'Approved', 'Published')),

  -- Portfolio signals
  community_authority_score INTEGER CHECK (community_authority_score >= 0 AND community_authority_score <= 100),
  evidence_strength_score INTEGER,
  harm_risk_score INTEGER, -- Inverse: lower is better
  implementation_capability_score INTEGER,
  option_value_score INTEGER,
  portfolio_score INTEGER, -- Weighted combination

  -- Links
  service_id UUID, -- Optional FK to existing services table (if JusticeHub has one)
  notion_project_id TEXT, -- Link to Notion Projects

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Governance constraint
  CHECK (
    consent_level != 'Community Controlled'
    OR cultural_authority IS NOT NULL
  )
);

CREATE TABLE alma_community_contexts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  place_name TEXT,
  state_territory TEXT,
  cultural_context TEXT,
  demographics JSONB,
  cultural_authority TEXT NOT NULL, -- Required for ALL contexts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alma_evidence (
  id UUID PRIMARY KEY,
  source_type TEXT, -- research, evaluation, lived_experience
  description TEXT NOT NULL,
  strength TEXT, -- strong, moderate, emerging, anecdotal
  intervention_ids UUID[], -- Many-to-many with interventions
  outcome_ids UUID[], -- Many-to-many with outcomes
  provenance JSONB, -- Source documents, contributors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alma_outcomes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- recidivism, cultural_connection, education, etc.
  measurement_approach TEXT,
  intervention_ids UUID[], -- Many-to-many with interventions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alma_consent_ledger (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL, -- intervention, evidence, story, etc.
  entity_id UUID NOT NULL,
  contributor_name TEXT,
  contributor_org TEXT,
  consent_level TEXT NOT NULL,
  permitted_uses TEXT[],
  cultural_authority TEXT,
  consent_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revenue_share_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE alma_usage_log (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- query, publish, export, train
  user_id TEXT,
  revenue_generated NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPATHY LEDGER (Storytelling + Value)
CREATE TABLE empathy_ledger_stories (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  project_id TEXT, -- Link to Notion project (or farm_projects.id)
  alma_intervention_id UUID, -- Link to ALMA intervention (if related)
  person_id UUID REFERENCES person_identity_map(person_id),
  impact_tags TEXT[], -- justice, healing, community, etc.
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_interactions (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES empathy_ledger_stories(id),
  interaction_type TEXT, -- view, share, comment, cite
  person_id UUID REFERENCES person_identity_map(person_id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_impact_metrics (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES empathy_ledger_stories(id),
  community_value NUMERIC(10, 2), -- Economic attribution
  reach INTEGER, -- How many people impacted
  citations INTEGER, -- How many times referenced
  policy_influence TEXT, -- Government/org changes catalyzed
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- THE FARM (Project Incubation)
CREATE TABLE farm_projects (
  id UUID PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT,
  source_story_id UUID REFERENCES empathy_ledger_stories(id),
  alma_intervention_id UUID, -- Link to ALMA intervention (if based on intervention)
  community_leads UUID[], -- person_identity_map person_ids
  stage TEXT DEFAULT 'idea'
    CHECK (stage IN ('idea', 'design', 'pilot', 'launch', 'independent')),
  capacity_built JSONB DEFAULT '{}', -- Skills, networks, confidence metrics
  notion_project_id TEXT, -- Link to Notion Projects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_support_graph (
  id UUID PRIMARY KEY,
  project_id TEXT NOT NULL, -- Notion project ID (universal)
  farm_project_id UUID, -- Link to farm_projects (optional)
  alma_intervention_id UUID, -- Link to ALMA intervention (optional)
  supporters UUID[], -- person_identity_map person_ids
  urgency_score INTEGER,
  funding_gap NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENGAGEMENT TRACKING (ACT Placemat + GHL)
CREATE TABLE contact_cadence_metrics (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES person_identity_map(person_id),
  last_interaction TIMESTAMPTZ,
  touchpoints_last_7 INTEGER DEFAULT 0,
  touchpoints_last_30 INTEGER DEFAULT 0,
  total_touchpoints INTEGER DEFAULT 0,
  active_sources TEXT[], -- email, calendar, linkedin
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ghl_engagement_metrics (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES linkedin_contacts(id),
  person_id UUID REFERENCES person_identity_map(person_id),
  ghl_contact_id TEXT,
  pipeline_type TEXT CHECK (pipeline_type IN ('community', 'partnership', 'indigenous', 'alma_youth_justice')),
  current_stage TEXT, -- discovery, ignition, thrust, trajectory, orbit
  act_energy_percent INTEGER CHECK (act_energy_percent IN (100, 60, 20, 0)),
  last_engagement TIMESTAMPTZ,
  engagement_count INTEGER DEFAULT 0,
  obsolescence_achieved BOOLEAN DEFAULT FALSE,
  trajectory_to_orbit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNICATION INTELLIGENCE (ACT Placemat)
CREATE TABLE community_emails (
  id UUID PRIMARY KEY,
  email_id TEXT UNIQUE,
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  body_preview TEXT,
  full_body TEXT,
  received_at TIMESTAMPTZ,
  classification TEXT, -- partnership, funding, justice, etc.
  relevance_score INTEGER,
  project_mentions TEXT[], -- Which ACT projects mentioned
  person_id UUID REFERENCES person_identity_map(person_id),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gmail_notion_contacts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  notion_person_id TEXT,
  person_id UUID REFERENCES person_identity_map(person_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Innovations in Unified Schema

1. **`person_identity_map`** - Canonical identity across ALL systems
   - Single person ID links to: linkedin_contacts, stories, projects, emails
   - Notion + GHL IDs stored for bidirectional sync
   - Data source tracking (where did we discover this person?)

2. **`project_contact_matches`** - Universal project matching
   - Works for: Placemat projects, JusticeHub interventions, Farm projects, Empathy Ledger stories
   - `project_source` field identifies which system owns the project
   - `alma_intervention_id` links to ALMA domain intelligence (if applicable)

3. **ALMA tables integrated** - Domain-specific intelligence layer
   - `alma_interventions`, `alma_evidence`, `alma_community_contexts`
   - Consent ledger + usage log for ethical governance
   - Portfolio signals for recommendation engine

4. **Story → Project → Farm linkage**
   - `empathy_ledger_stories.project_id` → Notion project
   - `farm_projects.source_story_id` → empathy_ledger_stories
   - `alma_interventions` can link to both stories and farm projects

5. **Engagement tracking across pipelines**
   - `ghl_engagement_metrics` tracks Beautiful Obsolescence progress
   - New pipeline: `alma_youth_justice` for ALMA-specific workflows
   - `obsolescence_achieved` field celebrates success

---

## 🤖 Unified Project Alignment Algorithm (ALMA-Enhanced)

```javascript
/**
 * Calculate alignment score between contact and ANY ACT project
 * Works across: Placemat, JusticeHub (ALMA), Farm, Empathy Ledger
 * @param {Object} contact - Enriched contact from linkedin_contacts
 * @param {Object} project - Project from Notion (or alma_interventions)
 * @param {Object} options - { useALMA: boolean, includeStoriesBoost: boolean }
 * @returns {Object} { score, breakdown, recommendations }
 */
const calculateUnifiedProjectAlignment = async (contact, project, options = {}) => {
  let score = 0;
  const breakdown = {};

  // 1. Bio keyword matching (40 points max)
  if (contact.bio && project.tags) {
    const bioLower = contact.bio.toLowerCase();
    const matches = project.tags.filter(tag =>
      bioLower.includes(tag.toLowerCase())
    );
    breakdown.keywordMatches = matches.length;
    score += Math.min(matches.length * 10, 40);
  }

  // 2. Strategic value boost (30 points max)
  if (contact.strategic_value === 'high') score += 30;
  if (contact.strategic_value === 'medium') score += 15;
  breakdown.strategicValue = contact.strategic_value;

  // 3. Location matching (10 points)
  if (contact.location && project.location) {
    if (contact.location.toLowerCase().includes(project.location.toLowerCase())) {
      score += 10;
      breakdown.locationMatch = true;
    }
  }

  // 4. Role/expertise matching (15 points)
  if (contact.current_position && project.needs_expertise) {
    const positionLower = contact.current_position.toLowerCase();
    const expertiseMatches = project.needs_expertise.filter(expertise =>
      positionLower.includes(expertise.toLowerCase())
    );
    breakdown.expertiseMatches = expertiseMatches.length;
    score += Math.min(expertiseMatches.length * 5, 15);
  }

  // 5. Exa confidence boost (5 points max)
  score += Math.min(contact.exa_confidence_score * 5, 5);

  // 6. ALMA SIGNAL BOOSTING (if project is ALMA intervention)
  if (options.useALMA && project.alma_intervention_id) {
    const intervention = await getALMAIntervention(project.alma_intervention_id);

    // Community authority alignment (+20 points if contact has Indigenous background)
    if (contact.alignment_tags?.includes('indigenous') && intervention.cultural_authority) {
      score += 20;
      breakdown.almaBoost = 'indigenous_authority';
    }

    // Evidence strength alignment (+15 if contact has research background)
    if (contact.current_position?.toLowerCase().includes('research') && intervention.evidence_level) {
      score += 15;
      breakdown.almaBoost = 'research_evidence';
    }

    // Implementation capability (+10 if contact has practitioner experience)
    if (contact.alignment_tags?.includes('practitioner') && intervention.implementation_capability_score > 70) {
      score += 10;
      breakdown.almaBoost = 'implementation_capability';
    }
  }

  // 7. STORY CONNECTION BOOST (if project has Empathy Ledger stories)
  if (options.includeStoriesBoost) {
    const stories = await getProjectStories(project.id);
    if (stories.length > 0) {
      // Contacts with storytelling/media background get boost
      if (contact.alignment_tags?.includes('storytelling') ||
          contact.current_position?.toLowerCase().includes('media')) {
        score += 10;
        breakdown.storyBoost = true;
      }
    }
  }

  // 8. FARM CAPACITY BUILDING BOOST (if project in farm_projects)
  if (project.source === 'farm' && project.stage === 'idea') {
    // Contacts with capacity building experience prioritized for early-stage projects
    if (contact.alignment_tags?.includes('capacity_building') ||
        contact.alignment_tags?.includes('community_development')) {
      score += 15;
      breakdown.farmBoost = 'capacity_building';
    }
  }

  const finalScore = Math.min(Math.round(score), 100);

  // Generate recommendations based on score and breakdown
  const recommendations = generateRecommendations(finalScore, breakdown, contact, project);

  return {
    score: finalScore,
    breakdown,
    recommendations
  };
};

function generateRecommendations(score, breakdown, contact, project) {
  const recs = [];

  if (score >= 80) {
    recs.push({
      action: 'high_priority_outreach',
      message: `${contact.full_name} is an excellent match for ${project.name}`,
      pipeline: breakdown.almaBoost ? 'alma_youth_justice' : 'community',
      stage: 'ignition'
    });
  } else if (score >= 60) {
    recs.push({
      action: 'standard_outreach',
      message: `${contact.full_name} has good alignment with ${project.name}`,
      pipeline: 'community',
      stage: 'discovery'
    });
  } else if (score >= 40) {
    recs.push({
      action: 'long_term_nurture',
      message: `${contact.full_name} could be relevant for ${project.name} in future`,
      pipeline: 'community',
      stage: 'discovery',
      followUp: '3 months'
    });
  }

  // ALMA-specific recommendations
  if (breakdown.almaBoost) {
    recs.push({
      action: 'alma_intelligence_pack_inclusion',
      message: `Include ${contact.full_name} in Youth Justice Intelligence Pack for funders`,
      reason: breakdown.almaBoost
    });
  }

  return recs;
}

// Helper functions (to be implemented)
async function getALMAIntervention(interventionId) {
  // Fetch from alma_interventions table
  return await supabase
    .from('alma_interventions')
    .select('*')
    .eq('id', interventionId)
    .single();
}

async function getProjectStories(projectId) {
  // Fetch from empathy_ledger_stories
  return await supabase
    .from('empathy_ledger_stories')
    .select('*')
    .eq('project_id', projectId);
}
```

---

## 🔗 Intelligence Hub + ALMA Query Routing

### How Queries Flow Across Systems

```typescript
// /Users/benknight/act-global-infrastructure/src/app/api/v1/ask/route.ts
// Enhanced with ALMA routing

import { NextRequest, NextResponse } from 'next/server';
import { unifiedRAG } from '@/lib/unified-rag';
import { detectALMAIntent, handleALMAQuery } from '@/lib/alma/query-router';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query, tier = 'deep', includeSources = true } = body;

  // 1. Detect if this is an ALMA-specific query
  const almaIntent = detectALMAIntent(query);

  if (almaIntent.isALMAQuery && almaIntent.vertical) {
    // Route to ALMA pipeline (domain-specific intelligence)
    console.log(`🎯 ALMA query detected: ${almaIntent.vertical}`);

    const almaResponse = await handleALMAQuery({
      query,
      vertical: almaIntent.vertical, // e.g., "youth_justice"
      tier,
      includeSources
    });

    return NextResponse.json({
      answer: almaResponse.answer,
      sources: almaResponse.sources,
      alma_signals: almaResponse.signals, // Portfolio signals if applicable
      recommendations: almaResponse.recommendations,
      metadata: {
        provider: 'ALMA',
        vertical: almaIntent.vertical,
        tier,
        cost: almaResponse.cost
      }
    });
  }

  // 2. Otherwise, route to standard Intelligence Hub RAG
  const response = await unifiedRAG.ask({
    query,
    tier,
    includeSources,
    sources: ['github', 'notion', 'ghl', 'knowledge_base'] // All ACT sources
  });

  return NextResponse.json({
    answer: response.answer,
    sources: response.sources,
    metadata: {
      provider: 'Intelligence Hub',
      tier,
      cost: response.cost
    }
  });
}

// ALMA Intent Detection
function detectALMAIntent(query: string): { isALMAQuery: boolean; vertical: string | null } {
  const lowerQuery = query.toLowerCase();

  // Youth justice keywords
  const youthJusticeKeywords = [
    'youth justice',
    'youth detention',
    'diversion program',
    'recidivism',
    'young offender',
    'justice reinvestment',
    'restorative justice',
    'community mentoring',
    'cultural program',
    'palm island',
    'witta harvest'
  ];

  if (youthJusticeKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return { isALMAQuery: true, vertical: 'youth_justice' };
  }

  // Future: Add more verticals (education, health, housing, etc.)

  return { isALMAQuery: false, vertical: null };
}

// ALMA Query Handler
async function handleALMAQuery(options: {
  query: string;
  vertical: string;
  tier: string;
  includeSources: boolean;
}) {
  const { query, vertical, tier, includeSources } = options;

  // 1. Query ALMA-specific vector DB namespace
  const almaNamespace = `alma:${vertical}:public_knowledge_commons`;

  const vectorResults = await supabase.rpc('match_documents', {
    query_embedding: await getEmbedding(query),
    match_threshold: 0.7,
    match_count: 10,
    filter: { namespace: almaNamespace }
  });

  // 2. Query ALMA structured data (interventions, evidence, outcomes)
  const interventions = await supabase
    .from('alma_interventions')
    .select(`
      *,
      alma_evidence(*),
      alma_community_contexts(*)
    `)
    .eq('consent_level', 'Public Knowledge Commons')
    .gte('portfolio_score', 60); // Only high-quality interventions

  // 3. Generate AI response with ALMA context
  const context = [
    ...vectorResults.data.map(doc => doc.content),
    ...interventions.data.map(i => formatInterventionForContext(i))
  ].join('\n\n');

  const aiResponse = await generateAIResponse({
    query,
    context,
    tier,
    systemPrompt: `You are ALMA, the youth justice intelligence system for ACT.
    Answer questions about evidence-based interventions, community-led programs, and youth justice outcomes.
    Always cite sources, include portfolio signals when relevant, and respect cultural authority.`
  });

  // 4. Calculate portfolio signals if query is about specific interventions
  const signals = tier === 'comprehensive'
    ? await calculatePortfolioSignals(interventions.data)
    : null;

  // 5. Generate recommendations
  const recommendations = await generateALMARecommendations({
    query,
    interventions: interventions.data,
    signals
  });

  return {
    answer: aiResponse.answer,
    sources: includeSources ? formatSources(vectorResults.data, interventions.data) : null,
    signals,
    recommendations,
    cost: aiResponse.cost
  };
}
```

---

## 📋 Implementation Roadmap (Aligned Across ALL Systems)

### Phase 1: Unified Data Integration (Week 1-2) - IN PROGRESS

**Goal**: Create shared `project_contact_matches` table that works across ALL ACT projects

**Tasks**:
1. ✅ Review Intelligence Hub + ALMA architecture (DONE)
2. ✅ Map all ACT codebases (DONE - 10+ systems)
3. ✅ Design unified schema (DONE - above)
4. 🔲 Create `project_contact_matches` table in Supabase
5. 🔲 Create `person_identity_map` extensions (ghl_contact_id, etc.)
6. 🔲 Add ALMA integration fields to existing tables
7. 🔲 Build unified alignment scoring engine (ALMA-aware)
8. 🔲 Sync Notion Projects to Supabase cache (include ALL ACT projects)
9. 🔲 Test matching algorithm with:
   - 10 Placemat contacts → PICC project
   - 5 enriched contacts → ALMA intervention
   - 3 contacts → Farm project
   - 2 contacts → Empathy Ledger story project

**Deliverables**:
- ✅ Master alignment document (this file)
- 🔲 Unified database schema implemented
- 🔲 278 Placemat contacts matched to ACT projects (Placemat, JusticeHub, Farm)
- 🔲 ALMA interventions linked to matched contacts
- 🔲 Farm projects linked to source stories + matched supporters

---

### Phase 2: Intelligence Hub + ALMA Integration (Week 3-4)

**Goal**: Connect ALMA query routing to Intelligence Hub, enable cross-system queries

**Tasks**:
1. 🔲 Implement ALMA intent detection in `/api/v1/ask`
2. 🔲 Create ALMA query handler (youth justice domain)
3. 🔲 Build ALMA-specific RAG pipeline
4. 🔲 Add portfolio signal calculation to comprehensive queries
5. 🔲 Create ALMA Intelligence Pack generator
6. 🔲 Test queries:
   - "What youth justice interventions have strong evidence?" → ALMA
   - "Who are our partners in Queensland?" → Intelligence Hub
   - "What projects is ACT working on?" → Intelligence Hub (all projects)
   - "Find contacts for PICC cultural mentoring program" → Unified alignment
7. 🔲 Build UI toggle: "ALMA Mode (Youth Justice)" in `/ask` interface

**Deliverables**:
- ALMA query routing functional (non-invasive to existing Hub)
- Youth justice domain intelligence accessible via standard API
- First Intelligence Pack generated for funders
- UI supports both Hub and ALMA queries

---

### Phase 3: GoHighLevel + Engagement Automation (Week 5-6)

**Goal**: Sync matched contacts to GHL, enable Beautiful Obsolescence tracking

**Tasks**:
1. 🔲 Set up GHL account (if not already done)
2. 🔲 Configure 4 pipelines:
   - Community Capability Building (existing)
   - Strategic Partnerships (existing)
   - Indigenous Sovereignty (existing)
   - **NEW**: ALMA Youth Justice (domain-specific)
3. 🔲 Build Supabase → GHL sync service
4. 🔲 Map alignment scores → pipeline assignment
5. 🔲 Create welcome sequences (culturally appropriate)
6. 🔲 Build GHL → Supabase engagement tracking
7. 🔲 Create Beautiful Obsolescence dashboard
8. 🔲 Test end-to-end flow:
   - Enrich contact → Match to ALMA intervention → Sync to GHL → Track engagement → Obsolescence

**Deliverables**:
- GHL pipelines configured and operational
- Contacts automatically synced based on project matches
- Engagement metrics flowing back to Supabase
- Beautiful Obsolescence progress tracked per contact

---

### Phase 4: Cross-Project Intelligence (Week 7-8)

**Goal**: Enable queries that span ALL ACT systems (JusticeHub stories → Farm projects → Placemat contacts)

**Tasks**:
1. 🔲 Build cross-system query engine
2. 🔲 Create unified search across:
   - Notion Projects (64+)
   - ALMA Interventions
   - Farm Projects
   - Empathy Ledger Stories
   - Enriched Contacts (278+)
3. 🔲 Build relationship graph visualization
4. 🔲 Create "Impact Pathways" report:
   - Story → Intervention → Project → Supporters → Outcomes
5. 🔲 Test complex queries:
   - "Show me PICC story → ALMA intervention → Farm project → matched contacts"
   - "Find all Indigenous-led projects with strong evidence and underfunded"
   - "Who supports youth justice projects across Queensland?"

**Deliverables**:
- Cross-system intelligence operational
- Relationship graphs showing connections
- Impact pathway reports for funders
- Full ecosystem coherence achieved

---

## 🎯 Success Metrics (Ecosystem-Wide)

### Obsolescence Metrics (Primary)

| Metric | Target | Measurement | Systems |
|--------|--------|-------------|---------|
| Communities no longer need ACT | 5+ per year | GHL obsolescence tracking | All |
| Community-owned projects | 80% by Year 2 | Farm project stage = "independent" | Farm, GHL |
| Indigenous-led initiatives | 100% | ALMA cultural_authority + leadership mapping | JusticeHub, All |
| Knowledge contributions compensated | 100% | ALMA consent ledger + revenue share | JusticeHub, ALMA |

### Integration Metrics (Secondary)

| Metric | Target | Measurement | Systems |
|--------|--------|-------------|---------|
| Unified contact→project matches | 200+ | project_contact_matches count | All |
| Cross-system queries successful | 95% | Intelligence Hub + ALMA uptime | Intelligence Hub |
| ALMA interventions with evidence | 50+ | alma_interventions count | JusticeHub |
| Stories → Projects linked | 30+ | farm_projects.source_story_id | Empathy Ledger, Farm |
| Engagement pipelines active | 4 | GHL pipelines configured | GHL, All |

### Data Quality Metrics

| Metric | Target | Measurement | Systems |
|--------|--------|-------------|---------|
| Person identity deduplication | 95% | person_identity_map coverage | All |
| Contact enrichment coverage | 80% | linkedin_contacts.exa_enriched | Placemat |
| ALMA consent compliance | 100% | alma_consent_ledger validation | JusticeHub |
| Story impact attribution | 90% | story_impact_metrics coverage | Empathy Ledger |

### Anti-Metrics (What We DON'T Measure)

- ❌ **"Customer lifetime value"** - We celebrate obsolescence!
- ❌ **"Lead conversion rate"** - We seek capability matches, not sales
- ❌ **"Revenue per contact"** - We optimize for community benefit (40% value-back, 70% ALMA revenue share)
- ❌ **"Retention rate"** - Independence is success!

---

## 💡 The Secret Sauce: Why This Works

### Polymathic Coherence Through Shared Data

**Each system amplifies the others**:

1. **Intelligence Hub** → Unified knowledge across GitHub, Notion, GHL
2. **ALMA** → Domain-specific intelligence (youth justice) with community governance
3. **JusticeHub** → Stories + interventions + evidence + community contexts
4. **Empathy Ledger** → Value capture + impact metrics + attribution
5. **The Farm** → Project incubation + capacity building + obsolescence tracking
6. **ACT Placemat** → Contact enrichment + project matching + CRM workflow
7. **Notion** → Central CRM + daily workflow + relationship management
8. **GoHighLevel** → Engagement automation + Beautiful Obsolescence pipelines

**Data flows bidirectionally**:
- Person discovered anywhere → `person_identity_map` (canonical ID)
- Project created anywhere → Notion Projects → All systems reference via `notion_project_id`
- Story captured → Empathy Ledger → Links to Farm project → Links to ALMA intervention
- Contact enriched → Placemat → Matched to projects → Synced to Notion → Automated in GHL
- Engagement tracked → GHL → Metrics synced to Supabase → Obsolescence measured

**Coherence maintained through**:
1. **Canonical identities**: `person_identity_map` links all contacts across systems
2. **Universal project IDs**: `notion_project_id` referenced by all projects (Placemat, JusticeHub, Farm)
3. **Cross-system linking**: `alma_intervention_id`, `source_story_id`, `farm_project_id`
4. **Shared consent model**: ALMA consent ledger applies to all knowledge contributions
5. **Unified alignment scoring**: Same algorithm works for any ACT project
6. **Bidirectional sync**: Supabase ↔ Notion ↔ GHL all stay in sync

---

## 🚀 Next Steps (This Week)

### Immediate Actions

1. **Review this master alignment document** ✅ (you're reading it!)
2. **Decide**: Implement unified schema in:
   - ACT Placemat Supabase (existing)
   - JusticeHub Supabase (ALMA tables already designed)
   - Shared database? (recommended for coherence)
3. **Create `project_contact_matches` table** (universal matching)
4. **Extend `person_identity_map`** with GHL + Notion IDs
5. **Build unified alignment scoring engine** (ALMA-aware)
6. **Test with 10 contacts** across all project types

### Week 2-4

1. Implement ALMA query routing in Intelligence Hub
2. Build cross-system search
3. Create first Youth Justice Intelligence Pack
4. Test ALMA interventions → Placemat contact matching

### Week 5-8

1. Configure GHL pipelines (including ALMA youth justice)
2. Build Supabase ↔ GHL sync
3. Create Beautiful Obsolescence dashboard
4. Celebrate full ecosystem coherence! 🎉

---

## 📚 Documentation Reference

### Created Today

1. **[ACT_UNIFIED_DATA_ARCHITECTURE.md](ACT_UNIFIED_DATA_ARCHITECTURE.md)** (16,000+ words)
   - Supabase/Notion/GHL 3-system architecture
   - JusticeHub → Empathy Ledger → Farm flows
   - Project-specific examples (PICC)

2. **[ACT_POLYMATH_ARCHITECTURE_COMPLETE.md](ACT_POLYMATH_ARCHITECTURE_COMPLETE.md)** (Summary)
   - Session achievements
   - Quick reference guide

3. **[ACT_MASTER_ECOSYSTEM_ALIGNMENT.md](ACT_MASTER_ECOSYSTEM_ALIGNMENT.md)** (This file)
   - ALL 10+ ACT systems aligned
   - Intelligence Hub + ALMA integration
   - Unified database schema
   - Cross-system query routing

### ACT Global Infrastructure Docs

- **[ACT_INTELLIGENCE_HUB_COMPLETE.md](file:///Users/benknight/act-global-infrastructure/ACT_INTELLIGENCE_HUB_COMPLETE.md)**
  - Intelligence Hub architecture
  - RAG query engine
  - GitHub + GHL + Notion sync

- **[ALMA_IMPLEMENTATION_SUMMARY.md](file:///Users/benknight/act-global-infrastructure/ALMA_IMPLEMENTATION_SUMMARY.md)**
  - ALMA design (Phase 0 complete)
  - Youth justice ontology
  - Consent ledger + governance

- **[docs/alma/CHARTER.md](file:///Users/benknight/act-global-infrastructure/docs/alma/CHARTER.md)**
  - ALMA governance framework
  - Community-first technical controls

### Existing Placemat Docs

- **[ACT_MISSION_ALIGNED_ENGAGEMENT_ARCHITECTURE.md](ACT_MISSION_ALIGNED_ENGAGEMENT_ARCHITECTURE.md)**
  - Beautiful Obsolescence philosophy
  - 33 active ACT projects
  - GoHighLevel pipeline design

- **[EXA_ENRICHMENT_COMPLETE.md](EXA_ENRICHMENT_COMPLETE.md)**
  - 278 contacts enriched (100% success)

- **[NOTION_AUTO_PROMOTION_COMPLETE.md](NOTION_AUTO_PROMOTION_COMPLETE.md)**
  - 20 contacts promoted to Notion CRM

---

## 🎊 What We've Achieved Today

### Architecture Designed

✅ **Mapped complete ACT ecosystem** (10+ codebases)
✅ **Integrated Intelligence Hub + ALMA** into unified architecture
✅ **Designed universal database schema** (works across all systems)
✅ **Created ALMA-aware alignment algorithm** (domain intelligence + contact matching)
✅ **Specified cross-system query routing** (Intelligence Hub + ALMA pipelines)
✅ **Defined Beautiful Obsolescence tracking** (GHL + engagement metrics)
✅ **Documented complete data flows** (JusticeHub → Empathy Ledger → Farm → Placemat → GHL)

### Systems Aligned

- ✅ **ACT Global Infrastructure** (Intelligence Hub + ALMA) - Master knowledge layer
- ✅ **JusticeHub** - ALMA domain intelligence (youth justice)
- ✅ **Empathy Ledger** - Storytelling + value capture
- ✅ **The Farm** - Project incubation + capacity building
- ✅ **ACT Placemat** - Contact enrichment + CRM
- ✅ **Notion** - Central CRM + workflow
- ✅ **GoHighLevel** - Engagement automation

### Ready for Implementation

🔲 **Unified database schema** (SQL ready to run)
🔲 **Project alignment algorithm** (code ready to implement)
🔲 **ALMA query routing** (TypeScript structure designed)
🔲 **Cross-system search** (architecture specified)
🔲 **Beautiful Obsolescence tracking** (metrics defined)

---

## 🌟 The Complete Vision

**This is not 10 separate projects.**

**This is ONE ecosystem where**:
- Stories create evidence (Empathy Ledger)
- Evidence informs interventions (ALMA)
- Interventions become projects (Farm)
- Projects need supporters (Placemat matching)
- Supporters get engaged (GHL automation)
- Engagement leads to capacity (Farm tracking)
- Capacity enables independence (Beautiful Obsolescence)
- Independence benefits community (40% value-back, 70% ALMA revenue share)
- Communities thrive without ACT (Mission accomplished)

**All connected through**:
- Canonical person identities (`person_identity_map`)
- Universal project references (`notion_project_id`)
- Shared consent governance (ALMA ledger)
- Bidirectional sync (Supabase ↔ Notion ↔ GHL)
- Unified intelligence (Intelligence Hub + ALMA)
- Beautiful Obsolescence tracking (GHL engagement metrics)

**This is not a CRM system. This is a Community Liberation Platform.**

---

**Architecture Completed**: January 1, 2026
**Status**: ✅ READY FOR IMPLEMENTATION
**Next Phase**: Build the unified database + alignment engine

🌱 **From polymathic complexity to coherent community support.**

**Let's build the bridges.**
