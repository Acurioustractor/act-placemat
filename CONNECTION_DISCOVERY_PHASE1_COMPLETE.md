# Connection Discovery System - Phase 1 Complete

**Date**: October 25, 2025
**Status**: Ready to Test

---

## What We Just Built

An **Automated Connection Discovery System** that uses Gmail + AI to find project connections and move 43 isolated projects (0-5 connections) → resilient (16+ connections).

### The Problem This Solves

- **66% of projects (43 total) are ISOLATED** (0-5 connections)
- They score only 64/100 on Beautiful Obsolescence
- They need 11-16 more connections to reach Beautiful Obsolescence readiness
- **Manual research would take 86 hours**

### The Solution We Built

**3 Discovery Methods:**

1. **Gmail Mining** 📧
   - Scans Gmail for mentions of project names
   - Extracts: organizations, people, and related projects
   - Scores by confidence (mention frequency)

2. **Theme Matching** 🎨
   - Finds projects with shared themes (Youth Justice, Indigenous, etc.)
   - Auto-suggests connections between similar projects

3. **Combined Discovery**
   - Runs both methods in parallel
   - Shows Beautiful Obsolescence impact of new connections

---

## New API Endpoints (Live Locally)

### 1. Discover from Gmail
```
POST http://localhost:4000/api/v2/connections/discover-from-gmail
{
  "projectId": "18febcf9-81cf-80fe-a738-fe374e01cd08",  // BG Fit
  "lookbackDays": 365,
  "minMentions": 2
}
```

**Returns:**
- Organizations mentioned in emails about this project
- People who email about this project
- Other projects mentioned together
- Confidence scores (0-1)
- Suggested actions

### 2. Discover from Themes
```
POST http://localhost:4000/api/v2/connections/discover-from-themes
{
  "projectId": "18febcf9-81cf-80fe-a738-fe374e01cd08"  // BG Fit
}
```

**Returns:**
- All other projects with shared themes
- Similarity scores
- Suggested connections

### 3. Discover All (Combined)
```
POST http://localhost:4000/api/v2/connections/discover-all
{
  "projectId": "18febcf9-81cf-80fe-a738-fe374e01cd08",  // BG Fit
  "lookbackDays": 365
}
```

**Returns:**
- Gmail discoveries + Theme discoveries
- Current connections count
- Projected connections after linking
- Beautiful Obsolescence impact calculation

### 4. Batch Discover (All Isolated Projects)
```
POST http://localhost:4000/api/v2/connections/batch-discover
{
  "isolatedOnly": true,  // Find all projects with < 6 connections
  "lookbackDays": 365
}
```

**Returns:**
- Discoveries for ALL 43 isolated projects
- Total connections discovered
- Full results array

---

## Files Created

1. **`/apps/backend/core/src/services/connectionDiscoveryService.js`** (470 lines)
   - Gmail email mining logic
   - Entity extraction (orgs, people, projects)
   - Confidence scoring algorithm
   - Theme-based matching
   - Batch processing

2. **`/apps/backend/core/src/api/connectionDiscovery.js`** (260 lines)
   - 4 API routes for connection discovery
   - Beautiful Obsolescence impact calculator
   - Error handling and logging

3. **`/apps/backend/server.js`** (modified)
   - Registered connection discovery routes
   - Made gmailService available to routes

4. **`CONNECTION_DISCOVERY_SYSTEM_DESIGN.md`** (comprehensive design doc)
   - Full system architecture
   - 3-stage design (Discover → Score → Link)
   - Expected impact calculations
   - Future enhancements

---

## How It Works

### Step 1: Search Gmail
```javascript
// Search for emails mentioning "BG Fit" in last 365 days
const emails = await gmailService.search('"BG Fit" after:2024/10/25');
// Returns: 15 emails
```

### Step 2: Extract Entities
```javascript
// From email subjects, snippets, from/to/cc fields:
- Organizations: "mmeic", "youthcoalition", "justiceservices"
- People: "sarah@org.au", "john@agency.gov.au"
- Projects: "JusticeHub", "MMEIC", "Oonchiumpa"
```

