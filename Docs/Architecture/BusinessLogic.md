# 🧠 First Principles: Business Intelligence System

## 🎯 Core Philosophy

**Question**: What do businesses ACTUALLY need to know?

**Answer**: 3 fundamental questions drive all business decisions:

1. **"Do I have money?"** (Cash position)
2. **"Am I making or losing money?"** (Profitability)
3. **"What should I do next?"** (Actions)

Everything else is noise. Let's design the system from these first principles.

---

## 🏗️ First Principles Architecture

### **Principle 1: Single Source of Truth**
**Problem**: Data scattered across Xero, Gmail, bank, receipts, invoices
**Solution**: Unified data model in Supabase with real-time sync

### **Principle 2: Questions → Queries**
**Problem**: Business owners ask questions in plain English
**Solution**: Map natural questions to specific data queries

### **Principle 3: Answers → Actions**
**Problem**: Knowing isn't enough - need to ACT
**Solution**: Every answer includes concrete next steps

---

## 💰 Question 1: "Do I have money?"

### **Sub-Questions**:
- How much cash do I have right now?
- How much is owed to me?
- How much do I owe others?
- When will I run out of money?

### **Data Sources**:
```
Primary: Xero Invoices
├── Accounts Receivable (money coming in)
├── Accounts Payable (money going out)
├── Bank Balance (actual cash)
└── Historical Trends (prediction)
```

### **API Logic**:
```javascript
// GET /api/v2/finance/cash-position
{
  current: {
    bankBalance: 50000,        // From Xero bank feeds
    receivable: 408292,        // Sum(invoices where type=ACCREC, amount_due>0)
    payable: 16538,            // Sum(invoices where type=ACCPAY, amount_due>0)
    netPosition: 391754        // receivable - payable
  },
  forecast: {
    next7days: {
      expected: 15000,         // invoices due within 7 days
      scheduled: -5000         // bills due within 7 days
    },
    next30days: {
      expected: 50000,
      scheduled: -20000
    },
    next90days: {
      expected: 150000,
      scheduled: -60000
    }
  },
  healthScore: 95,             // 0-100 based on runway, trends
  runwayMonths: 12             // months until cash runs out at current burn rate
}
```

### **UI Representation**:
```
💰 MONEY FLOW
┌────────────────────────────────────────┐
│  CURRENT POSITION: $391,754            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  💵 Coming In:  $408,292               │
│  💸 Going Out:  $16,538                │
│                                        │
│  📊 7-DAY FORECAST: +$10,000           │
│  📈 30-DAY FORECAST: +$30,000          │
│                                        │
│  🏃 RUNWAY: 12 months                  │
│  🟢 HEALTH: Excellent (95/100)         │
└────────────────────────────────────────┘
```

### **Actions**:
- 🚨 If runwayMonths < 3: "URGENT: Improve cash collection"
- ⚠️ If forecast.next30days < 0: "WARNING: Cash crunch in 30 days"
- ✅ If healthScore > 80: "All good! Consider growth investment"

---

## 📊 Question 2: "Am I making or losing money?"

### **Sub-Questions**:
- What's my revenue this month/quarter/year?
- What are my expenses?
- What's my profit margin?
- Which customers are most profitable?
- Am I compliant with tax obligations?

### **Data Sources**:
```
Primary: Xero Invoices + BAS
├── Sales Invoices (revenue)
├── Purchase Invoices (expenses)
├── GST Tracking (tax compliance)
└── Customer Analysis (profitability by client)
```

