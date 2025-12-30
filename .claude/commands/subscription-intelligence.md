# Subscription Intelligence Hub

**Purpose**: Comprehensive subscription discovery, reconciliation, and optimization across all ACT data sources (Gmail, Google Workspace, Xero, Calendar).

**Key Goals**:
1. Find ALL subscription receipts across all ACT email accounts
2. Reconcile receipts with Xero transactions (match paid vs unpaid)
3. Identify outstanding/unreconciled subscriptions
4. Estimate annual subscription costs and find savings opportunities
5. Centralize invoices to accounts@act.place for easier management

---

## Data Sources

### 1. **Google Workspace Accounts** (act.place domain)
- **Primary**: nicholas@act.place (personal admin)
- **Shared**: hi@act.place (general inquiries)
- **Finance**: accounts@act.place (NEW - invoices/receipts consolidation)
- **Access**: Via Google Workspace Admin API

### 2. **Gmail Personal Accounts**
- Currently scanning: ben.knight.au@gmail.com
- Integration: OAuth2 tokens in `.gmail_tokens.json`

### 3. **Xero Accounting**
- **Bank Accounts**:
  - NAB Visa ACT #8815 (credit card - 1,091 SPEND transactions)
  - NM Personal (2,867 SPEND transactions)
  - NJ Marchesi T/as ACT Everyday (116 SPEND)
  - Heritage Visa CC (24 SPEND)
- **Tenant ID**: `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`
- **Data Range**: 2023-07-01 to 2025-07-09 (needs sync update)

### 4. **Google Calendar**
- Event data for subscription renewal reminders
- Potential: Auto-create calendar events for upcoming renewals

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Subscription Intelligence Hub                │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐         ┌────▼────┐
    │ Gmail   │          │  Xero   │         │Calendar │
    │ Scanner │          │Reconcile│         │ Events  │
    └────┬────┘          └────┬────┘         └────┬────┘
         │                    │                    │
         │    ┌───────────────▼──────────┐         │
         └────►  Multi-Source Matcher    ◄─────────┘
              │  (Fuzzy Vendor Matching) │
              └───────────┬──────────────┘
                          │
              ┌───────────▼──────────────┐
              │  Reconciliation Engine   │
              │  - Paid vs Unpaid        │
              │  - Outstanding Invoices  │
              │  - Duplicate Detection   │
              └───────────┬──────────────┘
                          │
              ┌───────────▼──────────────┐
              │  Analytics & Insights    │
              │  - Annual Cost Estimates │
              │  - Savings Opportunities │
              │  - Usage Analysis        │
              └──────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Google Workspace Integration (Today)

#### 1.1 Set up Google Workspace Admin API
```bash
# Enable APIs in Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/library
2. Enable: "Admin SDK API"
3. Enable: "Gmail API" (for multi-account)
4. Create Service Account with domain-wide delegation
5. Grant scopes in Workspace Admin:
   - https://www.googleapis.com/auth/admin.directory.user.readonly
   - https://www.googleapis.com/auth/gmail.readonly
```

#### 1.2 Create Multi-Account Gmail Scanner
**File**: `/apps/backend/subscription-tracker/services/gmail/workspaceScanner.js`

```javascript
import { google } from 'googleapis';

export class WorkspaceScanner {
  constructor() {
    this.domain = 'act.place';
    this.accounts = [
      'nicholas@act.place',
      'hi@act.place',
      'accounts@act.place'
    ];
  }

  /**
   * Scan all ACT Workspace accounts for subscription receipts
   * Uses service account with domain-wide delegation
   */
  async scanAllAccounts() {
    const allReceipts = [];

    for (const email of this.accounts) {
      console.log(`[Workspace] Scanning ${email}...`);

      // Impersonate user with service account
      const gmail = await this.getGmailClient(email);
      const receipts = await this.scanAccount(gmail, email);

      allReceipts.push({
        account: email,
        receipts,
        count: receipts.length
      });
    }

    return allReceipts;
  }

  async getGmailClient(userEmail) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: userEmail  // Impersonate this user
    });

    return google.gmail({ version: 'v1', auth });
  }

  async scanAccount(gmail, accountEmail) {
    // Same logic as ReceiptScanner but for specific account
    const queries = [
      '(subscription OR recurring) AND (receipt OR invoice)',
      '"payment confirmation" OR "billing statement"',
      'from:(accounts@) OR from:(billing@) OR from:(noreply@)'
    ];

    const messages = [];
    for (const query of queries) {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `${query} after:2024/01/01`,
        maxResults: 100
      });

      if (response.data.messages) {
        messages.push(...response.data.messages);
      }
    }

    return this.deduplicateMessages(messages);
  }
}
```

