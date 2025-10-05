# AI Business Agent Test Plan

## Overview
This test plan validates the AI Business Agent's ability to analyze financial data, project intelligence, and provide actionable recommendations.

## Test Environment Setup

1. **Data Prerequisites**
   - Xero bank transactions synced
   - ACT projects in Notion
   - Gmail/LinkedIn data (optional for enhanced insights)

2. **Access the Agent**
   - URL: `http://localhost:5174/?tab=agent`
   - Ensure backend is running on port 4000

---

## Test Categories

### 1. Financial Health Analysis

#### Test 1.1: Cash Flow Overview
**Query:** "How is my cash flow looking?"

**Expected Response:**
- Summary of recent income vs expenses
- Cash flow trend (improving/declining)
- Current cash position
- Upcoming financial obligations

**Success Criteria:**
- ✅ Cites specific Xero transaction data
- ✅ Provides date ranges
- ✅ Identifies trends
- ✅ Actionable recommendations

---

#### Test 1.2: Revenue Analysis
**Query:** "What's my revenue breakdown by project?"

**Expected Response:**
- Revenue per ACT project
- Top performing projects
- Revenue trends over time
- Percentage breakdown

**Success Criteria:**
- ✅ Links Xero payments to Notion projects
- ✅ Shows accurate amounts
- ✅ Identifies growth opportunities
- ✅ Highlights underperforming areas

---

#### Test 1.3: Expense Analysis
**Query:** "Where am I spending the most money?"

**Expected Response:**
- Top expense categories
- Unusual or large expenses
- Recurring costs
- Cost optimization suggestions

**Success Criteria:**
- ✅ Categorizes expenses intelligently
- ✅ Flags anomalies
- ✅ Suggests cost savings
- ✅ Compares to historical patterns

---

### 2. Project Intelligence

#### Test 2.1: Project Profitability
**Query:** "Which projects are most profitable?"

**Expected Response:**
- Profit margin by project
- ROI calculations
- Time vs revenue analysis
- Resource allocation recommendations

**Success Criteria:**
- ✅ Combines Notion project data with Xero financials
- ✅ Accurate profit calculations
- ✅ Identifies high-value work
- ✅ Suggests resource reallocation

---

#### Test 2.2: Project Status Overview
**Query:** "What projects need my attention?"

**Expected Response:**
- Overdue tasks
- Projects missing financial data
- Stalled projects
- High-priority items

**Success Criteria:**
- ✅ Prioritizes based on deadlines and value
- ✅ Flags data gaps
- ✅ Suggests next actions
- ✅ Links to Notion pages

---

#### Test 2.3: Client Relationship Intelligence
**Query:** "How are my client relationships looking?"

**Expected Response:**
- Active vs inactive clients
- Revenue per client
- Communication frequency (if Gmail integrated)
- Opportunities for engagement

**Success Criteria:**
- ✅ Combines financial + communication data
- ✅ Identifies at-risk relationships
- ✅ Suggests outreach strategies
- ✅ Highlights top clients

---

### 3. Compliance & Bookkeeping

#### Test 3.1: Missing Receipts
**Query:** "Do I have any missing receipts?"

**Expected Response:**
- List of expenses without receipts
- Total amount unbacked
- Impact on tax deductions
- Prioritized action list

**Success Criteria:**
- ✅ Identifies unbacked transactions
- ✅ Calculates financial risk
- ✅ Provides clear action items
- ✅ Sorts by priority/amount

---

#### Test 3.2: Tax Preparation Readiness
**Query:** "Am I ready for tax time?"

**Expected Response:**
- Categorization completeness
- Missing documentation
- Deduction opportunities
- Estimated tax position

**Success Criteria:**
- ✅ Comprehensive audit of financial data
- ✅ Identifies gaps
- ✅ Suggests optimizations
- ✅ Provides confidence score

---

#### Test 3.3: Reconciliation Status
**Query:** "Are my bank accounts reconciled?"

**Expected Response:**
- Reconciliation status by account
- Unmatched transactions
- Discrepancies found
- Steps to resolve

**Success Criteria:**
- ✅ Checks data consistency
- ✅ Flags issues clearly
- ✅ Provides reconciliation guidance
- ✅ Links to problem transactions

---

### 4. Strategic Recommendations

#### Test 4.1: Focus Prioritization
**Query:** "What should I focus on financially this month?"

**Expected Response:**
- Top 3-5 priorities based on data
- Impact vs effort analysis
- Specific action items
- Timeline recommendations

**Success Criteria:**
- ✅ Data-driven priorities
- ✅ Considers multiple factors (cash flow, profitability, compliance)
- ✅ Actionable and specific
- ✅ Realistic timelines

