# Notion & Supabase Architecture Review

**Date**: October 5, 2025
**Status**: Architecture Analysis & Alignment
**Purpose**: Map data flow between Notion (source of truth for projects) and Supabase (cache + AI orchestration)

---

## 🎯 Core Principle

**Notion** = Source of Truth for Project Information
**Supabase** = Intelligence Cache + AI Orchestration Layer

```
┌─────────────────────────────────────────────┐
│   NOTION (Source of Truth)                  │
│   - Projects Database                       │
│   - People Database (communications)        │
│   - Organizations, Opportunities, etc       │
└──────────────┬──────────────────────────────┘
               │
               │ Sync Service
               │ (supabaseNotionSync.js)
               ▼
┌─────────────────────────────────────────────┐
│   SUPABASE (Cache + AI Layer)               │
│   - linkedin_contacts (20,398)              │
│   - contact_cadence_metrics                 │
│   - gmail_messages                          │
│   - Xero financial data (cached)            │
│   - AI-generated insights                   │
└──────────────┬──────────────────────────────┘
               │
               ▼
       Intelligence APIs
       (Grant Discovery,
        Morning Brief,
        Financial AI, etc)
```

---

## 📊 Current State Analysis

### Notion Configuration

**Configured Databases** (from code):
1. **Projects** - `177ebcf981cf80dd9514f1ec32f3314c` (hardcoded in stable-real-data-server.js:90)
2. **People** - ENV: `NOTION_PEOPLE_DATABASE_ID` (for communications sync)
3. **Communications** - ENV: `NOTION_COMMUNICATIONS_DATABASE_ID`
4. **Partners** - ENV: `NOTION_PARTNERS_DATABASE_ID`
5. **Opportunities** - ENV: `NOTION_OPPORTUNITIES_DATABASE_ID`
6. **Organizations** - ENV: `NOTION_ORGANIZATIONS_DATABASE_ID`
7. **Activities** - ENV: `NOTION_ACTIVITIES_DATABASE_ID`
8. **Artifacts** - ENV: `NOTION_ARTIFACTS_DATABASE_ID`
9. **Actions** - ENV: `NOTION_ACTIONS_DATABASE_ID`
10. **Places** - ENV: `NOTION_PLACES_DATABASE_ID`

**Problem**: Only NOTION_TOKEN is set in .env - all database IDs are missing!

**Current Project Query** (stable-real-data-server.js:131-154):
```javascript
const response = await notion.databases.query({
  database_id: NOTION_PROJECTS_DATABASE_ID
});

// Maps to:
{
  id: page.id,
  title: page.properties.Name?.title?.[0]?.plain_text,
  status: page.properties.Status?.status?.name,
  coverPhoto: page.cover?.external?.url,
  description: page.properties.Description?.rich_text?.[0]?.plain_text,
  area: page.properties.Area?.select?.name,
  tags: page.properties.Tags?.multi_select,
  philosophy: page.properties.Philosophy?.rich_text?.[0]?.plain_text
}
```

### Supabase Configuration

**Connection**:
- ✅ URL: `https://tednluwflfhxyucgwigh.supabase.co`
- ✅ Service Role Key: Configured
- ✅ Status: Connected (20,398 contacts verified)

**Known Tables** (from code references):
1. `linkedin_contacts` - 20,398 LinkedIn contacts
   - Columns: `id, full_name, email_address, current_company, current_position, location, industry`
2. `contact_cadence_metrics` - Contact interaction tracking
   - Links to linkedin_contacts via `contact_id`
3. `gmail_messages` - Gmail intelligence cache
4. Xero-related tables (financial data)
5. AI-generated insights tables

**Key Service**: [supabaseNotionSync.js](apps/backend/core/src/services/supabaseNotionSync.js:1)
- Syncs contact cadence from Supabase → Notion People database
- Matches by email address
- Updates communication tracking in Notion

---

## 🔧 Integration Points

### 1. Contact Intelligence Flow

```
LinkedIn Contacts (Supabase: 20,398)
           ↓
    Gmail Interaction Tracking
           ↓
  Contact Cadence Metrics (Supabase)
           ↓
  SupabaseNotionSync Service
           ↓
  Notion People Database
  (Daily workflow tracking)
```

**Implementation**: [supabaseNotionSync.js:107-180](apps/backend/core/src/services/supabaseNotionSync.js:107)
```javascript
// Gets cadence metrics from Supabase
async getContactCadenceMetrics(options = {}) {
  // 1. Fetch contact_cadence_metrics
  const cadenceData = await supabase
    .from('contact_cadence_metrics')
    .select('*');

  // 2. Join with linkedin_contacts to get emails
  const linkedinData = await supabase
    .from('linkedin_contacts')
    .select('id, email_address, full_name...')
    .in('id', contactIds);

  // 3. Merge data for Notion sync
  return mergedContacts;
}

// Syncs to Notion People database
async getAllNotionPeople() {
  return await notion.databases.query({
    database_id: this.databases.people  // Missing from .env!
  });
}
```

