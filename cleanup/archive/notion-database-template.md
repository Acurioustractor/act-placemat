# ACT Placemat - Notion Database Template

This document outlines the complete Notion database structure for managing projects, opportunities, organizations, and relationships.

## Database Structure Overview

```
Projects ←→ Opportunities ←→ Organizations ←→ People
    ↓           ↓              ↓           ↓
Artifacts   Stages         Contacts    Roles
```

## 1. Projects Database (Existing - Enhanced)

**Purpose**: Track all ACT projects across the five main areas

### Properties:
- **Name** (Title) - Project name
- **Area** (Select) - Story & Sovereignty, Economic Freedom, Community Engagement, Operations & Infrastructure, Research & Development
- **Status** (Select) - Active 🔥, Building 🔨, Ideation 🌀, Sunsetting 🌅, Completed ✅
- **Description** (Rich Text) - Project overview
- **AI Summary** (Rich Text) - Auto-generated or manual summary
- **Project Lead** (People) - Who leads this project
- **Team Members** (People) - All people involved
- **Core Values** (Select) - Truth-Telling, Economic Freedom, Decentralised Power, Creativity, Radical Humility
- **Themes** (Multi-select) - Youth Justice, Health and wellbeing, Storytelling, Operations, etc.
- **Tags** (Multi-select) - Flexible tagging system
- **Place** (Select) - Seed 🌱, Seedling 🌿, Lab 🧪, Harvest 🌾
- **Location** (Select) - Geographic location
- **State** (Select) - Queensland, NSW, National, Global, etc.
- **Revenue Actual** (Number) - Current revenue
- **Revenue Potential** (Number) - Potential revenue
- **Actual Incoming** (Number) - Confirmed incoming funds
- **Potential Incoming** (Number) - Possible incoming funds
- **Next Milestone Date** (Date) - Key upcoming date
- **Start Date** (Date) - Project start
- **End Date** (Date) - Project completion (if applicable)
- **🎯 Related Opportunities** (Relation) → Opportunities Database
- **📋 Project Artifacts** (Relation) → Artifacts Database
- **🏢 Partner Organizations** (Relation) → Organizations Database
- **📊 Success Metrics** (Rich Text) - How success is measured
- **🔗 Website/Links** (URL) - Project website or main link
- **Last Updated** (Last edited time) - Auto-populated

---

## 2. Opportunities Database (New)

**Purpose**: Track funding opportunities, partnerships, and revenue streams

### Properties:
- **Opportunity Name** (Title) - Name of the opportunity
- **Organization** (Relation) → Organizations Database
- **Stage** (Select) - Discovery 🔍, Qualification 📋, Proposal 📄, Negotiation 🤝, Closed Won ✅, Closed Lost ❌
- **Revenue Amount** (Number) - Total potential value
- **Probability** (Select) - 10%, 25%, 50%, 75%, 90%, 100%
- **Weighted Revenue** (Formula) - Revenue Amount × (Probability/100)
- **Opportunity Type** (Select) - Grant, Contract, Partnership, Investment, License, Donation
- **Description** (Rich Text) - Detailed opportunity description
- **🎯 Related Projects** (Relation) → Projects Database
- **Primary Contact** (Relation) → People Database
- **Decision Makers** (Relation) → People Database
- **Next Action** (Rich Text) - What needs to happen next
- **Next Action Date** (Date) - When next action is due
- **Deadline** (Date) - Final deadline for opportunity
- **Application Date** (Date) - When application was submitted
- **Expected Decision Date** (Date) - When decision is expected
- **📋 Supporting Artifacts** (Relation) → Artifacts Database
- **Requirements** (Rich Text) - What's needed to win
- **Competition** (Rich Text) - Who else is competing
- **Budget Breakdown** (Rich Text) - How funds would be used
- **Success Criteria** (Rich Text) - How success is defined
- **Risk Assessment** (Rich Text) - Potential risks and mitigation
- **Notes** (Rich Text) - General notes and updates
- **Created Date** (Created time) - Auto-populated
- **Last Updated** (Last edited time) - Auto-populated

