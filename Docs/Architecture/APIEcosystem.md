# 🔌 API Ecosystem Analysis - Business Autopilot System

## 📊 Current State Analysis

### ✅ **ACTIVE APIs** (Currently Registered in Server)

#### 1. **Xero Intelligence Sync** (`xeroIntelligenceSync.js`)
**Purpose**: Core financial data intelligence for Australian business
**Status**: ✅ Fully operational
**Endpoints**:
- `GET /api/v2/xero/dashboard` - Financial overview (receivables, payables, net position)
- `GET /api/v2/xero/invoices` - Query invoices with filters
- `GET /api/v2/xero/contacts` - Search contacts
- `GET /api/v2/xero/bas` - Current BAS (Business Activity Statement)
- `GET /api/v2/xero/stats` - Sync statistics
- `POST /api/v2/xero/sync/start` - Trigger full sync
- `POST /api/v2/xero/sync/contacts` - Sync contacts only

**Data**:
- 1,416 contacts
- 2,554 invoices
- $61,019.87 GST ready to lodge
- BAS Q3 2025 calculated

**Supports**:
- 💰 Money Flow Dashboard
- 🤖 Business Autopilot (urgent actions)
- 🧾 Receipt Processor (invoice matching)
- 🇦🇺 Business Agent (compliance monitoring)

---

#### 2. **Gmail Intelligence Sync** (`gmailIntelligenceSync.js`)
**Purpose**: Email communication intelligence
**Status**: ✅ Fully operational
**Endpoints**:
- `GET /api/v2/gmail/messages` - Query messages with filters
- `GET /api/v2/gmail/contacts` - Discovered contacts from emails
- `GET /api/v2/gmail/dashboard` - Email intelligence summary
- `GET /api/v2/gmail/stats` - Sync statistics
- `POST /api/v2/gmail/sync/start` - Trigger full sync
- `POST /api/v2/gmail/sync/messages` - Sync messages only
- `POST /api/v2/gmail/sync/contacts` - Sync contacts only

**Data**:
- 22 messages synced
- 5 contacts discovered
- 1 unread message
- Keywords, importance, attachments tracked

**Supports**:
- 💰 Money Flow Dashboard (financial emails)
- 🤖 Business Autopilot (email follow-ups)
- 🧾 Receipt Processor (attachments = receipts!)
- 📧 Relationship Intelligence

---

#### 3. **Integration Monitoring** (`integrationMonitoring.js`)
**Purpose**: Monitor health of all integrations
**Status**: ✅ Active
**Endpoints**:
- `GET /api/v2/integrations/status` - All integration statuses
- `GET /api/v2/integrations/:name/health` - Specific integration health

**Supports**:
- 🤖 Business Autopilot (ecosystem health score)
- System reliability monitoring

---

#### 4. **Financial Webhooks** (`events/financialWebhooks.js`)
**Purpose**: Real-time event notifications
**Status**: ✅ Active
**Endpoints**:
- `POST /api/events/xero/invoice/created` - New invoice webhook
- `POST /api/events/xero/invoice/paid` - Payment webhook
- `POST /api/events/gmail/attachment/received` - Receipt webhook

**Supports**:
- Real-time receipt detection
- Instant invoice notifications
- Automated workflow triggers

---

### 🔮 **HIGH-VALUE APIs TO ACTIVATE**

These APIs exist but aren't currently registered. They would massively enhance the Business Autopilot:

#### 5. **Business Agent Australia** (`businessAgentAustralia.js`)
**Purpose**: Autonomous Australian compliance monitoring
**Status**: 🟡 Disabled (missing dependencies)
**Why Critical**:
- Monitors BAS deadlines automatically
- Discovers grant opportunities (Regional Arts Fund, etc.)
- Australian-specific compliance (GST, PAYG, Super)
- Always-on background intelligence

**Should Power**:
- 🇦🇺 Business Agent Dashboard
- 🤖 Business Autopilot (compliance actions)
- Grant opportunity detection

**Action**: Fix dependencies and re-enable

---

#### 6. **Receipt Intelligence** (`financeReceipts.js`)
**Purpose**: OCR and receipt processing
**Status**: 📁 Exists but not integrated
**Why Critical**:
- Extract vendor, amount, GST from images/PDFs
- Match receipts to Xero invoices
- Auto-file with Xero
- Track receipt processing status

**Should Power**:
- 🧾 Receipt Processor (OCR backend)
- Automated expense recording
- GST claim tracking

**Action**: Integrate OCR library + connect to frontend

---

#### 7. **Contact Intelligence** (`contactIntelligence.js`)
**Purpose**: Unified contact management across systems
**Status**: 📁 Exists but not integrated
**Why Critical**:
- Merge contacts from Gmail + Xero + LinkedIn
- Track relationship health
- Last interaction tracking
- Suggest follow-up timing

