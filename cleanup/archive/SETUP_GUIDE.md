# ACT Placemat - Complete Setup Guide

This guide will help you set up the complete ACT Placemat system with integrated project management, opportunities pipeline, and relationship tracking.

## 🎯 What You'll Build

A comprehensive system that connects:
- **Projects** (your existing work)
- **Opportunities** (funding, partnerships, revenue)
- **Organizations** (who you work with)
- **People** (your network and contacts)
- **Artifacts** (documents, presentations, materials)

## 📋 Prerequisites

1. **Notion Account** with admin access
2. **Notion Integration** already created (you have this)
3. **Node.js** installed (you have this)
4. **Your existing ACT Projects database** (you have this)

## 🚀 Step-by-Step Implementation

### Step 1: Install Notion SDK

```bash
npm install @notionhq/client
```

### Step 2: Create Parent Page in Notion

1. Go to your Notion workspace
2. Create a new page called "**ACT Placemat System**"
3. Copy the page ID from the URL (the long string after the last `/`)
   - Example: `https://notion.so/ACT-Placemat-System-1a2b3c4d5e6f...`
   - Page ID: `1a2b3c4d5e6f...`

### Step 3: Run Database Setup Script

```bash
node notion-integration.js YOUR_PAGE_ID_HERE
```

This will create 5 interconnected databases:
- ✅ ACT Projects (enhanced version of your existing)
- ✅ ACT Opportunities 
- ✅ ACT Organizations
- ✅ ACT People
- ✅ ACT Artifacts

### Step 4: Migrate Your Existing Projects

#### Option A: Manual Migration
1. Export your existing projects database
2. Import key projects into the new enhanced Projects database
3. Add missing fields (Revenue, Opportunities, etc.)

#### Option B: Automated Migration (Recommended)
I can create a migration script to transfer your existing data.

### Step 5: Add Your First Organizations

Start with these key organizations you work with:

```
1. SMART Recovery Australia
   - Type: NGO
   - Relationship Status: Active Partner
   - Funding Capacity: $200K-$1M
   - Strategic Priority: High

2. Queensland Government
   - Type: Government
   - Relationship Status: Prospect
   - Funding Capacity: $1M+
   - Strategic Priority: High

3. Orange Sky Australia
   - Type: NGO
   - Relationship Status: Current Client
   - Funding Capacity: $50K-$200K
   - Strategic Priority: Medium

4. University of Queensland
   - Type: University
   - Relationship Status: Active Partner
   - Funding Capacity: $200K-$1M
   - Strategic Priority: Medium
```

### Step 6: Add Key People

For each organization, add 1-2 key contacts:

```
Example for SMART Recovery:
- Dr. Sarah Mitchell (CEO)
  - Influence Level: Decision Maker
  - Relationship Strength: Strong
  - Communication Preference: Email
  - Next Contact Date: [Set appropriate date]
```

### Step 7: Create Your First Opportunities

Based on your current pipeline, add opportunities like:

```
1. SMART Recovery National Expansion
   - Organization: SMART Recovery Australia
   - Stage: Proposal 📄
   - Revenue Amount: $200,000
   - Probability: 75%
   - Related Projects: SMART Recovery
   - Primary Contact: Dr. Sarah Mitchell

2. Youth Justice Innovation Fund
   - Organization: Queensland Government
   - Stage: Discovery 🔍
   - Revenue Amount: $500,000
   - Probability: 40%
   - Related Projects: JusticeHub, BG Fit
```

### Step 8: Create Supporting Artifacts

Add your key materials:

```
1. ACT One Pager
   - Type: One Pager
   - Format: PDF
   - Purpose: Sales
   - Access Level: Public

2. SMART Recovery Case Study
   - Type: Case Study
   - Format: PDF
   - Purpose: Marketing
   - Related Opportunities: SMART Recovery National Expansion

3. Empathy Ledger Demo
   - Type: Website
   - Format: Website
   - Purpose: Sales
   - Access Level: Public
```

## 📊 Dashboard Views to Create

### In Projects Database:
- **Revenue Pipeline** (Projects with Revenue Potential > 0)
- **Needs Funding** (Projects needing funding)
- **Active with Opportunities** (Active projects linked to opportunities)

### In Opportunities Database:
- **Active Pipeline** (All non-closed opportunities)
- **This Quarter** (Deadlines in next 3 months)
- **High Value** (Revenue > $100K)
- **Weighted Revenue** (Sorted by weighted value)

### In Organizations Database:
- **High Priority Partners** (Strategic Priority = High)
- **Active Opportunities** (Organizations with active opportunities)
- **Need Contact** (Next Contact Date overdue)

### In People Database:
- **Decision Makers** (Influence Level = Decision Maker)
- **Strong Relationships** (Relationship Strength = Strong)
- **Contact This Week** (Next Contact Date this week)

## 🔄 Weekly Workflow

### Monday: Pipeline Review
1. Check **Active Pipeline** view in Opportunities
2. Update stages for any opportunities that moved
3. Set next actions for the week
4. Review **Contact This Week** in People database

### Wednesday: Project Updates
1. Update project statuses in Projects database
2. Link any new opportunities to relevant projects
3. Update revenue figures if any deals closed

### Friday: Relationship Management
1. Review **Need Contact** views
2. Schedule follow-ups for next week
3. Update relationship notes after any meetings
4. Plan next week's outreach

## 🎯 Success Metrics to Track

### Financial Metrics:
- **Total Pipeline Value** (sum of all opportunity revenue)
- **Weighted Pipeline** (probability-adjusted revenue)
- **Conversion Rate** (% of opportunities that close won)
- **Average Deal Size** (mean revenue per opportunity)

### Relationship Metrics:
- **Active Relationships** (people contacted in last 30 days)
- **Strong Relationships** (relationship strength = strong)
- **Decision Maker Access** (% of orgs where you know decision makers)

### Project Metrics:
- **Revenue per Project** (actual revenue generated)
- **Funding Success Rate** (% of projects that get funded)
- **Project Velocity** (time from idea to active)

## 🔧 Advanced Features

### Automation Ideas:
1. **Slack Integration**: Get notified when opportunities move stages
2. **Calendar Integration**: Auto-schedule follow-ups
3. **Email Integration**: Track email interactions with contacts
4. **Reporting Dashboard**: Weekly pipeline reports

### Custom Properties:
- Add industry-specific fields as needed
- Create custom formulas for your metrics
- Set up conditional formatting for visual cues

## 🆘 Troubleshooting

### Common Issues:

**Relations not working?**
- Make sure both databases exist before creating relations
- Check that you're using the correct database IDs

**Data not syncing with dashboard?**
- Refresh your browser
- Check that the API endpoints are working
- Verify your Notion token has the right permissions

**Performance slow?**
- Limit database queries to essential data
- Use filters to reduce data load
- Consider pagination for large datasets

## 📞 Next Steps

1. **Set up the databases** using the script
2. **Import your key data** (projects, organizations, people)
3. **Create your first opportunities** 
4. **Build your weekly workflow**
5. **Start tracking metrics**

Once this is set up, you'll have a complete view of:
- What projects you're working on
- Who you're working with
- What funding opportunities exist
- How everything connects together

This system will transform how you manage ACT's growth and relationships! 🚀