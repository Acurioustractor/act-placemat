# Infrastructure Tracking Data Collection Process

## Purpose

This document outlines a practical, ACT-aligned process for populating infrastructure tracking data across all 65 projects in Notion. The goal is to make impact visible while honoring the reality that **communities own their stories** and data collection should **build capacity, not extract it**.

---

## The Three-Tier Approach

Not all projects are at the same stage or have the same data available. We use a **tiered approach** that meets projects where they are:

### 🟢 Tier 1: Active Projects with Recent Delivery (15-20 projects)
**Full infrastructure tracking** - these have recent activity and clearer metrics

**Target projects:**
- PICC Station Precinct ✅ (already populated)
- Goods ✅ (already populated)
- PICC Storm Stories
- BG Fit
- The Shed
- Diagrama
- MingaMinga Rangers
- SMART Connect
- June's Patch
- Contained
- JusticeHub
- Uncle Allan Palm Island Art
- Witta Harvest HQ
- Custodian Economy
- Empathy Ledger

### 🟡 Tier 2: Projects in Motion (20-25 projects)
**Basic infrastructure tracking** - capture what we know, flag gaps

**Target projects:**
- Projects with status "In progress" or recent activity
- Enough history to estimate community participation
- May have incomplete data but some impact is measurable

### ⚪ Tier 3: Concept/Early Stage Projects (20-30 projects)
**Planned infrastructure tracking** - mark as "To be tracked" with estimated approach

**Target projects:**
- New concepts without delivery yet
- Projects where community participation hasn't started
- Keep fields empty but mark Project Type for filtering

---

## The Data Collection Workflow

### Phase 1: Project Type Classification (Week 1)
**Goal:** Tag all 65 projects with their type so we can filter and prioritize

**Process:**
1. Review each project in Notion
2. Assign Project Type:
   - `Infrastructure Building` - Physical spaces/assets built with community
   - `Justice Innovation` - Disrupting justice pipeline, reducing recidivism
   - `Storytelling Platform` - Amplifying community voices, cultural narratives
   - `Community Enterprise` - Market-based solutions owned by community
   - `Mixed` - Hybrid projects (most ACT work is this)

**Tool:** Create a simple review script that lists all projects and prompts for type
**Time estimate:** 2-3 hours for all 65 projects (rough pass)

### Phase 2: Gather Existing Data (Week 1-2)
**Goal:** Extract what we already know without asking anyone for new info

**Sources to check:**
- ✅ Notion project descriptions (already there)
- ✅ Existing financial data in Notion (actualIncoming, revenueActual, etc.)
- 📧 Email archives (Gmail discovery for participation mentions)
- 📊 Google Drive (reports, photos with metadata)
- 💬 Slack/Discord (community participation mentions)
- 📸 Photo metadata (how many people in group shots, timestamps)

**Automated extraction opportunities:**
- Script to analyze project descriptions for participation keywords
- Gmail mining for phrases like "X people attended", "Y hours contributed"
- Photo EXIF data for event dates and estimated attendance

**Output:** Populate fields with "estimated" or "approximate" markers where needed

### Phase 3: Project Lead Check-ins (Week 2-4)
**Goal:** Get accurate numbers from project leads without creating burden

**Approach: Async, Template-Based**

Create a simple form/template that project leads can fill at their own pace:

```
# Infrastructure Data - [PROJECT NAME]

Hey [Name],

We're making the community impact of ACT projects more visible on the dashboard.
Could you help us capture what's already happened with [PROJECT NAME]?

**Only answer what you know** - estimates are fine, blanks are fine.

## Community Participation

**Young people (under 25):**
- Roughly how many: _____
- Total hours they contributed (estimate): _____

**Community members with lived experience:**
- Roughly how many: _____
- What kind of lived experience: _____
- Total hours: _____

**Skills that got transferred:**
- What skills: _____
- How many people learned them: _____
- Any certifications/credentials earned: _____

## Value Created

**If you'd hired contractors to do this work, what would it have cost?**
Rough estimate: $_____

**What did it actually cost you?**
(Materials, any paid labor, etc.): $_____

**Employment outcomes:**
Did anyone get a job or start a business because of this project? _____

## Physical Assets Built

**What got built/created:**
- _____
- _____

## Storytelling

**People actively sharing this story:**
- On socials: _____
- In communities: _____
- To funders/partners: _____

**Current combined reach:** (estimate)
- _____

## Grant → Market Journey

**Current funding:**
- Grant funding: $_____
- Market revenue: $_____
- Target date to be 50/50: _____

---

Thanks! This helps us show funders and communities the real infrastructure
we're building together.
```

