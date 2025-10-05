# 📋 Current Functions & APIs - Complete Inventory

**Last Updated**: October 4, 2025

---

## 🎯 ACTIVE SYSTEMS

### 1. Contact Intelligence Hub (Port 4000)
**Status**: ✅ LIVE
**URL**: http://localhost:4000
**Dashboard**: http://localhost:4000/contact-intelligence-hub.html

#### Available APIs:

##### Contact Search & Browse
```bash
GET /api/contacts/search?query=name&hasEmail=true&limit=50&offset=0
```
**What it does**: Search all 20,398 contacts by name, company, position, industry
**Filters**: `hasEmail` (true/false), `query` (text search), pagination
**Returns**: Contact list with email status, company, position

```bash
GET /api/contacts/:id
```
**What it does**: Get detailed profile for one contact
**Returns**: Full contact record including relationship score, strategic value, last interaction

##### AI Enrichment
```bash
POST /api/contacts/:id/enrich
```
**What it does**: Analyze what data is missing, suggest research actions
**Returns**: Email discovery status, background research actions, next steps
**Future**: Will call AI to actually research and populate data

##### Project Matching
```bash
GET /api/projects/:projectName/match-contacts?limit=10
```
**What it does**: Find contacts who match a specific project
**Returns**: Scored list of contacts with match reasons
**Current**: Basic keyword matching
**Future**: AI skill analysis, network overlap, values alignment

```bash
GET /api/contacts/:id/suggest-projects
```
**What it does**: Suggest which of your 22 projects a contact should join
**Returns**: Projects with fit scores and suggested roles
**Future**: AI multi-factor analysis

##### Email Intelligence
```bash
POST /api/contacts/:id/draft-email
Body: { "project_name": "Project Name", "email_type": "introduction" }
```
**What it does**: Generate personalized email draft
**Returns**: Email subject, body, timing recommendation, AI notes
**Current**: Template-based
**Future**: AI personalization with contact history, mutual connections, recent news

```bash
GET /api/contacts/:id/timing
```
**What it does**: Get optimal timing to reach out
**Returns**: Best day/time, current recommendation with reasoning
**Future**: Analysis of email open rates, response patterns, timezone

##### Smart Notion Sync
```bash
POST /api/contacts/:id/activate
Body: { "projects": ["Project A", "Project B"] }
```
**What it does**: Mark contact as "active" and prepare for Notion sync
**Returns**: Activation confirmation, Notion sync status
**Future**: Auto-sync to Notion People database, link to projects

```bash
GET /api/contacts/active
```
**What it does**: List all contacts marked as "active" (would be in Notion)
**Returns**: Active contact list
**Future**: Real-time sync status

##### Statistics
```bash
GET /api/stats
```
**What it does**: Platform-wide statistics
**Returns**:
- Total contacts: 20,398
- With emails: 276
- Without emails: 20,122
- Email coverage: 1.4%
- Total projects: 22

---

### 2. Supabase ↔ Notion Sync Service
**Status**: ✅ CONFIGURED (Daily automation at 6:00 AM)
**Location**: `apps/backend/core/src/services/supabaseNotionSync.js`

#### Core Functions:

##### Contact Cadence Intelligence
```javascript
async getContactCadenceMetrics(options = {})
```
**What it does**: Get contacts with interaction cadence data
**Options**: `limit`, `onlyRecentlyActive`
**Returns**: Contacts with last interaction, cadence days, next contact due
**Special**: JOINs cadence_metrics with linkedin_contacts to enrich with emails

##### Notion Integration
```javascript
async getAllNotionPeople()
```
**What it does**: Fetch all people from Notion People database
**Returns**: 115 Notion person records
**Special**: Uses fetch API workaround for Notion client issue

```javascript
async matchContactsByEmail(supabaseContacts, notionPeople)
```
**What it does**: Match Supabase contacts to Notion records by email
**Returns**: Matched pairs with both Supabase and Notion data

```javascript
async syncContactCadenceToNotion(options = {})
```
**What it does**: Sync contact cadence to Notion Communications Dashboard
**Options**: `dryRun`, `limit`
**Returns**: Sync results (created, updated, errors)

##### Automation
**Daily Sync Script**: `apps/backend/core/scripts/daily-sync.js`
**Runs**: 6:00 AM daily via cron
**What it does**: Syncs all active contacts to Notion automatically

---