---

## 3. Organizations Database (New)

**Purpose**: Track all organizations ACT works with or targets

### Properties:
- **Organization Name** (Title) - Full organization name
- **Type** (Select) - Government, NGO, Foundation, Corporate, University, Community Group, Startup
- **Sector** (Multi-select) - Health, Education, Justice, Environment, Technology, Arts, etc.
- **Size** (Select) - Startup (<10), Small (10-50), Medium (50-200), Large (200-1000), Enterprise (1000+)
- **Location** (Rich Text) - Primary location
- **Website** (URL) - Organization website
- **Description** (Rich Text) - What they do
- **Relationship Status** (Select) - Prospect, Active Partner, Past Partner, Current Client, Potential Client
- **Partnership Type** (Multi-select) - Funding Partner, Implementation Partner, Strategic Partner, Client, Vendor
- **🎯 Active Opportunities** (Relation) → Opportunities Database
- **🚀 Related Projects** (Relation) → Projects Database
- **👥 Key Contacts** (Relation) → People Database
- **📋 Shared Artifacts** (Relation) → Artifacts Database
- **Annual Budget** (Number) - Their approximate annual budget
- **Funding Capacity** (Select) - <$10K, $10K-$50K, $50K-$200K, $200K-$1M, $1M+
- **Decision Timeline** (Select) - Fast (<1 month), Medium (1-3 months), Slow (3-6 months), Very Slow (6+ months)
- **Values Alignment** (Select) - High, Medium, Low
- **Strategic Priority** (Select) - High, Medium, Low
- **Last Contact Date** (Date) - When we last contacted them
- **Next Contact Date** (Date) - When to contact next
- **Notes** (Rich Text) - General notes about organization
- **Created Date** (Created time) - Auto-populated
- **Last Updated** (Last edited time) - Auto-populated

---

## 4. People Database (New)

**Purpose**: Track all individuals ACT works with

### Properties:
- **Full Name** (Title) - Person's full name
- **Role/Title** (Rich Text) - Their job title
- **Organization** (Relation) → Organizations Database
- **Email** (Email) - Primary email address
- **Phone** (Phone) - Primary phone number
- **LinkedIn** (URL) - LinkedIn profile
- **Location** (Rich Text) - Where they're based
- **Relationship Type** (Select) - Team Member, Partner, Client, Funder, Advisor, Community Member, Prospect
- **Influence Level** (Select) - Decision Maker, Influencer, User, Gatekeeper
- **Communication Preference** (Select) - Email, Phone, LinkedIn, In-Person, Video Call
- **🎯 Related Opportunities** (Relation) → Opportunities Database
- **🚀 Related Projects** (Relation) → Projects Database
- **📋 Shared Artifacts** (Relation) → Artifacts Database
- **Interests** (Multi-select) - What they care about
- **Expertise** (Multi-select) - What they're expert in
- **Last Contact Date** (Date) - When we last spoke
- **Next Contact Date** (Date) - When to contact next
- **Contact Frequency** (Select) - Weekly, Monthly, Quarterly, Annually, As Needed
- **Relationship Strength** (Select) - Strong, Medium, Weak, New
- **Notes** (Rich Text) - Personal notes and conversation history
- **Birthday** (Date) - For relationship building
- **Personal Interests** (Rich Text) - Hobbies, interests for relationship building
- **Created Date** (Created time) - Auto-populated
- **Last Updated** (Last edited time) - Auto-populated

---

## 5. Artifacts Database (New)

**Purpose**: Track all documents, presentations, and materials

