# 📚 Bookkeeping Checklist - Complete Guide

**Purpose:** Walk through ALL core bookkeeping functions to ensure nothing is missed

---

## 🎯 What This Solves

### **The Problem:**
- Bookkeeping feels overwhelming
- Easy to forget critical tasks
- Unclear what needs to be done daily vs monthly
- Don't know how to properly tag receipts in Xero
- Uncertain what accountant needs from you

### **The Solution:**
Comprehensive checklist of ALL core bookkeeping functions organized by frequency (daily, weekly, monthly, quarterly, annual).

---

## 📊 Core Functions Mapped

### **Bookkeeper's Core Responsibilities:**

1. **Record Transactions** → ✅ Daily: Upload receipts, review invoices
2. **Categorize & Code** → ✅ Weekly: Code all expenses with account codes
3. **Reconcile** → ✅ Weekly: Bank reconciliation
4. **Receipt Management** → ✅ Daily: OCR + attach to transactions
5. **Process Invoices** → ✅ Daily/Weekly: AR & AP management
6. **Track GST** → ✅ Quarterly: BAS lodgement
7. **Maintain Chart of Accounts** → ✅ Weekly: Consistent coding
8. **Monthly Close** → ✅ Monthly: All transactions recorded & reviewed

### **Accountant's Core Needs:**

1. **Accurate Data** → ✅ All receipts attached, properly coded
2. **Reports** → ✅ Monthly P&L, Balance Sheet, Cash Flow
3. **Tax Compliance** → ✅ BAS lodged, receipts for deductions
4. **Clean Books** → ✅ Bank rec done, no uncoded transactions
5. **Audit Trail** → ✅ Every transaction documented
6. **Year-End Ready** → ✅ All accounts reconciled, trial balance

---

## 📋 Checklist Breakdown

### **Daily Tasks (3 items)**

#### 1. 💰 Check Bank Balance
- **Why:** Catch fraud, ensure cash flow visibility
- **How:** Compare bank statement to Xero daily
- **Xero Link:** Bank Accounts → Reconcile tab
- **Automatable:** ✅ Yes (API check)

#### 2. 🧾 Upload Today's Receipts
- **Why:** ATO compliance, GST claims, prevent lost receipts
- **How:**
  1. Scan/photo physical receipts
  2. Upload to Receipt Processor (Google Cloud Vision OCR)
  3. Review extracted data: vendor, amount, GST, ABN
  4. Match to existing Xero transaction OR create new
  5. **Tag with correct account code** (office supplies, travel, etc)
  6. Attach receipt file to transaction
- **GST Treatment:**
  - GST on Purchases (most expenses)
  - GST-Free (some food, education)
  - Input Taxed (financial services)
- **Automatable:** ✅ Yes (OCR + auto-matching)

#### 3. 📨 Review New Invoices
- **Why:** Cash flow management, avoid late payments
- **How:**
  1. Check email for supplier bills
  2. Enter into Xero (or forward to bills@xero.com)
  3. Set due dates
  4. Schedule payment runs
- **Automatable:** ⚠️ Partial (auto-import, but needs review)

---

### **Weekly Tasks (3 items)**

#### 4. 🏦 Bank Reconciliation
- **Why:** Accurate financials, fraud detection, accountant requirement
- **How:**
  1. Import bank statement (or use bank feed)
  2. Match transactions to invoices/bills
  3. Create new transactions for unmatched items
  4. **Code each transaction:**
     - 200: Sales (income)
     - 400-499: Cost of Goods Sold
     - 500-699: Operating Expenses
     - 800-899: Other Income/Expenses
  5. Confirm: Statement balance = Xero balance
  6. Mark reconciliation complete
- **Xero Coding Examples:**
  - 429: General Expenses
  - 461: Office Expenses
  - 469: Travel - National
  - 489: Bank Fees
  - 710: Interest Expense
- **Automatable:** ✅ Yes (smart matching algorithm)

#### 5. 💸 Chase Overdue Invoices
- **Why:** Cash flow, reduce bad debts
- **How:**
  1. Run Aged Receivables report
  2. Identify 30+ days overdue
  3. Send payment reminders (automated emails)
  4. Call high-value clients
  5. Update notes with follow-up
- **Automatable:** ✅ Yes (email reminders with human approval)

#### 6. 🏷️ Code All Expenses
- **Why:** Accurate P&L, GST reporting, tax deductions
- **How:**
  1. Review uncoded transactions
  2. Assign account code (travel, office, marketing)
  3. Verify GST treatment
  4. Add tracking categories (projects, departments)
  5. Add descriptive notes
- **Common Codes:**
  - 461: Office Supplies
  - 404: Advertising & Marketing
  - 469: Travel - National
  - 477: Telephone & Internet
  - 493: Computer Expenses