---

### Phase 2: Xero Reconciliation Engine

#### 2.1 Receipt-to-Transaction Matcher
**File**: `/apps/backend/subscription-tracker/services/reconciliation/matcher.js`

```javascript
export class SubscriptionMatcher {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Match Gmail receipts with Xero transactions
   * Algorithm:
   * 1. Fuzzy match vendor names (Levenshtein distance)
   * 2. Match amounts within 5% tolerance
   * 3. Match dates within 7-day window
   */
  async reconcile(gmailReceipts, xeroTransactions) {
    const matched = [];
    const unmatched = {
      receipts: [],    // Paid in Gmail but not in Xero (unpaid invoices)
      transactions: [] // Paid in Xero but no receipt (missing documentation)
    };

    for (const receipt of gmailReceipts) {
      const match = this.findBestMatch(receipt, xeroTransactions);

      if (match) {
        matched.push({
          receipt,
          transaction: match,
          confidence: match.matchConfidence,
          status: 'reconciled'
        });

        // Remove matched transaction to avoid duplicates
        xeroTransactions = xeroTransactions.filter(t => t.id !== match.id);
      } else {
        unmatched.receipts.push(receipt);
      }
    }

    // Remaining transactions have no receipts
    unmatched.transactions = xeroTransactions;

    return { matched, unmatched };
  }

  findBestMatch(receipt, transactions) {
    const vendor = this.extractVendor(receipt);
    const amount = this.extractAmount(receipt);
    const date = new Date(receipt.date);

    let bestMatch = null;
    let bestScore = 0;

    for (const txn of transactions) {
      const score = this.calculateMatchScore({
        vendorSimilarity: this.fuzzyMatch(vendor, txn.contact_name),
        amountMatch: Math.abs(amount - txn.total) / amount < 0.05, // 5% tolerance
        dateMatch: Math.abs(date - new Date(txn.date)) < 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      if (score > bestScore && score > 0.7) { // 70% minimum confidence
        bestScore = score;
        bestMatch = { ...txn, matchConfidence: score };
      }
    }

    return bestMatch;
  }

  calculateMatchScore({ vendorSimilarity, amountMatch, dateMatch }) {
    return (
      (vendorSimilarity * 0.5) +  // Vendor name most important
      (amountMatch ? 0.3 : 0) +    // Amount match
      (dateMatch ? 0.2 : 0)        // Date proximity
    );
  }

  fuzzyMatch(str1, str2) {
    // Levenshtein distance implementation
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLen); // 0-1 similarity score
  }

  levenshteinDistance(s1, s2) {
    const matrix = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null)
    );

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }

    return matrix[s2.length][s1.length];
  }
}
```

---

### Phase 3: Outstanding Invoices Tracker

#### 3.1 Unpaid Subscription Detector
**File**: `/apps/backend/subscription-tracker/services/reconciliation/outstandingTracker.js`

```javascript
export class OutstandingTracker {
  /**
   * Identify subscriptions that have receipts but no Xero payment
   * These are UNPAID invoices that need attention
   */
  async findOutstanding(reconciliationResult) {
    const outstanding = reconciliationResult.unmatched.receipts.map(receipt => ({
      vendor: this.extractVendor(receipt),
      amount: this.extractAmount(receipt),
      dueDate: this.extractDueDate(receipt),
      receiptDate: new Date(receipt.date),
      daysOverdue: this.calculateOverdue(receipt),
      priority: this.calculatePriority(receipt),
      actions: this.suggestActions(receipt)
    }));

    // Sort by priority (overdue first, then by amount)
    return outstanding.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.amount - a.amount;
    });
  }

  calculateOverdue(receipt) {
    const dueDate = this.extractDueDate(receipt);
    if (!dueDate) return 0;

    const today = new Date();
    const diffTime = today - dueDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  calculatePriority(receipt) {
    const daysOverdue = this.calculateOverdue(receipt);

    if (daysOverdue > 30) return 3; // Critical
    if (daysOverdue > 7) return 2;  // High
    if (daysOverdue > 0) return 1;  // Medium
    return 0; // Not yet due
  }

  suggestActions(receipt) {
    const actions = [];
    const daysOverdue = this.calculateOverdue(receipt);

    if (daysOverdue > 30) {
      actions.push('URGENT: Contact vendor about overdue payment');
      actions.push('Check if subscription should be cancelled');
    } else if (daysOverdue > 7) {
      actions.push('Pay invoice to avoid service interruption');
      actions.push('Set up auto-payment if available');
    } else {
      actions.push('Schedule payment before due date');
    }

    return actions;
  }
}
```