### **API Logic**:
```javascript
// GET /api/v2/finance/profitability?period=current_quarter
{
  period: {
    start: "2025-07-01",
    end: "2025-09-30"
  },
  revenue: {
    total: 674659,              // Sum(ACCREC invoices in period)
    breakdown: [
      { customer: "Ingkerreke Services", amount: 103099, percentage: 15.3 },
      { customer: "ARDS", amount: 89500, percentage: 13.3 }
      // ... more customers
    ]
  },
  expenses: {
    total: 45320,               // Sum(ACCPAY invoices in period)
    breakdown: [
      { category: "Cloud Services", amount: 12500, percentage: 27.6 },
      { category: "Travel", amount: 8900, percentage: 19.6 }
      // ... more categories
    ]
  },
  profitability: {
    grossProfit: 629339,        // revenue - expenses
    margin: 93.3,               // (grossProfit / revenue) * 100
    trend: "increasing"         // compared to previous period
  },
  taxCompliance: {
    gstCollected: 61432.66,     // GST on sales
    gstPaid: 412.79,            // GST on purchases
    netGst: 61019.87,           // owed to ATO
    status: "ready_to_lodge",
    dueDate: "2025-10-28"
  },
  topCustomers: [
    { name: "Ingkerreke Services", revenue: 103099, margin: 95 },
    { name: "ARDS", revenue: 89500, margin: 92 }
  ]
}
```

### **UI Representation**:
```
📊 PROFITABILITY Q3 2025
┌────────────────────────────────────────┐
│  REVENUE:   $674,659                   │
│  EXPENSES:  -$45,320                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  PROFIT:    $629,339 (93.3% margin)    │
│  TREND:     📈 Increasing              │
│                                        │
│  💎 TOP CUSTOMERS:                     │
│  1. Ingkerreke Services  $103K (95%)   │
│  2. ARDS                 $89K (92%)    │
│                                        │
│  🇦🇺 TAX STATUS:                       │
│  GST Owed: $61,019.87                  │
│  Due: Oct 28, 2025                     │
│  Status: ✅ Ready to lodge             │
└────────────────────────────────────────┘
```

### **Actions**:
- 🚨 If taxCompliance.dueDate < 14 days: "URGENT: Lodge BAS by Oct 28"
- ⚠️ If margin < 20%: "WARNING: Low profit margin - review pricing"
- 💡 If topCustomers have high margin: "OPPORTUNITY: Upsell to top 5 customers"

---

## ✅ Question 3: "What should I do next?"

### **Sub-Questions**:
- What's urgent?
- What's overdue?
- What deadlines are coming?
- What opportunities exist?
- What can be automated?

### **Data Sources**:
```
Combined Intelligence:
├── Xero Invoices (overdue, due soon)
├── Gmail Messages (follow-ups needed)
├── BAS Status (compliance deadlines)
├── Receipts (unprocessed)
└── Opportunities (grants, growth)
```

### **API Logic**:
```javascript
// GET /api/v2/autopilot/actions
{
  urgent: [
    {
      id: "bas-lodge",
      type: "compliance",
      title: "Lodge BAS Q3 2025",
      description: "$61,019 GST ready to lodge",
      dueDate: "2025-10-28",
      daysRemaining: 28,
      effort: "quick", // 5 minutes
      automatable: true,
      impact: "Avoid $1,200 late penalty"
    },
    {
      id: "chase-overdue",
      type: "cash_collection",
      title: "Chase 3 overdue invoices",
      description: "$70,620 overdue by 14 days average",
      invoices: ["INV-0275", "INV-0276", "INV-0278"],
      effort: "quick",
      automatable: true,
      impact: "Improve cash flow by $70K"
    }
  ],
  important: [
    {
      id: "process-receipts",
      type: "bookkeeping",
      title: "Process 5 receipts",
      description: "Gmail attachments ready for processing",
      effort: "quick",
      automatable: true,
      impact: "Keep books up-to-date, claim deductions"
    }
  ],
  opportunities: [
    {
      id: "grant-regional-arts",
      type: "funding",
      title: "Regional Arts Fund Grant",
      description: "$10K-$50K available",
      dueDate: "2025-11-15",
      effort: "involved", // 2 hours
      automatable: false,
      impact: "Secure growth funding"
    }
  ]
}
```

