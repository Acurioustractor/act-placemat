# ACT AI Content Generation Strategy

*Leveraging the intelligence layer for communication, strategy, relationships & integrations*

---

## Executive Summary

The ACT Placemat has a sophisticated foundation with **20,398 LinkedIn contacts**, **73+ projects**, **5 AI providers**, and integrations with **Notion, Gmail, Xero, and Supabase**. The newly built content generation system can be extended to automate communication, strengthen relationships, and drive strategic outcomes across the entire ecosystem.

---

## 1. COMMUNICATION POWERUPS

### 1.1 Smart Outreach Sequences

**What exists:** Contact intelligence with collaboration scoring (60-98%), sector classification, project-contact matching.

**AI Generation Opportunity:**

```
Contact Intelligence → AI Content Generation → Personalized Outreach
     ↓                        ↓                       ↓
[Collaboration Score]  [Context-aware template]  [Email/LinkedIn message]
[Sector classification] [Project alignment]       [Follow-up sequence]
[Interaction history]   [Relationship stage]     [Call script]
```

**New Service: `outreachContentService.js`**
- Generate personalized intro emails based on:
  - Shared connections (LinkedIn data)
  - Project alignment (matching algorithm)
  - Sector relevance (youth justice scoring)
  - Interaction history (touchpoint data)
- Create multi-step sequences (Day 0, 3, 7, 14)
- Voice adaptation (formal/casual based on sector)

**Integration Points:**
- Extend `contentGenerationService.js` with outreach templates
- Connect to `contactIntelligenceService.js` for context
- Store sequences in Supabase for tracking
- **Go High Level Integration:** Push generated sequences to GHL for automated delivery

### 1.2 Newsletter Intelligence

**What exists:** `newsletter_subscribers` table, `intelligentNewsletterService.js` (basic).

**AI Generation Opportunity:**
- Weekly digest from:
  - Project updates (Notion)
  - Key emails received (Gmail intelligence)
  - Financial highlights (Xero)
  - Upcoming opportunities (grants pipeline)
- Personalized segments based on subscriber interests
- Auto-generate subject lines with A/B variants

**New Service: `newsletterContentGenerator.js`**
```javascript
generateNewsletterContent({
  dateRange: 'last_7_days',
  sections: ['project_highlights', 'opportunities', 'community_voices'],
  audience: 'external_partners', // or 'internal_team', 'funders'
  tone: 'inspiring' // or 'professional', 'casual'
})
```

### 1.3 Meeting Brief Generator

**What exists:** Calendar sync, `calendarContactIntelligence.js`.

**AI Generation Opportunity:**
- Before each meeting, auto-generate:
  - Participant background (LinkedIn + interaction history)
  - Relevant project context
  - Previous meeting notes
  - Suggested talking points
  - Potential collaboration opportunities

**Integration:**
- Trigger on calendar event (T-1 hour)
- Pull from `linkedin_contacts`, `contact_interactions`, `gmail_messages`
- Generate brief using `contentGenerationService.js`
- Send via email or push to Notion

---

## 2. STRATEGY & INTELLIGENCE

### 2.1 Impact Narrative Generator

**What exists:** Year-in-review content generation, project health scoring.

**AI Generation Opportunity:**
Transform data into compelling stories for:
- **Quarterly impact reports** (automated)
- **Grant applications** (project-specific narratives)
- **Board presentations** (executive summaries)
- **Media releases** (newsworthy achievements)

**New Endpoint: `POST /api/content-generation/impact-narrative`**
```javascript
{
  scope: 'project' | 'portfolio' | 'organization',
  projectIds: ['...'], // optional
  timeframe: 'Q4_2025',
  audience: 'funder' | 'media' | 'board' | 'community',
  format: 'executive_summary' | 'detailed_report' | 'one_pager'
}
```

**Output includes:**
- Key metrics with narrative context
- Success stories with quotes
- Challenges & learnings (honest storytelling)
- Beautiful Obsolescence progress
- Community labor economics impact

### 2.2 Opportunity Intelligence

**What exists:** `opportunities.js`, grant pipeline tracking.

**AI Generation Opportunity:**
- **Auto-discover grants** via web research (Tavily API)
- **Generate eligibility assessments** per project
- **Draft application sections** from project data
- **Deadline reminders** with preparation checklists

**New Service: `grantContentGenerator.js`**
```javascript
generateGrantApplication({
  opportunityId: '...',
  projectId: '...',
  sections: ['project_description', 'impact_statement', 'budget_narrative']
})
```

### 2.3 Direction Scorecard Narrative

**What exists:** Direction intelligence with scores, Beautiful Obsolescence tracking.

**AI Generation Opportunity:**
Turn scorecard into actionable insights:
- "Your finance score dropped 12% because receivables are aging..."
- "Project X is 80% to Landed status, recommend reducing support to..."
- "Three contacts haven't been touched in 60 days who could help with..."

**Enhancement to `directionIntelligenceService.js`:**
Add narrative generation layer that explains scores in plain language with recommended actions.

---

