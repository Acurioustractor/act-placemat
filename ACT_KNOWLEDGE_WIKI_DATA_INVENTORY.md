# ACT Knowledge Wiki - Complete Data Inventory
## Building ACT's Organizational Memory & Searchable Intelligence System

**Philosophy**: Not buttons to "run research" - a living, searchable knowledge base that grows with every project, relationship, and learning. Think Notion + Wikipedia + GitHub Wiki for ACT's entire existence.

---

## 📊 AVAILABLE DATA SOURCES

### 1. NOTION DATABASES (10 Databases - Source of Truth)

**From .env file:**
```
NOTION_PROJECTS_DATABASE_ID=177ebcf981cf80dd9514f1ec32f3314c
NOTION_PEOPLE_DATABASE_ID=177ebcf981cf80b4857cc23bbf63c13c
NOTION_ORGANIZATIONS_DATABASE_ID=177ebcf981cf807c8e76c12d8a02b0bd
NOTION_OPPORTUNITIES_DATABASE_ID=177ebcf981cf8078bf0fc967385ca21d
NOTION_STORIES_DATABASE_ID=177ebcf981cf809e852dd17155d72e0d
NOTION_EVENTS_DATABASE_ID=177ebcf981cf804f8745ef52f0fae662
NOTION_TASKS_DATABASE_ID=177ebcf981cf8031b21fcd42e77c2532
NOTION_NOTES_DATABASE_ID=177ebcf981cf80eab5f4d2a4c1c54405
NOTION_MEDIA_DATABASE_ID=177ebcf981cf80c2888afc8b8c45d2b3
NOTION_TAGS_DATABASE_ID=177ebcf981cf8079bc29c90e6117f73f
```

**What each contains:**

#### Projects Database
- **Fields**: Name, Status, Area, Tags, Philosophy, Cover Photo, Created/Edited timestamps
- **Content**: Every ACT project with Beautiful Obsolescence tracking
- **Links**: People involved, Organizations partnered, Stories generated, Media created
- **Use Case**: Project case studies, timeline views, portfolio management

#### People Database
- **Fields**: Name, Email, Organization, Position, Location, Interests, Expertise, Notes
- **Links**: Projects they're part of, Organizations they represent, Opportunities they suggested
- **Use Case**: Relationship intelligence, contact context, collaboration history

#### Organizations Database
- **Fields**: Name, Type, Location, Focus Areas, Contact Info, Notes
- **Links**: People who work there, Projects collaborated on, Opportunities from them
- **Use Case**: Partnership tracking, institutional memory, collaboration patterns

#### Opportunities Database (Grants, Funding, Partnerships)
- **Fields**: Title, Source, Deadline, Amount, Status, Match Score, Requirements
- **Links**: Projects that applied, People who suggested, Organizations offering
- **Use Case**: Grant library, application tracking, success patterns

#### Stories Database
- **Fields**: Title, Type, Project, Date, Media, Content, Publishing Status
- **Links**: Projects featured, People quoted, Organizations mentioned, Media assets
- **Use Case**: Impact documentation, case study generation, transparency

#### Events Database
- **Fields**: Name, Date, Type, Location, Attendees, Outcomes, Notes
- **Links**: Projects discussed, People attending, Organizations hosting
- **Use Case**: Meeting intelligence, collaboration timeline, relationship history

#### Tasks Database
- **Fields**: Description, Status, Priority, Assignee, Project, Due Date
- **Links**: Projects, People responsible, Opportunities related
- **Use Case**: Action tracking, project management, accountability

#### Notes Database
- **Fields**: Title, Content, Date, Tags, Type, Privacy Level
- **Links**: Projects, People, Organizations, Opportunities
- **Use Case**: Internal learnings, meeting notes, research findings

#### Media Database
- **Fields**: Title, Type (Photo/Video/Document), Date, Project, Caption, File URL
- **Links**: Projects, Stories, Events, People
- **Use Case**: Media library, story assets, visual documentation

#### Tags Database
- **Fields**: Name, Category, Description, Color
- **Links**: Used across all other databases for categorization
- **Use Case**: Taxonomy, filtering, pattern recognition

---

### 2. SUPABASE DATABASES (PostgreSQL - Cached & Operational Data)

**Available Tables:**

#### linkedin_contacts (20,398 contacts)
```sql
- id, full_name, email_address
- current_company, current_position
- location, industry
- profile_url, connection_date
```
**Use Case**: CRM, relationship intelligence, network analysis

#### gmail_messages
```sql
- id, message_id, thread_id
- from, to, cc, bcc
- subject, snippet, body
- date, labels, attachments
```
**Use Case**: Communication history, relationship context, email intelligence

