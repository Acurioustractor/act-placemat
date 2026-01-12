# Week 1: Bank Reconciliation & Categorization Mastery

**Duration**: January 6-10, 2026
**Goal**: Master daily transaction workflow and build muscle memory for accurate bookkeeping
**Deliverable**: 80%+ auto-categorization rate by Friday

---

## 📅 Daily Schedule

**Time Commitment**: 30-45 minutes per day
**Best Time**: Morning (before emails pile up)
**Location**: Your Xero account → Banking → NAB Visa ACT #8815

---

## Day 1 (Monday): Reconcile 30 NAB Visa Transactions

### 🎯 Objective
Learn the fundamental skill of bank reconciliation - matching bank transactions to correct expense categories.

### 📚 What You'll Learn
- How to navigate Xero's bank reconciliation interface
- Difference between R&D and Operational expenses
- When to apply GST vs No GST
- How to categorize common ACT expenses

### 🚀 Step-by-Step

#### Step 1: Access Bank Reconciliation (2 min)
1. Log into Xero: go.xero.com
2. Click "Accounting" in left sidebar
3. Click "Bank accounts"
4. Find "NAB Visa ACT #8815"
5. Click "Reconcile X items"

#### Step 2: Understanding the Screen (5 min)
You'll see transactions with:
- **Date**: When transaction occurred
- **Payee/Description**: Vendor name from bank
- **Amount**: Money spent (out) or received (in)
- **Suggestions**: Xero's AI recommendations

#### Step 3: Categorizing Your First Transaction (10 min)

**Click a transaction** → Panel opens on right

**Fill in these fields**:
- **Contact/Payee**: Vendor name (e.g., "OpenAI", "Canva")
- **Account**: Choose expense category:
  - **6120** - R&D Software & Tools (OpenAI, Claude, GitHub)
  - **6130** - R&D Infrastructure (AWS, Vercel, Supabase)
  - **6200** - Software & Subscriptions (Canva, Zoom, Slack)
  - **6300** - Office Expenses (supplies, equipment)
  - **6400** - Travel & Accommodation
  - **6500** - Marketing & Advertising
  - **6600** - Professional Services (consultants, lawyers)
  - **6700** - Meals & Entertainment (client meals)
- **Tax Rate**:
  - **GST on Expenses (10%)** = Australian supplier
  - **No GST** = Foreign supplier (most SaaS tools)
- **Tracking** (if available):
  - **R&D** = Research & Development activity
  - **Operational** = Business operations
- **Description**: Notes about what this was for

**Click "OK" to save**

#### Step 4: Common Transaction Types (10 min)

| Transaction | Account | Tax | Tracking | Notes |
|-------------|---------|-----|----------|-------|
| OpenAI API | 6120 - R&D Software | No GST | R&D | AI development |
| GitHub subscription | 6120 - R&D Software | No GST | R&D | Code hosting |
| AWS/Vercel | 6130 - R&D Infrastructure | No GST | R&D | Cloud hosting |
| Supabase | 6130 - R&D Infrastructure | No GST | R&D | Database |
| Canva | 6200 - Software | No GST | Operational | Design |
| Zoom | 6200 - Software | No GST | Operational | Meetings |
| Client meal | 6700 - Meals | GST | Operational | 50% deductible |
| Uber (work) | 6400 - Travel | GST | Operational | Business travel |

#### Step 5: Reconcile 30 Transactions (15-20 min)
- Start with oldest transactions
- Work through 30 total
- If unsure, use "Ask my accountant" category
- Keep count - aim for 30 completed

### ✅ Success Checklist
- [ ] Logged into Xero successfully
- [ ] Found NAB Visa ACT #8815 account
- [ ] Reconciled 30 transactions
- [ ] Understand R&D vs Operational difference
- [ ] Know when to apply GST

### 📝 Reflection Questions
Answer in Notion "Notes" field:
1. What was most common expense category?
2. Which transactions were you unsure about?
3. Did you notice recurring vendors (subscriptions)?
4. What % of expenses are R&D-eligible?