## 3. RELATIONSHIP INTELLIGENCE

### 3.1 Relationship Narrative Generator

**What exists:** 20,398 contacts, interaction tracking, collaboration scoring.

**AI Generation Opportunity:**
For any contact, generate:
- **Relationship timeline narrative** ("We first connected via X, collaborated on Y...")
- **Recommended next touchpoint** with suggested message
- **Introduction draft** to connect two people
- **Thank you note** post-collaboration

**New Endpoint: `POST /api/content-generation/relationship-narrative`**
```javascript
{
  contactId: '...',
  narrativeType: 'timeline' | 'introduction' | 'thank_you' | 'follow_up',
  context: 'project_collaboration' | 'funding_opportunity' | 'general'
}
```

### 3.2 Network Activation Campaigns

**What exists:** Contact segmentation, sector classification.

**AI Generation Opportunity:**
Generate coordinated outreach for specific goals:
- "We need 5 introductions to youth justice policy makers"
- "Find warm paths to these 10 target organizations"
- "Re-engage dormant high-value contacts from 2024"

**System identifies:**
1. Target profile from request
2. Existing contacts who match or can introduce
3. Generates personalized outreach for each path
4. Tracks responses and adjusts

### 3.3 Introduction Broker

**What exists:** `connectionDiscoveryService.js`, project-contact matching.

**AI Generation Opportunity:**
When two parties should meet:
- Generate introduction email for broker to send
- Include context for both parties
- Suggest meeting agenda
- Follow up with both post-introduction

---

## 4. TOOL INTEGRATIONS

### 4.1 Notion → Content Generation → Notion

**Current Flow:**
```
Notion Projects → API → Display in Dashboard
```

**Enhanced Flow:**
```
Notion Projects
    ↓
AI Content Generation
    ↓
├── Generate project briefs → Push to Notion Stories database
├── Generate meeting notes → Push to Notion Actions database
├── Generate impact summaries → Push to Notion Stories database
└── Generate next steps → Push to Notion Actions database
```

**New Service: `notionContentSync.js`**
- Watch for triggers (new project, completed action, milestone)
- Generate appropriate content
- Push to correct Notion database
- Bi-directional: Notion can request generation via property

### 4.2 Go High Level Integration

**GHL is a CRM/Marketing Automation platform perfect for:**
- Multi-channel outreach (email, SMS, social)
- Automated follow-up sequences
- Pipeline management
- Landing pages & forms

**Integration Architecture:**
```
ACT Intelligence Layer
    ↓
Content Generation Service
    ↓
GHL API Integration
    ↓
├── Push contacts with enrichment data
├── Push generated email sequences
├── Trigger workflows from project events
└── Sync interaction data back
```

**New Service: `goHighLevelIntegration.js`**
```javascript
// Push contact with AI enrichment
pushContactToGHL({
  contactId: '...',
  enrichmentData: { collaboration_score, sector, project_matches },
  sequences: ['intro_sequence', 'nurture_sequence']
})

// Push campaign with generated content
pushCampaignToGHL({
  name: 'Q1 2025 Partner Outreach',
  audience: 'high_value_dormant',
  sequence: [
    { day: 0, channel: 'email', content: generatedIntroEmail },
    { day: 3, channel: 'sms', content: generatedFollowUpSMS },
    { day: 7, channel: 'email', content: generatedValueEmail }
  ]
})
```

### 4.3 Xero → Financial Storytelling

**Current Flow:**
```
Xero → Supabase → Dashboard metrics
```

**Enhanced Flow:**
```
Xero Financial Data
    ↓
AI Content Generation
    ↓
├── Monthly financial narrative for board
├── Project cost allocation explanations
├── Grant acquittal reports
└── Cash flow forecasting narratives
```

**New Endpoint: `POST /api/content-generation/financial-narrative`**
```javascript
{
  reportType: 'monthly_summary' | 'project_costs' | 'grant_acquittal',
  projectIds: ['...'], // optional
  timeframe: 'last_month',
  audience: 'board' | 'funder' | 'team'
}
```

### 4.4 Gmail → Smart Responses

**Current Flow:**
```
Gmail → Sync → Email Intelligence → Dashboard display
```

**Enhanced Flow:**
```
Gmail Inbox
    ↓
Email Intelligence (intent, urgency, actions)
    ↓
AI Content Generation
    ↓
├── Generate smart reply drafts
├── Generate action items for Notion
├── Generate meeting brief if calendar invite
└── Generate follow-up reminders
```

**Enhancement to `emailIntelligenceService.js`:**
```javascript
generateSmartReply({
  messageId: '...',
  replyType: 'acknowledge' | 'accept' | 'decline' | 'defer' | 'custom',
  tone: 'professional' | 'warm' | 'brief',
  includeContext: true // adds project/relationship context
})
```

---

## 5. IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (This Week)

| Feature | Effort | Impact | Integration Point |
|---------|--------|--------|-------------------|
| Meeting brief generator | Low | High | Calendar + AI |
| Smart reply drafts | Low | High | Email intelligence |
| Contact relationship narratives | Low | Medium | Contact intelligence |

