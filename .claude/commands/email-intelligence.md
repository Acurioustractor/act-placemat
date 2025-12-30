# Email Intelligence Hub

Scan ACT Workspace emails for financial documents, reconcile with Xero, and track all business expenses.

## Overview

This command provides deep email scanning across ALL act.place email accounts to extract financial transactions and reconcile them with Xero bank accounts. Goes beyond subscriptions to become foundational infrastructure for contact intelligence, project tracking, and future use cases.

**Accounts Scanned:**
- nicholas@act.place
- hi@act.place
- accounts@act.place
- benjamin@act.place

**Document Types:**
- Invoices
- Receipts
- Payment confirmations
- Refunds
- Statements
- Subscriptions

## Commands

### /scan-emails [account] [timeframe]

Scan ACT Workspace email accounts for financial documents.

**Usage:**
```
/scan-emails                          # Scan all accounts, last 30 days
/scan-emails nicholas@act.place 3m    # Scan specific account, 3 months
/scan-emails all 1y                   # Scan all accounts, 1 year
```

**What it does:**
1. Uses `scan_workspace_emails` MCP tool to search Gmail
2. Calls `extract_financial_data` MCP tool for AI extraction
3. Stores results in `email_financial_documents` database table
4. Triggers EmailIntelligenceAgent for auto-reconciliation

**Output:**
```
📧 Email Scan Complete

Accounts scanned: 4 (nicholas@, hi@, accounts@, benjamin@)
Timeframe: Last 30 days
Messages scanned: 347
Financial documents found: 23

Breakdown by type:
- Invoices: 12
- Receipts: 8
- Payment confirmations: 3

Reconciliation status:
- Auto-matched: 18 (78%)
- Manual review: 3 (13%)
- Unmatched: 2 (9%)

Total amount discovered: $4,237.45 AUD
```

### /financial-transactions [timeframe] [status]

Show all financial transactions extracted from emails.

**Usage:**
```
/financial-transactions              # Last 30 days, all statuses
/financial-transactions 1y matched   # Last year, auto-matched only
/financial-transactions 90d review   # Last 90 days, needs review
```

**What it does:**
Queries `email_financial_documents` table with filters for timeframe and reconciliation status.

**Output:**
```
💰 Financial Transactions (Last 3 months)

Total: $12,458.90 AUD across 67 transactions

By Status:
✅ Auto-matched: 52 ($9,234.12)
🔍 Manual review: 8 ($2,145.00)
❌ Unmatched: 7 ($1,079.78)

By Account:
- nicholas@act.place: $7,234.50 (35 transactions)
- hi@act.place: $3,124.40 (18 transactions)
- accounts@act.place: $1,500.00 (10 transactions)
- benjamin@act.place: $600.00 (4 transactions)

Top Vendors:
1. Webflow - $589.00/mo (subscription)
2. Google Workspace - $324.00/mo (subscription)
3. Anthropic API - $247.50/mo (usage)
```

### /reconcile-xero [timeframe] [mode]

Trigger reconciliation with Xero bank transactions.

**Usage:**
```
/reconcile-xero           # Last 30 days, auto mode
/reconcile-xero 90d auto  # Last 90 days, auto-match eligible
/reconcile-xero all       # All unmatched, review mode
```

**What it does:**
1. Fetches unmatched documents from `email_financial_documents`
2. Calls EmailIntelligenceAgent.reconcileAllUnmatched()
3. Uses FuzzyMatcher to find Xero transactions
4. Auto-matches if confidence ≥80% and amount ≤$250

**Output:**
```
🔄 Xero Reconciliation Complete

Matched: 15 transactions
Auto-reconciled: 12 (80%)
Manual review: 2 (13%)
Unable to match: 1 (7%)

Details:
✅ Xero ($75.00) → Email receipt from xero.com
✅ Descript ($70.52) → Email receipt from descript.com
🔍 Stripe ($247.50) → Needs manual review (multiple candidates)
❌ Unknown Vendor ($15.00) → No Xero transaction found
```

### /email-stats [period]

Show email intelligence metrics and system health.

**Usage:**
```
/email-stats       # Last 30 days
/email-stats 90d   # Last 90 days
```

**What it does:**
Aggregates metrics from `email_financial_documents` table and agent audit logs.