---

### Phase 4: Annual Cost Analytics

#### 4.1 Subscription Cost Estimator
**File**: `/apps/backend/subscription-tracker/services/analytics/costEstimator.js`

```javascript
export class CostEstimator {
  /**
   * Estimate annual subscription costs and identify savings
   */
  async estimateAnnualCosts(subscriptions) {
    const estimates = subscriptions.map(sub => {
      const annualCost = this.calculateAnnualCost(sub);
      const usage = this.estimateUsage(sub);
      const valueScore = usage / annualCost; // Value per dollar

      return {
        vendor: sub.vendor,
        frequency: sub.frequency,
        monthlyCost: sub.amount,
        annualCost,
        usage: usage,
        valueScore,
        recommendation: this.getRecommendation(valueScore, sub),
        potentialSavings: this.calculateSavings(sub, valueScore)
      };
    });

    const summary = {
      totalAnnual: estimates.reduce((sum, e) => sum + e.annualCost, 0),
      highValue: estimates.filter(e => e.valueScore > 1.0),
      lowValue: estimates.filter(e => e.valueScore < 0.3),
      potentialSavings: estimates.reduce((sum, e) => sum + e.potentialSavings, 0),
      recommendations: this.generateRecommendations(estimates)
    };

    return { estimates, summary };
  }

  calculateAnnualCost(subscription) {
    const amount = subscription.amount || 0;

    switch (subscription.frequency) {
      case 'monthly':
        return amount * 12;
      case 'quarterly':
        return amount * 4;
      case 'yearly':
        return amount;
      default:
        // Estimate based on occurrences over time range
        const pattern = subscription.pattern;
        if (pattern && pattern.avgInterval) {
          const chargesPerYear = 365 / pattern.avgInterval;
          return amount * chargesPerYear;
        }
        return amount * 12; // Default to monthly
    }
  }

  estimateUsage(subscription) {
    // Placeholder - in future, integrate with:
    // - Calendar events (meeting frequency)
    // - Browser history (tool usage)
    // - API usage data
    // For now, use confidence as proxy
    return subscription.confidence || 0.5;
  }

  getRecommendation(valueScore, subscription) {
    if (valueScore < 0.2) {
      return {
        action: 'CANCEL',
        reason: 'Low value - rarely used',
        priority: 'high'
      };
    } else if (valueScore < 0.5) {
      return {
        action: 'REVIEW',
        reason: 'Moderate value - consider alternatives',
        priority: 'medium'
      };
    } else {
      return {
        action: 'KEEP',
        reason: 'High value - frequently used',
        priority: 'low'
      };
    }
  }

  calculateSavings(subscription, valueScore) {
    if (valueScore < 0.2) {
      // Could save full annual cost
      return this.calculateAnnualCost(subscription);
    } else if (valueScore < 0.5) {
      // Could save 50% by downgrading
      return this.calculateAnnualCost(subscription) * 0.5;
    }
    return 0;
  }

  generateRecommendations(estimates) {
    const recs = [];

    // Find duplicates (similar vendors)
    const duplicates = this.findDuplicateServices(estimates);
    if (duplicates.length > 0) {
      recs.push({
        type: 'CONSOLIDATE',
        message: `Found ${duplicates.length} duplicate services - consolidate to save ${this.calculateDuplicateSavings(duplicates)}`,
        items: duplicates
      });
    }

    // Find unused subscriptions
    const unused = estimates.filter(e => e.valueScore < 0.2);
    if (unused.length > 0) {
      recs.push({
        type: 'CANCEL_UNUSED',
        message: `Cancel ${unused.length} unused subscriptions to save $${unused.reduce((sum, e) => sum + e.annualCost, 0).toFixed(2)}/year`,
        items: unused
      });
    }

    // Find annual plan opportunities
    const monthlyHighUsage = estimates.filter(e =>
      e.frequency === 'monthly' && e.valueScore > 0.8
    );
    if (monthlyHighUsage.length > 0) {
      recs.push({
        type: 'SWITCH_TO_ANNUAL',
        message: `Switch ${monthlyHighUsage.length} high-usage subscriptions to annual plans to save ~15-20%`,
        items: monthlyHighUsage
      });
    }

    return recs;
  }
}
```

