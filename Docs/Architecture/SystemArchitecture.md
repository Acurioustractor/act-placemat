# 🗺️ ACT Platform - Complete System Architecture Map

**Quick reference for understanding how everything connects**

---

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contact Intelligence Hub    AI Business Agent                 │
│  http://localhost:4000        http://localhost:5174            │
│  ├─ Search 20k contacts      ├─ Financial intelligence         │
│  ├─ AI enrichment            ├─ Strategic planning             │
│  ├─ Project matching         ├─ Deep research (Perplexica)     │
│  └─ Email drafting           └─ Multi-modal AI                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contact Intelligence Hub API (Port 4000)                       │
│  ├─ GET  /api/contacts/search                                  │
│  ├─ POST /api/contacts/:id/enrich                              │
│  ├─ POST /api/contacts/:id/draft-email                         │
│  ├─ GET  /api/projects/:name/match-contacts                    │
│  └─ GET  /api/stats                                             │
│                                                                 │
│  Stable Data Server (Port 4001) - CAN START                    │
│  ├─ POST /api/events/xero/webhooks                             │
│  ├─ GET  /api/integration-monitoring/*                         │
│  ├─ GET  /api/gmail-intelligence/*                             │
│  └─ GET  /api/unified-business-intelligence/*                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AI SERVICES LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Local AI (100% Free, Privacy-First)                           │
│  ├─ Ollama (localhost:11434) ✅ RUNNING                        │
│  │  ├─ llama3.1:8b (fast, 8GB RAM)                            │
│  │  └─ nomic-embed-text (embeddings)                          │
│  └─ Perplexica (localhost:3000) - Research                     │
│                                                                 │
│  Cloud AI (High Quality)                                        │
│  ├─ Anthropic Claude ✅ CONFIGURED                             │
│  │  └─ claude-3-5-sonnet-20241022                             │
│  ├─ Groq ⚠️ NEEDS KEY (FREE, ultra-fast)                      │
│  ├─ Tavily ⚠️ NEEDS KEY (1000 searches/month FREE)            │
│  └─ OpenAI ⚠️ OPTIONAL                                         │
│                                                                 │
│  AI Service Modules (READY TO USE)                             │
│  ├─ multiProviderAI.js - Auto-fallback AI                      │
│  ├─ freeResearchAI.js - Free web research                      │
│  ├─ intelligenceAI.js - Financial intelligence                 │
│  └─ aiPatternRecognitionEngine.js - Pattern detection          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DATA LAYER (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  linkedin_contacts (20,398 records)                             │
│  ├─ 276 with email addresses                                   │
│  ├─ 20,122 need enrichment                                     │
│  └─ Fields: full_name, email, company, position, etc.          │
│                                                                 │
│  contact_cadence_metrics (52 records)                           │
│  ├─ Interaction frequency analysis                             │
│  └─ Next contact due calculations                              │
│                                                                 │
│  project_support_graph (22 records)                             │
│  ├─ Project collaboration networks                             │
│  └─ Supporter overlap analysis                                 │
│                                                                 │
│  community_emails (0 records) ⚠️ NEEDS GMAIL SYNC             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  NOTION LAYER (Action)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  People (115 records)                                           │
│  Communications Dashboard                                       │
│  Projects (22 active)                                           │
│  Actions/Tasks                                                  │
│                                                                 │
│  Sync Service ✅ OPERATIONAL                                   │
│  └─ Daily sync at 6:00 AM                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 File Structure

### Core Backend Services

```
apps/backend/
├── contact-intelligence-hub.js ✅ ACTIVE (Port 4000)
│   └─ Main intelligence interface
│
├── stable-real-data-server.js ⚠️ CAN START (Port 4001)
│   └─ Financial + integration monitoring
│
└── core/src/
    ├── services/
    │   ├── multiProviderAI.js ✅ READY
    │   │   └─ Auto-fallback AI (6 providers)
    │   │
    │   ├── freeResearchAI.js ✅ READY
    │   │   └─ Free web research + AI
    │   │
    │   ├── supabaseNotionSync.js ✅ ACTIVE
    │   │   └─ Bidirectional sync service
    │   │
    │   ├── intelligenceAI.js
    │   ├── aiPatternRecognitionEngine.js
    │   ├── gmailIntelligenceService.js
    │   └── ... (20+ AI services)
    │
    └── scripts/
        └── daily-sync.js ✅ RUNNING (cron 6am)
```

### Frontend

```
apps/frontend/
└── src/
    ├── App.tsx
    ├── main.tsx
    └── ... (React app structure)

apps/backend/public/
└── contact-intelligence-hub.html ✅ ACTIVE
    └─ Interactive dashboard
```

### Documentation

```
.taskmaster/docs/ACTIVE_STRATEGY/
├── FULL_PLATFORM_VISION.md ✅ NEW
│   └─ Complete 5-phase roadmap
│
├── CURRENT_FUNCTIONS_INVENTORY.md ✅ NEW
│   └─ All APIs + functions documented
│
└── AI_INFRASTRUCTURE_COMPLETE_GUIDE.md ✅ NEW
    └─ How to connect AI to Contact Hub
```

---

## 🔗 How Systems Connect

### Contact Intelligence Flow

```
1. User searches contacts
   └─> contact-intelligence-hub.js
       └─> Supabase: linkedin_contacts table
           └─> Returns 20,398 contacts

2. User clicks "Enrich" button
   └─> POST /api/contacts/:id/enrich
       └─> freeResearchAI.js
           ├─> DuckDuckGo/Tavily (web search)
           └─> multiProviderAI.js
               └─> Claude/Groq (AI analysis)
                   └─> Returns: email, background, news

3. User clicks "Match Projects"
   └─> GET /api/projects/:name/match-contacts
       └─> multiProviderAI.js
           └─> Claude analyzes each contact
               └─> Returns: fit scores + reasoning

4. User clicks "Draft Email"
   └─> POST /api/contacts/:id/draft-email
       └─> multiProviderAI.js
           └─> Claude generates personalized email
               └─> Returns: 3 variants + timing
```

### Notion Sync Flow

```
1. Daily at 6:00 AM
   └─> daily-sync.js (cron)
       └─> supabaseNotionSync.js
           ├─> Get contact_cadence_metrics from Supabase
           ├─> Get People from Notion
           ├─> Match by email
           └─> Update Communications Dashboard
               └─> Shows who to contact today
```

### AI Provider Selection

```
1. User triggers AI action
   └─> multiProviderAI.js
       ├─> Check: Anthropic available? ✅
       │   └─> Use Claude (best quality)
       │
       ├─> If Anthropic fails:
       │   └─> Check: Groq available?
       │       └─> Use Groq (ultra-fast)
       │
       └─> If all cloud fails:
           └─> Use Ollama (local, private)
```

---

## 🎯 Active Systems Status

| System | Status | URL | Purpose |
|--------|--------|-----|---------|
| **Contact Intelligence Hub** | ✅ RUNNING | http://localhost:4000 | Main contact interface |
| **Ollama** | ✅ RUNNING | http://localhost:11434 | Local AI (llama3.1:8b) |
| **Anthropic Claude** | ✅ CONFIGURED | API | Best quality AI |
| **Daily Sync** | ✅ AUTOMATED | Cron 6am | Notion ↔ Supabase sync |
| **Stable Data Server** | ⚠️ CAN START | Port 4001 | Financial + integrations |
| **Perplexica** | ⚠️ OPTIONAL | Port 3000 | Research (if running) |
| **Groq** | ⚠️ NEEDS KEY | API | FREE ultra-fast AI |
| **Tavily** | ⚠️ NEEDS KEY | API | FREE research (1k/month) |

---

## 🚀 Quick Commands

### Start Systems

```bash
# Contact Intelligence Hub (MAIN)
cd /Users/benknight/Code/ACT\ Placemat/apps/backend
node contact-intelligence-hub.js

# Stable Data Server (optional)
node stable-real-data-server.js

# Check Ollama status
curl http://localhost:11434/api/tags
```

### Test APIs

```bash
# Search contacts
curl http://localhost:4000/api/contacts/search?hasEmail=true&limit=5

# Get stats
curl http://localhost:4000/api/stats

# Enrich contact
curl -X POST http://localhost:4000/api/contacts/30940/enrich

# Draft email
curl -X POST http://localhost:4000/api/contacts/30940/draft-email \
  -H "Content-Type: application/json" \
  -d '{"project_name": "Test Project"}'
```

### Check Background Processes

```bash
# See what's running
lsof -i :4000
lsof -i :4001
lsof -i :11434

# Kill processes
pkill -f "contact-intelligence-hub"
pkill -f "stable-real-data-server"
```

---

## 📊 Data Flow Summary

```
Data Sources
├─ LinkedIn (20,398 contacts)
├─ Gmail (needs sync for emails)
├─ Xero (financial data)
└─ Notion (115 people, 22 projects)
        ↓
Intelligence Layer (Supabase)
├─ Contact enrichment
├─ Cadence calculation
├─ Project network analysis
└─ AI pattern recognition
        ↓
AI Processing
├─ Research: Tavily/DuckDuckGo
├─ Analysis: Claude/Groq/Ollama
└─ Embeddings: Ollama nomic-embed-text
        ↓
Action Layer (Notion + Dashboards)
├─ Communications Dashboard
├─ Project management
├─ Task automation
└─ Daily briefings
```

---

## 🎓 Key Learnings

### What You Already Have (Amazing!)

1. **20,398 contacts** - Massive network to leverage
2. **Multiple AI providers** - Auto-fallback for reliability
3. **Local AI** - Privacy-first with Ollama
4. **Complete services** - multiProviderAI.js + freeResearchAI.js ready
5. **Smart architecture** - Supabase (intelligence) ↔ Notion (action)

### What Needs Immediate Attention

1. **Add Groq API key** - FREE, 10x faster than GPT-4
2. **Add Tavily API key** - FREE 1k research queries/month
3. **Wire AI into Contact Hub** - Replace templates with real AI
4. **Run Gmail sync** - Get 10,000+ emails (1.4% → 50% coverage)

### The Big Opportunity

You're sitting on a **goldmine of data** (20k contacts, 22 projects) with **world-class AI infrastructure** already built.

**Just need to connect the dots!**

---

**Last Updated**: October 4, 2025
**Next Step**: Add Groq + Tavily keys, update contact-intelligence-hub.js with real AI
**Time to Full AI**: ~30 minutes of code integration