**Delivery method:**
- Email with pre-filled project name
- Google Form that populates Notion via API
- 1-on-1 calls for priority projects (Tier 1)

### Phase 4: Community Validation Sessions (Week 4-6)
**Goal:** For high-priority projects, validate data WITH community

**Approach: Participatory Data Sessions**

Run 2-3 workshops where community members involved in projects come together to:

1. **Review the impact cards** we've created
2. **Correct numbers** that feel wrong
3. **Add stories** behind the numbers
4. **Identify who's missing** from the count

**Why this matters:**
- Prevents extractive data collection
- Builds data literacy in community
- Surfaces stories we'd miss
- Community owns their impact narrative

**Format:**
- 90-minute session
- Show the actual dashboard
- Walk through 3-4 projects together
- Pizza/kai provided
- Record corrections in Notion live

### Phase 5: Ongoing Capture (Continuous)
**Goal:** Make infrastructure tracking part of project delivery, not an audit

**Mechanisms:**

1. **Milestone Check-ins**
   - When projects hit milestones in Notion, prompt for quick metrics update
   - "How many people participated in this milestone?"
   - "What skills got transferred?"

2. **Monthly Pulse**
   - Simple automated question in Slack/email
   - "What happened this month on [PROJECT]?"
   - Parse responses to extract participation data

3. **Photo Upload Prompts**
   - When someone uploads project photos, prompt:
   - "How many people in this photo?"
   - "What were you building/doing?"

4. **Quarterly Reviews**
   - Scheduled 30-min calls with project leads
   - Walk through dashboard together
   - Update numbers live

---

## Data Standards & Validation

### What "Counts" as Community Participation

**Young people:**
- Anyone under 25
- Counts if they contributed > 1 hour
- Include planning, building, testing, storytelling

**Community members:**
- Geographic community OR communities of practice
- Must have active role (not just recipients)

**Lived experience:**
- People with direct experience of the issue being addressed
- E.g., justice involvement, housing insecurity, disability

**Skills transferred:**
- Must be documented in some way (attendance, certificate, testimonial)
- Includes informal skills (not just certified training)

### Estimation Guidelines

When exact numbers aren't available:

**Community participation:**
- COUNT: Photos, sign-in sheets, testimonials, emails mentioning names
- ESTIMATE: Group sizes in photos, "about 20 people" in notes
- FLAG: Mark as "~" (approximate) in Notion

**Hours contributed:**
- TRACK: Event duration × attendance
- ESTIMATE: "Spent 3 Saturdays" = ~24 hours
- FLAG: Mark as "estimated" in notes

**Value created:**
- CALCULATE: Local contractor rates × hours
- DOCUMENT: Get 2-3 quotes for similar work
- CITE: Link to rate sources

### Quality Thresholds

**Tier 1 projects:**
- ✅ Must have actual numbers (with ~10% margin okay)
- ✅ Must have at least 3 data points verified
- ✅ Must have story behind the numbers

**Tier 2 projects:**
- ✅ Estimates okay if flagged
- ✅ At least 2 data points
- ✅ Brief context

**Tier 3 projects:**
- ✅ Just project type
- ✅ "To be tracked" note

---

## Tools & Templates

### 1. Notion Template for Infrastructure Data
Create a template page in Notion that project leads can duplicate and fill:

**Fields:**
- Project Type ✅ (already exists)
- Community Labor Metrics ✅ (already exists)
- Storytelling Metrics ✅ (already exists)
- Grant Dependency Metrics ✅ (already exists)
- Data Collection Notes (new - track sources, dates, confidence)
- Last Updated (new - when was this data refreshed)

### 2. Data Collection Script
Script that:
- Lists all projects without infrastructure data
- Prompts for each field with smart defaults
- Validates input (e.g., % between 0-100)
- Writes directly to Notion
- Logs what changed and when

### 3. Impact Card Generator
Script that:
- Takes infrastructure data from Notion
- Generates shareable impact cards (images)
- Posts to Slack/social media
- Links back to full project page

### 4. Dashboard Analytics
Add to dashboard:
- "Data completeness" score (% of projects with full metrics)
- "Last updated" timestamps
- "Needs refresh" flags for old data

---

## Roles & Responsibilities

