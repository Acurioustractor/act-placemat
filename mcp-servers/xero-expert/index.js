#!/usr/bin/env node

/**
 * Xero Expert MCP Server
 *
 * Your always-available Xero assistant that knows:
 * - All Xero features and how to use them
 * - ACT's specific setup and configuration
 * - R&D tax credits and compliance
 * - Bank reconciliation best practices
 * - Chart of accounts for Australian businesses
 * - GST rules and regulations
 * - Multi-entity accounting (company + trust)
 * - Xero Projects and tracking categories
 *
 * Usage: Ask any Xero question and get instant, expert answers!
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ACT's Xero Configuration
const ACT_XERO_CONFIG = {
  organization: {
    name: "ACT Pty Ltd",
    abn: "TBD",
    structure: "Proprietary Limited Company",
    industry: "Technology / R&D",
    financialYear: "July 1 - June 30 (Australian)",
  },
  bankAccounts: {
    primary: "NAB Visa ACT #8815",
    transactions: 6677,
    suppliers: 706,
  },
  chartOfAccounts: {
    rdExpenses: {
      "6100": "R&D Salaries & Wages",
      "6110": "R&D Contractors",
      "6120": "R&D Software & Tools",
      "6130": "R&D Equipment & Infrastructure",
      "6140": "R&D Materials & Supplies",
      "6150": "R&D Professional Services",
    },
    operationalExpenses: {
      "6200": "Software & Subscriptions",
      "6300": "Office Expenses",
      "6400": "Travel & Accommodation",
      "6500": "Marketing & Advertising",
      "6600": "Professional Services",
      "6700": "Meals & Entertainment",
    },
  },
  trackingCategories: {
    activityType: ["R&D", "Operational", "Admin"],
    expenseType: ["Software & Tools", "Infrastructure", "Labor & Contractors", "Materials & Supplies", "Professional Services"],
  },
  rdTaxCredit: {
    rate: 0.435,
    eligibleActivities: [
      "AI model development",
      "Software experimentation",
      "Technical risk solving",
      "Novel algorithm development",
      "Platform architecture innovation",
    ],
    currentSpend: {
      openai: "$24,000/year",
      github: "$6,000/year",
      aws: "$12,000/year",
      contractors: "$50,000/year",
      total: "$92,000/year",
      expectedRefund: "$40,020",
    },
  },
  commonVendors: {
    rdSoftware: ["OpenAI", "Anthropic (Claude)", "GitHub", "Linear", "Cursor"],
    rdInfrastructure: ["Vercel", "Supabase", "AWS", "Railway", "Cloudflare"],
    operationalSoftware: ["Google Workspace", "Notion", "Slack", "Zoom", "Canva"],
  },
  subscriptions: 332,
  weeklyGoals: {
    week1: "80%+ auto-categorization rate",
    week2: "R&D expense tracking for FY2025 claim",
    week3: "Family trust structure established",
    week4: "3 premium cards earning 1.2M+ Qantas points/year",
  },
};

// Xero Knowledge Base
const XERO_KNOWLEDGE = {
  features: {
    bankReconciliation: {
      description: "Match bank transactions to expense categories",
      location: "Accounting → Bank accounts → [Account] → Reconcile",
      bestPractices: [
        "Reconcile daily (takes 5-10 min)",
        "Use bank rules for recurring vendors",
        "Apply tracking categories for R&D",
        "Never let transactions go 7+ days unreconciled",
      ],
      commonIssues: [
        {
          issue: "Transaction amount doesn't match",
          solution: "Use bank statement amount (includes FX fees). This is normal for foreign currency.",
        },
        {
          issue: "Can't find bank accounts menu",
          solution: "Check you're in correct organization. Click your name → Switch organization.",
        },
      ],
    },
    bankRules: {
      description: "Automate categorization for recurring transactions",
      location: "Accounting → Advanced → Bank rules",
      howToCreate: [
        "Find a reconciled transaction from recurring vendor",
        "Click transaction → Create rule",
        "Use 'Contains' for flexibility (recommended)",
        "Test rule on next transaction",
      ],
      bestPractices: [
        "Create rules for all monthly subscriptions",
        "Use 'Contains' not 'Equals' (handles variations)",
        "Include tracking categories in rules",
        "Review rules monthly for accuracy",
      ],
    },
    trackingCategories: {
      description: "Extra tags for multi-dimensional expense tracking",
      location: "Settings → General Settings → Tracking",
      setup: [
        "Create Category 1: Activity Type (R&D, Operational, Admin)",
        "Create Category 2: Expense Type (Software, Infrastructure, Labor, etc.)",
        "Enable tracking on expense accounts (Chart of Accounts → Edit account)",
        "Apply during reconciliation",
      ],
      rdBenefit: "Essential for AusIndustry R&D tax credit claims - proves which expenses were R&D vs operational",
    },
    xeroProjects: {
      description: "Track expenses, time, and profitability per project",
      cost: "$78/month add-on",
      benefits: [
        "Real-time profitability dashboard",
        "Budget vs actual monitoring",
        "Time tracking built-in",
        "Invoice from projects",
        "Job costing for R&D activities",
      ],
      vsTrackingCategories: {
        useProjectsWhen: "You have distinct projects, need profitability visibility, or bill clients",
        useTrackingWhen: "Simple internal cost allocation only",
      },
      actRecommendation: "YES - $78/month worth it for 10 projects + R&D tracking",
    },
    reports: {
      cashFlow: {
        location: "Reports → Cash Flow Statement",
        sections: ["Operating Activities", "Investing Activities", "Financing Activities"],
        keyMetrics: ["Monthly burn rate", "R&D % of spend", "Runway (months)"],
      },
      profitLoss: {
        location: "Reports → Profit and Loss",
        useFor: "Understanding revenue vs expenses by category",
      },
      balanceSheet: {
        location: "Reports → Balance Sheet",
        useFor: "Assets, liabilities, equity snapshot",
      },
      rdExpenses: {
        custom: true,
        setup: "Reports → Account Transactions → Filter by R&D tracking category",
        export: "CSV for accountant to prepare AusIndustry claim",
      },
    },
  },
  gstRules: {
    australianSupplier: "GST on Expenses (10%)",
    foreignSupplier: "No GST",
    commonForeign: ["OpenAI", "GitHub", "Vercel", "Supabase", "AWS", "Stripe", "Anthropic"],
    commonAustralian: ["Telstra", "Australia Post", "Local suppliers"],
    mealsEntertainment: "GST applies, but only 50% tax deductible (Xero handles automatically)",
  },
  rdTaxCredit: {
    rate: "43.5% refundable offset for companies with turnover < $20M",
    eligibleExpenses: [
      "Software development with technical risk",
      "AI/ML model experimentation",
      "Novel algorithm development",
      "Platform architecture innovation",
      "Experimental prototyping",
    ],
    notEligible: [
      "Routine software maintenance",
      "Using existing technology without innovation",
      "Market research",
      "Sales and marketing",
    ],
    documentation: [
      "Track hypothesis + methodology + findings for each R&D activity",
      "Use Xero Projects to track costs per R&D activity",
      "Export quarterly reports for accountant review",
      "Apply R&D tracking categories to all eligible expenses",
    ],
    deadline: "April 30 (for previous financial year ending June 30)",
  },
  multiEntity: {
    company: {
      name: "ACT Pty Ltd",
      xeroOrg: "Primary",
      cost: "$65/month",
    },
    trust: {
      name: "ACT Family Trust (to be established)",
      xeroOrg: "Separate organization",
      cost: "$65/month",
      chartOfAccounts: {
        income: ["4100 - Distribution from ACT Pty Ltd", "4200 - Investment Income"],
        expenses: ["6100 - Trustee Fees", "6200 - Professional Fees", "6300 - Distribution to Beneficiaries"],
        equity: ["3100 - Trust Capital Account", "3200 - Retained Earnings"],
      },
      intercompanyTracking: {
        companyExpense: "6900 - Distribution to Family Trust",
        trustIncome: "4100 - Distribution from ACT Pty Ltd",
        reconciliation: "Monthly validation that amounts match",
      },
    },
    totalCost: "$130/month for both organizations",
  },
  integrations: {
    hubdoc: {
      description: "Receipt capture and auto-publish to Xero",
      cost: "Free with Xero",
      email: "receipts@hubdoc.com",
      benefit: "Zero manual data entry for R&D expenses",
    },
    stripe: {
      description: "Payment processor with Xero sync",
      useFor: "Amex Qantas points optimization",
      benefit: "Auto-reconcile card transactions, earn points",
    },
    goCardless: {
      description: "Direct debit for recurring revenue",
      fees: "1% + $0.20 per transaction (50-70% cheaper than cards)",
      useFor: "Donor subscriptions, royalties",
    },
  },
};

class XeroExpertServer {
  constructor() {
    this.server = new Server(
      {
        name: 'xero-expert-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'xero://act-config',
          mimeType: 'application/json',
          name: 'ACT Xero Configuration',
          description: 'Complete ACT Pty Ltd Xero setup and configuration',
        },
        {
          uri: 'xero://knowledge-base',
          mimeType: 'application/json',
          name: 'Xero Knowledge Base',
          description: 'Comprehensive Xero features, best practices, and how-tos',
        },
        {
          uri: 'xero://rd-guide',
          mimeType: 'text/markdown',
          name: 'R&D Tax Credit Guide',
          description: 'Complete guide to R&D tax credits in Xero',
        },
        {
          uri: 'xero://week1-lessons',
          mimeType: 'text/markdown',
          name: 'Week 1 Lessons',
          description: 'Bank reconciliation mastery lessons',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'xero://act-config') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(ACT_XERO_CONFIG, null, 2),
          }],
        };
      }

      if (uri === 'xero://knowledge-base') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(XERO_KNOWLEDGE, null, 2),
          }],
        };
      }

      if (uri === 'xero://rd-guide') {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: this.generateRDGuide(),
          }],
        };
      }

      if (uri === 'xero://week1-lessons') {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: 'See /Users/benknight/Code/ACT Placemat/docs/WEEK1_COMPLETE_GUIDE.md for complete lessons',
          }],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'ask_xero_question',
          description: 'Ask any question about Xero features, ACT setup, or accounting best practices. I know everything about Xero and ACT\'s configuration.',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'Your Xero question (e.g., "How do I create a bank rule?", "What\'s the R&D tax credit rate?", "Should I use Xero Projects?")',
              },
              context: {
                type: 'string',
                description: 'Optional context (e.g., "I\'m reconciling OpenAI transactions", "Setting up tracking categories")',
              },
            },
            required: ['question'],
          },
        },
        {
          name: 'categorize_transaction',
          description: 'Get expert advice on how to categorize a specific transaction in Xero',
          inputSchema: {
            type: 'object',
            properties: {
              vendor: {
                type: 'string',
                description: 'Vendor name (e.g., "OpenAI", "Canva", "Uber")',
              },
              amount: {
                type: 'number',
                description: 'Transaction amount',
              },
              description: {
                type: 'string',
                description: 'Transaction description or purpose',
              },
            },
            required: ['vendor'],
          },
        },
        {
          name: 'check_rd_eligibility',
          description: 'Check if an expense is eligible for R&D tax credit (43.5% offset)',
          inputSchema: {
            type: 'object',
            properties: {
              expense: {
                type: 'string',
                description: 'Description of the expense or activity',
              },
              purpose: {
                type: 'string',
                description: 'What was this expense for? What problem were you solving?',
              },
            },
            required: ['expense', 'purpose'],
          },
        },
        {
          name: 'xero_how_to',
          description: 'Get step-by-step instructions for any Xero task',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'What do you want to do? (e.g., "create a bank rule", "set up tracking categories", "generate cash flow report")',
              },
            },
            required: ['task'],
          },
        },
        {
          name: 'calculate_rd_refund',
          description: 'Calculate potential R&D tax refund based on eligible expenses',
          inputSchema: {
            type: 'object',
            properties: {
              expenses: {
                type: 'object',
                description: 'R&D expenses by category (e.g., {"software": 24000, "infrastructure": 12000, "contractors": 50000})',
              },
            },
            required: ['expenses'],
          },
        },
        {
          name: 'act_specific_advice',
          description: 'Get advice specific to ACT\'s Xero setup, vendors, and business structure',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'What aspect of ACT\'s setup? (e.g., "common vendors", "R&D tracking", "trust structure")',
              },
            },
            required: ['topic'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'ask_xero_question':
          return this.handleXeroQuestion(args.question, args.context);

        case 'categorize_transaction':
          return this.handleCategorizeTransaction(args.vendor, args.amount, args.description);

        case 'check_rd_eligibility':
          return this.handleRDEligibility(args.expense, args.purpose);

        case 'xero_how_to':
          return this.handleHowTo(args.task);

        case 'calculate_rd_refund':
          return this.handleCalculateRDRefund(args.expenses);

        case 'act_specific_advice':
          return this.handleACTAdvice(args.topic);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  handleXeroQuestion(question, context = '') {
    const answer = this.answerQuestion(question, context);
    return {
      content: [
        {
          type: 'text',
          text: answer,
        },
      ],
    };
  }

  answerQuestion(question, context) {
    const q = question.toLowerCase();

    // Bank reconciliation questions
    if (q.includes('reconcil') || q.includes('categoriz')) {
      return `**Bank Reconciliation in Xero**

**Where**: Accounting → Bank accounts → NAB Visa ACT #8815 → Reconcile

**How to categorize a transaction**:
1. Click the transaction
2. Fill in:
   - **Contact/Payee**: Vendor name
   - **Account**: Expense category (6120 for R&D Software, 6200 for Operational Software, etc.)
   - **Tax**: GST on Expenses (10%) for Australian suppliers, No GST for foreign
   - **Tracking**: R&D or Operational + Expense Type
3. Click OK

**Best practices**:
- Reconcile daily (5-10 min)
- Use bank rules for recurring vendors
- Never let transactions go 7+ days unreconciled
- Apply R&D tracking for tax credits

${context ? `\n**For your context** ("${context}"):\n${this.getContextualAdvice(context)}` : ''}`;
    }

    // Bank rules questions
    if (q.includes('bank rule') || q.includes('automat')) {
      return `**Creating Bank Rules**

**Where**: Accounting → Advanced → Bank rules

**How to create**:
1. Find a reconciled transaction from recurring vendor
2. Click transaction → "Create rule"
3. Fill in:
   - **Rule name**: Descriptive (e.g., "OpenAI Monthly API")
   - **When transaction contains**: Use "Contains" not "Equals"
   - **Contact, Account, Tax**: Same as manual categorization
   - **Tracking**: Include if applicable
4. Click Save
5. Test on next transaction

**Pro tip**: Use "Contains" for flexibility. "GitHub" matches "GITHUB INC" and "GitHub Corp".

**ACT's top rules to create**:
${Object.entries(ACT_XERO_CONFIG.commonVendors).flatMap(([cat, vendors]) =>
  vendors.slice(0, 3).map(v => `- ${v}`)
).join('\n')}`;
    }

    // Tracking categories
    if (q.includes('tracking') || q.includes('r&d') && q.includes('category')) {
      return `**Tracking Categories Setup**

**Where**: Settings → General Settings → Tracking

**ACT's recommended setup**:

**Category 1: Activity Type**
- R&D
- Operational
- Admin

**Category 2: Expense Type**
- Software & Tools
- Infrastructure
- Labor & Contractors
- Materials & Supplies
- Professional Services

**How to enable**:
1. Create both categories (Settings → Tracking)
2. Go to Chart of Accounts
3. For each expense account (6100-6700):
   - Click ⋯ → Edit
   - Check "Enable tracking"
   - Select both categories
   - Save

**Why this matters**:
Essential for R&D tax credit claims! Proves which $92K of expenses are R&D-eligible = $40K refund.

**Matrix example**:
- R&D + Software = $24K (OpenAI)
- R&D + Infrastructure = $12K (AWS)
- Operational + Software = $6K (Canva)`;
    }

    // GST questions
    if (q.includes('gst') || q.includes('tax')) {
      return `**GST Rules in Australia**

**Simple rule**:
- ✅ **Australian supplier** = GST on Expenses (10%)
- ❌ **Foreign supplier** = No GST

**Common foreign suppliers (No GST)**:
${XERO_KNOWLEDGE.gstRules.commonForeign.join(', ')}

**Common Australian suppliers (GST)**:
${XERO_KNOWLEDGE.gstRules.commonAustralian.join(', ')}

**Special cases**:
- **Meals & Entertainment**: GST applies, but only 50% tax deductible (Xero handles automatically)
- **Digital services from overseas**: Generally No GST for business use
- **When unsure**: Check vendor's invoice for ABN + GST notation

**R&D Tax Credit**: Separate from GST! You get 43.5% refund on R&D expenses regardless of GST status.`;
    }

    // Xero Projects
    if (q.includes('project') || q.includes('profitability')) {
      return `**Xero Projects**

**Cost**: $78/month add-on

**Features**:
- ✅ Real-time profitability dashboard
- ✅ Budget vs actual monitoring
- ✅ Time tracking built-in
- ✅ Invoice from projects
- ✅ Job costing for R&D activities

**vs Tracking Categories**:
- **Use Projects**: When you have distinct projects, need profitability, or bill clients
- **Use Tracking**: Simple internal cost allocation only

**ACT Recommendation**: ✅ **YES** - $78/month worth it for:
- 10 distinct projects (your Notion database)
- R&D cost tracking per activity (for $40K tax credits)
- Profitability visibility
- Future client billing capability

**Setup**:
1. Purchase add-on (Settings → Subscriptions)
2. Create project for each of your 10 Notion projects
3. Sync Xero Project ID to Notion (we can build this)
4. Assign transactions to projects during reconciliation
5. View profitability: Projects → Project Summary Report

**ROI**: Enables accurate R&D tracking = $40K refund. Pays for itself 40x over!`;
    }

    // R&D tax credit
    if (q.includes('r&d') || q.includes('tax credit')) {
      return `**R&D Tax Credit in Australia**

**Rate**: 43.5% refundable offset (companies < $20M turnover)

**ACT's Current R&D Spend**:
${Object.entries(ACT_XERO_CONFIG.rdTaxCredit.currentSpend).map(([k, v]) =>
  k !== 'total' && k !== 'expectedRefund' ? `- ${k}: ${v}` : ''
).filter(Boolean).join('\n')}
- **Total**: ${ACT_XERO_CONFIG.rdTaxCredit.currentSpend.total}
- **Expected Refund**: ${ACT_XERO_CONFIG.rdTaxCredit.currentSpend.expectedRefund}

**Eligible Expenses**:
${XERO_KNOWLEDGE.rdTaxCredit.eligibleExpenses.map(e => `✅ ${e}`).join('\n')}

**Not Eligible**:
${XERO_KNOWLEDGE.rdTaxCredit.notEligible.map(e => `❌ ${e}`).join('\n')}

**How to track in Xero**:
1. Use R&D expense accounts (6100-6150)
2. Apply "R&D" tracking category
3. Use Xero Projects for per-activity tracking
4. Generate quarterly reports (Reports → Account Transactions → Filter R&D)
5. Export for accountant before April 30 deadline

**Documentation needed**:
- Hypothesis: What were you trying to solve?
- Methodology: How did you approach it?
- Findings: What did you learn?

Store this in Notion, link to Xero Projects!`;
    }

    // Reports
    if (q.includes('report') || q.includes('cash flow')) {
      return `**Xero Reports**

**Cash Flow Statement**:
- **Where**: Reports → Cash Flow Statement
- **Shows**: Operating, Investing, Financing activities
- **Key metrics**: Monthly burn rate, runway
- **ACT tip**: Review weekly to track spending trends

**Profit & Loss**:
- **Where**: Reports → Profit and Loss
- **Shows**: Revenue vs expenses by category
- **ACT tip**: Filter by R&D tracking to see eligible spend

**R&D Expense Report** (Custom):
1. Reports → Account Transactions
2. Filter:
   - Date: Last quarter or YTD
   - Accounts: 6100-6150 (R&D accounts)
   - Tracking: R&D category
3. Export CSV for accountant
4. **Bookmark** this report for monthly review

**Key ACT Metrics to Track**:
- Monthly burn rate: Total expenses ÷ 12
- R&D % of spend: Currently 62% ($92K of ~$150K)
- Largest category: Software (35%)
- Subscription costs: 332 subscriptions = 28% of total`;
    }

    // Multi-entity
    if (q.includes('trust') || q.includes('multi') || q.includes('entity')) {
      return `**Multi-Entity Setup: Company + Trust**

**ACT Pty Ltd** (Current):
- Xero org: Primary
- Cost: $65/month
- Purpose: Operating company

**ACT Family Trust** (To be established Week 3):
- Xero org: Separate ($65/month)
- Cost: $3,500 one-time setup + $65/month
- Purpose: Tax efficiency, income distribution

**Total Xero cost**: $130/month for both orgs

**Chart of Accounts for Trust**:
**Income**:
${XERO_KNOWLEDGE.multiEntity.trust.chartOfAccounts.income.join('\n')}

**Expenses**:
${XERO_KNOWLEDGE.multiEntity.trust.chartOfAccounts.expenses.join('\n')}

**Intercompany Tracking**:
- Company expense: ${XERO_KNOWLEDGE.multiEntity.trust.intercompanyTracking.companyExpense}
- Trust income: ${XERO_KNOWLEDGE.multiEntity.trust.intercompanyTracking.trustIncome}
- Reconcile monthly to ensure amounts match

**Tax Benefits**:
- Distribute income to family members in lower tax brackets
- $10K-$30K annual tax savings potential
- Asset protection

**Week 3 project**: Engage accountant, establish trust, configure Xero`;
    }

    // Default comprehensive answer
    return `**Xero Question**: "${question}"

I'm your Xero expert! I know everything about Xero and ACT's setup.

**ACT's Xero Configuration**:
- Organization: ACT Pty Ltd
- Bank: NAB Visa ACT #8815 (6,677 transactions)
- Subscriptions: 332 active
- R&D Spend: $92K/year → $40K refund potential

**I can help with**:
- ✅ Bank reconciliation & categorization
- ✅ Creating bank rules for automation
- ✅ R&D tracking & tax credits (43.5% offset)
- ✅ Tracking categories setup
- ✅ GST rules (Australian vs foreign suppliers)
- ✅ Xero Projects for profitability
- ✅ Cash flow & financial reports
- ✅ Multi-entity setup (company + trust)
- ✅ ACT-specific vendor categorization

**Ask me specifically**:
- "How do I reconcile OpenAI transactions?"
- "Should I use Xero Projects?"
- "What's the R&D tax credit rate?"
- "How do I create a bank rule for GitHub?"
- "Is this expense R&D-eligible?"

**Current Week 1 Goal**: 80%+ auto-categorization rate by Friday

What specific aspect of Xero would you like help with?`;
  }

  getContextualAdvice(context) {
    const c = context.toLowerCase();

    if (c.includes('openai') || c.includes('claude')) {
      return '**For AI tools like OpenAI/Claude**:\n- Account: 6120 - R&D Software & Tools\n- Tax: No GST (foreign supplier)\n- Tracking: R&D + Software & Tools\n- Create bank rule for monthly auto-categorization';
    }

    if (c.includes('github') || c.includes('vercel')) {
      return '**For dev tools**:\n- Account: 6120 - R&D Software (GitHub) or 6130 - R&D Infrastructure (Vercel)\n- Tax: No GST (foreign)\n- Tracking: R&D + Software/Infrastructure\n- Highly R&D eligible!';
    }

    return 'Apply R&D tracking if related to technical experimentation or solving technical challenges.';
  }

  handleCategorizeTransaction(vendor, amount, description) {
    const categorization = this.categorizeVendor(vendor, description);

    return {
      content: [{
        type: 'text',
        text: `**How to categorize: ${vendor}** ${amount ? `($${amount})` : ''}

${categorization}

**Next steps in Xero**:
1. Banking → NAB Visa ACT #8815 → Reconcile
2. Find the ${vendor} transaction
3. Apply the categorization above
4. Consider creating a bank rule for future automation

**Create bank rule?** If this is a recurring vendor (monthly subscription), create a rule to save time!`,
      }],
    };
  }

  categorizeVendor(vendor, description = '') {
    const v = vendor.toLowerCase();
    const rdSoftware = ACT_XERO_CONFIG.commonVendors.rdSoftware.map(x => x.toLowerCase());
    const rdInfra = ACT_XERO_CONFIG.commonVendors.rdInfrastructure.map(x => x.toLowerCase());
    const opSoftware = ACT_XERO_CONFIG.commonVendors.operationalSoftware.map(x => x.toLowerCase());

    if (rdSoftware.some(s => v.includes(s))) {
      return `**Recommended Categorization**:
- **Contact**: ${vendor}
- **Account**: 6120 - R&D Software & Tools
- **Tax**: No GST (foreign supplier)
- **Tracking**: R&D + Software & Tools

**Why R&D**: This is AI/development tooling used for technical experimentation.
**Tax Credit**: ✅ Eligible for 43.5% R&D offset`;
    }

    if (rdInfra.some(s => v.includes(s))) {
      return `**Recommended Categorization**:
- **Contact**: ${vendor}
- **Account**: 6130 - R&D Equipment & Infrastructure
- **Tax**: No GST (foreign supplier)
- **Tracking**: R&D + Infrastructure

**Why R&D**: Cloud infrastructure for development and experimentation.
**Tax Credit**: ✅ Eligible for 43.5% R&D offset`;
    }

    if (opSoftware.some(s => v.includes(s))) {
      return `**Recommended Categorization**:
- **Contact**: ${vendor}
- **Account**: 6200 - Software & Subscriptions
- **Tax**: Check vendor location (GST if AU, No GST if foreign)
- **Tracking**: Operational + Software & Tools

**Why Operational**: General business operations, not R&D experimentation.
**Tax Credit**: ❌ Not R&D-eligible`;
    }

    // Default advice
    return `**Categorization Guide for ${vendor}**:

**Ask yourself**:
1. **Is this for R&D?** (Technical experimentation, solving technical challenges, AI development)
   - Yes → Account: 6120 (Software) or 6130 (Infrastructure), Tracking: R&D
   - No → Account: 6200-6700 (operational categories), Tracking: Operational

2. **Is vendor Australian or foreign?**
   - Australian → Tax: GST on Expenses (10%)
   - Foreign (most SaaS) → Tax: No GST

3. **What type of expense?**
   - Software/SaaS → 6120 (R&D) or 6200 (Operational)
   - Cloud hosting → 6130 (R&D Infrastructure)
   - Travel → 6400
   - Meals → 6700 (only 50% deductible)

${description ? `\n**Based on "${description}"**:\n${this.analyzeDescription(description)}` : ''}`;
  }

  analyzeDescription(description) {
    const d = description.toLowerCase();
    if (d.includes('api') || d.includes('development') || d.includes('experiment')) {
      return '→ Looks like R&D! Use 6120-6150 accounts with R&D tracking.';
    }
    if (d.includes('client') || d.includes('meeting')) {
      return '→ Looks operational. Use 6200+ accounts with Operational tracking.';
    }
    return '→ Review purpose to determine R&D vs Operational.';
  }

  handleRDEligibility(expense, purpose) {
    const eligible = this.checkRDEligibility(expense, purpose);

    return {
      content: [{
        type: 'text',
        text: eligible,
      }],
    };
  }

  checkRDEligibility(expense, purpose) {
    const p = purpose.toLowerCase();
    const keywords = {
      eligible: ['experiment', 'novel', 'technical', 'risk', 'research', 'develop', 'prototype', 'test', 'ai', 'ml', 'algorithm'],
      notEligible: ['routine', 'maintenance', 'marketing', 'sales', 'admin'],
    };

    const hasEligible = keywords.eligible.some(k => p.includes(k));
    const hasNotEligible = keywords.notEligible.some(k => p.includes(k));

    if (hasEligible && !hasNotEligible) {
      return `**R&D Eligibility: ${expense}**

✅ **LIKELY ELIGIBLE** for 43.5% tax credit

**Why**: Your purpose ("${purpose}") indicates technical experimentation or solving technical challenges.

**To qualify, ensure**:
- Technical risk or uncertainty existed
- Experimentation was systematic (hypothesis → test → findings)
- Outcome wasn't certain at start
- Solving a technical (not business) problem

**Document for AusIndustry**:
- **Hypothesis**: What technical problem were you solving?
- **Methodology**: How did you approach it?
- **Findings**: What did you learn? (Success or failure both count!)

**In Xero**:
- Account: 6120-6150 (R&D accounts)
- Tracking: R&D + appropriate expense type
- Project: Link to specific R&D activity in Xero Projects

**Expected refund**: $${(parseFloat(expense.replace(/[^0-9.]/g, '')) * 0.435).toFixed(2)} (if eligible)`;
    }

    if (hasNotEligible) {
      return `**R&D Eligibility: ${expense}**

❌ **LIKELY NOT ELIGIBLE** for R&D tax credit

**Why**: Your purpose ("${purpose}") appears to be routine operations, not R&D.

**Not eligible**:
- Routine software maintenance
- Marketing and sales activities
- Administrative tasks
- Using existing technology without innovation

**Still deductible!** This is a normal business expense:
- Account: 6200+ (operational accounts)
- Tracking: Operational + appropriate type
- Tax deduction: Standard business expense rules apply

**Want it to be R&D?** Ask:
- Was there technical uncertainty?
- Did you experiment with novel approaches?
- Were you solving a technical (not business) problem?

If yes, reframe the purpose to highlight the technical experimentation.`;
    }

    return `**R&D Eligibility: ${expense}**

⚠️ **UNCLEAR** - Need more information

**Your purpose**: "${purpose}"

**To determine eligibility, answer**:
1. **Technical uncertainty**: Was the outcome technically uncertain at the start?
2. **Experimentation**: Did you try multiple approaches to solve the problem?
3. **Novel**: Is this new to your company (doesn't have to be world-first)?
4. **Technical**: Is this a technical (not business/marketing) challenge?

**If YES to all** → ✅ R&D eligible (43.5% refund)
**If NO to any** → ❌ Not R&D (but still business deductible)

**Examples**:
✅ Eligible: "Experimenting with RAG architecture to reduce hallucinations in AI chatbot"
❌ Not eligible: "Using OpenAI API for standard customer service responses"

**Ask yourself**: Could a junior developer do this routinely, or does it require experimentation?`;
  }

  handleHowTo(task) {
    return {
      content: [{
        type: 'text',
        text: this.getHowTo(task),
      }],
    };
  }

  getHowTo(task) {
    const t = task.toLowerCase();

    if (t.includes('bank rule')) {
      return XERO_KNOWLEDGE.features.bankRules.howToCreate.map((step, i) =>
        `${i + 1}. ${step}`
      ).join('\n') + '\n\n**Best practices**:\n' +
      XERO_KNOWLEDGE.features.bankRules.bestPractices.map(bp => `- ${bp}`).join('\n');
    }

    if (t.includes('tracking')) {
      return XERO_KNOWLEDGE.features.trackingCategories.setup.map((step, i) =>
        `${i + 1}. ${step}`
      ).join('\n');
    }

    if (t.includes('reconcil')) {
      return XERO_KNOWLEDGE.features.bankReconciliation.bestPractices.map(bp =>
        `- ${bp}`
      ).join('\n');
    }

    if (t.includes('report') || t.includes('cash flow')) {
      return `**Generating Reports in Xero**:

1. Click "Reports" in left sidebar
2. Search for report type or browse categories
3. Common reports:
   - Cash Flow Statement
   - Profit and Loss
   - Balance Sheet
   - Account Transactions (custom)
4. Set date range
5. Apply filters (tracking categories, accounts, etc.)
6. Click "Update"
7. Export to Excel/PDF if needed
8. Bookmark frequently used reports (star icon)

**ACT-specific**: Create custom R&D report (Reports → Account Transactions → Filter by R&D tracking)`;
    }

    return `**How to: ${task}**

I can provide step-by-step instructions for:
- Creating bank rules
- Setting up tracking categories
- Reconciling transactions
- Generating reports
- Setting up Xero Projects
- Multi-entity configuration
- And more!

Please ask me specifically what task you'd like help with, for example:
- "How do I create a bank rule?"
- "How do I set up tracking categories?"
- "How do I generate a cash flow report?"`;
  }

  handleCalculateRDRefund(expenses) {
    const total = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const refund = total * ACT_XERO_CONFIG.rdTaxCredit.rate;

    const breakdown = Object.entries(expenses).map(([category, amount]) => {
      const refundAmount = amount * ACT_XERO_CONFIG.rdTaxCredit.rate;
      return `- ${category}: $${amount.toLocaleString()} → $${refundAmount.toLocaleString()} refund`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `**R&D Tax Credit Calculation**

${breakdown}

**Total R&D Spend**: $${total.toLocaleString()}
**Tax Credit Rate**: 43.5%
**Expected Refund**: $${refund.toLocaleString()}

**Comparison to ACT's current**:
- Your estimate: $${total.toLocaleString()}
- ACT current: $${ACT_XERO_CONFIG.rdTaxCredit.currentSpend.total}
- Difference: $${Math.abs(total - 92000).toLocaleString()}

**To claim this in Xero**:
1. Ensure all expenses use R&D accounts (6100-6150)
2. Apply R&D tracking category
3. Use Xero Projects to track per-activity costs
4. Generate quarterly reports
5. Export before April 30 deadline
6. Submit to accountant for AusIndustry claim

**Documentation needed for each activity**:
- Hypothesis: What technical problem?
- Methodology: How did you experiment?
- Findings: What did you learn?

Store in Notion, link to Xero Projects!`,
      }],
    };
  }

  handleACTAdvice(topic) {
    return {
      content: [{
        type: 'text',
        text: this.getACTAdvice(topic),
      }],
    };
  }

  getACTAdvice(topic) {
    const t = topic.toLowerCase();

    if (t.includes('vendor')) {
      return `**ACT's Common Vendors**

**R&D Software** (Account: 6120):
${ACT_XERO_CONFIG.commonVendors.rdSoftware.map(v => `- ${v}`).join('\n')}

**R&D Infrastructure** (Account: 6130):
${ACT_XERO_CONFIG.commonVendors.rdInfrastructure.map(v => `- ${v}`).join('\n')}

**Operational Software** (Account: 6200):
${ACT_XERO_CONFIG.commonVendors.operationalSoftware.map(v => `- ${v}`).join('\n')}

**Create bank rules for all of these!**
Week 1 goal: 8-10 rules = 80%+ auto-categorization`;
    }

    if (t.includes('subscription')) {
      return `**ACT's Subscriptions**

**Total**: 332 active subscriptions
**Monthly cost**: ~28% of total expenses

**Top categories**:
1. R&D Software & Tools (AI, dev tools)
2. R&D Infrastructure (cloud, hosting)
3. Operational Software (communication, design)

**Week 4 audit**: Review all 332 subscriptions for:
- Unused tools to cancel ($50-200/month each)
- Downgradeable plans ($100-500/month)
- Annual billing discounts (10-20% savings)

**Potential savings**: $1,000-$3,000/year`;
    }

    if (t.includes('r&d') || t.includes('tax')) {
      return `**ACT's R&D Tax Credit Status**

**Current Annual R&D Spend**: $92,000
- OpenAI: $24,000
- GitHub: $6,000
- AWS: $12,000
- Contractors: $50,000

**Expected Refund**: $40,020 (43.5% of $92,000)

**Eligible Activities**:
${ACT_XERO_CONFIG.rdTaxCredit.eligibleActivities.map(a => `- ${a}`).join('\n')}

**Week 2 Goal**: Complete R&D expense report for FY2025 claim

**Action items**:
1. Tag all R&D expenses with tracking categories
2. Set up Xero Projects for each activity
3. Document hypothesis/methodology/findings
4. Generate quarterly reports
5. Export before April 30 deadline`;
    }

    if (t.includes('trust')) {
      return `**ACT's Trust Structure (Week 3)**

**Current**: ACT Pty Ltd only
**Planned**: ACT Pty Ltd + ACT Family Trust

**Benefits**:
- Tax efficiency: Distribute to lower tax brackets
- Asset protection
- Estate planning
- $10K-$30K annual tax savings

**Setup costs**:
- Legal/accounting: $3,500 one-time
- Second Xero org: $65/month

**Week 3 deliverable**: Trust established, Xero configured

**ROI**: 3-5x in year 1 from tax savings alone`;
    }

    if (t.includes('week') || t.includes('goal')) {
      return `**ACT's 4-Week Goals**

**Week 1** (Jan 6-10): ${ACT_XERO_CONFIG.weeklyGoals.week1}
**Week 2** (Jan 13-17): ${ACT_XERO_CONFIG.weeklyGoals.week2}
**Week 3** (Jan 20-24): ${ACT_XERO_CONFIG.weeklyGoals.week3}
**Week 4** (Jan 27-31): ${ACT_XERO_CONFIG.weeklyGoals.week4}

**Current status**: Week 1 preparation complete!
- ✅ 6 Notion databases created
- ✅ Day 1 lesson detailed
- ✅ Week 1 guide written
- ✅ Xero Expert MCP created

**Start Monday**: Reconcile 30 NAB Visa transactions`;
    }

    return `**ACT-Specific Information**

${JSON.stringify(ACT_XERO_CONFIG, null, 2)}

**Ask me about**:
- Common vendors
- R&D tax credit status
- Subscriptions audit
- Trust structure
- Weekly goals
- Bank account setup`;
  }

  generateRDGuide() {
    return `# R&D Tax Credit Guide for ACT

## Overview
- **Rate**: 43.5% refundable offset
- **ACT's potential**: $40,020 refund on $92,000 spend
- **Deadline**: April 30 (for previous FY ending June 30)

## Eligible Expenses

### ✅ Yes - R&D
${XERO_KNOWLEDGE.rdTaxCredit.eligibleExpenses.map(e => `- ${e}`).join('\n')}

### ❌ No - Not R&D
${XERO_KNOWLEDGE.rdTaxCredit.notEligible.map(e => `- ${e}`).join('\n')}

## ACT's Current R&D Spend
${Object.entries(ACT_XERO_CONFIG.rdTaxCredit.currentSpend).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Tracking in Xero

1. **Accounts**: Use 6100-6150 series
2. **Tracking**: Apply "R&D" category to all eligible expenses
3. **Projects**: Create Xero Project per R&D activity
4. **Documentation**: Store hypothesis/methodology/findings in Notion

## Quarterly Workflow

1. Generate R&D expense report (Reports → Account Transactions → Filter R&D)
2. Review with accountant
3. Adjust categorizations if needed
4. Document activities in Notion

## Claim Preparation

Export quarterly before April 30:
- R&D expenses by category
- R&D expenses by project
- Documentation for each activity

Submit to accountant for AusIndustry claim.
`;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Xero Expert MCP server running on stdio');
  }
}

const server = new XeroExpertServer();
server.run().catch(console.error);
