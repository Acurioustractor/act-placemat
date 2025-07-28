# ACT Placemat - Complete Ecosystem Database Checklist

## 🎯 **Current Status Analysis**

### ✅ **What You Have Connected**
- **Notion Projects Database** ✅ (1 project found: "Community Solar Network")
- **Notion Integration Token** ✅ (Working)
- **Airtable Integration** ✅ (API key and base configured)
- **Enhanced Projects Page** ✅ (Ready for real data)

### ❌ **What Needs to be Created/Connected**

## 📋 **Complete Database Checklist**

### **NOTION DATABASES** (Primary CRM & Project Management)

#### 1. ✅ **Projects Database** (Connected)
```
Current Status: ✅ Connected (1 project)
Database ID: 177ebcf981cf80dd9514f1ec32f3314c
Fields Missing for Stories Integration:
- [ ] Stories (Relation) → Airtable Stories Table
- [ ] Impact Stories (Rich Text) - Summary of story connections
- [ ] Story Themes (Multi-select) - Story categorization
```

#### 2. ❌ **Opportunities Database** (Need to Create)
```
Status: ❌ Not Created
Priority: HIGH - Week 1
Purpose: Pipeline management, grant tracking, revenue forecasting
Stories Connection: Link opportunities to success stories for proposals
```

#### 3. ❌ **Organizations Database** (Need to Create)
```
Status: ❌ Not Created  
Priority: HIGH - Week 2
Purpose: Partner management, stakeholder tracking
Stories Connection: Connect to storytellers' organizations
```

#### 4. ❌ **People Database** (Need to Create)
```
Status: ❌ Not Created
Priority: HIGH - Week 2  
Purpose: Contact management, relationship tracking
Stories Connection: Direct link to storytellers table
```

#### 5. ❌ **Artifacts Database** (Need to Create)
```
Status: ❌ Not Created
Priority: MEDIUM - Week 3
Purpose: Document management, template library
Stories Connection: Store story videos, transcripts, media assets
```

### **AIRTABLE DATABASES** (Stories & Impact Content)

#### 6. ❌ **Stories Table** (Need to Access/Create)
```
Status: ❌ Not Connected Yet
Priority: HIGH - Week 1
Purpose: Impact stories, case studies, testimonials
Current Location: Airtable Base (app7G3Ae65pBblJke)

Required Fields for Integration:
- Story Title (Title)
- Story Description (Long Text)
- Storyteller (Link to Storytellers table)
- Related Project (Link to Projects - cross-platform)
- Story Type (Select): Success Story, Case Study, Testimonial, Impact Story
- Story Status (Select): Draft, Recorded, Edited, Published
- Media Files (Attachments): Videos, photos, documents
- Story Date (Date)
- Impact Metrics (Long Text)
- Story Themes (Multi-select): Innovation, Community, Sustainability, etc.
- Publication Status (Select): Internal, Public, Marketing, Grant Applications
- Story URL (URL): Published location
```

#### 7. ❌ **Storytellers Table** (Need to Access/Create)
```
Status: ❌ Not Connected Yet  
Priority: HIGH - Week 1
Purpose: People who share stories, community voices
Current Location: Airtable Base (app7G3Ae65pBblJke)

Required Fields for Integration:
- Storyteller Name (Title)
- Email (Email)
- Phone (Phone)
- Organization (Text) - Connect to Notion Organizations later
- Role/Title (Text)
- Location (Text)
- Preferred Contact Method (Select)
- Stories Shared (Link to Stories table)
- Consent Status (Select): Granted, Pending, Declined
- Story Preferences (Multi-select): Video, Written, Audio, Photo
- Impact Areas (Multi-select): Match project areas
- Availability (Select): Active, Occasional, Not Available
- Notes (Long Text)
```

## 🔗 **Cross-Platform Integration Strategy**

### **Notion ↔ Airtable Connection Points**

#### **Projects (Notion) ↔ Stories (Airtable)**
```
Connection Method: API Integration + Manual Linking
Data Flow: Bidirectional
Purpose: Link project outcomes to impact stories

Integration Fields Needed:
Notion Projects:
- [ ] Add "Airtable Story IDs" (Text field)
- [ ] Add "Story Summary" (Rich Text)
- [ ] Add "Impact Metrics from Stories" (Rich Text)

Airtable Stories:
- [ ] Add "Notion Project ID" (Single Line Text)
- [ ] Add "Project Name" (Single Line Text) - for reference
```

#### **People (Notion) ↔ Storytellers (Airtable)**  
```
Connection Method: Email-based matching + Manual linking
Data Flow: Bidirectional sync
Purpose: Unified contact management

Sync Strategy:
1. Match by email address
2. Sync contact information bidirectionally  
3. Link stories to contact records
4. Maintain consent and preference data in Airtable
```

#### **Organizations (Notion) ↔ Storytellers (Airtable)**
```
Connection Method: Organization name matching
Data Flow: Notion → Airtable (primary)
Purpose: Connect storytellers to partner organizations

Integration:
- Match storyteller organizations to Notion organization records
- Link organization stories to partnership records
- Track story consent by organization
```

## 🛠️ **Implementation Plan**