### 🎓 Key Concepts
- **Bank Reconciliation**: Matching bank transactions to expense categories
- **Chart of Accounts**: List of categories (6xxx numbers)
- **GST**: Australian tax (10%) for local suppliers only
- **R&D vs Operational**: Separating for tax credit (43.5% offset!)

### ❓ Common Issues

**Can't find Bank Accounts menu?**
→ Check you're in correct organization (ACT Pty Ltd). Click your name → Switch organization.

**Amount doesn't match what I paid?**
→ Normal! Includes FX fees. Use bank statement amount.

**Should I apply GST to foreign supplier?**
→ No! Only Australian suppliers charge GST.

**I categorized wrong?**
→ Go to Banking → Find transaction → Click → Edit → Fix → Save. Easy!

---

## Day 2 (Tuesday): Create 5 Bank Rules for Top Vendors

### 🎯 Objective
Automate reconciliation by creating bank rules. Save 5-10 minutes every day going forward!

### 📚 What You'll Learn
- How to create bank rules in Xero
- When to use "Contains" vs "Equals" matching
- How to test and edit rules
- Building automation mindset

### 🚀 Step-by-Step

#### Step 1: Identify Recurring Vendors (10 min)
Review yesterday's transactions. Find vendors you pay monthly:
- OpenAI - Monthly API usage
- GitHub - Monthly subscription
- Vercel - Monthly hosting
- Supabase - Monthly database
- Google Workspace - Monthly email/docs

#### Step 2: Create Your First Bank Rule (10 min)

1. Go to **Accounting → Bank accounts → NAB Visa ACT #8815**
2. Find a transaction from **OpenAI** (already reconciled)
3. Click the transaction
4. Look for **"Create rule"** button (bottom right)
5. Click **"Create rule"**