**Should Power**:
- 📧 Relationship Intelligence
- 🤖 Business Autopilot (relationship actions)
- Contact deduplication

**Action**: Connect to Gmail + Xero contact data

---

#### 8. **Relationship Intelligence** (`relationship-intelligence.js`)
**Purpose**: Deep relationship analysis
**Status**: 📁 Exists but not integrated
**Why Critical**:
- Analyze email sentiment
- Track project mentions
- Identify warm vs cold relationships
- Suggest re-engagement strategies

**Should Power**:
- 🤖 Business Autopilot (relationship actions)
- Email follow-up automation
- Opportunity detection

**Action**: Connect to Gmail intelligence data

---

#### 9. **Financial Intelligence Recommendations** (`financialIntelligenceRecommendations.js`)
**Purpose**: AI-powered financial insights
**Status**: 📁 Exists but not integrated
**Why Critical**:
- Cash flow forecasting
- Expense optimization suggestions
- Revenue opportunity detection
- Anomaly alerts (unusual expenses)

**Should Power**:
- 💰 Money Flow Dashboard (predictions)
- 🤖 Business Autopilot (opportunity actions)
- Growth recommendations

**Action**: Train models on Xero historical data

---

#### 10. **Google Calendar** (`google-calendar.js`)
**Purpose**: Meeting and event intelligence
**Status**: 📁 Exists but not integrated
**Why Critical**:
- Track client meetings
- Connect meetings to contacts/projects
- Meeting preparation context
- Follow-up reminders

**Should Power**:
- 🤖 Business Autopilot (meeting prep actions)
- 📧 Relationship Intelligence
- Contact interaction timeline

**Action**: Complete OAuth + sync setup

---

### 📋 **OTHER AVAILABLE APIs** (100+ files)

#### **Community & Projects**
- `community.js` - Community management
- `ecosystemData.js` - Ecosystem coordination
- `projectContactLinkage.js` - Link projects to contacts

#### **Bookkeeping**
- `bookkeeping.js` - Core bookkeeping logic
- `bookkeepingNotifications.js` - Deadline alerts
- `communityBookkeeping.js` - Community-specific bookkeeping

#### **Compliance**
- `compliance-dashboard.js` - Compliance monitoring
- `valuesCompliance.js` - Values-based compliance
- `dataSovereignty.js` - Data sovereignty tracking

#### **Intelligence & Analytics**
- `businessIntelligence.js` - Business insights
- `dataIntelligence.js` - Data analysis
- `opportunityScout.js` - Opportunity detection
- `decisionIntelligence.js` - Decision support

#### **Integration**
- `linkedin.js` - LinkedIn integration
- `notion-proxy.js` - Notion integration
- `supabase-crm.js` - Supabase CRM

#### **Monitoring**
- `systemHealth.js` - System health monitoring
- `observability.js` - Observability platform
- `performanceDashboard.js` - Performance metrics

---

## 🎯 **API → Dashboard Mapping**

### **🤖 Business Autopilot Dashboard**
**Current Data Sources**:
- ✅ Xero Intelligence (invoices, BAS, contacts)
- ✅ Gmail Intelligence (messages, importance)

**Needs Integration**:
- ❌ Business Agent Australia (compliance monitoring)
- ❌ Financial Intelligence Recommendations (predictions)
- ❌ Contact Intelligence (relationship health)
- ❌ Receipt Intelligence (unprocessed receipts)

**Action Flow**:
```
1. Fetch Xero invoices → Generate "Chase overdue" action
2. Fetch Gmail messages → Generate "Follow-up emails" action
3. Fetch BAS status → Generate "Lodge BAS" action
4. (FUTURE) Fetch receipts → Generate "Process receipts" action
5. (FUTURE) Fetch compliance → Generate "Upcoming deadlines" action
```

---

### **💰 Money Flow Dashboard**
**Current Data Sources**:
- ✅ Xero Dashboard (receivable, payable, net position)
- ✅ Xero Invoices (recent, overdue, due soon)
- ✅ Gmail Messages (financial emails)

**Needs Integration**:
- ❌ Financial Intelligence Recommendations (cash flow forecast)
- ❌ Bank feeds (actual bank balance)
- ❌ Receipt Intelligence (pending expenses)

**Data Flow**:
```
1. GET /api/v2/xero/dashboard → Hero metrics ($408K receivable)
2. GET /api/v2/xero/invoices?status=overdue → Red urgent zone
3. GET /api/v2/xero/invoices?due_within=7days → Yellow warning zone
4. GET /api/v2/gmail/messages?keywords=invoice,payment → Email intelligence
5. (FUTURE) GET /api/v2/finance/forecast → 90-day prediction
```