---

#### Test 4.2: Growth Opportunities
**Query:** "Where are my best growth opportunities?"

**Expected Response:**
- High-margin services/projects to expand
- Underutilized client relationships
- Market trends (if Perplexity enabled)
- Investment recommendations

**Success Criteria:**
- ✅ Identifies patterns in successful work
- ✅ Suggests scalable opportunities
- ✅ Includes market research
- ✅ Risk assessment

---

#### Test 4.3: Risk Assessment
**Query:** "What are my biggest financial risks right now?"

**Expected Response:**
- Cash flow vulnerabilities
- Client concentration risk
- Compliance gaps
- Mitigation strategies

**Success Criteria:**
- ✅ Identifies multiple risk types
- ✅ Quantifies impact
- ✅ Prioritizes by severity
- ✅ Provides mitigation plans

---

### 5. Complex Multi-Source Queries

#### Test 5.1: Comprehensive Business Review
**Query:** "Give me a complete business health check"

**Expected Response:**
- Financial summary (revenue, expenses, profit)
- Project portfolio status
- Client relationship health
- Compliance status
- Top 5 action items

**Success Criteria:**
- ✅ Integrates all data sources
- ✅ Balanced perspective
- ✅ Executive summary format
- ✅ Clear priorities

---

#### Test 5.2: Project Deep Dive
**Query:** "Analyze the Factory Records project in detail"

**Expected Response:**
- Project timeline and status
- Financial performance (revenue, costs, profit)
- Communication history with client
- Deliverables and milestones
- Recommendations

**Success Criteria:**
- ✅ Single project across all systems
- ✅ Complete financial picture
- ✅ Contextual insights
- ✅ Next steps

---

#### Test 5.3: Industry Benchmarking (Perplexity)
**Query:** "How do my rates compare to industry standards for creative consulting?"

**Expected Response:**
- Current rate analysis
- Industry benchmark data
- Competitive positioning
- Pricing recommendations

**Success Criteria:**
- ✅ Uses Perplexity for market research
- ✅ Compares internal data to market
- ✅ Specific to industry/location
- ✅ Actionable pricing strategy

---

## Testing Methodology

### Phase 1: Basic Functionality (1 hour)
- Run Tests 1.1, 1.2, 2.1, 3.1
- Verify data retrieval from Xero and Notion
- Confirm AI responses are coherent and relevant

### Phase 2: Integration Testing (1 hour)
- Run Tests 4.1, 5.1
- Validate cross-system data correlation
- Test recommendation quality

### Phase 3: Advanced Features (1 hour)
- Run Tests 5.2, 5.3 with Perplexity enabled
- Test edge cases and error handling
- Validate citation accuracy

### Phase 4: User Acceptance (30 min)
- Free-form queries based on actual business questions
- Assess usefulness and accuracy
- Identify gaps or improvements

---

## Success Metrics

### Quantitative
- ✅ 90%+ query response success rate
- ✅ <5 second average response time
- ✅ 100% accurate data citations
- ✅ Zero hallucinated financial data

### Qualitative
- ✅ Responses feel actionable and specific
- ✅ Insights are genuinely valuable
- ✅ Agent "understands" business context
- ✅ Recommendations align with business values

---

## Known Limitations to Test

1. **Historical Data Depth**: How far back can it analyze?
2. **Data Freshness**: Does it acknowledge sync delays?
3. **Ambiguous Queries**: How does it handle unclear questions?
4. **Missing Data**: How gracefully does it fail when data is incomplete?
5. **Multi-Currency**: Can it handle AUD/USD conversions?

---

## Post-Test Actions

1. **Bug Reports**: Log any errors or incorrect responses
2. **Feature Requests**: Note missing capabilities
3. **Prompt Refinement**: Improve system prompts based on weak responses
4. **Documentation**: Update user guide with best practices
5. **Training Data**: Identify queries that need better context

---

## Quick Start Test Script

```bash
# Terminal 1: Start backend
cd apps/backend
npm run dev

# Terminal 2: Start frontend
cd apps/frontend
npm run dev

# Browser: Open agent
open "http://localhost:5174/?tab=agent"

# Run quick tests:
# 1. "How is my cash flow looking?"
# 2. "Which projects are most profitable?"
# 3. "Do I have any missing receipts?"
# 4. "What should I focus on this month?"
# 5. "Give me a complete business health check"
```

---

## Notes

- Test with **Perplexity enabled** for research-backed insights
- Test with **Perplexity disabled** for faster, cost-effective queries
- Compare response quality between modes
- Monitor API costs during testing
- Take screenshots of particularly good/bad responses for documentation