#### gmail_threads
```sql
- id, thread_id, subject
- participants, message_count
- last_message_date, labels
```
**Use Case**: Conversation tracking, relationship frequency

#### xero_bank_transactions (1000+ transactions)
```sql
- xero_id, bank_account_id, bank_account_name
- contact_name, type (RECEIVE/SPEND)
- date, reference, total, status
```
**Use Case**: Financial patterns, project costs, organizational spending

#### xero_contacts
```sql
- xero_id, name, email
- phone, contact_status
- is_customer, is_supplier
```
**Use Case**: Vendor relationships, customer tracking

#### xero_invoices
```sql
- xero_id, contact_id, invoice_number
- date, due_date, total, status
- line_items (JSON)
```
**Use Case**: Revenue tracking, payment patterns

---

### 3. GOOGLE CALENDAR (via Gmail API)

**Available Data:**
```
- Events, meetings, deadlines
- Attendees, locations
- Meeting notes, outcomes
- Recurring patterns
```
**Use Case**: Time allocation analysis, meeting intelligence, relationship frequency

---

### 4. GMAIL (Full Email Archive)

**Available via Gmail API:**
```
- Complete email history
- Attachments, documents shared
- Communication patterns by contact
- Email sentiment over time
```
**Use Case**: Relationship timeline, document discovery, communication intelligence

---

### 5. XERO ACCOUNTING

**Available Data:**
```
- Bank accounts, transactions
- Invoices, bills, payments
- Contacts (customers, suppliers)
- Tax tracking (GST/BAS)
- Profit & loss reports
```
**Use Case**: Project financials, organizational health, grant spending tracking

---

### 6. STRATEGY DOCUMENTS (Filesystem)

**Location**: `/Users/benknight/Code/ACT Placemat/Docs/Strategy/`

**Files Available:**
- ACT_MASTER_PHILOSOPHY_2025.md (Core philosophy)
- ACT_LOCKED_VALUES_AND_ACCOUNTABILITY_FRAMEWORK.md (Values)
- NETWORK_CRM_ROADMAP.md (Relationship approach)
- MASTER_STRATEGY_10M_PHILANTHROPIC_MEETING.md (Big goals)
- ACT_DATA_PHILOSOPHY_INTEGRATION.md (Data sovereignty)
- ACT_DREAM_SYSTEM_VISION.md (Vision)
- PHILOSOPHY.md, ROADMAP.md, WORKSPACE_FOCUS.md
- Business/, Community/, Financial/, Global/ folders

**Use Case**: Philosophical grounding, methodology documentation, strategic context

---

### 7. CODE REPOSITORY (Git History)

**Available via Git:**
```bash
- Commit history (who built what, when)
- Code comments, documentation
- Issue tracking, PR discussions
- Technical learnings, architecture decisions
```
**Use Case**: Technical case studies, development patterns, learnings

---

## 🎯 KNOWLEDGE WIKI STRUCTURE

### Main Categories:

#### 1. 🏘️ PROJECTS
**Data from**: Notion Projects + People + Organizations + Stories + Media + Financial data
**Each project shows**:
- Overview, mission, Beautiful Obsolescence status
- Timeline (events, milestones, decisions)
- People involved (roles, contributions)
- Organizations partnered (relationships, agreements)
- Funding secured (opportunities applied, granted, spent)
- Stories published (impact documentation)
- Media gallery (photos, videos, documents)
- Learnings (what worked, what didn't, case study)
- Financial summary (Xero transactions tagged to project)
- Email archive (Gmail threads about this project)
- Calendar events (meetings, check-ins, launches)

**Search by**: Name, status, area, tags, philosophy, people, organization, date range

#### 2. 🤝 PEOPLE & RELATIONSHIPS
**Data from**: Notion People + LinkedIn Contacts + Gmail + Calendar + Events
**Each person shows**:
- Contact info, organization, position
- Projects they're part of (with roles)
- Organizations they represent
- Opportunities they suggested
- Stories they're featured in
- Communication history (emails, meetings)
- Relationship strength (email frequency, meeting cadence)
- Last contact date, follow-up suggestions
- Interests, expertise, notes

**Search by**: Name, organization, industry, location, project, expertise

#### 3. 🏢 ORGANIZATIONS
**Data from**: Notion Organizations + Xero Contacts + People + Projects
**Each organization shows**:
- Contact info, type, focus areas
- People who work there
- Projects collaborated on (history, outcomes)
- Opportunities offered (grants, partnerships)
- Financial relationship (Xero invoices, payments)
- Communication history
- Partnership patterns, learnings

**Search by**: Name, type, location, focus area, project involvement

#### 4. 💎 OPPORTUNITIES (Grants & Funding)
**Data from**: Notion Opportunities + Xero Invoices + Projects
**Each opportunity shows**:
- Title, source, amount, deadline
- Requirements, eligibility criteria
- Match score (based on ACT projects)
- Application status, outcome
- Projects that applied
- Success/failure learnings
- Similar opportunities found
- Contact at funding organization

**Library features**:
- Search by amount, deadline, type, status
- Filter by eligibility (auto-match to ACT projects)
- Application template library
- Success rate analytics

#### 5. 🌱 PHILOSOPHY & METHODS
**Data from**: Strategy docs + Notion Notes + Project learnings
**Contains**:
- Beautiful Obsolescence framework
- Community-led transformation methodology
- Values & accountability framework
- Data sovereignty protocols
- Indigenous engagement guidelines
- Case studies organized by method
- Learnings from each project approach

**Search by**: Method, value, project example, outcome type

#### 6. 📖 STORIES & IMPACT
**Data from**: Notion Stories + Media + Projects + Events
**Each story shows**:
- Title, content, publishing status
- Project featured, people quoted
- Media assets (photos, videos)
- Impact metrics, outcomes
- Where published (social, website, reports)
- Learnings documented

**Gallery features**:
- Browse by project, date, type
- Media library search
- Story template generator
- Export for transparency (case studies)

#### 7. 📅 TIMELINE & EVENTS
**Data from**: Calendar + Notion Events + Gmail + Projects
**Shows**:
- All events chronologically
- Meetings by project, person, organization
- Outcomes, decisions made
- Follow-ups scheduled
- Time allocation analytics (where ACT spends time)

#### 8. 💰 FINANCIALS & RESOURCES
**Data from**: Xero + Opportunities + Projects
**Shows**:
- Organizational financials (revenue, expenses, profit)
- Project-level financials (costs, funding, ROI)
- Grant success rates
- Spending patterns by category
- Vendor relationships
- GST/BAS tracking

---

## 🔍 SEARCH & INTELLIGENCE FEATURES

### Universal Search (Cmd+K)
Search across:
- Projects, people, organizations
- Opportunities, stories, media
- Notes, events, emails
- Philosophy docs, learnings

### AI Assistant ("Ask ACT")
Powered by context from entire knowledge base:
- "Show me all water-related projects"
- "Who should I contact about regenerative agriculture?"
- "What grants have we successfully applied for?"
- "Generate a case study for [project]"
- "What are our learnings about community governance?"
- "Find all contacts in Queensland government"

### Auto-Linking
- Mentions of projects → link to project page
- Mentions of people → link to person page
- Mentions of organizations → link to org page
- Email addresses → link to contact + email history
- Dates → link to events on that date

### Analytics & Patterns
- Relationship frequency heatmap
- Project success patterns
- Grant matching recommendations
- Time allocation insights
- Collaboration network visualization

---

## 🌐 TRANSPARENCY & SHARING

### Public Pages (External)
- Project pages (community sees their work)
- Impact stories (published externally)
- Philosophy & methods (for other communities)
- Case studies (exportable PDF/markdown)

### Private Pages (Internal)
- Notes, learnings, internal discussions
- Financial details, grant strategies
- Relationship notes, sensitive context

### Exports
- Case study generator (PDF with project timeline, people, outcomes, learnings)
- Grant application templates (pre-filled from past successes)
- Impact reports (auto-generated from project data)
- Embeddable widgets (for ACT website transparency)

---

## 📊 DATA FLOW

```
Notion (Source of Truth)
  ↓
Supabase (Cache + Operational)
  ↓
Knowledge Wiki (Structured + Searchable)
  ↓
AI Intelligence Layer (Insights + Suggestions)
  ↓
Public Transparency (Case Studies + Impact)
```

**Sync Strategy:**
1. Notion → Supabase (real-time webhooks or hourly sync)
2. Gmail/Calendar → Supabase (daily sync)
3. Xero → Supabase (daily sync)
4. Supabase → Knowledge Wiki (live queries)
5. AI layer indexes everything for search + chat

---

## 🏗️ NEXT STEPS

1. ✅ **Audit data access** - Confirm we can read all these sources
2. ✅ **Design schema** - How data links across sources
3. ✅ **Build sync layer** - Pull everything into unified graph
4. ✅ **Create wiki UI** - Search-first, browsable, linked pages
5. ✅ **Add AI intelligence** - "Ask ACT" assistant
6. ✅ **Enable transparency** - Public pages, exports, embeds

---

## 💡 KEY INSIGHT

This isn't a "research tool" - it's **ACT's memory system**. Every project, every person, every grant, every learning, every story - all connected, searchable, and surfaceable. The organizational intelligence that makes you move faster, build better case studies, and help more communities.

**This is what you actually need to build.**
