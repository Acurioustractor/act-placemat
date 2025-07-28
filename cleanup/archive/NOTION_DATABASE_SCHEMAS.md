# ACT Placemat - Notion Database Schemas

## 🎯 Complete Database Setup Guide

This document provides the exact schema and setup instructions for all 5 Notion databases needed for a fully connected ACT Placemat ecosystem.

## 1️⃣ **Projects Database** ✅ (Existing)

*You already have this database - verify it has these fields:*

### **Core Properties**
```
Name (Title) - Project name
Description (Rich Text) - Project overview
Area (Select) - Operations & Infrastructure, Community Engagement, Research & Development, etc.
Status (Select) - Active, Planning, Completed, On Hold
Funding (Select) - Funded, Seeking, Applied, Not Required
```

### **Financial Properties**
```
Revenue Actual (Number) - Current revenue generated
Revenue Potential (Number) - Projected revenue potential
Actual Incoming (Number) - Confirmed incoming revenue
Potential Incoming (Number) - Potential incoming revenue
```

### **Team & Timeline**
```
Project Lead (Rich Text) - Lead person name
Team Members (Rich Text) - Team member names
Start Date (Date) - Project start date
End Date (Date) - Project end date
Next Milestone Date (Date) - Next milestone
```

### **AI & Analytics**
```
AI Summary (Rich Text) - AI-generated project insights
Success Metrics (Rich Text) - Success measurement criteria
```

### **Relationships** (For future connections)
```
🎯 Related Opportunities (Relation) → Opportunities Database
🏢 Partner Organizations (Relation) → Organizations Database
📋 Project Artifacts (Relation) → Artifacts Database
```

### **External Links**
```
🔗 Website/Links (URL) - Project website or resources
Place (Rich Text) - Location information
State (Select) - State/region
```

---

## 2️⃣ **Opportunities Database** ❌ (To Create)

### **Setup Instructions**
1. **Create New Database** in Notion named: `ACT Opportunities Pipeline`
2. **Add Properties** (exact names important):

### **Core Properties**
```
Opportunity Name (Title) - Name of the opportunity
Description (Rich Text) - Detailed description
Stage (Select) - Discovery 🔍, Qualification 📋, Proposal 📄, Negotiation 🤝, Closed Won ✅, Closed Lost ❌
Type (Select) - Grant, Contract, Partnership, Investment, License, Donation
```

### **Financial Properties**
```
Revenue Amount (Number) - Total potential revenue
Probability (Select) - 10%, 25%, 50%, 75%, 90%, 100%
Weighted Revenue (Formula) - prop("Revenue Amount") * prop("Probability") / 100
Budget Required (Number) - Required budget to pursue
```

### **Timeline Properties**
```
Application Date (Date) - When application was submitted
Deadline (Date) - Application or response deadline
Expected Decision Date (Date) - When decision is expected
Next Action Date (Date) - Next action deadline
```

### **Action Properties**
```
Next Action (Rich Text) - What needs to be done next
Requirements (Rich Text) - Opportunity requirements
Success Criteria (Rich Text) - What defines success
```

### **Relationship Properties**
```
🚀 Related Projects (Relation) → Projects Database
🏢 Organization (Relation) → Organizations Database (single select)
👥 Primary Contact (Relation) → People Database (single select)
👥 Decision Makers (Relation) → People Database (multi-select)
📋 Supporting Artifacts (Relation) → Artifacts Database
```

### **Analysis Properties**
```
Competition (Rich Text) - Competitive analysis
Risk Assessment (Select) - Low, Medium, High
Notes (Rich Text) - General notes and updates
```

---

## 3️⃣ **Organizations Database** ❌ (To Create)

### **Setup Instructions**
1. **Create New Database** in Notion named: `ACT Organizations`
2. **Add Properties**:

### **Core Properties**
```
Organization Name (Title) - Full organization name
Type (Select) - Government, NGO, Corporation, Foundation, University, Startup, Community Group
Sector (Multi-select) - Energy, Agriculture, Technology, Education, Health, Environment, Finance
Size (Select) - Startup (<10), Small (10-50), Medium (50-200), Large (200-500), Enterprise (500+)
```