---

## API Endpoints

### New Routes to Add

```javascript
// GET /api/v1/subscriptions/workspace/scan
// Scan all Google Workspace accounts
router.get('/workspace/scan', async (req, res) => {
  const scanner = new WorkspaceScanner();
  const results = await scanner.scanAllAccounts();

  return apiResponse(res, {
    accounts: results,
    totalReceipts: results.reduce((sum, r) => sum + r.count, 0)
  });
});

// POST /api/v1/subscriptions/reconcile
// Reconcile Gmail receipts with Xero transactions
router.post('/reconcile', async (req, res) => {
  const { tenantId } = req.query;

  // 1. Get Gmail receipts
  const gmailScanner = new ReceiptScanner();
  const receipts = await gmailScanner.scanForReceipts({ maxResults: 500 });

  // 2. Get Xero transactions
  const xeroAnalyzer = new TransactionAnalyzer(supabase);
  const transactions = await xeroAnalyzer.getAllTransactions(tenantId);

  // 3. Match them
  const matcher = new SubscriptionMatcher(supabase);
  const result = await matcher.reconcile(receipts, transactions);

  return apiResponse(res, result);
});

// GET /api/v1/subscriptions/outstanding
// Get unpaid invoices
router.get('/outstanding', async (req, res) => {
  const tracker = new OutstandingTracker();
  const reconciliation = await getLatestReconciliation();
  const outstanding = await tracker.findOutstanding(reconciliation);

  return apiResponse(res, {
    count: outstanding.length,
    total: outstanding.reduce((sum, o) => sum + o.amount, 0),
    items: outstanding
  });
});

// GET /api/v1/subscriptions/analytics/annual-cost
// Estimate annual costs and savings
router.get('/analytics/annual-cost', async (req, res) => {
  const { tenantId } = req.query;

  const subscriptions = await getAllSubscriptions(tenantId);
  const estimator = new CostEstimator();
  const analysis = await estimator.estimateAnnualCosts(subscriptions);

  return apiResponse(res, analysis);
});
```

---

## Dashboard Enhancements

### New Components

**File**: `/apps/frontend/src/components/SubscriptionReconciliation.tsx`