### Step 3: Score Confidence
```javascript
// Based on mention frequency:
- "MMEIC" mentioned 12 times → confidence: 0.95 (HIGH)
- "Youth Coalition" mentioned 5 times → confidence: 0.75 (MEDIUM)
- "Some Org" mentioned 2 times → confidence: 0.55 (LOW)
```

### Step 4: Calculate Impact
```javascript
// BG Fit currently has 5 connections (ISOLATED)
// Discovered 15 new connections from Gmail
// → Projected total: 20 connections (RESILIENT)
// → Beautiful Obsolescence improvement: +15 points!
```

---

## Next Steps to Test

### Test 1: Discover for BG Fit
```bash
curl -X POST http://localhost:4000/api/v2/connections/discover-from-themes \
  -H "Content-Type: application/json" \
  -d '{"projectId": "18febcf9-81cf-80fe-a738-fe374e01cd08"}'
```

**Expected:** Find JusticeHub, MMEIC, Oonchiumpa, Diagrama (all Youth Justice)

### Test 2: Batch Discover All Isolated Projects
```bash
curl -X POST http://localhost:4000/api/v2/connections/batch-discover \
  -H "Content-Type: application/json" \
  -d '{"isolatedOnly": true, "lookbackDays": 365}'
```

**Expected:** Discover 200-300 connections across 43 isolated projects

### Test 3: Check Beautiful Obsolescence Impact
```bash
curl -X POST http://localhost:4000/api/v2/connections/discover-all \
  -H "Content-Type: application/json" \
  -d '{"projectId": "177ebcf9-81cf-805f-b111-f407079f9794"}'  # Goods.
```

**Expected:** Show how many connections needed to reach 80+ score

---

## What's Still To Build (Phase 2)

### Auto-Linking to Notion

Once we confirm discoveries are accurate, build:

```javascript
POST /api/v2/connections/auto-link
{
  "projectId": "...",
  "discoveries": [...],  // From discover-all
  "mode": "auto",  // or "suggest" or "manual"
  "minConfidence": 0.8
}
```

**What it will do:**
1. Take discovered connections
2. Match against existing Notion orgs/people/projects databases
3. Auto-create relationships in Notion
4. Return updated Beautiful Obsolescence score

---

## Expected Impact

### Before (Current State)
- 43 isolated projects (0-5 connections each)
- Average Beautiful Obsolescence: 14/100
- 0 projects ready for transition (80+)

### After Gmail Discovery (Conservative)
- Discover ~5 connections per project from Gmail
- ~215 new connections discovered
- Projects move from ISOLATED → DEVELOPING

### After Theme Matching
- Discover ~3-5 similar projects per project
- ~150 additional connections
- Projects move from DEVELOPING → RESILIENT

### After Auto-Linking (Target)
- Average connections per project: 5 → 16
- Average Beautiful Obsolescence: 14 → 38 (+24 points!)
- 15-20 projects at RESILIENT status (16+ connections)
- On track for 60+ scores with one more discovery round

---

## Success Metrics (This Week)

✅ **Phase 1 Complete**: Gmail + Theme discovery APIs built
⏳ **Test**: Run discovery on 5 isolated projects
⏳ **Validate**: Review discovered connections for accuracy
⏳ **Build**: Auto-linking system (Phase 2)
⏳ **Deploy**: Batch discover for all 43 isolated projects
⏳ **Celebrate**: Beautiful Obsolescence scores increase! 🌅

---

## The Vision

**Imagine this:**

```
Monday morning:
- Click "Discover Connections for All Isolated Projects"
- System scans 1 year of Gmail history
- Discovers 250+ connections automatically
- Shows: "Ready to link 127 high-confidence connections"
- Click "Auto-Link"
- Notion updates in real-time
- Beautiful Obsolescence scores jump from 14 → 38
- 15 projects move from ISOLATED → RESILIENT
- Dashboard shows clear path to Beautiful Obsolescence

Time: 5 minutes of your time vs. 86 hours of manual research
```

**This is the power of automation to unlock Beautiful Obsolescence at scale.** 🚀

---

**Ready to test!** Start the server and run the theme discovery for BG Fit to see it in action.
