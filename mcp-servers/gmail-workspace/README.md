# Gmail Workspace Intelligence MCP Server

MCP Server for scanning ACT Workspace emails to extract financial documents and enable intelligence layers.

## Features

- **Multi-Account Scanning**: Scan all act.place email accounts simultaneously
- **Cross-Account Deduplication**: Automatically deduplicate messages across accounts
- **AI Financial Extraction**: Extract vendor, amount, date from emails using Claude
- **Domain-Wide Delegation**: Service account authentication for automated access
- **Rate Limiting**: Built-in batch processing and delays to respect Gmail API limits

## Tools

### 1. scan_workspace_emails

Scan ACT Workspace accounts for financial documents.

```json
{
  "accounts": ["nicholas@act.place"],
  "query": "(invoice OR receipt)",
  "timeframe": "30d",
  "maxResults": 100,
  "includeBody": false
}
```

### 2. get_email_details

Fetch full email content for a specific message.

```json
{
  "messageId": "18d8f9a1b2c3d4e5",
  "account": "nicholas@act.place",
  "includeAttachments": false
}
```

### 3. extract_financial_data

AI-powered extraction of financial data using Claude.

```json
{
  "messageId": "18d8f9a1b2c3d4e5",
  "account": "nicholas@act.place",
  "documentType": "invoice"
}
```

### 4. search_emails

Advanced email search with cross-account deduplication.

```json
{
  "query": "from:stripe.com after:2024-01-01",
  "accounts": ["nicholas@act.place", "hi@act.place"],
  "maxResults": 50
}
```

### 5. list_accounts

Show all configured accounts and their status.

```json
{}
```

## Setup

### 1. Install Dependencies

```bash
cd mcp-servers/gmail-workspace
npm install
```

### 2. Configure Google Workspace Domain-Wide Delegation

**CRITICAL**: This must be done before the MCP server will work.

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to: Security → API Controls → Domain-wide Delegation
3. Click "Add new"
4. Enter Client ID: `106740829315613258776` (from service-account.json)
5. Add OAuth scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`
6. Click "Authorize"
7. Wait 10-15 minutes for propagation

### 3. Add to .mcp.json

Add this configuration to your `.mcp.json`:

```json
{
  "mcpServers": {
    "gmail-workspace": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/benknight/Code/ACT Placemat/mcp-servers/gmail-workspace/index.js"],
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_PATH": "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/service-account.json",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "ACT_WORKSPACE_ACCOUNTS": "nicholas@act.place,hi@act.place,accounts@act.place,benjamin@act.place"
      }
    }
  }
}
```

### 4. Test the Server

```bash
# Test list_accounts tool
node index.js

# In Claude Code, try:
# Use the list_accounts tool to check if all accounts are accessible
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Path to service account JSON file | Yes |
| `ACT_WORKSPACE_ACCOUNTS` | Comma-separated list of email accounts | Yes |
| `ANTHROPIC_API_KEY` | API key for AI extraction (extract_financial_data tool) | No |

## Troubleshooting

### "Precondition check failed" Error

This means domain-wide delegation is not configured. Follow Setup Step 2 above.

### "unauthorized_client" Error

The service account doesn't have permission. Check:
1. Client ID matches the one in admin console
2. Scopes are exactly as specified
3. Wait 10-15 minutes after adding delegation

### Rate Limit Errors

The server includes automatic rate limiting (25 messages per batch, 2s delays). If you still hit limits:
- Reduce `maxResults` parameter
- Increase `delayMs` in gmailClient.js batchGetMessages()

## R&D Documentation

This MCP server is part of ACT's R&D tax claim for email intelligence infrastructure:

**Technical Uncertainty**: Optimal Gmail API query patterns for multi-tenant financial document detection
**Methodology**: Cross-account scanning + deduplication + AI extraction
**Success Metric**: 90% auto-extraction accuracy for financial data
**Category**: Core R&D (software development)
**Estimated Hours**: 8 hours

## License

UNLICENSED - Internal ACT tool