- **Automatable:** ⚠️ Partial (AI can suggest, human confirms)

---

### **Monthly Tasks (3 items)**

#### 7. 📅 Month-End Close
- **Why:** Accurate monthly reporting, year-end preparation
- **How:**
  1. Ensure all bank accounts reconciled
  2. Record all invoices sent/received
  3. Process credit card statements
  4. Record accruals (expenses incurred but not billed)
  5. Record prepayments (paid in advance)
  6. Review balance sheet for errors
  7. **Lock period in Xero** (prevent backdating)
- **Automatable:** ❌ No (requires judgment)

#### 8. 💼 Process Payroll
- **Why:** Employee compliance, STP reporting to ATO
- **How:**
  1. Enter timesheets
  2. Calculate pay + superannuation (11%)
  3. Process pay run in Xero
  4. Pay employees via bank transfer
  5. Pay PAYG withholding to ATO
  6. Pay super (quarterly)
- **Xero Link:** Payroll → Employees
- **Automatable:** ⚠️ Partial (calculations automated, approval needed)

#### 9. 📊 Generate Monthly Reports
- **Why:** Board meetings, financial decision-making, trend analysis
- **Reports Needed:**
  1. Profit & Loss (actual vs budget)
  2. Balance Sheet
  3. Cash Flow Statement
  4. Aged Receivables
  5. Aged Payables
- **Xero Link:** Reports section
- **Export:** PDF for directors, Excel for accountant
- **Automatable:** ✅ Yes (scheduled reports)

---

### **Quarterly Tasks (2 items)**

#### 10. 🇦🇺 Lodge BAS (Business Activity Statement)
- **Why:** GST compliance, avoid ATO penalties ($1,050 per day late!)
- **How:**
  1. Run GST report for the quarter
  2. Verify all GST coded correctly (check uncoded transactions)
  3. Review:
     - **G1:** GST on Sales (GST you collected from customers)
     - **G11:** GST on Purchases (GST you paid to suppliers)
     - **1A:** Net GST (G1 - G11 = amount owing/refund)
  4. Lodge via Xero or myGovID
  5. Pay GST to ATO (if owing)
  6. Record BAS lodgement in Xero
- **Australian Quarters:**
  - Q1: Jul-Sep (due Oct 28)
  - Q2: Oct-Dec (due Jan 28)
  - Q3: Jan-Mar (due Apr 28)
  - Q4: Apr-Jun (due Jul 28)
- **Xero Link:** Reports → GST Report
- **Automatable:** ✅ Yes (calculation + preparation, lodgement needs approval)

#### 11. 🏦 Pay Superannuation
- **Why:** Employee retirement, ATO compliance
- **How:**
  1. Calculate 11% super on gross wages (quarterly)
  2. Generate super payment file from Xero
  3. Pay via SuperStream or clearing house
  4. Record payment in Xero
  5. Verify funds received by super funds
- **Deadline:** 28 days after quarter end
- **Automatable:** ⚠️ Partial (calculations yes, payment approval needed)

---

### **Annual Tasks (3 items)**

#### 12. 📆 Year-End Close
- **Why:** Tax return, financial statements, audit preparation
- **How:**
  1. Complete ALL monthly closes
  2. Reconcile EVERY account (bank, cards, loans)
  3. Record depreciation on assets
  4. Write off bad debts
  5. Accrue unpaid expenses
  6. Defer income received in advance
  7. Prepare trial balance
  8. **Lock financial year in Xero** (June 30 year-end)
  9. Send to accountant for tax return
- **Accountant Needs:**
  - All receipts attached
  - All accounts reconciled
  - Trial balance
  - Depreciation schedule
  - Asset register
- **Automatable:** ❌ No (requires professional judgment)

#### 13. 📦 Annual Stocktake
- **Why:** Accurate balance sheet, COGS calculation
- **How:**
  1. Physical count of all inventory
  2. Value at cost or market value (lower of two)
  3. Adjust Xero to match physical count
  4. Write off damaged/obsolete stock
  5. Record in balance sheet
- **Automatable:** ❌ No (physical count required)

#### 14. 💰 Tax Planning Meeting
- **Why:** Minimize tax, optimize structure
- **How:**
  1. Review projected profit
  2. Identify tax deductions (equipment purchases)
  3. Consider timing of income/expenses
  4. Review business structure (company vs trust)
  5. Discuss franking credits, dividends
  6. Plan PAYG instalments
- **When:** Before June 30 (financial year end)
- **Automatable:** ❌ No (requires accountant advice)

---

## 🏷️ How to Tag/Code in Xero

### **Account Code Structure:**

```
100-199: Assets
200-299: Income
300-399: Cost of Goods Sold
400-499: Direct Costs
500-699: Operating Expenses
700-799: Non-Operating Expenses
800-899: Other Income
```

