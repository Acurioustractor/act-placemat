# 🚀 Goods. GHL Quick Start Guide

**Purpose**: Import 64 Goods. contacts to GoHighLevel and start actioning them through strategic pipelines
**Time to Complete**: 30-45 minutes
**Result**: Systematic action system for achieving Beautiful Obsolescence

---

## ✅ What You Have Ready

1. **`goods-ghl-import.csv`** - 64 contacts with custom fields
2. **8 Pipeline templates** - Documented in GOODS_GHL_PIPELINE_INTEGRATION.md
3. **5 Email templates** - Ready to customize in GHL
4. **Complete automation plan** - Workflows for each pipeline

---

## 📊 Your 64 Contacts by Pipeline

| Pipeline | Contacts | Top Priority |
|----------|----------|--------------|
| **Beautiful Obsolescence** | 15 | Wilya Janta team (6 @ 95 points) |
| **General Engagement** | 17 | Various allies |
| **Funding** | 10 | Snow, Ian Potter, Dusseldorp |
| **Academic Partnership** | 5 | UQ, Sydney, UNSW researchers |
| **Legal Structure** | 5 | PIAC, barristers, corporate lawyers |
| **Health Validation** | 4 | Aboriginal Health NT (3) + UQ (1) |
| **Supplier & Partner** | 4 | Defy, CSIRO, Troppo, Our Shed |
| **Media & Storytelling** | 3 | Oonchiumpa, Time & Place, writers |
| **Customer Expansion** | 1 | Julalikari Council CEO |

---

## 🏃 Quick Start (30 minutes)

### Step 1: Create Custom Fields in GHL (5 minutes)

Go to **Settings → Custom Fields** and create these fields:

**Contact Custom Fields**:

1. **goods_category**
   - Type: Dropdown
   - Options: Indigenous, Health, Legal, Funder, Academic, Media, Product, Customer, Community, Other

2. **goods_priority_score**
   - Type: Number
   - Range: 60-95

3. **goods_strategic_role**
   - Type: Text Area
   - Description: Strategic role in Goods. ecosystem

4. **goods_pipeline**
   - Type: Dropdown
   - Options: Beautiful Obsolescence, Health Validation, Legal Structure, Funding, Academic Partnership, Media & Storytelling, Supplier & Partner, Customer Expansion, General Engagement

5. **goods_pipeline_stage**
   - Type: Text
   - Description: Current pipeline stage

6. **goods_next_action**
   - Type: Text Area
   - Description: Specific next action to take

7. **goods_outreach_status**
   - Type: Dropdown
   - Options: Not Contacted, Email Sent, Meeting Scheduled, In Progress, Partnership Active, Inactive

8. **linkedin_url**
   - Type: URL
   - Description: LinkedIn profile

9. **alignment_tags**
   - Type: Text
   - Description: Tags from alignment scoring

---

### Step 2: Import Contacts (5 minutes)

1. Go to **Contacts → Import**
2. Upload **`goods-ghl-import.csv`**
3. Map CSV columns to GHL fields:
   - `first_name` → First Name
   - `last_name` → Last Name
   - `email` → Email
   - `phone` → Phone
   - `company` → Company
   - `position` → Position
   - `goods_category` → goods_category (custom field)
   - `goods_priority_score` → goods_priority_score (custom field)
   - `goods_strategic_role` → goods_strategic_role (custom field)
   - `goods_pipeline` → goods_pipeline (custom field)
   - `goods_pipeline_stage` → goods_pipeline_stage (custom field)
   - `goods_next_action` → goods_next_action (custom field)
   - `goods_outreach_status` → goods_outreach_status (custom field)
   - `linkedin_url` → linkedin_url (custom field)
   - `alignment_tags` → alignment_tags (custom field)
4. Click **Import**
5. Verify: 64 contacts imported

---

### Step 3: Create Core Pipelines (10 minutes)

Go to **Opportunities → Pipelines** and create these 3 priority pipelines:

#### Pipeline 1: Beautiful Obsolescence (15 contacts)

**Stages**:
1. Initial Contact
2. Discovery Call Scheduled
3. Planning Phase
4. Legal Structure Design
5. Transition Timeline
6. Implementation

**Purpose**: Wilya Janta team → 100% community ownership

---