### **Contact Properties**
```
Website (URL) - Organization website
Location (Rich Text) - Physical location/address
Description (Rich Text) - Organization overview
```

### **Relationship Properties**
```
Relationship Status (Select) - New Lead, Active Partner, Past Partner, Competitor, Unknown
Partnership Type (Multi-select) - Funding, Technical, Strategic, Vendor, Client, Referral
Relationship Strength (Select) - Strong, Medium, Weak, New
```

### **Capacity Properties**
```
Annual Budget (Number) - Organization's annual budget
Funding Capacity (Select) - <$10K, $10K-$50K, $50K-$200K, $200K-$1M, $1M+, Unknown
Decision Timeline (Select) - Days, Weeks, Months, Quarterly, Annual
```

### **Engagement Properties**
```
Last Contact Date (Date) - When last contacted
Next Contact Date (Date) - When to contact next
Contact Frequency (Select) - Weekly, Monthly, Quarterly, Annually, As Needed
```

### **Strategic Properties**
```
Values Alignment (Select) - High, Medium, Low, Unknown
Strategic Priority (Select) - Critical, High, Medium, Low
Influence Level (Select) - High, Medium, Low, Unknown
```

### **Connection Properties**
```
🎯 Active Opportunities (Relation) → Opportunities Database
🚀 Related Projects (Relation) → Projects Database
👥 Key Contacts (Relation) → People Database
📋 Shared Artifacts (Relation) → Artifacts Database
```

### **Notes Properties**
```
Notes (Rich Text) - General notes and observations
Partnership History (Rich Text) - History of collaboration
```

---

## 4️⃣ **People Database** ❌ (To Create)

### **Setup Instructions**
1. **Create New Database** in Notion named: `ACT People`
2. **Add Properties**:

### **Core Properties**
```
Full Name (Title) - Person's full name
Role/Title (Rich Text) - Job title or role
Email (Email) - Primary email address
Phone (Phone) - Primary phone number
LinkedIn (URL) - LinkedIn profile URL
```

### **Location Properties**
```
Location (Rich Text) - City, state, country
Time Zone (Select) - EST, CST, MST, PST, UTC, etc.
```

### **Professional Properties**
```
🏢 Organization (Relation) → Organizations Database (single select)
Expertise (Multi-select) - Technology, Finance, Strategy, Operations, Marketing, Legal, HR
Interests (Multi-select) - Sustainability, Innovation, Community, Policy, Research, Education
Seniority (Select) - Executive, Director, Manager, Specialist, Coordinator, Intern
```

### **Relationship Properties**
```
Relationship Type (Select) - Key Stakeholder, Partner, Collaborator, Contact, Team Member
Relationship Strength (Select) - Strong, Medium, Weak, New
Influence Level (Select) - Decision Maker, Influencer, Supporter, Observer
```

### **Communication Properties**
```
Communication Preference (Select) - Email, Phone, In-Person, Video Call, Text, LinkedIn
Contact Frequency (Select) - Weekly, Monthly, Quarterly, Annually, As Needed
Last Contact Date (Date) - When last contacted
Next Contact Date (Date) - When to contact next
```

### **Connection Properties**
```
🚀 Related Projects (Relation) → Projects Database
🎯 Related Opportunities (Relation) → Opportunities Database
📋 Shared Artifacts (Relation) → Artifacts Database
```

### **Personal Properties**
```
Birthday (Date) - Birthday (optional)
Personal Interests (Rich Text) - Hobbies and personal interests
Background (Rich Text) - Professional background
```

### **Notes Properties**
```
Notes (Rich Text) - General notes about the person
Last Meeting Notes (Rich Text) - Notes from last interaction
Communication Log (Rich Text) - History of communications
```

---

## 5️⃣ **Artifacts Database** ❌ (To Create)

### **Setup Instructions**
1. **Create New Database** in Notion named: `ACT Artifacts`
2. **Add Properties**:

### **Core Properties**
```
Artifact Name (Title) - Document or asset name
Type (Select) - Proposal, Report, Presentation, Template, Contract, Media, Website, Tool
Format (Select) - PDF, Word, PowerPoint, Excel, Video, Image, Web, Text, Spreadsheet
Status (Select) - Draft, Review, Approved, Published, Archived, Expired
```

### **Content Properties**
```
Description (Rich Text) - What this artifact contains
File/Link (Files) - Upload files or add URLs
Access Level (Select) - Public, Internal, Confidential, Restricted, Team Only
Version (Number) - Version number (1.0, 2.0, etc.)
```

### **Purpose Properties**
```
Purpose (Select) - Proposal, Marketing, Training, Documentation, Legal, Internal, External
Audience (Multi-select) - Internal Team, Partners, Funders, Public, Clients, Prospects
Keywords/Tags (Multi-select) - Searchable tags and keywords
```

### **Ownership Properties**
```
👥 Created By (Relation) → People Database (single select)
👥 Approved By (Relation) → People Database (single select)
👥 Owner (Relation) → People Database (single select)
Review Date (Date) - When this needs review
Expiry Date (Date) - When this expires (if applicable)
```

### **Connection Properties**
```
🚀 Related Projects (Relation) → Projects Database
🎯 Related Opportunities (Relation) → Opportunities Database
🏢 Related Organizations (Relation) → Organizations Database
👥 Related People (Relation) → People Database
```

### **Usage Properties**
```
Usage Notes (Rich Text) - How and when to use this
Download Count (Number) - How many times downloaded (manual tracking)
Last Accessed (Date) - When last used
Effectiveness Rating (Select) - High, Medium, Low, Unknown
```

### **Legal Properties**
```
Copyright Status (Select) - ACT Owned, Licensed, Public Domain, Third Party
Compliance Requirements (Multi-select) - Privacy, Legal, Financial, None
Legal Review Status (Select) - Required, In Progress, Approved, Not Required
```

---

## 🔗 **Database Relationships Setup**

### **After Creating All Databases**

1. **Update Projects Database**:
   - Add relation to Opportunities: `🎯 Related Opportunities`
   - Add relation to Organizations: `🏢 Partner Organizations`
   - Add relation to People: `👥 Team Members` (update existing field to relation)
   - Add relation to Artifacts: `📋 Project Artifacts`

2. **Set Bidirectional Relationships**:
   - When you create a relation, Notion will ask if you want a bidirectional relation
   - **Always choose YES** for bidirectional relations
   - This creates the reverse relationship automatically

3. **Test Relationships**:
   - Create a test opportunity and link it to a project
   - Create a test organization and link it to an opportunity
   - Verify all connections work in both directions

## 🎯 **Environment Configuration**

### **Update .env file**:
```env
# Notion Integration
NOTION_TOKEN=your_integration_token_here
NOTION_API_VERSION=2022-06-28

# Database IDs (get from database URLs)
NOTION_DATABASE_ID=your_projects_database_id
NOTION_OPPORTUNITIES_DB=your_opportunities_database_id
NOTION_ORGANIZATIONS_DB=your_organizations_database_id
NOTION_PEOPLE_DB=your_people_database_id
NOTION_ARTIFACTS_DB=your_artifacts_database_id
```

### **Share All Databases with Integration**:
1. Open each database in Notion
2. Click "Share" → "Add integration"
3. Select your ACT Placemat integration
4. Grant access to all 5 databases

## 🧪 **Testing Your Setup**

### **Run Setup Script**:
```bash
node setup-real-data.js
```

### **Expected Results**:
- ✅ All 5 databases configured
- ✅ Real data loading in enhanced projects page
- ✅ Relationships visible and clickable
- ✅ Cross-database navigation working

## 🚀 **Quick Start Order**

1. **Week 1**: Connect real Projects data (fix current mock data issue)
2. **Week 2**: Create Opportunities database and connect to Projects
3. **Week 3**: Create Organizations database and connect to Opportunities/Projects
4. **Week 4**: Create People database and connect to all other databases
5. **Week 5**: Create Artifacts database and complete full ecosystem

---

**This schema creates a fully connected ecosystem where every entity relates to every other relevant entity, providing rich insights and comprehensive relationship management for ACT.**