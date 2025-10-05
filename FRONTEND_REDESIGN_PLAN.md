# ACT Intelligence Platform - Frontend Redesign Plan
## Moving Beyond Money to Complete Intelligence System

**Current Problem**: Frontend is 70% financial tools when the platform is actually a comprehensive relationship, project, and opportunity intelligence system.

**Philosophy Alignment**: The platform should reflect ACT's "Beautiful Obsolescence" - helping communities become independent through intelligence and relationships, not just money management.

---

## 🎯 What We Actually Have (Backend APIs Available)

### ✅ Working APIs Right Now:
1. **Contact Intelligence** - 20,398 LinkedIn contacts with AI search
2. **Gmail Intelligence** - Email analysis and relationship tracking
3. **Notion Projects** - 10 databases of ACT projects and partnerships
4. **Grant Discovery** - Tavily-powered research for funding opportunities
5. **AI Business Agent** - Multi-provider chat (Groq/Anthropic/OpenAI)
6. **Morning Intelligence Brief** - Daily digest of opportunities and actions
7. **Xero Financial Data** - Bank transactions (but holding for Thriday)
8. **Calendar Integration** - Meeting and event tracking
9. **Relationship Intelligence** - Connection strength, follow-up tracking
10. **Automation Engine** - Workflow automation

---

## 🚫 What We're HIDING (Good Decision!)

**Financial tools until Thriday integration**:
- Money Flow Dashboard
- Bookkeeping Checklist
- Receipt Processor
- Financial Reports
- Project Financials

**Why**: You correctly identified we're duplicating work that Thriday will do better. Keep these hidden until we integrate properly.

---

## 🎨 PROPOSED NEW FRONTEND STRUCTURE