### 3. Stable Data Server (Port 4001)
**Status**: ✅ CAN START (not currently running)
**Location**: `apps/backend/stable-real-data-server.js`

#### Integrated APIs:

##### Financial Webhooks
```bash
POST /api/events/xero/webhooks
POST /api/events/financial/*
```
**What it does**: Receive real-time financial events from Xero

##### Integration Monitoring
```bash
GET /api/integration-monitoring/*
```
**What it does**: Monitor health of all integrations (Gmail, Xero, Notion, etc.)

##### Gmail Intelligence Sync
```bash
GET /api/gmail-intelligence/*
```
**What it does**: Sync Gmail emails to community_emails table
**Special**: Extracts contact relationships from email history

##### Xero Intelligence Sync
```bash
GET /api/xero-intelligence/*
```
**What it does**: Sync Xero financial data with intelligence layer

##### Unified Business Intelligence
```bash
GET /api/unified-business-intelligence/*
```
**What it does**: Combined view of contacts, financials, projects

---

## 📊 DATA STRUCTURE - What's in Supabase

### Core Tables

#### `linkedin_contacts` (20,398 records)
```sql
Columns:
- id, first_name, last_name, full_name
- linkedin_url, email_address (276 populated)
- current_position, current_company, industry
- location, connected_on, connection_source
- relationship_score, strategic_value, alignment_tags
- engagement_frequency, interaction_count, last_interaction
- skills_extracted, industries, influence_level, network_reach
- notion_person_id, gmail_contact_id
- created_at, updated_at, last_analyzed_at
```

#### `contact_cadence_metrics` (52 records)
```sql
Columns:
- contact_id (FK to linkedin_contacts.id)
- total_interactions, interaction_cadence_days
- last_interaction, days_since_interaction
- next_contact_due (calculated)
```

#### `project_support_graph` (22 records)
```sql
Columns:
- project_name
- supporter_count, top_supporters (array)
- network_strength, collaboration_score
- created_at, updated_at
```

#### `community_emails` (0 records - needs Gmail sync)
```sql
Purpose: Store all Gmail emails for contact relationship analysis
Status: Table exists but not populated
```

---

## 🔧 HELPER SCRIPTS & UTILITIES

### Testing & Diagnostics
```bash
# Check full data inventory
node check-real-data.js

# Check total contact count
node check-total-contacts.js

# Test all APIs
node test-all-apis.js
```

### Sync Management
```bash
# Start daily sync in background
./start-daily-sync.sh

# Stop daily sync
./stop-daily-sync.sh

# Run sync once (dry run)
node core/scripts/daily-sync.js

# Run full sync (all contacts)
node core/scripts/daily-sync.js --full
```

### Dashboard Management
```bash
# Start Contact Intelligence Hub
node contact-intelligence-hub.js

# Start Stable Data Server
node stable-real-data-server.js
```

---

## 🚀 READY TO IMPLEMENT (Needs AI Integration)

### 1. Contact Enrichment with Perplexity
```javascript
// Endpoint ready: POST /api/contacts/:id/enrich
// Needs: Perplexity API key + integration

async function enrichContactWithAI(contactId) {
  // 1. Get contact from Supabase
  // 2. Call Perplexity: "Research {name} at {company}"
  // 3. Extract: email, background, recent news, skills
  // 4. Update Supabase with enriched data
  // 5. Return enrichment results
}
```

### 2. Email Drafting with OpenAI
```javascript
// Endpoint ready: POST /api/contacts/:id/draft-email
// Needs: OpenAI API key + integration

async function draftEmailWithAI(contactId, projectName) {
  // 1. Get contact history
  // 2. Get project context
  // 3. Call OpenAI GPT-4:
  //    "Draft personalized email to {name} about {project}
  //     Context: {history}, Mutual connections: {connections}"
  // 4. Generate 3 variants (short/medium/long)
  // 5. Return with timing recommendations
}
```

### 3. Project Matching with Claude
```javascript
// Endpoint ready: GET /api/projects/:name/match-contacts
// Needs: Anthropic Claude API key + integration

async function matchContactsToProject(projectName) {
  // 1. Get project requirements
  // 2. Get all contacts with emails (276)
  // 3. Call Claude for each contact:
  //    "Score {contact} fit for {project}
  //     Consider: skills, network, values, capacity"
  // 4. Rank by score
  // 5. Return top 20 matches with reasoning
}
```

