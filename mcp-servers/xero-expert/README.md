# Xero Expert MCP Server

Your always-available Xero assistant that knows everything about Xero and ACT's specific setup!

## What It Knows

- **All Xero Features**: Bank reconciliation, bank rules, tracking categories, Xero Projects, reports, GST rules
- **ACT's Setup**: NAB Visa ACT #8815, 332 subscriptions, 706 suppliers, $92K R&D spend
- **R&D Tax Credits**: 43.5% offset, eligibility criteria, documentation requirements, $40K potential refund
- **Multi-Entity Accounting**: Company + Family Trust structure
- **Common Vendors**: OpenAI, GitHub, Vercel, Supabase, AWS, Canva, etc.
- **Best Practices**: Australian GST rules, chart of accounts, weekly goals

## Installation

The server is already configured in your Claude Desktop config! Just restart Claude Desktop to load it.

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xero-expert": {
      "command": "node",
      "args": ["/Users/benknight/Code/ACT Placemat/mcp-servers/xero-expert/index.js"],
      "cwd": "/Users/benknight/Code/ACT Placemat/mcp-servers/xero-expert"
    }
  }
}
```

## Available Tools

### 1. `ask_xero_question`
Ask any question about Xero features, ACT setup, or accounting best practices.

**Examples**:
- "How do I create a bank rule?"
- "What's the R&D tax credit rate?"
- "Should I use Xero Projects?"
- "How do I reconcile transactions?"

### 2. `categorize_transaction`
Get expert advice on how to categorize a specific transaction.

**Examples**:
- "How should I categorize OpenAI?"
- "What account for Canva subscription?"
- "Is Uber R&D or operational?"

### 3. `check_rd_eligibility`
Check if an expense is eligible for R&D tax credit (43.5% offset).

**Examples**:
- "Is my OpenAI API expense R&D eligible? I'm using it to experiment with RAG architectures."
- "Can I claim GitHub costs? We use it for code hosting."

### 4. `xero_how_to`
Get step-by-step instructions for any Xero task.

**Examples**:
- "How do I create a bank rule?"
- "How do I set up tracking categories?"
- "How do I generate a cash flow report?"

### 5. `calculate_rd_refund`
Calculate potential R&D tax refund based on eligible expenses.

**Examples**:
- "Calculate R&D refund for: software $24K, infrastructure $12K, contractors $50K"

### 6. `act_specific_advice`
Get advice specific to ACT's Xero setup, vendors, and business structure.

**Examples**:
- "What are ACT's common vendors?"
- "What's our R&D tax credit status?"
- "Tell me about the trust structure plan"

## Available Resources

### 1. `xero://act-config`
Complete ACT Pty Ltd Xero setup and configuration (JSON)

### 2. `xero://knowledge-base`
Comprehensive Xero features, best practices, and how-tos (JSON)

### 3. `xero://rd-guide`
Complete guide to R&D tax credits in Xero (Markdown)

### 4. `xero://week1-lessons`
Bank reconciliation mastery lessons (Markdown)

## Example Questions

### Bank Reconciliation
- "How do I reconcile OpenAI transactions?"
- "What account should I use for AWS charges?"
- "Is this foreign supplier GST or No GST?"

### Bank Rules
- "How do I create a bank rule for GitHub?"
- "Should I use 'Contains' or 'Equals' for bank rules?"
- "What are ACT's top vendors to create rules for?"

### Tracking Categories
- "How do I set up R&D tracking categories?"
- "What's the difference between Activity Type and Expense Type?"
- "Why are tracking categories important for R&D?"

### R&D Tax Credits
- "What's ACT's current R&D spend?"
- "How much refund can I expect?"
- "Is experimenting with Claude API R&D eligible?"
- "What documentation do I need for AusIndustry?"

### Xero Projects
- "Should ACT use Xero Projects?"
- "How much does Xero Projects cost?"
- "What's the difference between Projects and Tracking Categories?"

### Reports
- "How do I generate a cash flow report?"
- "How do I create an R&D expense report?"
- "What reports should ACT review weekly?"

### Trust Structure
- "How should I set up the family trust in Xero?"
- "What's the cost of multi-entity accounting?"
- "What are the tax benefits of a family trust?"

## ACT's Xero Setup

### Bank Accounts
- **Primary**: NAB Visa ACT #8815
- **Transactions**: 6,677
- **Suppliers**: 706

### Chart of Accounts
#### R&D Expenses (6100-6150)
- 6100: R&D Salaries & Wages
- 6110: R&D Contractors
- 6120: R&D Software & Tools
- 6130: R&D Equipment & Infrastructure
- 6140: R&D Materials & Supplies
- 6150: R&D Professional Services

#### Operational Expenses (6200-6700)
- 6200: Software & Subscriptions
- 6300: Office Expenses
- 6400: Travel & Accommodation
- 6500: Marketing & Advertising
- 6600: Professional Services
- 6700: Meals & Entertainment

### Tracking Categories
1. **Activity Type**: R&D, Operational, Admin
2. **Expense Type**: Software & Tools, Infrastructure, Labor & Contractors, Materials & Supplies, Professional Services

### R&D Tax Credit
- **Rate**: 43.5% refundable offset
- **Current Spend**: $92,000/year
- **Expected Refund**: $40,020
- **Deadline**: April 30 (for previous financial year)

### Common Vendors
#### R&D Software
- OpenAI, Anthropic (Claude), GitHub, Linear, Cursor

#### R&D Infrastructure
- Vercel, Supabase, AWS, Railway, Cloudflare

#### Operational Software
- Google Workspace, Notion, Slack, Zoom, Canva

## 4-Week Mastery Goals

- **Week 1**: 80%+ auto-categorization rate
- **Week 2**: R&D expense tracking for FY2025 claim
- **Week 3**: Family trust structure established
- **Week 4**: 3 premium cards earning 1.2M+ Qantas points/year

## Testing

Run the test script to verify everything works:

```bash
cd /Users/benknight/Code/ACT\ Placemat/mcp-servers/xero-expert
node test-server.js
```

## Troubleshooting

### Server not appearing in Claude Desktop
1. Check that `claude_desktop_config.json` has the `xero-expert` entry
2. Restart Claude Desktop completely
3. Look for MCP icon in Claude Desktop to verify servers loaded

### Tool calls failing
1. Check the MCP server logs in Claude Desktop
2. Verify the server started successfully
3. Try restarting Claude Desktop

## Learn More

- **Week 1 Complete Guide**: `/docs/WEEK1_COMPLETE_GUIDE.md`
- **Xero Mastery Guide**: `/docs/XERO_MASTERY_GUIDE.md`
- **Notion Databases**: Your learning curriculum is populated and ready!

## Support

This MCP server was created as part of ACT's January 2026 Xero Mastery sprint. For questions or issues, ask Claude directly using any of the tools above!
