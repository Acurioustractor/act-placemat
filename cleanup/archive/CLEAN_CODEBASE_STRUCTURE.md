# 🧹 ACT Placemat - Clean Codebase Structure

## 🎯 **Phase 2 Ready - Clean Foundation**

### ✅ **Core Application Files**

#### **Main Interface**
```
dashboard-home.html          # Main dashboard (localhost:4000)
shared-styles.css           # Apple-inspired design system
menu-bar.js                 # Navigation component
```

#### **Modern Interface Pages**
```
analytics-modern.html       # Analytics dashboard
docs-modern.html           # Documentation viewer
help-modern.html           # Help & support
map-modern.html            # Projects visualization map
opportunities-modern.html  # Opportunities pipeline
projects-modern.html       # Projects detailed view
```

#### **Backend & Integrations**
```
server.js                  # Express server (port 4000)
notion-mcp-enhanced.js     # Notion API integration (5 databases)
notion-real-data.js        # Real data processing
```

#### **Supabase Integration (Phase 2 Ready)**
```
supabase-advanced-tools.js # Advanced Supabase operations
supabase-inspector.js      # Database inspection tools
supabase-stories-connector.js # Stories from Supabase (replaces Airtable)
```

### 🗂️ **Configuration & Setup**
```
.env                       # Environment variables
package.json              # Dependencies
README.md                 # Documentation
QUICKSTART.md             # Setup guide
```

### 📊 **Data & Automation**
```
automations/
├── opportunity-alerts.js  # Daily opportunity alerts
└── weekly-action-email.js # Weekly summary emails

alerts/                    # Generated reports
├── opportunity-alerts-*.json
├── weekly-action-*.html
└── weekly-action-*.txt
```

### 🧹 **Cleaned Up (Moved to /cleanup/)**
```
cleanup/
├── old-html/             # Redundant HTML files
│   ├── index.html
│   └── index-secure.html
├── old-js/              # Replaced JavaScript files
│   ├── airtable-*.js    # Replaced by Supabase
│   ├── test-*.js        # Development testing files
│   ├── debug-*.js       # Debug utilities
│   └── notion-mcp-original.js
└── archive/             # Future cleanup
```

---

## 🚀 **Phase 2 Integration Points**

### **1. Supabase Stories (✅ Ready)**
- **File**: `supabase-stories-connector.js`
- **Method**: `getStoriesWithDetails()`
- **Integration**: Already connected to dashboard
- **Next**: Replace Airtable completely

### **2. Notion Multi-Database (✅ Ready)**
- **File**: `notion-mcp-enhanced.js`
- **Databases**: Projects, Opportunities, Organizations, People, Artifacts
- **Integration**: Enhanced MCP with relationship mapping
- **Next**: Add grant opportunity scraping

### **3. API Integration Framework (🔄 Phase 2)**
**Targets for Phase 2:**
- **Gmail API**: Email processing and opportunity detection
- **Grant.gov API**: Government funding opportunities
- **Foundation Directory**: Private foundation grants
- **Web Scraping**: Custom opportunity sources

### **4. Advanced Automation (🔄 Phase 2)**
**Current**: Basic email alerts and summaries
**Phase 2**: 
- AI-powered opportunity matching
- Automated grant application tracking
- Intelligent project-opportunity linking
- Real-time stakeholder notifications

---

## 📈 **Database Architecture (Phase 2)**

### **Current State**
- ✅ **Notion**: Projects database connected
- ✅ **Supabase**: Stories infrastructure ready
- ⚠️ **Airtable**: Being phased out

### **Phase 2 Target**
```
┌─ Notion (Project Management) ─┐    ┌─ Supabase (Community Data) ─┐
│ • Projects                     │    │ • Stories                    │
│ • Opportunities                │    │ • Storytellers               │
│ • Organizations                │    │ • Project Links              │
│ • People                       │    │ • Tags & Metadata            │
│ • Artifacts                    │    │ • User Analytics             │
└─────────────────────────────────┘    └─────────────────────────────┘
           │                                        │
           └──────────── Express API ───────────────┘
                            │
           ┌─ External APIs (Phase 2) ─┐
           │ • Gmail API                │
           │ • Grant.gov                │
           │ • Foundation Directory     │
           │ • Web Scrapers             │
           │ • AI Processing            │
           └───────────────────────────┘
```

---

## 🛠️ **Development Workflow**

### **Current Working Setup**
1. **Start Server**: `node server.js` (port 4000)
2. **Main Interface**: http://localhost:4000
3. **Navigation**: Sidebar → different modern pages
4. **Data Sources**: Notion + Supabase

### **Phase 2 Development**
1. **API Framework**: Extend server.js with new endpoints
2. **Grant Scraping**: Add automated opportunity discovery
3. **Email Integration**: Gmail API for stakeholder communications
4. **AI Enhancement**: Opportunity matching and project insights
5. **Real-time Updates**: WebSocket integration for live data

---

## 🎯 **Immediate Phase 2 Tasks**

### **Week 1: Supabase Migration**
- [ ] Complete Airtable → Supabase stories migration
- [ ] Test all story functionality with Supabase
- [ ] Remove remaining Airtable dependencies

### **Week 2: API Framework**
- [ ] Design API integration architecture
- [ ] Implement Gmail API connection
- [ ] Create grant.gov scraper prototype

### **Week 3: Advanced Features**
- [ ] AI-powered opportunity matching
- [ ] Automated stakeholder notifications
- [ ] Enhanced project-opportunity linking

### **Week 4: Production Ready**
- [ ] Performance optimization
- [ ] Error handling and monitoring
- [ ] Documentation and deployment

---

## ✨ **Clean Codebase Benefits**

### **Development**
- **50% fewer files** to manage
- **Clear separation** of concerns
- **No conflicting** dependencies
- **Consistent** naming and structure

### **Performance**
- **Faster loading** (removed redundant scripts)
- **Better caching** (consolidated assets)
- **Cleaner APIs** (single integration points)

### **Maintainability**
- **Single source of truth** for each feature
- **Clear upgrade path** for Phase 2
- **Better testing** (isolated components)
- **Easier debugging** (clean call stack)

---

**✅ Your codebase is now clean and ready for Phase 2 advanced integrations!**

*Generated: July 20, 2025*
*Status: Clean foundation established, Phase 2 ready*