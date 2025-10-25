# Automated Connection Discovery & Linking System

**Date**: October 25, 2025
**Goal**: Move 43 isolated projects (0-5 connections) → resilient (16+ connections) automatically

---

## The Problem

**Current State:**
- 43/65 projects (66%) are ISOLATED (0-5 connections)
- These projects score 64/100 on Beautiful Obsolescence
- They're financially independent and autonomous, but lack network connections
- **Missing 11-16 connections each = blocking Beautiful Obsolescence**

**Manual Solution Would Be:**
- Research each project manually
- Find potential connections
- Add to Notion one by one
- **Time: 43 projects × 2 hours = 86 hours of manual work**

**Automated Solution:**
- Use Gmail + AI Research APIs
- Discover connections automatically
- Auto-populate Notion relationship fields
- **Time: 30 minutes to build + runs forever**

---

## The 3-Stage System

### Stage 1: Gmail Contact Mining 📧
**Extract connections from your existing email history**

**What it does:**
1. Scan Gmail for emails mentioning project names
2. Extract:
   - Organizations mentioned (potential Related Organizations)
   - People mentioned (potential Related People)
   - Other projects mentioned (potential Related Projects)
3. Build a "connection graph" from email patterns

**Example:**
- Email about "Goods." mentions "MMEIC" and "Empathy Ledger"
- → Auto-suggest: Add MMEIC and Empathy Ledger as Related Projects
- Email from sarah@indigenous-org.au about "BG Fit"
- → Auto-suggest: Add sarah@indigenous-org.au as Related Person

**API Endpoint:**
```
POST /api/v2/connections/discover-from-gmail
{
  "projectId": "177ebcf9-81cf-805f-b111-f407079f9794",  // Goods.
  "lookbackDays": 365
}

Returns:
{
  "project": "Goods.",
  "discovered": {
    "organizations": [
      { "name": "MMEIC", "confidence": 0.9, "evidence": "mentioned in 12 emails" },
      { "name": "Indigenous Corp", "confidence": 0.7, "evidence": "cc'd on 5 emails" }
    ],
    "people": [
      { "email": "sarah@org.au", "name": "Sarah Smith", "confidence": 0.8, "evidence": "8 conversations" }
    ],
    "relatedProjects": [
      { "name": "Empathy Ledger", "confidence": 0.85, "evidence": "mentioned together 6 times" }
    ]
  },
  "suggestedActions": [
    "Add MMEIC as Related Organization",
    "Add Empathy Ledger as Related Project",
    "Add Sarah Smith to Related People"
  ]
}
```

### Stage 2: AI-Powered Theme Matching 🤖
**Use AI research to find thematic connections**

**What it does:**
1. Analyze project themes (Youth Justice, Indigenous, Storytelling, etc.)
2. Use Groq AI to research:
   - Which organizations work on similar themes in Australia?
   - What other ACT projects share themes?
   - Who are the key people in this space?
3. Score potential connections by relevance

**Example:**
- "BG Fit" has theme: Youth Justice
- AI finds:
  - Other Youth Justice projects: JusticeHub, MMEIC, Diagrama, Oonchiumpa
  - Key orgs: Youth Justice Coalition, Jesuit Social Services
  - Key people: Youth justice advocates in Australia

**API Endpoint:**
```
POST /api/v2/connections/discover-from-themes
{
  "projectId": "18febcf9-81cf-80fe-a738-fe374e01cd08",  // BG Fit
  "themes": ["Youth Justice"]
}

Returns:
{
  "project": "BG Fit",
  "themeBasedConnections": {
    "sameThemeProjects": [
      { "name": "JusticeHub", "sharedThemes": ["Youth Justice"], "score": 0.95 },
      { "name": "MMEIC", "sharedThemes": ["Youth Justice", "Indigenous"], "score": 0.92 },
      { "name": "Oonchiumpa", "sharedThemes": ["Youth Justice"], "score": 0.90 }
    ],
    "suggestedOrganizations": [
      { "name": "Youth Justice Coalition NSW", "relevance": 0.88, "source": "AI research" },
      { "name": "Jesuit Social Services", "relevance": 0.82, "source": "AI research" }
    ]
  },
  "suggestedActions": [
    "Connect BG Fit with JusticeHub (both Youth Justice)",
    "Connect BG Fit with MMEIC (Youth Justice + Indigenous)",
    "Add Youth Justice Coalition as Related Organization"
  ]
}
```

### Stage 3: Auto-Linking to Notion 🔗
**Automatically populate Notion relationship fields**

**What it does:**
1. Take discovered connections from Stages 1 & 2
2. Match against existing Notion databases:
   - Organizations database
   - People database
   - Projects database
3. Auto-create Notion relationships
4. OR suggest new entries if not found

**Modes:**

