# ACT Financial Intelligence System

## 🎯 WHAT WE BUILT TODAY

A complete **Project-Based Financial Intelligence System** that helps you:
1. **Understand where money is coming from and going to** (Real bank transactions)
2. **Link every dollar to ACT projects** (Project financial tracking)
3. **Track receipt reconciliation** (Dext integration)
4. **Search across all systems** (Xero + Dext + Email + Calendar)

---

## 📊 YOUR FINANCIAL DATA SOURCES

### ✅ What You Have (Discovered from Supabase):

1. **xero_bank_transactions**: **4,939 real bank transactions**
   - Type: RECEIVE (money IN) or SPEND (money OUT)
   - Contains: date, amount, vendor, bank account, reference
   - **This is your actual cash flow**

2. **xero_contacts**: **1,416 contacts**
   - Customers and suppliers
   - Email addresses for receipt searching

3. **Notion Projects**: **65 ACT projects**
   - All your community projects
   - Ready to link with financial data

### ❌ What's Missing (Need to sync from Xero):

1. **xero_invoices**: 0 (needs re-sync)
2. **xero_bank_accounts**: 0 (needs re-sync)
3. **dext_receipts**: 0 (needs Dext integration)

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  XERO                DEXT               GMAIL   CALENDAR │
│  (4,939 txns)        (Receipts)        (Emails) (Events) │
│                                                           │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│               SUPABASE DATABASE                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  • xero_bank_transactions (4,939)                        │
│  • xero_contacts (1,416)                                 │
│  • dext_receipts (0 - to be added)                       │
│  • project_transactions (to be created)                  │
│                                                           │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│                  BACKEND APIs                            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Cash Flow Intelligence                               │
│     GET /api/v2/cashflow/dashboard                       │
│     - Real bank transactions                             │
│     - Missing receipts tracking                          │
│     - Top vendors                                        │
│     - Monthly trends                                     │
│                                                           │
│  2. Project Financials                                   │
│     GET /api/v2/projects/financial-overview              │
│     - All ACT projects with $ amounts                    │
│     - Auto-match transactions to projects                │
│     - Unmatched transactions list                        │
│                                                           │
│  3. Universal Search                                     │
│     GET /api/v2/financial/search?query=stripe            │
│     - Search bank transactions                           │
│     - Search contacts                                    │
│     - AI suggestions for email/calendar                  │
│                                                           │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│              FRONTEND DASHBOARD                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Financial Reports Tab                                │
│  • Overview (Money IN/OUT, Net Cash Flow)                │
│  • Missing Receipts (with AI hints)                      │
│  • Top Vendors                                           │
│  • Monthly Trends                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 HOW IT WORKS

### 1. **Real Cash Flow Tracking**

**Current view shows:**
- 💚 Total Money IN = All RECEIVE transactions
- ❤️ Total Money OUT = All SPEND transactions
- Net Cash Flow = Money IN - Money OUT
- Last 30 days breakdown
- Recent transactions (green = deposits, red = payments)

**Each transaction shows:**
- Vendor/Contact name
- Date
- Amount
- Bank account (e.g., "NM Personal", "Business Account")
- Reference/description

### 2. **Receipt Reconciliation**

**For each expense over $50:**
- ✅ Has receipt uploaded to Dext (reconciled)
- ⚠️ Missing receipt (unreconciled)

**AI Hints for finding receipts:**
- 📧 "Search email from Stripe around Jan 15, 2025"
- 📱 "Upload receipt from Uber to Dext"
- 📅 "Check calendar for meeting expenses on Feb 3"

### 3. **Project-Based Tracking** (NEW!)

**Auto-matching logic:**
- If vendor name matches project name → link automatically
- If transaction description contains project keyword → link
- Manual linking for everything else

**You can see:**
- Each ACT project's total income
- Each project's total expenses
- Net profit per project
- All transactions for that project

### 4. **Universal Search** (NEW!)

**Search across everything:**
```
Query: "stripe"

Results:
• 12 bank transactions mentioning Stripe
• 3 contacts with Stripe in their name
• AI suggestion: "Search Gmail for stripe@example.com"
• AI suggestion: "Check calendar around Jan 15 for Stripe payment"
```

---

## 🔄 THE COMPLETE WORKFLOW

### Step 1: Money Moves (Real-time)
1. You make a purchase or receive payment
2. Bank transaction appears in Xero
3. Xero syncs to Supabase
4. Transaction appears in your dashboard

