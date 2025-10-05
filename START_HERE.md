# 🚜 ACT Unified Intelligence Platform - Quick Start Guide

**Date**: October 5, 2025
**Status**: ✅ Ready for Testing
**Philosophy**: Beautiful Obsolescence

---

## 🚀 Quick Start (5 minutes)

### Step 1: Start Backend (Terminal 1)

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
node server.js
```

**Expected output**:
```
🚜 ACT STABLE DATA SERVICE
✅ Server: http://localhost:4000
✅ Notion: Connected
✅ Database: 177ebcf981cf80dd9514f1ec32f3314c
🔄 Cache: 5 minutes (no spam)
```

### Step 2: Start Frontend (Terminal 2)

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/frontend"
npm run dev
```

**Expected output**:
```
VITE ready in XXX ms
Local: http://localhost:5176/
```

### Step 3: Open Browser

Navigate to: **http://localhost:5175**

You should see 4 intelligence tabs:
- 🌅 Morning Brief - Daily intelligence digest
- 🤝 Contacts - 20K relationship network
- 🏘️ Projects - Portfolio & Beautiful Obsolescence tracking
- 🌱 Research - Curious Tractor deep dives

---

## ✅ What's Working

### Backend APIs (Port 4000)

**Working Endpoints**:
- `GET /api/health` - Server health (20,398 contacts verified)
- `GET /api/projects` - Notion projects (55+ projects)
- `GET /api/contacts/search?query=ben` - Contact search
- `GET /api/contacts/stats` - Contact statistics
- `POST /api/ai/chat` - AI business agent
- `POST /api/research/grants` - Grant discovery (Tavily + Groq)
- `GET /api/v2/xero/dashboard` - Xero financial data ($61,019.87 GST)
- `GET /api/v2/gmail/messages` - Gmail intelligence
- `GET /api/v2/agents/*/status` - Agent status

**Data Sources**:
- ✅ Notion (10 databases: Projects, People, Organizations, etc.)
- ✅ Supabase (20,398 LinkedIn contacts + cadence metrics)
- ✅ Xero (Financial data, BAS ready)
- ✅ Gmail (Email intelligence)
- ✅ Groq (FREE unlimited AI)
- ✅ Tavily (FREE 1000 searches/month)

### Frontend Components

**9 Active Tabs**:
1. **Autopilot** - Automated business operations
2. **Bookkeeping** - Financial checklist
3. **Money Flow** - Cash flow dashboard
4. **Financial Reports** - P&L, Balance Sheet
5. **Receipts** - Receipt processing
6. **Dashboard** - Aggregated metrics
7. **Projects** - Notion projects gallery
8. **AI Agent** - Chat with business AI
9. **Curious Tractor** - Deep research tool

---

## 🧪 Test APIs Manually

```bash
# Health check
curl http://localhost:4000/api/health | jq

# List projects (55+ from Notion)
curl http://localhost:4000/api/projects | jq '.count'

# Contact search (20,398 contacts)
curl "http://localhost:4000/api/contacts/search?query=ben&limit=5" | jq

# Xero dashboard (real BAS data)
curl http://localhost:4000/api/v2/xero/dashboard | jq

# AI chat
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you help me with?"}' | jq

# Grant research
curl -X POST http://localhost:4000/api/research/grants \
  -H "Content-Type: application/json" \
  -d '{"query": "community agriculture grants Australia"}' | jq
```

---

## 📋 Architecture

```
┌────────────────────────────────────────┐
│  NOTION (Source of Truth)              │
│  • 55+ Projects                        │
│  • People, Organizations, Opportunities│
└──────────────┬─────────────────────────┘
               │
               │ Sync
               ▼
┌────────────────────────────────────────┐
│  SUPABASE (Intelligence Cache)         │
│  • 20,398 LinkedIn Contacts            │
│  • Contact Cadence Metrics             │
│  • Gmail Messages                      │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│  UNIFIED INTELLIGENCE SERVER (4000)    │
│  • Contact Intelligence                │
│  • Grant Discovery (Tavily + Groq)     │
│  • AI Business Agent                   │
│  • Financial Intelligence (Xero)       │
│  • V2 API Compatibility Layer          │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│  REACT FRONTEND (5176)                 │
│  • 9 Working Tabs                      │
│  • TailwindCSS + Vite                  │
└────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Port 4000 already in use

```bash
# Kill all node processes
pkill -9 node

# Restart backend
cd apps/backend
node unified-intelligence-server.js
```

### Frontend not connecting to backend

**Check**: Frontend should use `http://localhost:4000`

All components updated to port 4000 (not 4001):
- ✅ MoneyFlowDashboard.tsx
- ✅ BusinessAgentDashboard.tsx
- ✅ ProjectFinancials.tsx
- ✅ AIBusinessAgent.tsx
- ✅ BusinessAutopilot.tsx
- ✅ EnhancedDashboard.tsx
- ✅ FinancialReports.tsx
- ✅ RealCashFlow.tsx

### Notion/Supabase not connecting

**Check environment variables** (/.env):
```bash
NOTION_TOKEN=ntn_633000104472...
SUPABASE_URL=https://tednluwflfhxyucgwigh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

All configured in **root `.env`** file (not `apps/backend/.env`)

---

## 📚 Documentation

- **[FRONTEND_TESTING_PLAN.md](FRONTEND_TESTING_PLAN.md)** - Complete testing guide
- **[NOTION_SUPABASE_SUMMARY.md](NOTION_SUPABASE_SUMMARY.md)** - Data architecture
- **[WEEK_1_PROGRESS.md](apps/backend/WEEK_1_PROGRESS.md)** - Implementation progress

---

## 🌱 Philosophy: Beautiful Obsolescence

This platform is built to become unnecessary:
- ✅ Open source (MIT license)
- ✅ Self-hostable ($0/month option)
- ✅ Community can fork and own
- ✅ No vendor lock-in
- ✅ 40% community benefit tracked

**Goal**: Build tools communities can own, then gracefully exit when they don't need us anymore.

---

## 🎯 What's Next

### Immediate (Working Now):
- ✅ Backend unified on port 4000
- ✅ Frontend connects successfully
- ✅ 9 tabs loading
- ✅ Real data flowing (Notion, Supabase, Xero)

### Phase 2 (Enhance with Real Intelligence):
- [ ] Link Notion projects to financial data
- [ ] Add grant opportunity discovery UI
- [ ] Implement morning intelligence brief
- [ ] Track 40% community benefit attribution

### Phase 3 (Polish):
- [ ] Beautiful loading states
- [ ] Error handling & retries
- [ ] Mobile responsive design
- [ ] Real-time updates

---

**Ready to test!** Open http://localhost:5176 after starting both servers.