### 4. Gmail Sync for Email Population
```javascript
// Scripts ready: setup-gmail-simple.js, etc.
// Needs: Gmail OAuth setup completion

async function syncGmailEmails() {
  // 1. Authenticate with Gmail API
  // 2. Fetch all emails from sent/received
  // 3. Extract email addresses
  // 4. Match to linkedin_contacts by name/company
  // 5. Update email_address field
  // 6. Store emails in community_emails table
  // Expected result: 1.4% → 50%+ email coverage
}
```

---

## 🎯 IMMEDIATE PRIORITIES (Next 2 Weeks)

### Week 1: AI Integration
**Goal**: Make enrichment, matching, and email drafting ACTUALLY intelligent

1. **Connect Perplexity API**
   ```bash
   npm install @anthropic-ai/perplexity-client
   # Add PERPLEXITY_API_KEY to .env
   # Implement in contact-intelligence-hub.js
   ```

2. **Connect OpenAI API**
   ```bash
   npm install openai
   # Add OPENAI_API_KEY to .env
   # Implement email drafting
   ```

3. **Gmail Sync Setup**
   ```bash
   # Complete OAuth flow
   node setup-gmail-simple.js
   # Run full sync
   # Expected: 276 → 10,000+ emails
   ```

### Week 2: Enhanced Features

4. **Skill Extraction Engine**
   - Parse linkedin_contacts data
   - Extract expertise tags
   - Build skill taxonomy
   - Match skills to project needs

5. **Project Scoring Algorithm**
   - Multi-factor scoring (skills, network, values, capacity)
   - Weighted ranking system
   - Confidence scores

6. **Smart Filters**
   - Values alignment (cultural protocols, ethics)
   - Geographic proximity
   - Capacity availability (engagement_frequency)
   - Funding capability (strategic_value)

---

## 📈 METRICS TO TRACK

### System Health
- **API Response Times**: <100ms for search, <3s for AI
- **Sync Success Rate**: >99% daily sync completion
- **Email Coverage**: Track 1.4% → 50%+ growth
- **Data Quality**: % of contacts with complete profiles

### Business Impact
- **Time Saved**: Minutes per week on relationship planning
- **Opportunities Found**: Collaboration matches per month
- **Email Effectiveness**: Response rates on AI-drafted emails
- **Funding Success**: Grants won via platform insights

### User Engagement
- **Daily Active Users**: % checking daily briefing
- **Feature Usage**: % using AI drafts, enrichment, matching
- **Satisfaction**: Net Promoter Score
- **Retention**: Monthly/annual renewal rate

---

## 🔗 INTEGRATION STATUS

### Currently Integrated
- ✅ Supabase (PostgreSQL intelligence layer)
- ✅ Notion API (People, Communications, Projects)
- ✅ LinkedIn data (20,398 contacts imported)
- ✅ Xero API (financial webhooks configured)

### Partially Integrated
- ⚠️ Gmail API (OAuth ready, sync not populated)
- ⚠️ Contact cadence (52/20398 contacts have metrics)

### Ready to Integrate
- 🔄 OpenAI GPT-4 (API endpoint ready)
- 🔄 Anthropic Claude (API endpoint ready)
- 🔄 Perplexity (API endpoint ready)

### Future Integrations
- 📋 Hunter.io (email discovery)
- 📋 Clearbit (company enrichment)
- 📋 Apollo.io (contact data)
- 📋 Slack (notifications)
- 📋 Calendar APIs (meeting scheduling)

---

## 💡 KEY INSIGHTS

### What's Working Really Well
1. **Architecture**: Supabase (intelligence) ↔ Notion (action) separation is perfect
2. **Data Volume**: 20,398 contacts is a goldmine for AI
3. **API Design**: RESTful, clear, extensible
4. **Foundation**: 80% of core infrastructure complete

### What Needs Immediate Attention
1. **Email Coverage**: 1.4% is too low → Run Gmail sync NOW
2. **AI Integration**: Templates are good, real AI will be transformative
3. **User Interface**: Backend powerful, need React dashboard
4. **Testing**: More real-world usage to validate approaches

### Biggest Opportunities
1. **Network Effects**: 22 projects × 20k contacts = massive collaboration potential
2. **AI Personalization**: Contact history + project context = highly effective outreach
3. **Financial + Relationship**: Unique combo no other CRM has
4. **Values Alignment**: Ethical AI with cultural protocols = differentiation

---

This is everything we have **RIGHT NOW**.

The foundation is solid. The next 2 weeks of AI integration will make this incredibly powerful. 🚀