#### Pipeline 2: Health Validation (4 contacts)

**Stages**:
1. Research Partnership Outreach
2. Partnership Call
3. Research Design
4. Data Collection
5. Analysis & Validation
6. Publication & Advocacy

**Purpose**: Aboriginal Health NT → RHD prevention validation

---

#### Pipeline 3: Funding (10 contacts)

**Stages**:
1. Funder Research
2. Application Preparation
3. Application Submitted
4. Follow-Up & Questions
5. Decision Pending
6. Funding Secured / Rejected

**Purpose**: Multi-year funding for Beautiful Obsolescence

---

### Step 4: Assign Contacts to Pipelines (5 minutes)

1. Go to **Contacts**
2. Filter by **goods_pipeline = "Beautiful Obsolescence"**
3. Select all 15 contacts
4. Click **Add to Pipeline** → Beautiful Obsolescence → Stage 1
5. Repeat for Health Validation (4 contacts)
6. Repeat for Funding (10 contacts)

**Result**: 29 high-priority contacts now in pipelines!

---

### Step 5: Create 3 Core Email Templates (5 minutes)

Go to **Settings → Templates → Email** and create:

#### Template 1: Beautiful Obsolescence Intro

**Subject**: Beautiful Obsolescence - Goods. Community Ownership Planning

**Body**:
```
Hi {{contact.first_name}},

Following our work together on Goods., I wanted to reach out about our
Beautiful Obsolescence vision.

**Goal**: Transition Goods. to 100% community ownership by end of 2026

This means Wilya Janta and the community would own:
- Manufacturing operations
- Product IP and designs
- Customer relationships
- Decision-making authority

Would you be available for a 1-hour planning meeting?

[INSERT YOUR CALENDAR LINK]

Looking forward to co-designing this transition together.

Best,
[Your name]
```

---

#### Template 2: Health Validation Partnership

**Subject**: Goods. Health Impact Research Partnership

**Body**:
```
Hi {{contact.first_name}},

Simon Quilty from Wilya Janta recommended I reach out about Goods.,
a project creating dignified mattresses and washing machines in remote
NT communities.

We're seeing anecdotal evidence of health improvements, particularly
around RHD prevention through better sleep hygiene.

**Opportunity**: Research partnership to validate health impact

Would you be interested in a 30-minute call to discuss?

[INSERT YOUR CALENDAR LINK]

Best,
[Your name]
```

---

#### Template 3: Funding Application Intro

**Subject**: Multi-Year Funding Application - Goods. Community Ownership

**Body**:
```
Hi {{contact.first_name}},

Following {{contact.company}}'s support for Indigenous manufacturing,
I wanted to reach out about Goods.' Beautiful Obsolescence transition.

**Request**: Multi-year funding for community ownership transition

**Funding Need**: $XXX,XXX over 3 years for:
- Manufacturing equipment and capability building
- Skills training and knowledge transfer
- Legal structure and governance design
- Health impact evaluation

Would you be open to a 30-minute call to discuss?

[INSERT YOUR CALENDAR LINK]

Best,
[Your name]
```

---

## 🚀 Launch (First Actions)

### Week 1: Beautiful Obsolescence Outreach

**Who**: 6 Wilya Janta team members (all @ 95 points)
- Gabriel Waterford (gw@wilyajanta.org)
- Jimmy Frank (jf@wilyajanta.org)
- Andrea Elliott (ae@wilyajanta.org)
- Wilya Janta Accounts (accounts@wilyajanta.org)
- Lucy McGarry (lm@wilyajanta.org)
- Simon Quilty (sq@wilyajanta.org)

**Action**:
1. Send "Beautiful Obsolescence Intro" email to all 6
2. Track in GHL: Move to "Email Sent" status
3. Wait 3 days for replies
4. Follow up with non-responders
5. Schedule planning meeting with responders

**Expected Result**: 1 planning meeting scheduled by end of week

---

### Week 1: Health Validation Outreach

**Who**: 4 health contacts (all @ 85 points)
- Nathan Evans (nathan.evans@ahnt.org.au)
- Leeanne Caton (leeanne.caton@ahnt.org.au)
- Skye Thompson (skye.thompson@ahnt.org.au)
- Nina Lansbury (n.lansbury@uq.edu.au)