---

### **🧾 Receipt Processor**
**Current Data Sources**:
- ✅ Mock OCR (simulated data)

**Needs Integration**:
- ❌ Receipt Intelligence API (real OCR)
- ❌ Xero invoice matching
- ❌ Gmail attachment sync

**Automation Flow**:
```
1. User drops receipt PDF → Frontend upload
2. POST /api/v2/receipts/upload → Store in Supabase
3. POST /api/v2/receipts/process → OCR extraction
   → Returns: { vendor, amount, gst, date }
4. POST /api/v2/receipts/match → Find Xero invoice
   → Returns: { matchedInvoice: "INV-0273", confidence: 0.95 }
5. POST /api/v2/receipts/approve → Record in Xero
   → Updates BAS GST calculation
   → Marks receipt as "processed"
```

---

### **🇦🇺 Business Agent Dashboard**
**Current Data Sources**:
- ❌ DISABLED (needs Business Agent Australia API)

**Should Use**:
- ❌ Business Agent Australia (monitoring status)
- ❌ Compliance Dashboard (deadline tracking)
- ❌ Opportunity Scout (grant discovery)

**Target Flow**:
```
1. GET /api/v2/agents/business-australia/status → Agent health
2. GET /api/v2/agents/business-australia/analyze/compliance → BAS, PAYG, Super deadlines
3. GET /api/v2/agents/business-australia/analyze/opportunities → Grant opportunities
4. POST /api/v2/agents/business-australia/start → Start background monitoring
```

---

## 🚀 **Priority Integration Plan**

### **Phase 1: Critical Automations (Week 1)**

#### **1A. Receipt OCR Backend**
**File**: `financeReceipts.js`
**Action**: Connect Google Cloud Vision or Tesseract
**Endpoints to Create**:
- `POST /api/v2/receipts/upload` - Upload image/PDF
- `POST /api/v2/receipts/process` - OCR extraction
- `POST /api/v2/receipts/match` - Match to Xero invoice
- `POST /api/v2/receipts/approve` - Record in Xero

**Impact**: Receipts go from 5 min → 5 seconds

---

#### **1B. Re-enable Business Agent Australia**
**File**: `businessAgentAustralia.js`
**Action**: Fix dependencies, reconnect to Xero/Gmail
**Endpoints to Enable**:
- `GET /api/v2/agents/business-australia/status`
- `GET /api/v2/agents/business-australia/analyze/compliance`
- `GET /api/v2/agents/business-australia/analyze/opportunities`
- `POST /api/v2/agents/business-australia/start`

**Impact**: Compliance monitoring becomes autonomous

---

#### **1C. Gmail Attachment → Receipt Pipeline**
**Files**: `gmailIntelligenceSync.js` + `financeReceipts.js`
**Action**: When Gmail syncs, detect PDF attachments → auto-process as receipts
**Flow**:
```javascript
1. Gmail sync finds new message with PDF attachment
2. Download attachment to temp storage
3. POST to /api/v2/receipts/upload automatically
4. Frontend shows "3 new receipts ready to review"
```

**Impact**: Never manually find receipts again

---

### **Phase 2: Intelligent Automation (Week 2)**

#### **2A. Automated Invoice Reminders**
**New Endpoint**: `POST /api/v2/xero/invoices/:id/remind`
**Logic**:
```javascript
1. Check invoice overdue status
2. Generate personalized email via Gmail API
3. Include Xero payment link
4. Track email sent timestamp
5. Schedule follow-up +7 days if still unpaid
```

**Integration Points**:
- Xero Intelligence (invoice data)
- Gmail Intelligence (send email)
- Business Autopilot (trigger action)

**Impact**: 30% faster payments, zero manual chasing

---

#### **2B. Contact Intelligence Hub**
**File**: `contactIntelligence.js`
**Action**: Merge contacts from Gmail + Xero
**Endpoints**:
- `GET /api/v2/contacts` - Unified contact list
- `GET /api/v2/contacts/:id` - Contact profile with history
- `GET /api/v2/contacts/:id/interactions` - All touchpoints
- `POST /api/v2/contacts/:id/merge` - Merge duplicates

**Impact**: Single source of truth for relationships

---

#### **2C. Financial Forecasting**
**File**: `financialIntelligenceRecommendations.js`
**Action**: Analyze Xero historical data
**Endpoints**:
- `GET /api/v2/finance/forecast` - 90-day cash flow prediction
- `GET /api/v2/finance/insights` - AI recommendations
- `GET /api/v2/finance/anomalies` - Unusual expenses

**Impact**: Predict cash crunches 2 weeks early

---