### **UI Representation**:
```
🤖 BUSINESS AUTOPILOT
┌────────────────────────────────────────┐
│  🚨 URGENT (2)                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  1. Lodge BAS - $61K GST               │
│     Due: Oct 28 (28 days) | ⚡ Automate│
│                                        │
│  2. Chase 3 overdue invoices - $70K    │
│     14 days late avg | ⚡ Automate     │
│                                        │
│  ⚠️ IMPORTANT (1)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  3. Process 5 receipts                 │
│     Gmail attachments | ⚡ Automate    │
│                                        │
│  💡 OPPORTUNITIES (1)                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  4. Regional Arts Fund Grant           │
│     $10K-$50K | Due Nov 15             │
└────────────────────────────────────────┘
```

### **Actions**:
- One-click "⚡ Automate" for tedious tasks
- Priority sorting (urgent → important → opportunities)
- Time estimates for each action
- Impact measurement

---

## 🏗️ Technical Implementation

### **1. Unified Business Intelligence API**
**File**: `apps/backend/core/src/api/unifiedBusinessIntelligence.js`

```javascript
// GET /api/v2/business/overview
// Returns: Cash position + Profitability + Actions

export default function unifiedBusinessIntelligenceRoutes(app) {

  // OVERVIEW: Answer all 3 questions at once
  app.get('/api/v2/business/overview', async (req, res) => {
    const [cashPosition, profitability, actions] = await Promise.all([
      getCashPosition(),
      getProfitability(),
      getActions()
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      cashPosition,
      profitability,
      actions,
      healthScore: calculateOverallHealth(cashPosition, profitability, actions)
    });
  });

  // CASH POSITION: "Do I have money?"
  app.get('/api/v2/business/cash-position', async (req, res) => {
    const { data: receivables } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCREC')
      .gt('amount_due', 0);

    const { data: payables } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCPAY')
      .gt('amount_due', 0);

    const totalReceivable = receivables.reduce((sum, inv) => sum + inv.amount_due, 0);
    const totalPayable = payables.reduce((sum, inv) => sum + inv.amount_due, 0);

    res.json({
      current: {
        receivable: totalReceivable,
        payable: totalPayable,
        netPosition: totalReceivable - totalPayable
      },
      forecast: await generateForecast(receivables, payables),
      healthScore: calculateHealthScore(totalReceivable, totalPayable),
      runwayMonths: calculateRunway(totalReceivable, totalPayable)
    });
  });

  // PROFITABILITY: "Am I making money?"
  app.get('/api/v2/business/profitability', async (req, res) => {
    const { period = 'current_quarter' } = req.query;
    const { start, end } = getPeriodDates(period);

    const { data: sales } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCREC')
      .gte('date', start)
      .lte('date', end);

    const { data: expenses } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCPAY')
      .gte('date', start)
      .lte('date', end);

    const revenue = sales.reduce((sum, inv) => sum + inv.total, 0);
    const expenseTotal = expenses.reduce((sum, inv) => sum + inv.total, 0);

    res.json({
      period: { start, end },
      revenue: {
        total: revenue,
        breakdown: groupByCustomer(sales)
      },
      expenses: {
        total: expenseTotal,
        breakdown: groupByCategory(expenses)
      },
      profitability: {
        grossProfit: revenue - expenseTotal,
        margin: ((revenue - expenseTotal) / revenue) * 100
      },
      taxCompliance: await getBASStatus()
    });
  });

  // ACTIONS: "What should I do next?"
  app.get('/api/v2/business/actions', async (req, res) => {
    const actions = {
      urgent: [],
      important: [],
      opportunities: []
    };

    // Check BAS due
    const bas = await getBASStatus();
    if (bas && bas.status === 'ready_to_lodge') {
      actions.urgent.push({
        id: 'bas-lodge',
        type: 'compliance',
        title: `Lodge BAS ${bas.period}`,
        description: `$${bas.net_gst.toLocaleString()} GST ready`,
        dueDate: '2025-10-28',
        automatable: true,
        impact: 'Avoid late penalties'
      });
    }

    // Check overdue invoices
    const { data: overdue } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCREC')
      .lt('due_date', new Date().toISOString())
      .gt('amount_due', 0);

    if (overdue && overdue.length > 0) {
      actions.urgent.push({
        id: 'chase-overdue',
        type: 'cash_collection',
        title: `Chase ${overdue.length} overdue invoices`,
        description: `$${overdue.reduce((sum, inv) => sum + inv.amount_due, 0).toLocaleString()}`,
        automatable: true,
        impact: 'Improve cash flow'
      });
    }

    // Check unprocessed receipts
    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('status', 'pending');

    if (receipts && receipts.length > 0) {
      actions.important.push({
        id: 'process-receipts',
        type: 'bookkeeping',
        title: `Process ${receipts.length} receipts`,
        automatable: true,
        impact: 'Keep books current'
      });
    }

    res.json(actions);
  });
}
```