**Action**:
1. Send "Health Validation Partnership" email to all 4
2. Track in GHL: Move to "Email Sent" status
3. Wait 3 days for replies
4. Follow up with non-responders
5. Schedule partnership call with responders

**Expected Result**: 1 partnership call scheduled by end of week

---

### Week 2: Funding Applications

**Who**: Top 3 funders
- Georgina Byron / Sally Grimsley-Ballard (Snow Foundation)
- Alberto Furlan (Ian Potter Foundation)
- Teya Dusseldorp (Dusseldorp Forum)

**Action**:
1. Research each funder's priorities and application process
2. Prepare tailored funding applications
3. Send "Funding Application Intro" email
4. Schedule calls to discuss opportunity
5. Submit applications

**Expected Result**: 3 funding applications submitted by end of week 2

---

## 📊 Success Metrics (30 Days)

### Beautiful Obsolescence Pipeline
- ✅ 6/6 Wilya Janta contacts engaged
- ✅ 1+ planning meeting completed
- ✅ Community ownership structure co-design started

### Health Validation Pipeline
- ✅ 3/4 health contacts engaged
- ✅ 1+ research partnership call completed
- ✅ Research design discussion started

### Funding Pipeline
- ✅ 3+ funding applications submitted
- ✅ $XXX,XXX in funding secured or pending

### Overall Engagement
- ✅ 15+ contacts actively engaged
- ✅ 5+ meetings/calls completed
- ✅ 3+ partnerships formalized

---

## 🔧 Optional: Advanced Setup (Later)

### Automation Workflows

Once you have basic pipelines running, add automation:

1. **Auto-Follow-Up**: Email → Wait 3 days → Follow-up if no reply
2. **Meeting Reminders**: Meeting scheduled → Send reminder 1 day before
3. **Task Creation**: Contact moves to new stage → Create task for next action
4. **Inactivity Alert**: No activity for 30 days → Send re-engagement email

### Integration with ACT Ecosystem

1. **Supabase Sync**: Enrichment data → Auto-update GHL contacts
2. **Notion CRM**: High-priority contacts (85+) → Sync to Notion
3. **Intelligence Hub**: AI suggests next actions → Update GHL

---

## 🎯 Quick Win: First 3 Actions

**TODAY**:

1. **Import contacts to GHL** (5 minutes)
   - Upload goods-ghl-import.csv
   - Map fields
   - Import 64 contacts

2. **Send first outreach email** (10 minutes)
   - Email Wilya Janta team (6 contacts)
   - Use "Beautiful Obsolescence Intro" template
   - Track in GHL

3. **Schedule follow-up task** (2 minutes)
   - Create task for 3 days from now
   - Action: "Follow up with Wilya Janta team who haven't responded"

**TIME INVESTMENT**: 17 minutes
**EXPECTED RESULT**: 1+ planning meeting scheduled this week

---

## 📁 Files You Have

1. **`goods-ghl-import.csv`** ✅ - Import file with 64 contacts
2. **`GOODS_GHL_PIPELINE_INTEGRATION.md`** - Complete integration guide
3. **`GOODS_GHL_QUICK_START.md`** (this file) - Quick start guide
4. **`goods-health-contacts.csv`** - Health sector contacts
5. **`goods-legal-contacts.csv`** - Legal experts
6. **`goods-wilya-janta-team.csv`** - Wilya Janta team
7. **`goods-all-contacts.csv`** - All contacts with scores

---

## 🎉 Summary

**You now have**:
- ✅ 64 contacts ready to import to GHL
- ✅ 8 pipeline templates designed
- ✅ 5 email templates ready to use
- ✅ Complete automation plan
- ✅ Clear next actions for each contact
- ✅ Success metrics for 30/60/90 days

**Instead of**:
- ❌ 64 contacts sitting in a spreadsheet
- ❌ No systematic outreach plan
- ❌ Manual follow-ups

**You get**:
- ✅ Systematic action on all 64 contacts
- ✅ Automated workflows and follow-ups
- ✅ Clear path to Beautiful Obsolescence
- ✅ Real-time progress tracking

**Next Step**: Import `goods-ghl-import.csv` to GoHighLevel and send your first email! 🚀

---

**File**: `GOODS_GHL_QUICK_START.md`
**Created**: 2026-01-01
**Status**: Ready to import and action!