### **Phase 3: Relationship Intelligence (Week 3)**

#### **3A. Relationship Health Tracking**
**File**: `relationship-intelligence.js`
**Endpoints**:
- `GET /api/v2/relationships` - All relationships with health scores
- `GET /api/v2/relationships/:id/timeline` - Interaction timeline
- `GET /api/v2/relationships/needing-attention` - Cold relationships

**Impact**: Never drop important relationships

---

#### **3B. Google Calendar Integration**
**File**: `google-calendar.js`
**Endpoints**:
- `GET /api/v2/calendar/events` - Upcoming meetings
- `GET /api/v2/calendar/events/:id/context` - Meeting prep info
- `POST /api/v2/calendar/events/:id/followup` - Auto-schedule follow-up

**Impact**: Always prepared for meetings

---

#### **3C. Opportunity Detection**
**File**: `opportunityScout.js`
**Endpoints**:
- `GET /api/v2/opportunities` - Detected opportunities
- `GET /api/v2/opportunities/grants` - Grant deadlines
- `GET /api/v2/opportunities/partnerships` - Partnership suggestions

**Impact**: Capture revenue opportunities automatically

---

## 📊 **API Dependency Graph**

```
┌──────────────────────────────────────────────────┐
│         BUSINESS AUTOPILOT (Orchestrator)        │
└───────────────────┬──────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼─────────┐    ┌───────▼──────────┐
│  DATA SOURCES   │    │  ACTION ENGINES  │
│  (Read-Only)    │    │  (Write/Modify)  │
└───────┬─────────┘    └───────┬──────────┘
        │                       │
    ┌───┴───┐               ┌───┴───┐
    │       │               │       │
┌───▼──┐ ┌──▼──┐      ┌────▼───┐ ┌▼────┐
│ Xero │ │Gmail│      │Receipt │ │Email│
│ Sync │ │Sync │      │  OCR   │ │Send │
└──────┘ └─────┘      └────────┘ └─────┘
    │       │               │       │
    └───┬───┘               └───┬───┘
        │                       │
┌───────▼───────────────────────▼────────┐
│          SUPABASE (Storage)            │
│  • xero_invoices (2,554 records)       │
│  • xero_contacts (1,416 records)       │
│  • gmail_messages (22 records)         │
│  • receipts (to be created)            │
└────────────────────────────────────────┘
```

---

## 🎯 **Success Metrics by Integration**

### **Current Performance**
- ✅ Xero sync: 2,554 invoices in 11 minutes
- ✅ Gmail sync: 22 messages in 8 seconds
- ✅ Frontend load: <500ms
- ❌ Receipt processing: Manual (target: <5s)
- ❌ Invoice reminders: Manual (target: automated)

### **Target Performance (4 weeks)**
- 🎯 Receipt processing: 5 seconds (automated OCR)
- 🎯 Invoice reminders: 100% automated
- 🎯 Compliance monitoring: 24/7 autonomous
- 🎯 Cash flow forecast: 90-day predictions
- 🎯 Relationship health: Real-time tracking

---

## 🛠️ **Quick Wins (Can Do Today)**

### **1. Re-enable Business Agent**
```bash
# Check dependencies
cd apps/backend/core/src/api
grep -r "import.*businessAgentAustralia" .

# Uncomment in stable-real-data-server.js
import businessAgentAustraliaRoutes from './core/src/api/businessAgentAustralia.js';
businessAgentAustraliaRoutes(app);
```

### **2. Connect Receipt API Skeleton**
```bash
# Create receipt endpoints
touch apps/backend/core/src/api/receiptProcessor.js

# Register in server
import receiptProcessorRoutes from './core/src/api/receiptProcessor.js';
receiptProcessorRoutes(app);
```

### **3. Gmail Attachment Detection**
```javascript
// In gmailIntelligenceSync.js, when processing messages:
if (message.has_attachments && message.attachment_names.includes('.pdf')) {
  // Emit event for receipt processing
  eventEmitter.emit('receipt:detected', {
    messageId: message.gmail_id,
    attachments: message.attachment_names
  });
}
```

---

## 🎉 **Bottom Line**

**Current Reality**:
- 4 APIs active (Xero, Gmail, Integration Monitoring, Financial Webhooks)
- 100+ APIs exist but unused
- Frontend pulling from 2 data sources

**Opportunity**:
- 10 high-value APIs ready to activate
- Would unlock full autopilot capabilities
- 80% of bookkeeping could be automated

**Next Action**:
1. Re-enable Business Agent Australia (compliance monitoring)
2. Build Receipt OCR endpoint (receipt automation)
3. Connect Contact Intelligence (relationship tracking)

**The ecosystem is READY - we just need to connect the dots! 🚀**