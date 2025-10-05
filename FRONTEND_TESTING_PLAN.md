# ACT Platform - Frontend Testing & Integration Plan

**Date**: October 5, 2025
**Status**: Ready for Frontend Testing
**Goal**: Make the unified intelligence platform testable and usable from the frontend

---

## 🎯 What We Have (Current State)

### ✅ Backend (Unified Intelligence Server - Port 4000)

**Working APIs**:
1. ✅ **Contact Intelligence** - 20,398 LinkedIn contacts
   - `GET /api/contacts/search?query=ben&limit=50`
   - `GET /api/contacts/stats`

2. ✅ **Grant Discovery** - FREE Tavily + Groq research
   - `POST /api/research/grants` - Research grant opportunities
   - `GET /api/research/health` - Check research AI status

3. ✅ **AI Business Agent** - Multi-provider with fallback
   - `POST /api/ai/chat` - Chat with AI agent
   - `GET /api/ai/status` - Check AI provider status

4. ✅ **Financial Intelligence** - Xero + Gmail integration
   - `/api/xero/*` - Xero financial data
   - `/api/gmail/*` - Gmail intelligence
   - `/api/dashboard/*` - Dashboard aggregation
   - `/api/project-financials/*` - Project financial tracking

5. ✅ **Research Tools**
   - `/api/curious-tractor/*` - Deep research for entity setup

**Data Sources Connected**:
- ✅ Supabase (20,398 contacts)
- ✅ Notion (10 databases - Projects, People, Organizations, etc)
- ✅ Xero (Financial data with valid access token)
- ✅ Gmail (Email intelligence)
- ✅ Groq (FREE unlimited AI)
- ✅ Tavily (FREE 1000 searches/month)
- ✅ Anthropic Claude (Premium fallback)

### ✅ Frontend (React + TypeScript + Vite)

**Active Tabs** (9 working components):
1. 🤖 **Autopilot** - BusinessAutopilot.tsx (updated to port 4000)
2. 📚 **Bookkeeping** - BookkeepingChecklist.tsx
3. 💰 **Money Flow** - MoneyFlowDashboard.tsx (updated to port 4000)
4. 📊 **Financial Reports** - (needs component)
5. 🧾 **Receipts** - ReceiptProcessor.tsx
6. 🧭 **Dashboard** - EnhancedDashboard.tsx (updated to port 4000)
7. 🏘️ **Projects** - CommunityProjects.tsx
8. 🤖 **AI Agent** - AIBusinessAgent.tsx (updated to port 4000)
9. 🌱 **Curious Tractor** - CuriousTractorResearch.tsx

**Frontend Configuration**:
- ✅ All components updated to use `http://localhost:4000`
- ✅ Vite dev server configured
- ✅ TailwindCSS configured

---

## ❌ What's Missing / Broken

### 1. Missing Backend Endpoints

Several frontend components expect endpoints that don't exist yet:

**MoneyFlowDashboard.tsx** expects:
- ❌ `GET /api/v2/xero/dashboard` - Needs to be created
- ❌ `GET /api/v2/gmail/messages?limit=20` - Needs to be created

**BusinessAgentDashboard.tsx** expects:
- ❌ `GET /api/v2/agents/business-australia/status`
- ❌ `GET /api/v2/agents/business-australia/analyze/compliance`
- ❌ `POST /api/v2/agents/business-australia/start`

**ProjectFinancials.tsx** expects:
- ❌ `GET /api/v2/projects/financial-overview`

**AIBusinessAgent.tsx** expects:
- ❌ `POST /api/v2/agent/ask` (we have `/api/ai/chat` instead)

### 2. API Version Mismatch

Frontend uses `/api/v2/*` but server has `/api/*` (no versioning)

**Fix needed**: Add API versioning to unified server OR update frontend to use non-versioned endpoints

### 3. Missing Notion Project API

Frontend needs:
- ❌ `GET /api/projects` - List all Notion projects
- ❌ `GET /api/projects/:id` - Get single project with financial data

**Have**: Notion service with all 10 databases configured
**Need**: REST API endpoints to expose this data

### 4. Missing Real-Time Features

