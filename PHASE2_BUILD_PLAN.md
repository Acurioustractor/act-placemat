# Phase 2: Build Intelligence Features
**Status**: Ready to Start
**Foundation**: Clean Phase 1 architecture ✅
**Goal**: Build 4 new intelligence tabs + enhance existing tabs

---

## 🎯 BUILD ORDER (Priority)

### **Week 1: New Intelligence Tabs**

#### **1. Opportunities Tab** 💎 (Highest Priority)
Grant & funding discovery using AI

**Backend** (`/apps/backend/core/src/api/opportunities.js`):
```javascript
// Connect to Notion Opportunities database
// Tavily research integration for grant discovery
// Match scoring algorithm
// Application tracking

Endpoints:
- GET  /api/opportunities
- POST /api/opportunities/discover (Tavily search)
- GET  /api/opportunities/match/:projectId
- POST /api/opportunities/apply
```

**Frontend** (`/apps/frontend/src/components/tabs/Opportunities.tsx`):
```tsx
Features:
- Discovery search interface
- Match scoring display (0-100%)
- Deadline tracking
- Application status
- AI-assisted drafts
```

**Time**: 4-6 hours (2-3 backend, 2-3 frontend)

---

#### **2. Calendar Tab** 📅
Meeting intelligence & prep briefs

**Backend** (`/apps/backend/core/src/api/calendar.js`):
```javascript
// Google Calendar API integration
// Meeting prep brief generator (AI)
// Follow-up tracking
// Time allocation analytics

Endpoints:
- GET  /api/calendar/events
- GET  /api/calendar/prep-brief/:eventId
- POST /api/calendar/follow-up/:eventId
- GET  /api/calendar/analytics
```

**Frontend** (`/apps/frontend/src/components/tabs/Calendar.tsx`):
```tsx
Features:
- Calendar view (day/week/month)
- Meeting prep briefs (AI-generated)
- Attendee context (from Contacts)
- Follow-up suggestions
- Time allocation pie chart
```

**Time**: 5-7 hours (3-4 backend, 2-3 frontend)

---

#### **3. Stories Tab** 📖
Impact documentation & storytelling

**Backend** (`/apps/backend/core/src/api/stories.js`):
```javascript
// Notion Stories database
// Media library integration
// AI story polishing
// Publishing tools

Endpoints:
- GET  /api/stories
- GET  /api/stories/:id
- POST /api/stories/generate (AI-assisted)
- POST /api/stories/publish
- GET  /api/stories/media
```

**Frontend** (`/apps/frontend/src/components/tabs/Stories.tsx`):
```tsx
Features:
- Story card gallery
- Media library
- Impact metrics
- AI story assistant
- Publishing tools (social, PDF export)
```

**Time**: 4-6 hours (2-3 backend, 2-3 frontend)

---

#### **4. Gmail Tab** 📧
Email intelligence (backend exists, need UI)

**Backend**: Already exists! ✅
```
GET  /api/v2/gmail/messages
GET  /api/v2/gmail/contacts
GET  /api/v2/gmail/sync/status
POST /api/v2/gmail/sync/start
```

**Frontend** (`/apps/frontend/src/components/tabs/Gmail.tsx`):
```tsx
Features:
- Important emails (AI-categorized)
- Requires response tracking
- Conversation threads
- Email sentiment
- Auto-draft responses (AI)
```

**Time**: 2-3 hours (frontend only - backend ready!)

---

### **Week 2: Enhance Existing Tabs**

#### **5. Enhance Projects Tab** 🏘️
Full knowledge wiki features

**Add to existing** (`/apps/frontend/src/components/CommunityProjects.tsx`):
```tsx
New Features:
- Project timeline view
- People & organizations linked
- Funding tracking
- Email archive (Gmail threads)
- Calendar events
- Beautiful Obsolescence meter (0-100%)
```

**Backend additions** (`/apps/backend/core/src/api/projects.js`):
```javascript
// Already exists, enhance with:
- GET  /api/projects/:id/timeline
- GET  /api/projects/:id/people
- GET  /api/projects/:id/funding
- GET  /api/projects/:id/emails
- GET  /api/projects/:id/events
```

**Time**: 3-4 hours

---

#### **6. Enhance Contacts Tab** 🤝
Relationship intelligence

**Add to existing** (`/apps/frontend/src/components/ContactIntelligenceHub.tsx`):
```tsx
New Features:
- Communication history (Gmail + Calendar)
- Relationship strength score
- Last contact tracking
- Follow-up suggestions
- Projects involved in
- Organization represented
```

**Backend additions** (`/apps/backend/core/src/api/contacts.js`):
```javascript
// Enhance existing endpoint:
- GET  /api/contacts/:id (full profile)
- GET  /api/contacts/:id/history
- GET  /api/contacts/:id/strength
- GET  /api/contacts/:id/suggestions
```

**Time**: 3-4 hours

---

### **Week 3: Organizations Tab** (Bonus)

#### **7. Organizations Tab** 🏢

**Backend** (`/apps/backend/core/src/api/organizations.js`):
```javascript
// Notion Organizations database
// Xero contacts integration
// Partnership tracking

Endpoints:
- GET  /api/organizations
- GET  /api/organizations/:id
- GET  /api/organizations/search
```

**Frontend** (`/apps/frontend/src/components/tabs/Organizations.tsx`):
```tsx
Features:
- Organization profiles
- People who work there
- Projects collaborated on
- Financial relationship (Xero)
- Communication history
```

**Time**: 4-5 hours

---

## 📊 TOTAL TIME ESTIMATE

**Week 1** (New Tabs):
- Opportunities: 4-6h
- Calendar: 5-7h
- Stories: 4-6h
- Gmail: 2-3h
**Total: 15-22 hours**

**Week 2** (Enhancements):
- Projects: 3-4h
- Contacts: 3-4h
**Total: 6-8 hours**

**Week 3** (Bonus):
- Organizations: 4-5h

**Grand Total: 25-35 hours** (~3-4 weeks part-time)

---

## 🚀 IMMEDIATE NEXT STEP

**Let's start with Opportunities Tab** (highest impact):

1. Build backend API connecting Notion + Tavily
2. Build frontend discovery interface
3. Test grant discovery workflow
4. Deploy and get user feedback

**Ready to build?** Just say:
- "Build Opportunities" → I'll start backend + frontend
- "Show mockup first" → I'll design UI wireframe
- "Different order" → Tell me what to build first

---

## ✅ SUCCESS CRITERIA

After Phase 2, you'll have:
- ✅ 8 intelligence tabs (4 new + 4 existing enhanced)
- ✅ Complete knowledge wiki functionality
- ✅ AI-powered grant discovery
- ✅ Meeting intelligence & prep
- ✅ Impact storytelling tools
- ✅ Email intelligence UI
- ✅ Relationship tracking
- ✅ Organization management

**This becomes the complete ACT Intelligence Platform!** 🎉