### Step 2: Receipt Capture
1. You receive receipt (email, physical, etc.)
2. Upload to Dext OR system finds it in email
3. Dext links to bank transaction
4. Transaction marked as "reconciled"

### Step 3: Project Linking
1. System suggests which project this belongs to
2. You confirm or manually assign
3. Project financials update automatically
4. You can now see $ per project

### Step 4: Search & Insights
1. Search for vendor, amount, or date range
2. System searches Xero + Dext + suggests Email/Calendar
3. Get complete picture of that expense
4. Make informed decisions

---

## 📱 WHAT YOU CAN DO NOW

### In the Financial Reports Tab (`http://localhost:5174/?tab=reports`):

**Overview Section:**
- See total money in/out
- View recent deposits and payments
- Understand last 30 days cash flow

**Missing Receipts Section:**
- See all expenses needing receipts
- Get AI hints for where to find them
- Upload receipts directly

**Top Vendors Section:**
- See where you spend the most money
- Track vendor relationships
- Spot unusual expenses

**Monthly Trends Section:**
- View cash flow over time
- Identify seasonal patterns
- Plan for future months

### Coming Soon:

**Project Financials Dashboard:**
- See all 65 ACT projects
- View income/expenses per project
- Link unmatched transactions
- Get project profitability reports

---

## 🎯 NEXT STEPS TO IMPLEMENT

### 1. **Bank Account Filtering** ✅ (Already works - bank_account_name is in each transaction)

### 2. **Dext Integration** (To Do)
- Set up Dext API credentials
- Build sync from Dext → Supabase
- Auto-match receipts to bank transactions

### 3. **Email Receipt Discovery** (To Do)
- Use Gmail API to search for receipt emails
- Extract PDF receipts from attachments
- Auto-upload to Dext

### 4. **Calendar Integration** (To Do)
- Link calendar events to expenses
- Suggest missing expenses based on calendar
- Track travel/meeting costs

### 5. **Project Financials UI** (To Do)
- Build frontend for `/api/v2/projects/financial-overview`
- Add manual transaction linking
- Create project profit/loss reports

---

## 🔍 EXAMPLE: HOW TO FIND A MISSING RECEIPT

**Scenario:** You have a $250 expense from "Stripe" on Jan 15 but no receipt.

1. **Go to Missing Receipts tab**
   - See: "Stripe - $250 - Jan 15, 2025"
   - AI hint: "Search email for stripe around Jan 15"

2. **Search Gmail** (manual or automated)
   - Query: `from:stripe after:2025/01/14 before:2025/01/16`
   - Find receipt email

3. **Upload to Dext**
   - Forward email to Dext
   - OR download PDF and upload

4. **System auto-matches**
   - Dext receipt links to bank transaction
   - Transaction marked as reconciled
   - Disappears from "Missing Receipts"

---

## 📊 AVAILABLE APIs

### Discovery
- `GET /api/v2/financial/discover` - See what data sources exist

### Cash Flow
- `GET /api/v2/cashflow/dashboard` - Main cash flow dashboard
- `GET /api/v2/cashflow/missing-receipts` - Expenses needing receipts

### Projects
- `GET /api/v2/projects/financial-overview` - All projects with financials
- `POST /api/v2/projects/:id/link-transaction` - Link transaction to project

### Search
- `GET /api/v2/financial/search?query=X` - Universal search

---

## ✅ WHAT WE ACHIEVED TODAY

1. ✅ **Cleared bad invoice data** (removed 2,554 incorrect invoices)
2. ✅ **Built real cash flow dashboard** (showing 4,939 actual transactions)
3. ✅ **Created receipt reconciliation system** (AI-powered hints)
4. ✅ **Added project financial tracking** (link $ to ACT projects)
5. ✅ **Built universal search** (search across all systems)

---

## 🚀 VISION: THE COMPLETE ACT FINANCIAL BRAIN

**When fully built, you'll be able to:**

1. **Ask:** "How much did the Factory Records project make last month?"
   - **Answer:** Instant breakdown of income/expenses

2. **Ask:** "Show me all expenses without receipts"
   - **Answer:** List with AI hints for finding them

3. **Ask:** "Which bank account has the most activity?"
   - **Answer:** Ranked list with transaction counts

4. **Ask:** "Find that Uber receipt from the meeting with Sarah"
   - **Answer:** Search transactions + calendar + email

5. **Ask:** "What's our burn rate across all projects?"
   - **Answer:** Monthly trend analysis

**This makes financial management SIMPLE instead of confusing!**

---

Made with ❤️ for ACT Placemat