Frontend expects but we don't have:
- ❌ WebSocket connections for real-time updates
- ❌ Server-Sent Events for progress tracking
- ❌ Polling endpoints for long-running operations

---

## 🔧 Fixes Required (Priority Order)

### Phase 1: Quick Wins (1-2 hours) - GET IT WORKING

**Goal**: Get frontend loading without errors

1. **Add API Version Adapter**
   ```javascript
   // In unified-intelligence-server.js
   // Duplicate all /api/* routes to /api/v2/*
   app.use('/api/v2/ai', app._router.stack.find(r => r.route?.path === '/api/ai'));
   ```

2. **Add Missing Xero Dashboard Endpoint**
   ```javascript
   app.get('/api/v2/xero/dashboard', async (req, res) => {
     // Return Xero summary: invoices, bills, accounts
   });
   ```

3. **Add Missing Gmail Messages Endpoint**
   ```javascript
   app.get('/api/v2/gmail/messages', async (req, res) => {
     const { limit = 20 } = req.query;
     // Return recent Gmail messages from Supabase cache
   });
   ```

4. **Add Notion Projects Endpoint**
   ```javascript
   app.get('/api/projects', async (req, res) => {
     const response = await notion.databases.query({
       database_id: process.env.NOTION_PROJECTS_DATABASE_ID
     });
     // Return formatted projects
   });
   ```

5. **Add Agent Status Stub**
   ```javascript
   app.get('/api/v2/agents/:agentId/status', async (req, res) => {
     res.json({
       status: 'available',
       agent: req.params.agentId,
       capabilities: ['compliance', 'opportunities', 'analysis']
     });
   });
   ```

### Phase 2: Core Intelligence (2-4 hours) - MAKE IT USEFUL

**Goal**: Wire up real data to frontend components

1. **Project Financial Intelligence**
   - Query Notion Projects database
   - Link to Xero invoices by project name
   - Calculate profitability
   - Track community benefit (40% rule)

2. **Contact Intelligence UI**
   - Create contact search component
   - Display 20,398 LinkedIn contacts
   - Show cadence metrics
   - Integrate with Notion People sync

3. **Grant Discovery UI**
   - Add search interface for grant research
   - Display Tavily results with AI analysis
   - Save opportunities to Notion Opportunities database
   - Track application status

4. **Dashboard Aggregation**
   - Financial summary (Xero)
   - Contact priorities (Supabase)
   - Project health (Notion)
   - AI insights

### Phase 3: Beautiful UX (4-8 hours) - MAKE IT BEAUTIFUL

**Goal**: Polish the user experience

1. **Loading States**
   - Add skeleton loaders
   - Show progress indicators
   - Handle slow APIs gracefully

2. **Error Handling**
   - Friendly error messages
   - Retry mechanisms
   - Fallback data

3. **Real-time Updates**
   - Polling for data changes
   - Optimistic UI updates
   - Cache invalidation

4. **Responsive Design**
   - Mobile-friendly layouts
   - Touch-optimized interactions
   - Accessible keyboard navigation

---

## 🚀 Implementation Plan

### Step 1: API Compatibility Layer (30 min)

**File**: `apps/backend/unified-intelligence-server.js`

```javascript
// Add after all existing routes

// ============================================================
// API V2 COMPATIBILITY LAYER
// ============================================================
console.log('📌 Registering /api/v2 compatibility routes...');

// Map v2 routes to v1 routes
app.post('/api/v2/agent/ask', app._router.stack.find(r =>
  r.route?.path?.includes('/api/ai/chat')
)?.route?.stack[0]?.handle);

app.get('/api/v2/xero/dashboard', async (req, res) => {
  try {
    // TODO: Implement Xero dashboard aggregation
    res.json({
      status: 'coming_soon',
      message: 'Xero dashboard aggregation coming in Phase 2',
      data: {
        total_outstanding: 0,
        overdue_invoices: 0,
        recent_transactions: []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v2/gmail/messages', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    // TODO: Query gmail_messages from Supabase
    res.json({
      status: 'coming_soon',
      messages: [],
      count: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v2/agents/:agentId/status', async (req, res) => {
  res.json({
    status: 'available',
    agent: req.params.agentId,
    version: '1.0.0',
    capabilities: ['compliance', 'opportunities', 'analysis']
  });
});

app.post('/api/v2/agents/:agentId/:action', async (req, res) => {
  res.json({
    status: 'success',
    agent: req.params.agentId,
    action: req.params.action,
    message: `${req.params.action} action completed`
  });
});

console.log('✅ API v2 compatibility layer registered');
```