### 2. Project Intelligence Flow

```
Notion Projects Database
(Source of Truth)
           ↓
    Cached in unified-intelligence-server
    (5-minute cache)
           ↓
    Enriched with Financial Data
    (Xero invoices, Thriday transactions)
           ↓
    AI Analysis Layer
    (Profitability, Community Benefit)
           ↓
    Intelligence APIs
```

**Implementation**: [stable-real-data-server.js:109-159](apps/backend/stable-real-data-server.js:109)
```javascript
const fetchNotionProjects = async () => {
  const response = await notion.databases.query({
    database_id: NOTION_PROJECTS_DATABASE_ID
  });

  // Returns projects with:
  // - title, status, coverPhoto
  // - area, tags, philosophy
  // - created/lastEdited timestamps
};
```

**Issue**: No financial data linkage yet - need to connect:
- Notion Project → Xero Invoices (by project name/ID)
- Notion Project → Thriday Transactions (by project tags)
- Notion Project → Community Benefit Attribution (40% rule)

### 3. AI Orchestration Flow

```
Supabase Tables
(Historical Data)
           ↓
    AI Services
    (Groq, Anthropic, Tavily)
           ↓
    Intelligence Engines
    (Grant Discovery, Morning Brief)
           ↓
    Results Cached in Supabase
    (For faster subsequent queries)
```

---

## ❌ Current Issues

### 1. Missing Environment Variables
**Problem**: Notion database IDs not configured
```bash
# Currently in .env:
NOTION_TOKEN=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

# MISSING (needed for full integration):
NOTION_PROJECTS_DATABASE_ID=177ebcf981cf80dd9514f1ec32f3314c  # Hardcoded!
NOTION_PEOPLE_DATABASE_ID=???
NOTION_COMMUNICATIONS_DATABASE_ID=???
NOTION_ORGANIZATIONS_DATABASE_ID=???
NOTION_OPPORTUNITIES_DATABASE_ID=???
# ... etc
```

**Impact**:
- ❌ Supabase → Notion sync fails (no People database)
- ❌ Communications tracking broken
- ✅ Projects work (hardcoded ID as fallback)

### 2. No Project-to-Financial Linkage
**Problem**: Notion projects not linked to financial data

**Example of what we NEED**:
```javascript
// Notion Project: "Seed House Witta"
{
  id: "notion-123",
  title: "Seed House Witta",
  status: "Active",

  // MISSING - Need to add:
  financial_intelligence: {
    xero_invoices: [
      { invoice_id: "INV-001", amount: "$12,500", status: "Paid" }
    ],
    thriday_transactions: [
      { date: "2025-09-15", amount: "$5,000", category: "Consulting" }
    ],
    total_revenue: "$17,500",
    total_expenses: "$3,200",
    profitability: "$14,300",
    community_benefit_owed: "$7,000"  // 40% of $17,500
  }
}
```

### 3. Supabase Table Schema Unknown
**Problem**: Don't know full Supabase table structure

**Need to discover**:
- What tables exist?
- What columns in each table?
- What relationships exist?
- What indexes for performance?

---

## ✅ Recommended Architecture

### Phase 1: Discovery & Configuration (Immediate)

1. **Discover Notion Databases**
   ```javascript
   // Query all accessible Notion databases
   const search = await notion.search({
     filter: { property: 'object', value: 'database' }
   });
   // Save database IDs to .env
   ```

2. **Discover Supabase Schema**
   ```sql
   -- Query all tables
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';

   -- Get table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'linkedin_contacts';
   ```

3. **Update .env Configuration**
   - Add all Notion database IDs
   - Document what each database is for
   - Update unified-intelligence-server.js to use them

### Phase 2: Data Flow Alignment