### Phase 2: High Value (Next 2 Weeks)

| Feature | Effort | Impact | Integration Point |
|---------|--------|--------|-------------------|
| Outreach sequence generator | Medium | High | Contact + Content gen |
| Impact narrative generator | Medium | High | Projects + Content gen |
| Notion bi-directional sync | Medium | High | Notion + Content gen |

### Phase 3: Platform Expansion (Following Month)

| Feature | Effort | Impact | Integration Point |
|---------|--------|--------|-------------------|
| Go High Level integration | High | Very High | New integration |
| Newsletter content generator | Medium | Medium | Newsletter + Content |
| Grant application generator | High | High | Opportunities + Content |

---

## 6. API STRUCTURE PROPOSAL

```
/api/content-generation/
├── /status                    ← AI provider health (existing)
├── /project-story             ← Year-in-review (existing)
├── /timeline-description      ← Entry enrichment (existing)
├── /timeline-ideas            ← Suggestions (existing)
├── /bulk-projects             ← Batch generation (existing)
│
├── /outreach                  ← NEW: Personalized outreach
│   ├── POST /intro            ← Introduction email
│   ├── POST /follow-up        ← Follow-up sequence
│   └── POST /sequence         ← Multi-step campaign
│
├── /relationship              ← NEW: Relationship narratives
│   ├── POST /timeline         ← Relationship history
│   ├── POST /introduction     ← Broker intro email
│   └── POST /thank-you        ← Thank you note
│
├── /impact                    ← NEW: Impact storytelling
│   ├── POST /quarterly        ← Quarterly report
│   ├── POST /project          ← Project impact summary
│   └── POST /media-release    ← Press release
│
├── /meeting                   ← NEW: Meeting intelligence
│   ├── POST /brief            ← Pre-meeting brief
│   └── POST /summary          ← Post-meeting summary
│
├── /financial                 ← NEW: Financial narratives
│   ├── POST /monthly          ← Monthly summary
│   └── POST /grant-acquittal  ← Grant reporting
│
└── /newsletter                ← NEW: Newsletter content
    └── POST /digest           ← Weekly digest
```

---

## 7. CONTENT GENERATION TEMPLATES

### ACT Voice Guide (Extend existing)

```javascript
const ACT_TEMPLATES = {
  outreach_intro: {
    tone: 'warm, professional, community-focused',
    structure: 'connection → shared interest → value proposition → soft ask',
    avoid: 'corporate jargon, hard sells, assumptions',
    include: 'specific project reference, mutual connection, clear next step'
  },

  impact_narrative: {
    tone: 'honest, hopeful, grounded',
    structure: 'challenge → approach → outcome → learning → future',
    avoid: 'savior language, exaggeration, jargon',
    include: 'specific numbers, direct quotes, Beautiful Obsolescence lens'
  },

  relationship_timeline: {
    tone: 'appreciative, specific, forward-looking',
    structure: 'first touch → key moments → current state → future potential',
    avoid: 'generic praise, forgotten details, assumptions',
    include: 'specific dates, project names, shared achievements'
  },

  meeting_brief: {
    tone: 'efficient, contextual, actionable',
    structure: 'who → context → goals → talking points → asks',
    avoid: 'unnecessary detail, assumptions, missing info',
    include: 'recent interactions, relevant projects, suggested questions'
  }
};
```

---

## 8. DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────┤
│   NOTION    │   GMAIL     │   XERO      │  LINKEDIN   │  CALENDAR  │
│ 73 projects │ Messages    │ Financials  │ 20K contacts│  Events    │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬─────┘
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE INTELLIGENCE LAYER                      │
│  Projects │ Contacts │ Interactions │ Opportunities │ Briefings     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI CONTENT GENERATION ENGINE                      │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │   Context    │ │   Template   │ │   Multi-AI   │                │
│  │   Builder    │ │   Selector   │ │   Provider   │                │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│                   ┌──────────────┐                                  │
│                   │   Generated  │                                  │
│                   │   Content    │                                  │
│                   └──────┬───────┘                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   NOTION        │ │ GO HIGH     │ │   EMAIL         │
│   Stories DB    │ │ LEVEL       │ │   Drafts        │
│   Actions DB    │ │ Campaigns   │ │   Newsletters   │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

---

## 9. SUCCESS METRICS

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to draft outreach email | 15 min | 2 min | User timing |
| Contact engagement rate | Unknown | Track | GHL metrics |
| Newsletter open rate | Unknown | 35%+ | GHL metrics |
| Meeting prep time | 30 min | 5 min | User timing |
| Grant application drafting | Days | Hours | Project tracking |
| Impact report creation | Week | Day | Project tracking |

---

## 10. NEXT STEPS

1. **Today:** Start with meeting brief generator (high value, low effort)
2. **This week:** Add smart reply drafts to email intelligence
3. **Next week:** Build outreach sequence generator
4. **Following:** Go High Level integration exploration

---

*This strategy document should be updated as new capabilities are built and lessons are learned.*