**A. Auto Mode (High Confidence)**
- Confidence > 0.8 → Auto-link immediately
- Example: Email shows "Goods." and "MMEIC" together 12 times → Auto-add MMEIC as Related Project

**B. Suggest Mode (Medium Confidence)**
- Confidence 0.5-0.8 → Create suggestions for review
- Return list of "suggested connections" for human approval
- One-click approve/reject

**C. Manual Research Mode (Low Confidence)**
- Confidence < 0.5 → Flag for manual research
- Use Tavily web search to find more info

**API Endpoint:**
```
POST /api/v2/connections/auto-link
{
  "projectId": "177ebcf9-81cf-805f-b111-f407079f9794",  // Goods.
  "mode": "auto",  // "auto" | "suggest" | "manual"
  "minConfidence": 0.8
}

Returns:
{
  "project": "Goods.",
  "linked": {
    "relatedProjects": [
      { "name": "MMEIC", "action": "linked", "notionId": "179ebcf9..." },
      { "name": "Empathy Ledger", "action": "linked", "notionId": "187ebcf9..." }
    ],
    "relatedOrganizations": [
      { "name": "Indigenous Corp", "action": "created_and_linked", "notionId": "new-id-123" }
    ],
    "relatedPeople": [
      { "name": "Sarah Smith", "action": "suggested", "reason": "Not found in People database" }
    ]
  },
  "newConnectionsAdded": 5,
  "connectionsNow": 42,  // Was 37, now 42
  "beautifulObsolescenceImpact": {
    "before": 64,
    "after": 68,
    "improvement": "+4 points",
    "status": "Still needs 12 more connections to reach 80 (Beautiful Obsolescence ready)"
  }
}
```

---

## The Connection Discovery Algorithm

### Step-by-Step Process

**For Each Isolated Project:**

1. **Gmail Mining**
   ```
   - Search Gmail for project name
   - Extract: organizations, people, other projects mentioned
   - Score by frequency and recency
   ```

2. **Theme Analysis**
   ```
   - Get project themes from Notion
   - Find all other projects with same themes
   - AI research for external organizations in same space
   ```

3. **Location Analysis**
   ```
   - Get project location from Notion (relatedPlaces)
   - Find all other projects in same location
   - Suggest local organizations in that area
   ```

4. **Confidence Scoring**
   ```
   High (0.8-1.0): Gmail shows 10+ interactions
   Medium (0.5-0.8): Theme overlap or 3-9 interactions
   Low (0.0-0.5): AI suggestion only
   ```

5. **Auto-Linking**
   ```
   IF confidence > 0.8 AND exists in Notion:
     → Auto-link immediately
   ELSE IF confidence > 0.5:
     → Create suggestion for review
   ELSE:
     → Flag for manual research
   ```

6. **Notion Update**
   ```
   - Add to relatedProjects field
   - Add to relatedOrganisations field
   - Add to relatedPeople field
   - Recalculate Beautiful Obsolescence score
   ```

---

## Implementation Plan

### Phase 1: Gmail Connection Discovery (Week 1)

**File:** `/apps/backend/core/src/api/connectionDiscovery.js`

**Functions to build:**
```javascript
// 1. Search Gmail for project mentions
async function searchGmailForProject(projectName, lookbackDays = 365)

// 2. Extract entities from email
function extractEntitiesFromEmail(emailText)

// 3. Build connection graph
function buildConnectionGraph(gmailResults)

// 4. Score connections
function scoreConnection(entity, evidence)
```

**API Routes:**
```javascript
POST /api/v2/connections/discover-from-gmail
POST /api/v2/connections/batch-discover  // Run for all 43 isolated projects
```

### Phase 2: AI Theme Matching (Week 1)

**Use existing Research API:**
```javascript
// Already have: /api/v2/research/query

// New wrapper:
async function discoverThemeConnections(project) {
  const query = `Find organizations working on ${project.themes.join(', ')} in Australia`;
  const results = await researchService.query(query);
  return parseOrganizations(results);
}
```

### Phase 3: Auto-Linking (Week 2)

**Functions:**
```javascript
// Match discovered entities to Notion databases
async function matchToNotionOrgs(orgName)
async function matchToNotionPeople(personEmail)
async function matchToNotionProjects(projectName)

// Create relationships
async function linkRelatedProject(projectId, relatedProjectId)
async function linkRelatedOrg(projectId, orgId)
async function linkRelatedPerson(projectId, personId)

// Batch operations
async function autoLinkDiscoveredConnections(projectId, discoveries, mode)
```

**API Routes:**
```javascript
POST /api/v2/connections/auto-link
POST /api/v2/connections/batch-link  // Run for all suggested connections
GET  /api/v2/connections/suggestions/:projectId  // Review suggestions
POST /api/v2/connections/approve-suggestion  // Approve a suggestion
```