### **Week 1: Stories Foundation**
- [ ] **Day 1**: Access Airtable Stories and Storytellers tables
- [ ] **Day 2**: Create Airtable MCP integration for Stories
- [ ] **Day 3**: Test Stories data extraction and display
- [ ] **Day 4**: Add Stories section to enhanced projects page
- [ ] **Day 5**: Test project-story connections

### **Week 2: Notion Expansion**  
- [ ] **Day 1-2**: Create Opportunities database in Notion
- [ ] **Day 3-4**: Create Organizations database in Notion
- [ ] **Day 5**: Create People database in Notion
- [ ] **Weekend**: Test all Notion database connections

### **Week 3: Integration Layer**
- [ ] **Day 1-2**: Build cross-platform sync utilities
- [ ] **Day 3**: Implement email-based People/Storytellers matching
- [ ] **Day 4**: Add story linking to projects interface
- [ ] **Day 5**: Create story impact dashboard

### **Week 4: Artifacts & Polish**
- [ ] **Day 1-2**: Create Artifacts database for story media
- [ ] **Day 3**: Implement story media management
- [ ] **Day 4**: Add story search and filtering
- [ ] **Day 5**: Complete testing and documentation

## 📊 **Data Architecture for Stories Integration**

### **Enhanced Projects Page with Stories**
```javascript
Project Card Display:
├── Project Details (from Notion)
├── Financial Metrics (from Notion) 
├── Team Information (from Notion)
├── 📖 Impact Stories Section (from Airtable)
│   ├── Story previews with thumbnails
│   ├── Storyteller information
│   ├── Impact metrics summary
│   └── Link to full story content
└── Related Entities (cross-platform)
```

### **Stories Dashboard (New Page)**
```
URL: /stories
Purpose: Dedicated stories management and showcase
Features:
├── Story gallery with filtering
├── Storyteller directory
├── Project-story mapping
├── Impact metrics aggregation
├── Publication workflow management
└── Story content management
```

### **Storytellers Directory (New Page)**
```
URL: /storytellers  
Purpose: Community voice management
Features:
├── Storyteller profiles
├── Contact management
├── Consent tracking
├── Story portfolio by person
├── Availability scheduling
└── Communication preferences
```

## 🎯 **Story Integration Benefits**

### **For Projects**
- **Impact Evidence**: Real stories demonstrate project outcomes
- **Grant Applications**: Compelling narratives for funding proposals
- **Community Engagement**: Authentic voices build trust
- **Marketing Content**: Ready-made success stories

### **For Organization**
- **Impact Measurement**: Stories provide qualitative metrics
- **Stakeholder Communication**: Personal narratives resonate
- **Team Motivation**: Success stories inspire continued work
- **Knowledge Capture**: Lessons learned through storytelling

### **For Community**
- **Voice Amplification**: Platform for community members
- **Recognition**: Storytellers get acknowledgment
- **Connection**: Stories build community bonds
- **Legacy**: Preserve impact narratives

## 🔧 **Technical Implementation**

### **New Files to Create**
```
airtable-stories-mcp.js - Stories-specific Airtable integration
stories-dashboard.html - Stories management interface  
storytellers-page.html - Storyteller directory
story-project-connector.js - Cross-platform linking utility
story-sync-service.js - Automated story-project matching
```

### **Environment Variables to Add**
```env
# Airtable Stories Configuration
AIRTABLE_STORIES_TABLE=Stories
AIRTABLE_STORYTELLERS_TABLE=Storytellers

# Story Integration Settings  
STORY_SYNC_INTERVAL=3600000 # 1 hour
STORY_AUTO_LINK=true
STORY_PUBLISH_WEBHOOK=your_webhook_url
```

### **Database Schema Extensions**

#### **Enhanced Notion Projects Schema**
```
Add to existing Projects database:
├── 📖 Story IDs (Text) - Comma-separated Airtable Story IDs
├── 📖 Story Summary (Rich Text) - Key story highlights
├── 📖 Impact Metrics (Rich Text) - Quantified story outcomes
├── 📖 Story Themes (Multi-select) - Story categorization
└── 📖 Story Status (Select) - None, Planned, Recorded, Published
```

## 🚀 **Quick Start Action Plan**

### **This Week - Stories Foundation**
1. **Access Airtable Stories**: Verify Stories and Storytellers tables exist
2. **Create Stories Integration**: Build Airtable MCP for stories
3. **Test Data Flow**: Ensure stories can be fetched and displayed
4. **Add to Projects Page**: Show related stories on enhanced projects page

### **Next Week - Database Expansion**  
1. **Opportunities Database**: Create in Notion for pipeline management
2. **Organizations Database**: Create in Notion for partner tracking
3. **People Database**: Create in Notion for contact management

### **Following Weeks - Full Integration**
1. **Cross-Platform Sync**: Build utilities to connect Notion and Airtable
2. **Story Management**: Complete story workflow and publishing tools
3. **Impact Dashboard**: Aggregate story metrics and project outcomes

---

**This checklist creates a comprehensive ecosystem where projects connect to real impact stories, providing compelling evidence of ACT's community impact for grants, partnerships, and stakeholder communication.**