**Output:**
```
📊 Email Intelligence Statistics (Last 30 days)

Scanning Activity:
- Total scans: 30 (1/day automated)
- Emails processed: 10,423
- Financial docs found: 234
- Detection rate: 2.2%

Reconciliation Performance:
- Auto-match rate: 82% (target: 80%)
- Average confidence: 0.87
- False positives: 3 (1.3%)

Time Savings:
- Manual entry avoided: 234 transactions
- Estimated hours saved: 23.4 hours
- Value @ $30/hr: $702

Top Unmatched:
1. "Accounts" ($120) - benjamin@act.place
2. "Act" ($??) - unknown account
```

## Implementation

### MCP Tools Used

This skill uses the `gmail-workspace` MCP server (configured in `.mcp.json`):

1. **scan_workspace_emails** - Scan all accounts for financial documents
2. **get_email_details** - Fetch full email content
3. **extract_financial_data** - AI-powered extraction using Claude
4. **search_emails** - Advanced search with deduplication
5. **list_accounts** - Show account status

### Agent Events

This skill triggers EmailIntelligenceAgent events:

1. **email_scan_scheduled** - When /scan-emails called
2. **financial_document_detected** - When document extracted
3. **email_reconciliation_requested** - When /reconcile-xero called
4. **reconciliation_completed** - When match confirmed

### Database Tables

Queries these Supabase tables:

1. **email_financial_documents** - Main storage for extracted documents
2. **unreconciled_financial_documents** (view) - Documents needing attention
3. **financial_by_account** (view) - Summary by email account
4. **financial_monthly_summary** (view) - Monthly aggregations

## Examples

### Example 1: Daily workflow

```
User: /scan-emails
Claude: [Scans all 4 accounts for last 30 days]
        Found 12 new invoices, 8 auto-matched with Xero
        3 need manual review

User: /financial-transactions review
Claude: [Shows 3 transactions needing manual review]
        Stripe: $247.50 (2 Xero candidates)
        Unknown: $15.00 (no Xero match)
        BP: $87.34 (date mismatch)

User: /reconcile-xero 90d
Claude: [Triggers reconciliation]
        Successfully matched 2 more transactions
        1 still needs attention
```

### Example 2: Year-end review

```
User: /financial-transactions 1y
Claude: [Shows full year analysis]
        Total: $45,678.90 across 347 transactions
        Auto-matched: 315 (91%)
        [Breakdown by vendor, account, month]

User: /email-stats 1y
Claude: [Shows annual metrics]
        Saved 347 hours of manual entry
        Value: $10,410 @ $30/hr
```

### Example 3: Account-specific scan

```
User: /scan-emails nicholas@act.place 1y
Claude: [Scans only Nicholas's account for full year]
        Found 145 financial documents
        Total: $23,456.78
        Top vendor: Stripe ($3,450/year)
```

## Technical Details

### Auto-Reconciliation Policy

The EmailIntelligenceAgent applies these rules:

- **Auto-match**: Confidence ≥80% AND amount ≤$250
- **Manual review**: Confidence 60-80% OR amount >$250
- **Unmatched**: Confidence <60%

### Fuzzy Matching Algorithm

Uses weighted scoring:
- Vendor name: 40% (Levenshtein distance ≥70%)
- Amount: 30% (±5% tolerance)
- Date: 20% (±30 days window)
- Reference: 10% (substring matching)

### R&D Compliance

This system is documented for Australian R&D tax incentive:

**Technical Uncertainty**: Optimal Gmail API query patterns for financial document detection
**Methodology**: Multi-account scanning + AI extraction + fuzzy reconciliation
**Success Metric**: 90% auto-reconciliation rate, <5% false positives
**Category**: Core R&D (software development)
**Estimated Hours**: 20 hours

## Prerequisites

1. ✅ Google Workspace domain-wide delegation configured
2. ✅ Service account authorized with scopes
3. ✅ MCP server installed and added to `.mcp.json`
4. ✅ EmailIntelligenceAgent registered with AgentOrchestrator
5. ✅ Database migration applied

## Troubleshooting

**Issue**: "gmail-workspace MCP server not found"
**Fix**: Restart Claude Code to reload `.mcp.json` configuration

**Issue**: "Precondition check failed" when scanning emails
**Fix**: Domain-wide delegation not configured in Google Workspace Admin Console

**Issue**: AI extraction returns low confidence
**Fix**: Email may not contain structured financial data - mark for manual entry

**Issue**: No auto-reconciliation happening
**Fix**: Check policy thresholds - may need to lower auto_reconcile_threshold in agent config