### ACT Core Team
- **Design the process** (this document)
- **Create tools/templates**
- **Run community validation sessions**
- **Monitor data quality**
- **Celebrate impact publicly**

### Project Leads
- **Fill initial data** (async, at their pace)
- **Update quarterly** (30-min check-in)
- **Invite community** to validation sessions
- **Correct errors** when spotted

### Community Members
- **Validate data** in participatory sessions
- **Share stories** behind the numbers
- **Challenge extractive framing**
- **Own the narrative**

### Technical Team (me!)
- **Build data collection scripts**
- **Automate where possible**
- **Create beautiful visualizations**
- **Maintain data pipeline**

---

## Success Metrics

After 6 weeks, we should have:

✅ **All 65 projects** tagged with Project Type
✅ **15-20 Tier 1 projects** with full infrastructure tracking
✅ **20-25 Tier 2 projects** with basic tracking
✅ **Dashboard filters working** (can filter by type, impact, etc.)
✅ **3 community validation sessions** completed
✅ **Data collection playbook** documented
✅ **Ongoing capture mechanisms** in place

---

## The ACT Way: Principles

As we do this, we commit to:

### 1. Community Ownership
- Communities decide what impact looks like
- Data belongs to the community, not ACT
- Anyone can export, fork, remix their project data

### 2. Build Capacity, Don't Extract
- Data collection should teach, not just take
- Community members learn to measure their own impact
- Process creates artifacts community can use elsewhere

### 3. Honesty Over Hype
- Estimates marked as estimates
- Gaps acknowledged as gaps
- Failure and learning count as impact too

### 4. Stories Before Spreadsheets
- Numbers without context mean nothing
- Every metric needs a story
- Qualitative > quantitative when forced to choose

### 5. Accessible, Not Academic
- Plain language, no jargon
- Visual > text where possible
- Anyone should be able to understand the impact

---

## Next Steps

**Immediate (This Week):**
1. ✅ Review this process with ACT team
2. Create project type classification script
3. Set up async form for project leads
4. Schedule first community validation session

**Short-term (Next 2 Weeks):**
1. Classify all 65 projects by type
2. Extract existing data from Notion/Gmail/Drive
3. Send forms to Tier 1 project leads
4. Build data collection script

**Medium-term (Next 4-6 Weeks):**
1. Run 3 community validation sessions
2. Populate Tier 1 projects fully
3. Get Tier 2 projects to basic level
4. Document learnings for ongoing process

**Ongoing:**
1. Quarterly project lead check-ins
2. Monthly pulse in Slack
3. Continuous improvement based on feedback
4. Share impact stories publicly

---

## Questions to Resolve

Before we start, let's align on:

1. **Who should we start with?** Which 3-5 projects are highest priority for full tracking?

2. **What's the incentive?** Why will project leads take time to fill this?
   - Public recognition?
   - Better funding applications?
   - Community pride?

3. **What's too much?** Where's the line between useful and burdensome?

4. **How do we handle sensitive data?** Some projects involve vulnerable people - what privacy protections?

5. **Who validates the validators?** How do we ensure our "community validation" isn't performative?

---

## Resources Needed

**Time:**
- 10-15 hours: Initial classification + existing data extraction
- 5-10 hours: Building data collection tools
- 3 × 2 hours: Community validation sessions
- 2 hours/week: Ongoing data updates

**Money:**
- $300-500: Food for validation sessions
- $0: Everything else (use existing tools)

**People:**
- 1 person coordinating (ACT core team)
- 1 developer (for scripts/tools)
- 3-5 community facilitators (for validation sessions)

---

## Making It Stick

This only works if it becomes **part of how ACT does projects**, not a one-off audit.

**Embed in project lifecycle:**
- **Proposal stage:** Define expected infrastructure impact
- **Kickoff:** Set up tracking mechanisms
- **Milestones:** Capture participation at each checkpoint
- **Completion:** Final impact summary
- **Retrospective:** What did we learn about measuring impact?

**Make it rewarding:**
- Celebrate data completion publicly
- Share impact cards on social media
- Use metrics in funding applications
- Show community members their impact visualized

**Keep it light:**
- Max 15 minutes per update
- Automate what can be automated
- Make it visual and fun
- No judgment for incomplete data

---

**The goal isn't perfect data. The goal is making community impact visible in a way that honors the work and the people doing it.**

Let's start small, learn as we go, and build something that lasts.