```typescript
interface ReconciliationDashboardProps {
  tenantId: string;
}

export function SubscriptionReconciliation({ tenantId }: ReconciliationDashboardProps) {
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReconciliation = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/subscriptions/reconcile?tenantId=${tenantId}`, {
      method: 'POST'
    });
    const data = await response.json();
    setReconciliation(data.data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subscription Reconciliation</h2>
        <button onClick={runReconciliation} disabled={loading}>
          {loading ? 'Reconciling...' : 'Run Reconciliation'}
        </button>
      </div>

      {reconciliation && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Matched"
              value={reconciliation.matched.length}
              icon="✅"
              color="green"
            />
            <MetricCard
              label="Unpaid Invoices"
              value={reconciliation.unmatched.receipts.length}
              icon="⚠️"
              color="yellow"
            />
            <MetricCard
              label="Missing Receipts"
              value={reconciliation.unmatched.transactions.length}
              icon="📄"
              color="blue"
            />
          </div>

          {/* Matched Subscriptions */}
          <section>
            <h3 className="text-xl font-semibold mb-4">✅ Reconciled ({reconciliation.matched.length})</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Receipt Date</th>
                  <th>Paid Date</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {reconciliation.matched.map((item) => (
                  <tr key={item.transaction.id}>
                    <td>{item.receipt.vendor}</td>
                    <td>${item.transaction.total}</td>
                    <td>{formatDate(item.receipt.date)}</td>
                    <td>{formatDate(item.transaction.date)}</td>
                    <td>
                      <ConfidenceBadge value={item.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Outstanding Invoices */}
          <section>
            <h3 className="text-xl font-semibold mb-4">⚠️ Unpaid Invoices ({reconciliation.unmatched.receipts.length})</h3>
            <div className="space-y-3">
              {reconciliation.unmatched.receipts.map((receipt) => (
                <OutstandingInvoiceCard key={receipt.id} receipt={receipt} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
```

---

## Migration Plan: Consolidate to accounts@act.place

### Step 1: Create Email Forwarding Rules

**For nicholas@act.place**:
```
Gmail Settings → Forwarding → Add forwarding address: accounts@act.place
Filter: from:(billing@ OR invoice@ OR receipt@ OR accounts@)
Action: Forward to accounts@act.place + Keep in inbox
```

**For hi@act.place**:
```
Same forwarding rule
```

### Step 2: Update Vendor Billing Emails

Create a CSV of all subscriptions:
```csv
Vendor,Current Email,New Email,Status
Amazon Prime,nicholas@act.place,accounts@act.place,Pending
Descript,nicholas@act.place,accounts@act.place,Pending
Midjourney,nicholas@act.place,accounts@act.place,Pending
...
```

Bulk update script:
```javascript
// apps/backend/subscription-tracker/scripts/migrateVendorEmails.js
const subscriptions = await getAllSubscriptions();

for (const sub of subscriptions) {
  console.log(`
🔄 Update billing email for ${sub.vendor}
   Old: ${sub.currentEmail}
   New: accounts@act.place

   Steps:
   1. Log in to ${sub.vendor}
   2. Go to Account → Billing Settings
   3. Update email to: accounts@act.place
   4. Verify change
  `);

  // Mark as migrated when done
  await markAsMigrated(sub.id);
}
```

---

## Implementation Checklist

### Week 1: Google Workspace Integration
- [ ] Enable Google Workspace Admin SDK API
- [ ] Create service account with domain-wide delegation
- [ ] Implement WorkspaceScanner for multi-account scanning
- [ ] Test scanning nicholas@act.place, hi@act.place
- [ ] Set up accounts@act.place mailbox
- [ ] Configure email forwarding rules

### Week 2: Reconciliation Engine
- [ ] Build SubscriptionMatcher with fuzzy matching
- [ ] Implement Levenshtein distance algorithm
- [ ] Create reconciliation API endpoint
- [ ] Build OutstandingTracker for unpaid invoices
- [ ] Add priority scoring system

### Week 3: Analytics & Dashboard
- [ ] Implement CostEstimator for annual projections
- [ ] Build savings recommendation engine
- [ ] Create SubscriptionReconciliation React component
- [ ] Add charts for cost trends
- [ ] Implement drill-down views

### Week 4: Migration & Automation
- [ ] Export vendor contact list
- [ ] Create migration tracking spreadsheet
- [ ] Update vendor billing emails (one by one)
- [ ] Test end-to-end reconciliation flow
- [ ] Set up automated weekly reconciliation reports

---

## R&D Documentation

**Component**: Subscription Intelligence Hub
**Hypothesis**: Multi-source reconciliation (Gmail + Xero + Workspace) achieves 95%+ accuracy in identifying unpaid subscriptions vs 60% from single-source analysis
**Methodology**: Fuzzy vendor matching with Levenshtein distance + amount/date windowing + confidence scoring
**Success Metric**: Precision >= 95% on matching receipts to transactions, Recall >= 90% on finding unpaid invoices
**Findings**: TBD after implementation
**Estimated Hours**: 40 hours (Week 1-4)
**Tax Benefit**: ~$2,600 AUD (43.5% of $6,000 labor cost)

---

## Expected Outcomes

1. **Complete Visibility**: All subscriptions across all ACT accounts visible in one dashboard
2. **Proactive Management**: Identify unpaid invoices before they cause service interruptions
3. **Cost Optimization**: Estimate $1,000-$3,000/year savings from cancelled/downgraded subscriptions
4. **Simplified Workflow**: All invoices to accounts@act.place for easy reconciliation
5. **Automated Reporting**: Weekly email with outstanding invoices and savings opportunities

**Total Annual Subscription Cost** (Current estimate): ~$2,000-$3,000
**Projected Savings**: 30-50% ($600-$1,500/year)
**ROI**: Pay for itself in first quarter

---

**Created**: 2025-12-27
**Status**: Planning
**Next Action**: Enable Google Workspace Admin SDK API
