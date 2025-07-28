# ACT Placemat Integration Setup Guide

This guide will help you set up and test the Notion MCP and Airtable integrations for the ACT Placemat platform.

## Table of Contents
1. [Notion MCP Setup](#notion-mcp-setup)
2. [Airtable Setup](#airtable-setup)
3. [Testing the Integrations](#testing-the-integrations)
4. [Data Synchronization](#data-synchronization)
5. [Troubleshooting](#troubleshooting)
6. [Data Points Reference](#data-points-reference)

## Notion MCP Setup

### Step 1: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Configure:
   - Name: "ACT Placemat Integration"
   - Associated workspace: Select your workspace
   - Capabilities: Read content, Update content, Insert content
4. Copy the **Internal Integration Token**

### Step 2: Setup Notion Databases

Create the following databases in Notion (or use existing ones):

#### Projects Database (Required)
| Property Name | Type | Required | Description |
|---------------|------|----------|-------------|
| Name | Title | Yes | Project name |
| Area | Select | Yes | Story & Sovereignty, Economic Freedom, Community Engagement, Operations & Infrastructure, Research & Development |
| Description | Rich Text | Yes | Project overview |
| Status | Select | Yes | Active, Building, Ideation, Sunsetting, Completed |
| Funding | Select | No | Funded, Needs Funding, Self Funded, Community Owned |
| Project Lead | People/Text | No | Project leader |
| Revenue Actual | Number | No | Current revenue |
| Revenue Potential | Number | No | Potential revenue |
| Actual Incoming | Number | No | Confirmed incoming funds |
| Potential Incoming | Number | No | Possible incoming funds |
| Next Milestone Date | Date | No | Key upcoming date |
| AI Summary | Rich Text | No | AI-generated summary |
| Themes | Multi-select | No | Project themes |
| Tags | Multi-select | No | Project tags |

#### Opportunities Database (Optional)
| Property Name | Type | Required | Description |
|---------------|------|----------|-------------|
| Opportunity Name | Title | Yes | Name of opportunity |
| Organization | Relation | Yes | Link to Organizations |
| Stage | Select | Yes | Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost |
| Revenue Amount | Number | Yes | Total value |
| Probability | Number | Yes | Win probability (0-100) |
| Opportunity Type | Select | Yes | Grant, Contract, Partnership, Investment, License, Donation |

#### Organizations Database (Optional)
| Property Name | Type | Required | Description |
|---------------|------|----------|-------------|
| Organization Name | Title | Yes | Full organization name |
| Type | Select | Yes | Government, NGO, Foundation, Corporate, University, Community Group, Startup |
| Relationship Status | Select | Yes | Prospect, Active Partner, Past Partner, Current Client, Potential Client |

#### People Database (Optional)
| Property Name | Type | Required | Description |
|---------------|------|----------|-------------|
| Full Name | Title | Yes | Person's full name |
| Organization | Relation | No | Link to Organizations |
| Email | Email | No | Primary email |
| Role/Title | Text | No | Job title |

### Step 3: Share Databases with Integration

1. Open each database in Notion
2. Click "Share" in the top right
3. Click "Add people, emails, groups, or integrations"
4. Search for and select your integration
5. Copy the **Database ID** from the URL:
   - URL format: `https://notion.so/workspace/DATABASE_ID?v=...`
   - The DATABASE_ID is the 32-character string

### Step 4: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   # Notion Configuration
   NOTION_TOKEN=your_integration_token_here
   NOTION_DATABASE_ID=your_projects_database_id_here
   NOTION_API_VERSION=2022-06-28
   ```

## Airtable Setup

### Step 1: Get Airtable API Credentials

1. Go to [Airtable Account](https://airtable.com/account)
2. Click on "Generate API key" or create a Personal Access Token
3. Copy the API key/token

### Step 2: Create Airtable Base

1. Create a new base in Airtable or use existing
2. Get the Base ID from the URL:
   - URL format: `https://airtable.com/BASE_ID/...`
   - The BASE_ID starts with 'app'

### Step 3: Create Tables

Create tables matching the Notion structure:

#### Projects Table
- Name (Single line text)
- Area (Single select)
- Description (Long text)
- Status (Single select)
- Funding (Single select)
- Project Lead (Single line text)
- Revenue Actual (Number/Currency)
- Revenue Potential (Number/Currency)
- Themes (Multiple select)
- Tags (Multiple select)

#### Opportunities Table
- Opportunity Name (Single line text)
- Organization (Link to Organizations)
- Stage (Single select)
- Revenue Amount (Currency)
- Probability (Number/Percentage)
- Opportunity Type (Single select)

### Step 4: Configure Environment

Add to your `.env` file:
```env
# Airtable Configuration
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_PROJECTS_TABLE=Projects
AIRTABLE_OPPORTUNITIES_TABLE=Opportunities
AIRTABLE_ORGANIZATIONS_TABLE=Organizations
AIRTABLE_PEOPLE_TABLE=People
```

## Testing the Integrations

### 1. Start the Server

```bash
npm install
npm start
```

The server should start on `http://localhost:3000`

### 2. Run Integration Tests

```bash
node test-integrations.js
```

This will:
- Check environment configuration
- Test Notion connection
- Analyze data completeness
- Test API endpoints
- Check for unused databases
- Prepare Airtable integration

### 3. Test in Browser

1. Open `http://localhost:3000` in your browser
2. Click "Refresh from Notion" to test data loading
3. Check browser console for any errors

### 4. Test Unified Data Sync

```javascript
// In Node.js or browser console
const UnifiedDataSync = require('./unified-data-sync.js');

const sync = new UnifiedDataSync({
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    enableAutoSync: false
});

// Run manual sync
sync.sync().then(report => {
    console.log('Sync report:', report);
});

// Check sync status
console.log(sync.getSyncStatus());
```

## Data Synchronization

### Manual Sync

```javascript
// One-time sync
await sync.sync();
```

### Auto Sync

```javascript
// Start auto-sync (every 5 minutes by default)
sync.startAutoSync();

// Stop auto-sync
sync.stopAutoSync();
```

### Conflict Resolution

Configure how conflicts are handled:

1. **Newest** (default): Use the most recently modified version
2. **Notion**: Always prefer Notion data
3. **Airtable**: Always prefer Airtable data
4. **Manual**: Store conflicts for manual resolution

```javascript
const sync = new UnifiedDataSync({
    conflictResolution: 'newest' // or 'notion', 'airtable', 'manual'
});
```

### Event Monitoring

```javascript
// Listen for sync events
sync.on('sync:start', (report) => {
    console.log('Sync started');
});

sync.on('sync:complete', (report) => {
    console.log('Sync completed:', report);
});

sync.on('sync:error', (error) => {
    console.error('Sync error:', error);
});

sync.on('conflict:detected', (conflict) => {
    console.log('Conflict detected:', conflict);
});
```

## Troubleshooting

### Common Issues

#### 1. "Notion MCP not available"
- Check your `.env` file has correct NOTION_TOKEN and NOTION_DATABASE_ID
- Verify the integration has access to your database
- Check server logs for detailed error messages

#### 2. Empty data from Notion
- Ensure database is shared with integration
- Check if database has the expected property names
- Verify database has at least one entry

#### 3. Airtable connection fails
- Verify API key is correct
- Check base ID format (should start with 'app')
- Ensure table names match configuration

#### 4. CORS errors in browser
- Make sure server is running (`npm start`)
- Use the proxy endpoint: `/api/notion/query`
- Check browser console for specific errors

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('DEBUG', 'true');

// In Node.js
process.env.DEBUG = 'true';
```

### Check Integration Health

```bash
# Check server health
curl http://localhost:3000/api/health

# Test Notion query directly
curl -X POST http://localhost:3000/api/notion/query \
  -H "Content-Type: application/json" \
  -d '{"databaseId": "YOUR_DATABASE_ID"}'
```

## Data Points Reference

### Core Project Fields

| Field | Notion | Airtable | Type | Description |
|-------|--------|----------|------|-------------|
| id | Auto | Auto | String | Unique identifier |
| name | Title | Name | String | Project name |
| area | Select | Single Select | String | Project area category |
| description | Rich Text | Long Text | String | Project description |
| status | Select | Single Select | String | Current status |
| funding | Select | Single Select | String | Funding status |
| lead | People/Text | Text | String | Project leader |

### Financial Fields

| Field | Notion | Airtable | Type | Description |
|-------|--------|----------|------|-------------|
| revenueActual | Number | Currency | Number | Actual revenue |
| revenuePotential | Number | Currency | Number | Potential revenue |
| actualIncoming | Number | Currency | Number | Confirmed incoming |
| potentialIncoming | Number | Currency | Number | Possible incoming |

### Metadata Fields

| Field | Notion | Airtable | Type | Description |
|-------|--------|----------|------|-------------|
| themes | Multi-select | Multiple Select | Array | Project themes |
| tags | Multi-select | Multiple Select | Array | Project tags |
| lastModified | Last edited | Last modified | Date | Last update time |
| createdTime | Created | Created | Date | Creation time |

### Calculated Fields

These fields are calculated by the system:

- **Area Distribution**: Percentage of projects in each area
- **Funding Summary**: Total funded vs needs funding
- **Revenue Totals**: Sum of actual and potential revenue
- **Project Status**: Active, completed, and pending counts

## Best Practices

1. **Regular Backups**: Export your data regularly from both platforms
2. **Consistent Naming**: Use the same names for projects across platforms
3. **Data Validation**: Set up validation rules in both Notion and Airtable
4. **Incremental Sync**: Start with a small dataset to test sync
5. **Monitor Conflicts**: Review conflict logs regularly
6. **API Limits**: Be aware of rate limits for both APIs

## Next Steps

1. Complete environment setup
2. Run integration tests
3. Configure desired databases
4. Test manual sync
5. Set up auto-sync if needed
6. Monitor for conflicts
7. Customize field mappings as needed

For additional support, check the error logs and use the debug mode to get detailed information about any issues.