### **Common Expense Codes:**

| Code | Account Name | Examples |
|------|-------------|----------|
| 461 | Office Expenses | Stationery, printing, postage |
| 404 | Advertising & Marketing | Facebook ads, website costs |
| 469 | Travel - National | Flights, accommodation, Uber |
| 477 | Telephone & Internet | Mobile plans, NBN, Zoom |
| 493 | Computer Expenses | Software subscriptions, Dropbox |
| 429 | General Expenses | Miscellaneous small items |
| 489 | Bank Fees | Transaction fees, account fees |
| 412 | Cleaning | Office cleaning services |
| 420 | Entertainment | Client dinners (50% deductible) |

### **GST Treatment:**

1. **GST on Purchases (most common):**
   - Office supplies, software, professional fees
   - Claimable as input tax credit

2. **GST-Free:**
   - Some food, education, health services
   - Not claimable

3. **Input Taxed:**
   - Financial services, residential rent
   - Not claimable

### **Tracking Categories:**

Add these for better reporting:
- **Project/Client:** Which client is this for?
- **Department:** Marketing, Operations, Admin?
- **Location:** Sydney, Melbourne, Remote?

---

## 🚀 How to Use the Checklist

### **Step 1: Open Bookkeeping Checklist**
```
http://localhost:5174/?tab=bookkeeping
```

### **Step 2: Filter by Frequency**
- Click "Daily" to see today's tasks
- Click "Weekly" for this week's tasks
- Click "Monthly" for month-end
- Click "Quarterly" for BAS quarter
- Click "Annual" for year-end tasks

### **Step 3: Work Through Each Task**
1. Read the title & description
2. Check "Why this matters" (accountant needs)
3. Follow the step-by-step instructions
4. Click "🔗 Open in Xero" to go directly to relevant page
5. Update status: Not Started → In Progress → Completed

### **Step 4: Track Progress**
- Dashboard shows: Total tasks, Completed, In Progress, Blocked
- Completion % shows overall bookkeeping health
- Filter by category to focus on what's due

---

## ✅ Accountant-Ready Checklist

**Before sending to your accountant, ensure:**

| Task | Status |
|------|--------|
| All bank accounts reconciled | ✅ |
| All receipts uploaded & attached | ✅ |
| All transactions coded with account codes | ✅ |
| GST coded correctly (G1, G11 verified) | ✅ |
| BAS lodged for all quarters | ✅ |
| Payroll processed & STP lodged | ✅ |
| Month-end close completed for all months | ✅ |
| Prepayments & accruals recorded | ✅ |
| Depreciation recorded | ✅ |
| Trial balance generated | ✅ |
| Financial year locked in Xero | ✅ |

If all ✅, your books are **accountant-ready**! 🎉

---

## 🔄 Automation Opportunities

From the checklist, these tasks are **automatable:**

### **✅ Already Automated:**
1. **Invoice Reminders** - Email automation (with human approval)
2. **BAS Calculation** - Auto-calculates G1, G11, 1A from Xero
3. **Bank Reconciliation** - Smart matching algorithm
4. **Receipt OCR** - Google Cloud Vision extracts data

### **⚠️ Partially Automated:**
1. **Expense Coding** - AI suggests, human confirms
2. **Bank Feed** - Auto-imports, needs review
3. **Payroll** - Calculations automated, approval needed
4. **Monthly Reports** - Auto-generate, review needed

### **❌ Requires Human Judgment:**
1. **Month-End Close** - Professional review
2. **Year-End Close** - Accountant expertise
3. **Tax Planning** - Strategic decisions
4. **Stocktake** - Physical count

---

## 📈 Next Steps

### **Immediate Actions:**
1. ✅ Open Bookkeeping Checklist page
2. ✅ Filter by "Daily" → Complete today's tasks
3. ✅ Upload receipts via Receipt Processor
4. ✅ Review bank reconciliation status

### **This Week:**
1. Complete weekly bank reconciliation
2. Code all uncoded transactions
3. Chase overdue invoices (if any)

### **This Month:**
1. Complete month-end close
2. Generate monthly reports
3. Process payroll (if applicable)

### **This Quarter:**
1. Prepare BAS (run GST report)
2. Review GST coding
3. Pay superannuation

---

## 🎯 Success Metrics

**Healthy Bookkeeping = 90%+ Completion Rate**

- **100%** = World-class bookkeeping
- **90-99%** = Excellent, accountant-ready
- **70-89%** = Good, some catch-up needed
- **50-69%** = Requires attention, risk of issues
- **<50%** = Critical, immediate action needed

---

**Last Updated:** October 1, 2025
**Location:** http://localhost:5174/?tab=bookkeeping
**Status:** ✅ Live and ready to use!