```
┌──────────────────────────────────────────────────────┐
│  NOTION (Source of Truth - User Managed)             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📋 Projects Database                                │
│     - Name, Status, Area, Tags, Philosophy           │
│     - Cover Photos, Descriptions                     │
│     - Created/Edited timestamps                      │
│                                                       │
│  👥 People Database                                  │
│     - Name, Email, Company, Role                     │
│     - Last Contact Date, Next Follow-up              │
│     - Relationship strength, Notes                   │
│                                                       │
│  🏢 Organizations, 💡 Opportunities, etc             │
└───────────────────┬──────────────────────────────────┘
                    │
                    │ ⚡ Sync Service (Bidirectional)
                    │    - Real-time via webhooks (future)
                    │    - Polling every 5 minutes (current)
                    │
┌───────────────────▼──────────────────────────────────┐
│  SUPABASE (Cache + AI Orchestration)                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📊 linkedin_contacts (20,398)                       │
│     - Cached LinkedIn data                           │
│     - Email, company, position, location             │
│                                                       │
│  📈 contact_cadence_metrics                          │
│     - Last interaction, interaction count            │
│     - Average cadence, overdue status                │
│     - Calculated daily from gmail_messages           │
│                                                       │
│  📧 gmail_messages                                   │
│     - Email intelligence                             │
│     - Sender, recipient, subject, date               │
│     - Linked to linkedin_contacts                    │
│                                                       │
│  💰 financial_cache                                  │
│     - Xero invoices, Thriday transactions            │
│     - Linked to Notion projects (by name/tag)        │
│     - Refreshed on-demand or nightly                 │
│                                                       │
│  🤖 ai_insights                                      │
│     - Grant opportunities (Tavily research)          │
│     - Project profitability analysis                 │
│     - Relationship intelligence                      │
│     - Morning brief pre-computed sections            │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  UNIFIED INTELLIGENCE SERVER (Port 4000)             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  APIs:                                               │
│  - Contact Intelligence (Supabase contacts)          │
│  - Project Intelligence (Notion projects + $$)       │
│  - Grant Discovery (Tavily + AI)                     │
│  - Morning Brief (All sources combined)              │
│  - Financial Intelligence (Xero + Thriday + AI)      │
└──────────────────────────────────────────────────────┘
```

### Phase 3: Critical Tables to Create/Verify

**Supabase Tables Needed**:

1. **project_financial_cache**
   ```sql
   CREATE TABLE project_financial_cache (
     id SERIAL PRIMARY KEY,
     notion_project_id TEXT NOT NULL,
     project_name TEXT,
     total_revenue DECIMAL,
     total_expenses DECIMAL,
     profitability DECIMAL,
     community_benefit_owed DECIMAL,
     last_updated TIMESTAMP DEFAULT NOW(),
     xero_data JSONB,
     thriday_data JSONB
   );
   ```

2. **ai_research_cache**
   ```sql
   CREATE TABLE ai_research_cache (
     id SERIAL PRIMARY KEY,
     query_hash TEXT UNIQUE,
     query TEXT,
     results JSONB,
     provider TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP
   );
   ```

3. **morning_brief_sections**
   ```sql
   CREATE TABLE morning_brief_sections (
     id SERIAL PRIMARY KEY,
     user_id TEXT,
     section_type TEXT, -- 'contacts', 'grants', 'financial', 'projects'
     content JSONB,
     generated_at TIMESTAMP DEFAULT NOW(),
     delivered_at TIMESTAMP
   );
   ```

---

## 🎯 Next Steps

### Immediate Actions:

1. **Discover Notion Structure**
   - [ ] Query Notion to find all accessible databases
   - [ ] Save database IDs to .env
   - [ ] Document database purposes

2. **Discover Supabase Structure**
   - [ ] List all tables
   - [ ] Document table schemas
   - [ ] Identify missing tables
   - [ ] Create migration plan

3. **Fix Sync Service**
   - [ ] Configure NOTION_PEOPLE_DATABASE_ID
   - [ ] Test Supabase → Notion contact sync
   - [ ] Verify bidirectional data flow

4. **Create Project-Financial Linkage**
   - [ ] Create project_financial_cache table
   - [ ] Link Notion projects to Xero invoices
   - [ ] Link Notion projects to Thriday transactions
   - [ ] Calculate community benefit attribution

5. **Update Unified Server**
   - [ ] Add Notion project query with financial enrichment
   - [ ] Add AI research caching
   - [ ] Add morning brief pre-computation
   - [ ] Test all integration points

### Success Metrics:
- ✅ All Notion databases discoverable
- ✅ All Supabase tables documented
- ✅ Contact sync working (Supabase ↔ Notion)
- ✅ Projects enriched with financial data
- ✅ AI insights cached in Supabase
- ✅ Morning brief pre-computed daily

---

## 🌱 Philosophy Alignment

**Beautiful Obsolescence Principles**:
1. ✅ Notion = User-controlled source of truth (community can own)
2. ✅ Supabase = Open-source cache (community can self-host)
3. ✅ Intelligence APIs = Open, documented, forkable
4. ✅ No vendor lock-in - all data exportable

**Community Benefit Tracking**:
```javascript
// Example: Project profitability with 40% attribution
{
  project: "Seed House Witta",
  revenue: "$17,500",
  attribution: {
    "Uncle Allan (cultural sovereignty story)": "$7,000",  // 40%
    "ACT operational costs": "$10,500"  // 60%
  }
}
```

This ensures the 40% community benefit model is tracked in the data layer itself.