### **HOME TAB: Morning Intelligence Brief** 🌅
**What It Shows**:
- Today's priority actions (calls to make, emails to send)
- New grant opportunities discovered overnight
- Relationship health alerts (contacts you haven't touched in 30+ days)
- Project status updates from Notion
- Calendar overview for today

**Backend APIs**:
- `/api/intelligence/morning-brief`
- `/api/dashboard/*`
- `/api/contacts/stats`

---

### **RELATIONSHIPS TAB: Contact Intelligence Hub** 🤝
**What It Shows**:
- Searchable database of 20,398 contacts
- Relationship strength scores
- Last contact dates (from Gmail)
- Organizations and projects linked to each person
- Smart suggestions: "You haven't talked to Jane in 45 days"
- Quick actions: Email, Call, Add Note

**Backend APIs**:
- `/api/contacts/search`
- `/api/contacts/stats`
- `/api/gmail/messages`
- Notion People database

**Why This Matters**: This is your CRM - the heart of community relationship building!

---

### **PROJECTS TAB: ACT Portfolio View** 🏘️
**What It Shows**:
- All ACT projects from Notion (Beautiful Obsolescence status)
- Project timelines and phase tracking
- Linked people, organizations, opportunities per project
- Community ownership progression (0% → 100% independence)
- Story moments and media from each project

**Backend APIs**:
- `/api/projects`
- `/api/projects/:id`
- Notion Projects, Organizations, People databases

**Why This Matters**: This tracks the core ACT mission - helping communities become independent!

---

### **OPPORTUNITIES TAB: Grant & Partnership Discovery** 💎
**What It Shows**:
- AI-discovered grant opportunities (Tavily search)
- Matched to ACT values and current projects
- Application deadlines and requirements
- Success probability scoring
- Draft application assistance from AI agent

**Backend APIs**:
- `/api/research/grants`
- `/api/ai/chat` (for application help)
- Notion Opportunities database

**Why This Matters**: This is how ACT funds the work - finding aligned opportunities!

---

### **CALENDAR TAB: Meeting & Event Intelligence** 📅
**What It Shows**:
- Upcoming meetings with auto-generated prep briefs
- Meeting history by contact/project
- Suggested follow-ups post-meeting
- Community event tracking
- Time allocation by project (are you spending time where it matters?)

**Backend APIs**:
- Google Calendar API (via Gmail service)
- `/api/contacts/search` (for attendee context)
- `/api/projects` (for project context)

**Why This Matters**: Meetings are where relationships deepen and projects move!

---

### **GMAIL TAB: Email Intelligence** 📧
**What It Shows**:
- Recent important emails (AI-categorized)
- Emails requiring response
- Conversation threads by project/contact
- Email sentiment analysis
- Auto-draft responses from AI

**Backend APIs**:
- `/api/v2/gmail/messages`
- `/api/gmail/*` (full sync APIs)
- `/api/ai/chat` (for response drafting)

**Why This Matters**: Email is where most professional relationships live!

---

### **AI AGENT TAB: Business Intelligence Assistant** 🤖
**What It Shows**:
- Chat interface for asking questions
- "Find all contacts working in regenerative agriculture"
- "Draft grant application for $50k water project"
- "Show me people I should reconnect with this week"
- "Analyze my calendar - am I overcommitted?"

**Backend APIs**:
- `/api/v2/agent/ask`
- `/api/ai/chat`
- All other APIs (agent has access to everything)

**Why This Matters**: This makes all the intelligence accessible via natural language!

---

### **RESEARCH TAB: Curious Tractor Deep Dives** 🌱
**What It Shows**:
- Long-form research on topics ACT cares about
- Grant landscape analysis
- Community impact research
- Policy and systems change insights
- Saved research library

**Backend APIs**:
- `/api/research/grants`
- `/api/curious-tractor/*`
- Tavily API for deep research

**Why This Matters**: This is where strategic thinking happens!

---

### **STORIES TAB: Impact Documentation** 📖
**What It Shows**:
- Story moments from projects
- Media library (photos, videos)
- Impact metrics and testimonials
- Story draft assistance from AI
- Publishing tools for social media

**Backend APIs**:
- Notion Stories database
- `/api/projects` (for project stories)
- `/api/ai/chat` (for story polishing)

**Why This Matters**: Stories are how ACT shares learnings and inspires others!

---

### **SETTINGS TAB: Automation & Preferences** ⚙️
**What It Shows**:
- Email/Calendar sync settings
- AI agent preferences
- Notification preferences
- Data export and privacy controls
- Automation workflows

**Backend APIs**:
- `/api/automation/*`
- Integration status endpoints

---

## 🎯 PRIORITY ORDER FOR DEVELOPMENT

### **Week 1: CORE INTELLIGENCE (Must Have)**
1. ✅ Morning Intelligence Brief (home page)
2. ✅ Contact Intelligence Hub (relationships)
3. ✅ AI Agent Chat (always accessible sidebar)

### **Week 2: PROJECT & OPPORTUNITY TRACKING**
4. ✅ ACT Projects Portfolio View
5. ✅ Grant & Opportunity Discovery
6. ✅ Calendar Intelligence

### **Week 3: COMMUNICATION & RESEARCH**
7. ✅ Gmail Intelligence
8. ✅ Curious Tractor Research
9. ✅ Story Documentation

### **Week 4+: ENHANCEMENT**
10. Mobile optimization
11. Automation workflows
12. Advanced analytics

---

## 🚀 What This Achieves

**Aligns with ACT Philosophy**:
- Focus on relationships (people over transactions)
- Support community independence (project ownership tracking)
- Build intelligence for action (grants, opportunities)
- Document and share learnings (stories)

**Uses Existing Backend**:
- Every tab uses APIs we already have
- No new backend development needed
- Just connecting frontend to working intelligence

**Defers Financial Work**:
- Money management waits for Thriday
- No duplicated bookkeeping effort
- Keep financial APIs for when Thriday integration is ready

---

## 📝 NEXT STEPS

1. **Review this plan** - Does this match your vision?
2. **Prioritize tabs** - Which 3-4 tabs do you want FIRST?
3. **Design review** - Should we sketch UI mockups?
4. **Start building** - I can begin frontend components today

**Question for you**: Which tabs are most urgent? My suggestion:
- Morning Brief (daily intelligence)
- Contact Hub (20K contacts need a home!)
- AI Agent (makes everything accessible)
- Projects (tracks your core mission)