**Fill in the rule form**:
- **Rule name**: "OpenAI Monthly API" (descriptive)
- **For money**: "Spent" (it's an expense)
- **From bank account**: "NAB Visa ACT #8815" (pre-filled)
- **When transaction contains**: "OpenAI" (use "Contains" not "Equals")
- **Contact**: OpenAI
- **Account**: 6120 - R&D Software & Tools
- **Tax**: No GST
- **Tracking** (if available): R&D

6. Click **"Save"**

💡 **Tip**: Use "Contains" because vendor names might have extra characters in bank feed.

#### Step 3: Create 4 More Rules (15 min)

Repeat for these vendors:

**Rule 2: GitHub**
- Contains: "GitHub"
- Account: 6120 - R&D Software & Tools
- Tax: No GST
- Tracking: R&D

**Rule 3: Vercel**
- Contains: "Vercel"
- Account: 6130 - R&D Infrastructure
- Tax: No GST
- Tracking: R&D

**Rule 4: Supabase**
- Contains: "Supabase"
- Account: 6130 - R&D Infrastructure
- Tax: No GST
- Tracking: R&D

**Rule 5: Google Workspace**
- Contains: "Google"
- Account: 6200 - Software & Subscriptions
- Tax: GST on Expenses (if AU supplier) or No GST
- Tracking: Operational

#### Step 4: Test Your Rules (5 min)
1. Go back to bank reconciliation
2. Find a new transaction from one of your ruled vendors
3. Click it
4. **Should auto-populate** with your rule settings!
5. Click OK to accept

#### Step 5: View All Rules (2 min)
1. Go to **Accounting → Advanced → Bank rules**
2. See all your rules listed
3. Click any rule to edit
4. Can enable/disable rules here

### ✅ Success Checklist
- [ ] Created 5 bank rules
- [ ] Tested at least one rule
- [ ] Know how to edit existing rules
- [ ] Understand "Contains" vs "Equals"

### 🎓 Key Concepts
- **Bank Rules**: Automated categorization based on patterns
- **Rule Matching**: "Contains" = flexible, "Equals" = exact
- **Time Savings**: Each rule saves 30-60 seconds per transaction
- **Rule Priority**: First matching rule wins

### ⏭️ Tomorrow
Day 3: Set up R&D tracking categories to separate R&D expenses from operational. Critical for 43.5% tax offset!

---

## Day 3 (Wednesday): Set Up R&D Tracking Categories

### 🎯 Objective
Configure tracking categories to separate R&D from operational expenses. Essential for AusIndustry R&D tax credit claims.

### 📚 What You'll Learn
- What tracking categories are and why they matter
- How to set up two-dimensional expense tracking
- R&D tax credit basics (43.5% offset!)
- How to apply tracking categories during reconciliation

### 🚀 Step-by-Step

#### Step 1: Understanding Tracking Categories (5 min)

**What are they?**
Extra "tags" you can add to transactions to segment expenses beyond just account codes.

**Why do we need them?**
For R&D tax credits, you need to prove which expenses were for "research and development" vs normal operations.

**Two categories for ACT**:
1. **Activity Type**: R&D vs Operational vs Admin
2. **Expense Type**: Labor, Materials, Software, Infrastructure

This creates a matrix:
- R&D + Software = $X
- R&D + Labor = $Y
- Operational + Infrastructure = $Z

Perfect for AusIndustry reports!

#### Step 2: Set Up Tracking Categories (10 min)

1. Click **⚙️ Settings** (top right)
2. Click **General Settings**
3. Click **Tracking** in left menu
4. Click **Add tracking category**

**Create Category 1: Activity Type**
- **Category name**: "Activity Type"
- **Options**:
  - R&D
  - Operational
  - Admin
- Click **Save**

5. Click **Add tracking category** again

**Create Category 2: Expense Type**
- **Category name**: "Expense Type"
- **Options**:
  - Software & Tools
  - Infrastructure
  - Labor & Contractors
  - Materials & Supplies
  - Professional Services
- Click **Save**

#### Step 3: Enable Tracking on Accounts (5 min)

1. Go to **Accounting → Chart of Accounts**
2. Find these accounts:
   - 6100 series (R&D expenses)
   - 6200 (Software)
   - 6300-6700 (Other expenses)
3. For each account, click the **⋯** menu → **Edit**
4. Check **"Enable tracking for this account"**
5. Select both tracking categories
6. Click **Save**

#### Step 4: Apply Tracking Categories (10 min)

1. Go to **Banking → NAB Visa ACT #8815 → Reconcile**
2. Click a transaction (new or existing)
3. You'll now see **two dropdown menus**:
   - **Activity Type**: Choose R&D or Operational
   - **Expense Type**: Choose category
4. Example for OpenAI transaction:
   - Activity Type: **R&D**
   - Expense Type: **Software & Tools**
5. Save transaction

#### Step 5: Update Existing Transactions (10 min)

Go back and add tracking to yesterday's reconciled transactions:
1. **Banking → NAB Visa ACT #8815 → View all** (shows reconciled transactions)
2. Click each transaction
3. Add appropriate tracking categories
4. Save

Focus on R&D expenses first (most valuable for tax credits):
- OpenAI, Claude, AI tools → R&D + Software
- AWS, Vercel, Supabase → R&D + Infrastructure
- Contractors working on R&D → R&D + Labor

### ✅ Success Checklist
- [ ] Created "Activity Type" tracking category
- [ ] Created "Expense Type" tracking category
- [ ] Enabled tracking on key accounts
- [ ] Applied tracking to at least 10 transactions
- [ ] Understand R&D tax credit basics

### 🎓 Key Concepts
- **Tracking Categories**: Extra tags for segmenting expenses
- **R&D Tax Credit**: 43.5% refund on eligible R&D expenses
- **AusIndustry**: Australian government body that processes R&D claims
- **Eligible R&D**: Experimental activities with technical risk/novelty

### 💰 Why This Matters

**Example R&D Calculation**:
- OpenAI API: $2,000/month × 12 = $24,000/year
- GitHub: $500/month × 12 = $6,000/year
- AWS: $1,000/month × 12 = $12,000/year
- Contractors: $50,000/year
- **Total R&D**: $92,000/year
- **43.5% offset**: $92,000 × 0.435 = **$40,020 refund!**

Tracking categories make this reporting **automatic** instead of manual spreadsheet work.

### ⏭️ Tomorrow
Day 4: Review weekly cash flow report to understand where money is going and identify cost optimization opportunities.

---

## Day 4 (Thursday): Review Cash Flow Report

### 🎯 Objective
Learn to read Xero's cash flow reports to understand your spending patterns and identify opportunities for cost optimization.

### 📚 What You'll Learn
- How to generate cash flow reports
- Reading and interpreting financial data
- Identifying spending trends
- Finding cost-saving opportunities

### 🚀 Step-by-Step

#### Step 1: Generate Cash Flow Report (5 min)

1. Click **Reports** in left sidebar
2. Search for **"Cash Flow Statement"** or find under "Financial"
3. Click **Cash Flow Statement**
4. Set date range to **"This Financial Year"** (July 1 - June 30 in Australia)
5. Click **Update**

#### Step 2: Understand the Report Sections (10 min)

**Three main sections**:

**1. Operating Activities** (day-to-day business)
- Money in: Client payments, grants
- Money out: Expenses, subscriptions, payroll
- **Net Operating Cash**: Positive = healthy, Negative = burning cash

**2. Investing Activities** (assets/equipment)
- Buying equipment, software licenses
- Selling old equipment
- Usually negative (you're investing)

**3. Financing Activities** (loans/equity)
- Loan proceeds
- Loan repayments
- Owner contributions/withdrawals

#### Step 3: Analyze Your Spending (15 min)

**Top expense categories to review**:

1. **R&D Software & Tools**
   - Are you using all subscriptions?
   - Any unused tools to cancel?
   - Could you downgrade any plans?

2. **R&D Infrastructure**
   - AWS/cloud costs trending up?
   - Could you optimize server usage?
   - Rightsizing opportunities?

3. **Operational Software**
   - Zoom, Slack, email - still needed?
   - Team size changes = plan adjustments?

**Questions to ask**:
- Which category has highest spend?
- Any unexpected large expenses?
- Are expenses increasing or stable?
- Seasonal patterns?

#### Step 4: Create Custom Report (10 min)

1. Click **Reports → All reports**
2. Click **Account Transactions**
3. Set these filters:
   - Date: Last 3 months
   - Accounts: 6100-6700 (all expense accounts)
   - Tracking: R&D (to see just R&D spend)
4. Click **Update**
5. **Bookmark this report** (click star icon) for weekly review

#### Step 5: Identify 3 Cost-Saving Opportunities (5 min)

Review your expenses and find 3 potential savings:

**Example opportunities**:
- Cancel unused SaaS subscriptions ($50-200/month each)
- Downgrade cloud hosting tier ($100-500/month)
- Negotiate annual billing discounts (save 10-20%)
- Consolidate tools (use fewer platforms)

**Write these in Notion**:
1. Opportunity #1: Cancel Canva Pro (saves $12.99/month = $156/year)
2. Opportunity #2: Downgrade AWS tier (saves $200/month = $2,400/year)
3. Opportunity #3: Annual GitHub billing (saves 10% = $60/year)

### ✅ Success Checklist
- [ ] Generated Cash Flow Statement
- [ ] Understand three sections (Operating, Investing, Financing)
- [ ] Analyzed top expense categories
- [ ] Created custom R&D expense report
- [ ] Identified 3 cost-saving opportunities

### 🎓 Key Concepts
- **Cash Flow**: Money actually moving (not just invoices)
- **Operating Cash Flow**: Core business health indicator
- **Burn Rate**: Monthly cash outflow (important for runway)
- **Runway**: Months until money runs out (bank balance ÷ monthly burn)

### 💡 Insights to Track

**Calculate your key metrics**:
1. **Monthly Burn Rate**: Total expenses ÷ 12 months
2. **R&D % of Spend**: R&D expenses ÷ total expenses
3. **Largest expense category**: % of total spend
4. **Subscription costs**: All recurring software ÷ total spend

Example:
- Monthly burn: $15,000
- R&D % of spend: 62% ($9,300 of $15,000)
- Largest category: Software (35%)
- Subscription costs: 28% of total

### ⏭️ Tomorrow
Day 5: Analyze auto-categorization accuracy and celebrate Week 1 completion! Set goals for Week 2.

---

## Day 5 (Friday): Analyze Auto-Categorization Accuracy

### 🎯 Objective
Review your week's work, measure auto-categorization success rate, and prepare for Week 2's R&D project tracking.

### 📚 What You'll Learn
- How to measure categorization accuracy
- Reviewing and improving bank rules
- Week 1 recap and learnings
- Setting up for Week 2 success

### 🚀 Step-by-Step

#### Step 1: Check Auto-Categorization Rate (15 min)

1. Go to **Banking → NAB Visa ACT #8815**
2. Click **Reconcile**
3. Count transactions that **auto-populate** (from your rules)
4. Count transactions that need **manual categorization**

**Calculate your rate**:
- Auto-populated: 24 transactions
- Manual: 6 transactions
- Total: 30 transactions
- **Auto-cat rate**: 24 ÷ 30 = **80%** ✅

**Target**: 80%+ by end of Week 1

#### Step 2: Review and Improve Rules (15 min)

1. Go to **Accounting → Advanced → Bank rules**
2. Review each of your 5 rules
3. Check if they're working correctly:
   - Matching right transactions?
   - Correct categorization?
   - Any false positives?

**Improve rules**:
- If rule is too broad ("Google" matches too many things)
  → Make more specific ("Google Workspace" or "Google Cloud")
- If rule is too narrow (missing some transactions)
  → Use broader matching ("Contains Vercel" vs "Equals VERCEL INC")

**Add 3-5 more rules** for other recurring vendors you've identified this week.

#### Step 3: Week 1 Metrics & Reflection (10 min)

**Record these in Notion**:

**Quantitative Metrics**:
- Total transactions reconciled this week: ___
- Auto-categorization rate: ___%
- Bank rules created: ___
- Time spent on reconciliation: ___ minutes total
- Average time per transaction: ___ seconds

**Qualitative Reflection**:
1. What surprised you most about your spending?
2. What was hardest part of reconciliation?
3. What's still confusing?
4. What would you do differently next week?
5. How confident do you feel now (1-10)?

#### Step 4: Prepare for Week 2 (5 min)

**Week 2 Preview**: R&D Cost Tracking with Xero Projects

**Action items for weekend**:
1. Review your 10 Notion projects
2. Think about which are R&D activities vs client work
3. Estimate annual spend per project (rough guess)
4. Consider Xero Projects add-on ($78/month) - worth it?

**Read ahead**:
- Xero Projects documentation
- How to sync Notion → Xero Projects
- R&D tax credit eligibility criteria

#### Step 5: Celebrate Week 1! (2 min)

You've accomplished a lot:
- ✅ Reconciled 150+ transactions (30/day × 5 days)
- ✅ Created 5-10 bank rules (saving 5-10 min/day going forward)
- ✅ Set up tracking categories for R&D tracking
- ✅ Reviewed cash flow and found cost savings
- ✅ Built daily reconciliation habit

**Weekly time saved going forward**: 25-50 minutes/week
**Annual time saved**: 22-43 hours/year
**Annual R&D tax credits enabled**: $40,000+ potential refund

### ✅ Week 1 Success Checklist
- [ ] Reconciled 150+ transactions total
- [ ] Created 8-10 bank rules
- [ ] Auto-categorization rate 80%+
- [ ] Set up R&D tracking categories
- [ ] Reviewed cash flow report
- [ ] Identified cost savings
- [ ] Completed reflection questions
- [ ] Ready to start Week 2!

### 🎓 Week 1 Key Learnings

**Skills Acquired**:
1. Bank reconciliation fundamentals
2. Chart of accounts navigation
3. GST application rules
4. Bank rule creation & management
5. Tracking category setup
6. Cash flow report reading
7. Cost optimization analysis

**Xero Features Mastered**:
- Banking interface
- Bank reconciliation screen
- Bank rules editor
- Tracking categories
- Cash flow statement
- Account transactions report

**Mindset Shifts**:
- From reactive to proactive bookkeeping
- From manual to automated processes
- From expense tracking to expense analysis
- From compliance to optimization

### 📊 Week 1 Stats Template

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Transactions reconciled | 150 | ___ | ⬜ |
| Auto-categorization rate | 80% | __% | ⬜ |
| Bank rules created | 8+ | ___ | ⬜ |
| R&D tracking enabled | Yes | ___ | ⬜ |
| Cost savings identified | $1,000+ | $___ | ⬜ |
| Time per transaction | <60 sec | ___ sec | ⬜ |

### ⏭️ Week 2 Preview

**Focus**: R&D Cost Tracking with Xero Projects

**Goals**:
- Map 10 Notion projects to Xero
- Set up project-based expense allocation
- Create R&D expense report for FY2025
- Enable automatic R&D tax credit calculation

**Deliverable**: Comprehensive R&D expense report ready for AusIndustry claim

**Estimated Value**: $50,000-$100,000 in R&D tax credits

---

## 📚 Additional Resources

### Xero Help Articles
- [Bank Reconciliation Overview](https://central.xero.com/s/article/Bank-reconciliation-overview)
- [Create and Use Bank Rules](https://central.xero.com/s/article/Create-and-use-bank-rules)
- [Set Up Tracking Categories](https://central.xero.com/s/article/Set-up-and-use-tracking-categories)
- [Cash Flow Reports](https://central.xero.com/s/article/Cash-Flow-Statement)

### Week 1 Cheat Sheet

**Common Expense Categories**:
- 6120 - R&D Software & Tools
- 6130 - R&D Infrastructure
- 6200 - Software & Subscriptions
- 6400 - Travel
- 6700 - Meals & Entertainment

**GST Quick Rule**:
- Australian supplier = GST on Expenses (10%)
- Foreign supplier = No GST

**Tracking Categories**:
- Activity Type: R&D / Operational / Admin
- Expense Type: Software / Infrastructure / Labor / Materials

**Bank Rule Matching**:
- "Contains" = Flexible (recommended)
- "Equals" = Exact match only

### Keyboard Shortcuts
- `c` = Create new transaction
- `↑` `↓` = Navigate transactions
- `Enter` = Open transaction
- `Esc` = Close panel
- `Tab` = Move to next field

---

## 🆘 Getting Help

**Stuck on something?**
1. Check Xero Central (help.xero.com)
2. Search "Xero [your question]" on Google
3. Ask in ACT Notion (tag it for future reference)
4. Contact your accountant for tax questions

**Common Week 1 Questions**:

**Q: Should every transaction be categorized immediately?**
A: Aim for within 7 days. Don't let them pile up!

**Q: What if I'm not sure if something is R&D?**
A: Ask: "Does this involve technical experimentation or solving a technical challenge?" If yes → R&D. If no → Operational.

**Q: Can I change categorization later?**
A: Yes! Banking → Find transaction → Edit → Save. Always fixable.

**Q: Do I need to reconcile on weekends?**
A: No! This is a 5-day/week habit. Weekends off.

---

## 🎯 Week 1 Completion Certificate

**I, _________________, have completed Xero Week 1!**

**Date completed**: _______________

**Achievements**:
- ✅ Reconciled 150+ transactions
- ✅ Created 8+ bank rules
- ✅ Set up R&D tracking categories
- ✅ 80%+ auto-categorization rate
- ✅ Built daily bookkeeping habit

**Ready for Week 2**: R&D Cost Tracking & Project Profitability

**Signature**: _______________

---

**Congratulations on completing Week 1!** 🎉

You've built the foundation for world-class financial management. The habits you've established this week will save you hours every month and unlock tens of thousands in R&D tax credits.

**See you Monday for Week 2!**
