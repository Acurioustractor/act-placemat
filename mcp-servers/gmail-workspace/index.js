#!/usr/bin/env node

/**
 * Gmail Workspace Intelligence MCP Server
 *
 * Provides 5 tools for scanning ACT Workspace emails:
 * 1. scan_workspace_emails - Scan all accounts for financial documents
 * 2. get_email_details - Fetch full email content
 * 3. extract_financial_data - AI-powered financial extraction
 * 4. search_emails - Advanced search with deduplication
 * 5. list_accounts - Show configured accounts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GmailClient } from './services/gmailClient.js';
import { Deduplicator } from './services/deduplicator.js';
import Anthropic from '@anthropic-ai/sdk';

// Environment variables
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ACT_WORKSPACE_ACCOUNTS = (process.env.ACT_WORKSPACE_ACCOUNTS || '')
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);

// Validation
if (!SERVICE_ACCOUNT_PATH) {
  console.error('Error: GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set');
  process.exit(1);
}

if (ACT_WORKSPACE_ACCOUNTS.length === 0) {
  console.error('Error: ACT_WORKSPACE_ACCOUNTS environment variable not set');
  process.exit(1);
}

// Initialize services
const gmailClient = new GmailClient(SERVICE_ACCOUNT_PATH);
const deduplicator = new Deduplicator();
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// Create MCP server
const server = new Server(
  {
    name: 'gmail-workspace',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: scan_workspace_emails
const ScanWorkspaceSchema = z.object({
  accounts: z.array(z.string()).optional().describe('Email accounts to scan (default: all configured accounts)'),
  query: z.string().optional().describe('Gmail search query (default: financial document patterns)'),
  timeframe: z.enum(['7d', '30d', '3m', '1y']).optional().describe('Timeframe to scan (default: 30d)'),
  maxResults: z.number().min(1).max(500).optional().describe('Maximum results per account (default: 100)'),
  includeBody: z.boolean().optional().describe('Include email body in results (default: false)'),
});

// Tool: get_email_details
const GetEmailSchema = z.object({
  messageId: z.string().describe('Gmail message ID'),
  account: z.string().describe('Email account that has this message'),
  includeAttachments: z.boolean().optional().describe('Include attachment metadata (default: false)'),
});

// Tool: extract_financial_data
const ExtractFinancialSchema = z.object({
  messageId: z.string().describe('Gmail message ID'),
  account: z.string().describe('Email account'),
  documentType: z.enum(['invoice', 'receipt', 'payment', 'refund', 'statement', 'subscription']).optional()
    .describe('Hint for AI extraction (optional)'),
});

// Tool: search_emails
const SearchEmailsSchema = z.object({
  query: z.string().describe('Gmail search query'),
  accounts: z.array(z.string()).optional().describe('Accounts to search (default: all)'),
  maxResults: z.number().min(1).max(500).optional().describe('Max results (default: 50)'),
});

// Tool: list_accounts
const ListAccountsSchema = z.object({});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'scan_workspace_emails',
        description: 'Scan ACT Workspace email accounts for financial documents (invoices, receipts, payments). Returns deduplicated messages across all accounts.',
        inputSchema: {
          type: 'object',
          properties: {
            accounts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Email accounts to scan (default: all configured accounts)',
            },
            query: {
              type: 'string',
              description: 'Gmail search query (default: financial document patterns)',
            },
            timeframe: {
              type: 'string',
              enum: ['7d', '30d', '3m', '1y'],
              description: 'Timeframe to scan (default: 30d)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum results per account (default: 100)',
              minimum: 1,
              maximum: 500,
            },
            includeBody: {
              type: 'boolean',
              description: 'Include email body in results (default: false)',
            },
          },
        },
      },
      {
        name: 'get_email_details',
        description: 'Fetch full email content including headers, body, and metadata for a specific message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID',
            },
            account: {
              type: 'string',
              description: 'Email account that has this message',
            },
            includeAttachments: {
              type: 'boolean',
              description: 'Include attachment metadata (default: false)',
            },
          },
          required: ['messageId', 'account'],
        },
      },
      {
        name: 'extract_financial_data',
        description: 'Extract financial data from an email using AI (vendor, amount, date, invoice number). Requires ANTHROPIC_API_KEY.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID',
            },
            account: {
              type: 'string',
              description: 'Email account',
            },
            documentType: {
              type: 'string',
              enum: ['invoice', 'receipt', 'payment', 'refund', 'statement', 'subscription'],
              description: 'Hint for AI extraction (optional)',
            },
          },
          required: ['messageId', 'account'],
        },
      },
      {
        name: 'search_emails',
        description: 'Advanced email search with cross-account deduplication. Uses Gmail search syntax.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:stripe.com after:2024-01-01")',
            },
            accounts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Accounts to search (default: all)',
            },
            maxResults: {
              type: 'number',
              description: 'Max results (default: 50)',
              minimum: 1,
              maximum: 500,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_accounts',
        description: 'Show all configured ACT Workspace email accounts and their status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'scan_workspace_emails':
        return await handleScanWorkspace(args);

      case 'get_email_details':
        return await handleGetEmail(args);

      case 'extract_financial_data':
        return await handleExtractFinancial(args);

      case 'search_emails':
        return await handleSearchEmails(args);

      case 'list_accounts':
        return await handleListAccounts(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool handlers

async function handleScanWorkspace(args) {
  const accounts = args.accounts || ACT_WORKSPACE_ACCOUNTS;
  const timeframe = args.timeframe || '30d';
  const maxResults = args.maxResults || 100;
  const includeBody = args.includeBody || false;

  // Build query
  let query = args.query || '(invoice OR receipt OR payment OR subscription OR billing)';

  // Add timeframe
  const timeframeMap = {
    '7d': 'newer_than:7d',
    '30d': 'newer_than:1m',
    '3m': 'newer_than:3m',
    '1y': 'newer_than:1y',
  };
  query += ` ${timeframeMap[timeframe]}`;

  // Scan all accounts
  const allMessages = [];

  for (const account of accounts) {
    try {
      const messages = await gmailClient.searchMessages(account, query, maxResults);

      // Fetch details if requested
      if (includeBody && messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        const details = await gmailClient.batchGetMessages(account, messageIds);
        allMessages.push(...details.map(d => ({ ...d, accountEmail: account })));
      } else {
        allMessages.push(...messages.map(m => ({ ...m, accountEmail: account })));
      }
    } catch (error) {
      console.error(`Error scanning ${account}:`, error.message);
    }
  }

  // Deduplicate across accounts
  const deduplicated = deduplicator.deduplicate(allMessages);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          accountsScanned: accounts.length,
          messagesFound: deduplicated.length,
          timeframe,
          query,
          messages: deduplicated,
        }, null, 2),
      },
    ],
  };
}

async function handleGetEmail(args) {
  const { messageId, account, includeAttachments = false } = args;

  const message = await gmailClient.getMessage(account, messageId, includeAttachments);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          account,
          message,
        }, null, 2),
      },
    ],
  };
}

async function handleExtractFinancial(args) {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const { messageId, account, documentType } = args;

  // Get email content
  const message = await gmailClient.getMessage(account, messageId, false);

  // Prepare prompt for Claude
  const prompt = `Extract financial data from this email:

Subject: ${message.headers.subject}
From: ${message.headers.from}
Date: ${message.headers.date}

Body:
${message.body}

Please extract:
1. Vendor/Company name
2. Amount (number only, no currency symbols)
3. Currency (default AUD if not specified)
4. Transaction date (YYYY-MM-DD format)
5. Invoice/Receipt number (if present)
6. Document type (invoice, receipt, payment_confirmation, refund, subscription, statement, other)

Respond with ONLY a JSON object in this exact format:
{
  "vendor": "Company Name",
  "amount": 123.45,
  "currency": "AUD",
  "date": "2025-01-30",
  "invoiceNumber": "INV-12345",
  "documentType": "invoice"
}

If you cannot confidently extract a field, use null for that field.`;

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const extractedText = response.content[0].text;
  const extracted = JSON.parse(extractedText);

  // Calculate confidence score (simple heuristic)
  let confidence = 0.5; // Base confidence
  if (extracted.vendor) confidence += 0.2;
  if (extracted.amount) confidence += 0.2;
  if (extracted.date) confidence += 0.1;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          messageId,
          account,
          extraction: {
            ...extracted,
            confidence: Math.min(confidence, 1.0),
            extractionMethod: 'ai',
            raw: extractedText,
          },
        }, null, 2),
      },
    ],
  };
}

async function handleSearchEmails(args) {
  const accounts = args.accounts || ACT_WORKSPACE_ACCOUNTS;
  const { query, maxResults = 50 } = args;

  const allMessages = [];

  for (const account of accounts) {
    try {
      const messages = await gmailClient.searchMessages(account, query, maxResults);
      allMessages.push(...messages.map(m => ({ ...m, accountEmail: account })));
    } catch (error) {
      console.error(`Error searching ${account}:`, error.message);
    }
  }

  const deduplicated = deduplicator.deduplicate(allMessages);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          query,
          accountsSearched: accounts.length,
          resultsFound: deduplicated.length,
          messages: deduplicated,
        }, null, 2),
      },
    ],
  };
}

async function handleListAccounts(args) {
  // Test each account
  const accountsStatus = [];

  for (const account of ACT_WORKSPACE_ACCOUNTS) {
    try {
      const messages = await gmailClient.searchMessages(account, 'newer_than:1d', 1);
      accountsStatus.push({
        email: account,
        status: 'active',
        accessible: true,
        recentMessageCount: messages.length,
      });
    } catch (error) {
      accountsStatus.push({
        email: account,
        status: 'error',
        accessible: false,
        error: error.message,
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          totalAccounts: ACT_WORKSPACE_ACCOUNTS.length,
          accounts: accountsStatus,
          serviceAccountPath: SERVICE_ACCOUNT_PATH,
          hasAnthropicKey: !!ANTHROPIC_API_KEY,
        }, null, 2),
      },
    ],
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gmail Workspace MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