### Properties:
- **Artifact Name** (Title) - Name of the document/material
- **Type** (Select) - One Pager, Presentation, Proposal, Contract, Report, Case Study, Website, Video, Notion Page
- **Format** (Select) - PDF, PowerPoint, Word, Notion, Website, Video, Image
- **Status** (Select) - Draft, Review, Approved, Published, Archived
- **🎯 Related Opportunities** (Relation) → Opportunities Database
- **🚀 Related Projects** (Relation) → Projects Database
- **🏢 Related Organizations** (Relation) → Organizations Database
- **👥 Related People** (Relation) → People Database
- **File/Link** (Files & media or URL) - The actual file or link
- **Description** (Rich Text) - What this artifact is for
- **Audience** (Multi-select) - Who this is intended for
- **Purpose** (Select) - Sales, Marketing, Reporting, Legal, Internal, Training
- **Version** (Number) - Version number
- **Created By** (People) - Who created it
- **Approved By** (People) - Who approved it
- **Review Date** (Date) - When it needs review/update
- **Access Level** (Select) - Public, Internal, Confidential, Restricted
- **Tags** (Multi-select) - Flexible tagging
- **Usage Notes** (Rich Text) - How and when to use this
- **Created Date** (Created time) - Auto-populated
- **Last Updated** (Last edited time) - Auto-populated

---

## Database Relationships

### Key Connections:
1. **Projects ↔ Opportunities**: Many-to-many (one project can have multiple funding opportunities, one opportunity can fund multiple projects)
2. **Opportunities ↔ Organizations**: Many-to-one (multiple opportunities can come from one organization)
3. **Organizations ↔ People**: One-to-many (one organization has many contacts)
4. **People ↔ Opportunities**: Many-to-many (people can be involved in multiple opportunities)
5. **Artifacts ↔ Everything**: Many-to-many (artifacts can be shared across projects, opportunities, organizations, and people)

---

## Views to Create

### Projects Database Views:
- **All Projects** (Default view)
- **By Area** (Grouped by Area)
- **Active Projects** (Status = Active)
- **Revenue Generating** (Revenue Actual > 0)
- **Needs Funding** (Funding = Needs Funding)

### Opportunities Database Views:
- **Pipeline Overview** (Grouped by Stage)
- **Active Opportunities** (Stage ≠ Closed Won/Lost)
- **High Value** (Revenue Amount > $100K)
- **This Quarter** (Deadline within 3 months)
- **Weighted Revenue** (Sorted by Weighted Revenue)

### Organizations Database Views:
- **Active Partners** (Relationship Status = Active Partner)
- **High Priority** (Strategic Priority = High)
- **Funding Partners** (Partnership Type contains Funding Partner)
- **Need Contact** (Next Contact Date < Today)

### People Database Views:
- **Team Members** (Relationship Type = Team Member)
- **Decision Makers** (Influence Level = Decision Maker)
- **Need Contact** (Next Contact Date < Today)
- **Strong Relationships** (Relationship Strength = Strong)

### Artifacts Database Views:
- **By Type** (Grouped by Type)
- **Need Review** (Review Date < Today)
- **Public Materials** (Access Level = Public)
- **Recent** (Created Date within 30 days)

---

## Automation Ideas

### Using Notion's Automation:
1. **Opportunity Stage Changes**: When opportunity moves to "Closed Won", automatically update related projects' funding status
2. **Contact Reminders**: When "Next Contact Date" passes, send reminder or move to "Overdue Contacts" view
3. **Artifact Reviews**: When "Review Date" passes, change status to "Needs Review"
4. **Project Updates**: When project status changes, notify related opportunity contacts

---

## Getting Started

### Step 1: Create the Databases
1. Create each database with the properties listed above
2. Set up the relations between databases
3. Create the suggested views

### Step 2: Import Existing Data
1. Import your current projects from the existing database
2. Add key organizations you work with
3. Add team members and key contacts
4. Link existing projects to organizations and people

### Step 3: Start Tracking Opportunities
1. Add current opportunities you're pursuing
2. Link them to relevant projects and organizations
3. Add supporting artifacts
4. Set up next actions and deadlines

### Step 4: Build Workflows
1. Create templates for common opportunity types
2. Set up regular review processes
3. Create dashboards for key metrics
4. Train team on using the system

This structure will give you a complete view of your projects, funding pipeline, and relationships - exactly what you need to scale ACT effectively!