---

## 📊 Database Schema (First Principles)

### **Core Principle**: Separate "What Happened" from "What It Means"

#### **Layer 1: Raw Data (What Happened)**
```sql
-- Direct sync from Xero (no transformations)
xero_invoices (
  id, xero_id, type, contact_name,
  date, due_date, total, amount_due,
  total_tax, status
)

-- Direct sync from Gmail (no transformations)
gmail_messages (
  id, gmail_id, subject, from_email,
  sent_date, importance, has_attachments
)
```

#### **Layer 2: Derived Intelligence (What It Means)**
```sql
-- Calculated from xero_invoices
business_metrics (
  id, date,
  total_receivable, total_payable, net_position,
  revenue_mtd, expenses_mtd, profit_margin,
  health_score, runway_months
)

-- Calculated from multiple sources
business_actions (
  id, type, priority, title, description,
  due_date, automatable, impact,
  source_data_ids -- JSON array of invoice/message IDs
)
```

---

## 🔄 Data Flow (First Principles)

```
1. COLLECT (Sync)
   Xero → xero_invoices (every hour)
   Gmail → gmail_messages (every 5 min)

2. ANALYZE (Transform)
   xero_invoices → business_metrics
   multiple sources → business_actions

3. PRESENT (Display)
   business_metrics → Dashboards
   business_actions → Autopilot

4. ACT (Automate)
   business_actions → Automation APIs
   Automation APIs → Xero/Gmail
```

---

## 🎯 Key Design Decisions

### **1. Cache at the Right Level**
- ❌ Don't cache raw Xero data (changes frequently)
- ✅ Do cache calculated metrics (expensive to compute)
- ✅ Do cache actions list (regenerate every 5 minutes)

### **2. Real-Time vs Batch**
- Real-time: Cash position, overdue invoices
- Batch (hourly): BAS calculation, profitability reports
- Batch (daily): Forecasting, trend analysis

### **3. Automation Boundaries**
- Can automate: Send invoice reminders, process receipts, lodge BAS
- Can't automate: Apply for grants, strategic decisions
- Should suggest: Pricing changes, customer focus

---

## 🚀 Implementation Priority

### **Phase 1: Core Intelligence (Week 1)**
1. ✅ Xero sync working (done)
2. ✅ Gmail sync working (done)
3. ❌ Unified Business Intelligence API
4. ❌ Receipt OCR + matching

### **Phase 2: Actions & Automation (Week 2)**
1. ❌ Business Actions generator
2. ❌ Automated invoice reminders
3. ❌ Automated receipt processing
4. ❌ BAS lodgement automation

### **Phase 3: Predictions (Week 3)**
1. ❌ Cash flow forecasting
2. ❌ Profitability trends
3. ❌ Anomaly detection
4. ❌ Growth recommendations

---

## 💡 First Principles Summary

**Instead of thinking**: "What features should we build?"

**Think**: "What questions do businesses ask, and how do we answer them?"

### **The 3 Universal Questions**:
1. "Do I have money?" → Cash Position API
2. "Am I making money?" → Profitability API
3. "What should I do?" → Actions API

### **Everything Else is Just**:
- Different time horizons (today, this week, this quarter)
- Different aggregations (by customer, by category, by trend)
- Different presentations (charts, tables, alerts)

**Keep it simple. Answer the questions. Show the actions. Automate the boring stuff.**