### Phase 4: Dashboard Integration (Week 2)

**Frontend Component:** `ConnectionDiscoveryDashboard.tsx`

**Features:**
- Button: "Discover Connections for All Isolated Projects"
- Progress bar showing: "Discovered 127 connections for 43 projects"
- Review panel: "Suggested Connections (require approval)"
- One-click approve/reject for each suggestion
- Real-time Beautiful Obsolescence score updates

---

## Expected Impact

### Before Automation
- 43 isolated projects (0-5 connections)
- Average Beautiful Obsolescence score: 14/100
- 0 projects ready for transition
- **Manual effort: 86 hours to research and link**

### After Automation (Conservative Estimates)

**Gmail Mining finds:**
- 5-10 connections per project from email history
- ~300 total connections discovered

**Theme Matching finds:**
- 3-5 similar projects per project
- 2-3 relevant organizations per project
- ~200 total connections discovered

**Total Discovered: ~500 potential connections**

**After filtering for confidence > 0.5:**
- ~250 high-quality connections
- Average: 6 new connections per isolated project

**New State:**
- 43 projects move from ISOLATED (0-5) → DEVELOPING/RESILIENT (11-16)
- Average Beautiful Obsolescence score: 14 → 38 (+24 points!)
- Projects on track for 60+ scores with one more round of connections
- **Automated effort: 1 hour to run + 2 hours to review suggestions**

---

## Success Metrics

**Week 1:**
- ✅ Gmail mining working for 5 test projects
- ✅ 50+ connections discovered
- ✅ 20+ auto-linked with high confidence

**Week 2:**
- ✅ Theme matching integrated
- ✅ 100+ additional connections discovered
- ✅ Dashboard for reviewing suggestions built

**Week 3:**
- ✅ All 43 isolated projects processed
- ✅ 250+ new connections added to Notion
- ✅ Average project connections: 5 → 11 (+6)

**Week 4:**
- ✅ Beautiful Obsolescence scores updated
- ✅ 15-20 projects now at 60+ (Cruising stage)
- ✅ 5-10 projects at 70+ (approaching transition)

---

## Safety & Quality Controls

### 1. Confidence Thresholds
- Don't auto-link below 0.8 confidence
- Human review required for 0.5-0.8 range
- Flag < 0.5 for manual research

### 2. Notion Validation
- Check if relationship already exists (no duplicates)
- Validate that related entity exists in target database
- Create new entries only with user approval

### 3. Email Privacy
- Only extract organization/project names (not personal content)
- Don't store email bodies
- Aggregate patterns only

### 4. Undo Capability
- Track all auto-created relationships
- One-click "Undo Auto-Linking" per project
- Audit log of all changes

---

## Future Enhancements (Phase 2)

### 1. **Web Scraping**
- Scrape project websites for "Partners" sections
- Auto-discover organizations they work with

### 2. **Social Media Mining**
- Analyze LinkedIn connections
- Twitter/X mentions and interactions

### 3. **Document Analysis**
- Parse uploaded project docs/reports
- Extract mentioned organizations and people

### 4. **Geographic Clustering**
- Auto-connect projects in same city/region
- Suggest local meetups/collaborations

### 5. **Temporal Patterns**
- Identify "went quiet" connections
- Suggest re-engagement

### 6. **Reciprocal Linking**
- When linking Project A → Project B
- Suggest linking Project B → Project A (bidirectional)

---

## API Spec Summary

### Connection Discovery
```
POST /api/v2/connections/discover-from-gmail
POST /api/v2/connections/discover-from-themes
POST /api/v2/connections/batch-discover
```

### Auto-Linking
```
POST /api/v2/connections/auto-link
POST /api/v2/connections/batch-link
GET  /api/v2/connections/suggestions/:projectId
POST /api/v2/connections/approve-suggestion
POST /api/v2/connections/reject-suggestion
DELETE /api/v2/connections/undo-auto-link/:projectId
```

### Analytics
```
GET /api/v2/connections/discovery-stats
GET /api/v2/connections/impact-report
```

---

## The Bottom Line

**Instead of 86 hours of manual work:**
- Build the system once (1-2 weeks)
- Run it automatically forever
- Discover 250+ connections for 43 isolated projects
- Move projects from Isolated → Resilient
- Unlock Beautiful Obsolescence at scale

**This is how you weave the ecosystem automatically.** 🕸️

---

**Next Steps:**
1. Build Gmail connection discovery API
2. Test on 5 isolated projects (BG Fit, AIME, Dad.Lab.25, Designing for Obsolescence, Barkly Backbone)
3. Review quality of discovered connections
4. Build auto-linking system
5. Scale to all 43 isolated projects
6. Celebrate Beautiful Obsolescence! 🌅