### Step 2: Add Notion Projects API (30 min)

```javascript
// ============================================================
// NOTION PROJECTS API
// ============================================================
app.get('/api/projects', async (req, res) => {
  if (!notion) {
    return res.status(503).json({ error: 'Notion not configured' });
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_PROJECTS_DATABASE_ID
    });

    const projects = response.results.map(page => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      area: page.properties.Area?.select?.name || '',
      tags: page.properties.Tags?.multi_select?.map(t => t.name) || [],
      coverPhoto: page.cover?.external?.url || page.cover?.file?.url,
      created: page.created_time,
      lastEdited: page.last_edited_time
    }));

    res.json({
      projects,
      count: projects.length,
      cached: false
    });
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  if (!notion) {
    return res.status(503).json({ error: 'Notion not configured' });
  }

  try {
    const page = await notion.pages.retrieve({
      page_id: req.params.id
    });

    res.json({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      // Add more fields as needed
    });
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 3: Test Frontend (15 min)

```bash
# Terminal 1: Backend running
cd apps/backend
node unified-intelligence-server.js
# Should show: ✅ Server running on http://localhost:4000

# Terminal 2: Start frontend
cd apps/frontend
npm run dev
# Should show: Local: http://localhost:5176

# Terminal 3: Test APIs
curl http://localhost:4000/api/health
curl http://localhost:4000/api/projects
curl http://localhost:4000/api/contacts/stats
```

### Step 4: Fix Frontend Errors (30 min)

Open browser to `http://localhost:5176`:
1. Check browser console for errors
2. Fix any component errors one by one
3. Verify each tab loads without crashing
4. Test API calls show loading states

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Frontend loads without console errors
- ✅ All 9 tabs render (even with "coming soon" messages)
- ✅ At least 3 tabs show real data:
  - Dashboard (contact stats)
  - Projects (Notion projects)
  - AI Agent (can chat)

### Phase 2 Complete When:
- ✅ Contact search works (20,398 contacts searchable)
- ✅ Grant discovery works (Tavily research)
- ✅ Project intelligence shows financial data
- ✅ Dashboard shows aggregated metrics

### Phase 3 Complete When:
- ✅ All tabs production-ready
- ✅ Beautiful loading states
- ✅ Error handling tested
- ✅ Mobile responsive

---

## 🌱 Philosophy Alignment

**Beautiful Obsolescence Principles**:
1. ✅ Frontend can be forked independently
2. ✅ All data exportable (Notion, Supabase)
3. ✅ No vendor lock-in (self-hostable)
4. ✅ Community can run without ACT

**Community Benefit Tracking**:
- Show 40% attribution in Project Financial UI
- Track community value in dashboard metrics
- Transparent profit distribution display

---

## 📊 Quick Test Script

Create `test-frontend-integration.sh`:

```bash
#!/bin/bash

echo "🧪 Testing ACT Frontend Integration..."

# Test backend health
echo "\n1️⃣ Testing Backend Health..."
curl -s http://localhost:4000/api/health | jq

# Test contacts API
echo "\n2️⃣ Testing Contacts API..."
curl -s "http://localhost:4000/api/contacts/stats" | jq

# Test projects API
echo "\n3️⃣ Testing Projects API..."
curl -s http://localhost:4000/api/projects | jq '.count'

# Test AI chat
echo "\n4️⃣ Testing AI Chat..."
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you help me with?"}' | jq

# Test research
echo "\n5️⃣ Testing Grant Research..."
curl -s -X POST http://localhost:4000/api/research/grants \
  -H "Content-Type: application/json" \
  -d '{"query": "community agriculture grants Australia"}' | jq '.success'

echo "\n✅ All tests complete!"
```

---

**Next Action**: Implement Phase 1 (API Compatibility Layer) to get frontend loading without errors.
