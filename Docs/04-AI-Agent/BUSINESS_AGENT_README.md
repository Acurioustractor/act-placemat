# ACT Business Agent for Australia 🇦🇺🤖

## Overview

The **ACT Business Agent for Australia** is an autonomous, always-on business intelligence system that continuously monitors and provides actionable insights across all areas of business operations for Australian businesses.

### Key Features

- **24/7 Autonomous Monitoring** - Runs continuously without manual intervention
- **Australian Compliance Tracking** - BAS, PAYG, Superannuation, R&D Tax Incentives
- **Financial Intelligence** - Real-time Xero monitoring, cash flow forecasting
- **Grant Discovery** - Automatic scanning of grants.gov.au and Indigenous programs
- **Relationship Intelligence** - LinkedIn network analysis (4,491 connections)
- **Project Health Monitoring** - Notion project tracking and blocking alerts

## Quick Start

### 1. Start the Backend Server

```bash
cd apps/backend
node stable-real-data-server.js
```

The agent will automatically start and display:
```
🤖 Starting Business Agent for Australia...
✅ Business Agent is monitoring your business 24/7
```

### 2. Access the Dashboard

Open your browser to:
- **Frontend**: http://localhost:5175/?tab=agent
- **Agent Status API**: http://localhost:4001/api/v2/agents/business-australia/status

## Architecture

### Core Components

1. **BusinessAgentAustralia** (`apps/backend/core/src/agents/businessAgentAustralia.js`)
   - Main agent class with analysis capabilities
   - Autonomous decision-making
   - Multi-domain insights gathering

2. **Agent Scheduler** (`apps/backend/core/src/scheduler/agentScheduler.js`)
   - Cron-based scheduling (node-cron)
   - Timezone: Australia/Sydney
   - Configurable intervals

3. **API Routes** (`apps/backend/core/src/api/businessAgentAustralia.js`)
   - RESTful endpoints for agent control
   - Analysis triggers
   - Status monitoring

4. **Frontend Dashboard** (`apps/frontend/src/components/BusinessAgentDashboard.tsx`)
   - Real-time agent status
   - Compliance alerts
   - Grant opportunities display

### Data Flow

```
┌─────────────────────┐
│   Agent Scheduler   │  ← Runs on schedule (hourly, daily, weekly)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  BusinessAgent AU   │  ← Gathers insights from all domains
└──────────┬──────────┘
           │
           ├──→ Financial Analysis (Xero)
           ├──→ Compliance Checks (AU regulations)
           ├──→ Grant Scanning (grants.gov.au)
           ├──→ Relationship Intelligence (LinkedIn)
           └──→ Project Health (Notion)
           │
           ↓
┌─────────────────────┐
│   Supabase DB       │  ← Stores insights history
└─────────────────────┘
           │
           ↓
┌─────────────────────┐
│  Frontend Dashboard │  ← Displays insights to users
└─────────────────────┘
```

## API Endpoints

### Agent Control

#### Start Agent
```bash
POST /api/v2/agents/business-australia/start
```
Response:
```json
{
  "success": true,
  "status": "running",
  "message": "Business agent started successfully",
  "nextAnalysis": "2025-09-30T15:00:00.000Z"
}
```

#### Stop Agent
```bash
POST /api/v2/agents/business-australia/stop
```

#### Get Status
```bash
GET /api/v2/agents/business-australia/status
```
Response:
```json
{
  "agent": "ACT Business Agent - Australia",
  "version": "1.0.0",
  "region": "Australia",
  "status": "running",
  "lastAnalysis": "2025-09-30T14:00:00.000Z",
  "nextAnalysis": "2025-09-30T15:00:00.000Z",
  "consecutiveErrors": 0,
  "config": {
    "analysisInterval": "60 minutes",
    "complianceMonitoring": true,
    "grantDiscovery": true,
    "notifications": true
  }
}
```

### Analysis Endpoints

#### Run Immediate Analysis
```bash
POST /api/v2/agents/business-australia/analyze
```

#### Get Morning Intelligence Brief
```bash
GET /api/v2/agents/business-australia/morning-brief
```
Returns comprehensive morning briefing with:
- Priority actions for the day
- Financial status
- Compliance deadlines
- Grant opportunities
- Project health

#### Get Financial Analysis
```bash
GET /api/v2/agents/business-australia/analyze/financial
```

#### Get Compliance Status
```bash
GET /api/v2/agents/business-australia/analyze/compliance
```

#### Get Grant Opportunities
```bash
GET /api/v2/agents/business-australia/analyze/opportunities
```

#### Get Relationship Intelligence
```bash
GET /api/v2/agents/business-australia/analyze/relationships
```

#### Get Project Health
```bash
GET /api/v2/agents/business-australia/analyze/projects
```

## Scheduled Jobs

The agent runs automatically on the following schedule (Australia/Sydney timezone):

### Hourly Analysis
- **Schedule**: Every hour (0 * * * *)
- **Function**: `runContinuousAnalysis()`
- **Purpose**: Continuous business monitoring across all domains

### Daily Morning Brief
- **Schedule**: 6:00 AM daily (0 6 * * *)
- **Function**: `generateMorningBrief()`
- **Purpose**: Generate prioritized morning intelligence briefing

### Daily Compliance Check
- **Schedule**: 9:00 PM daily (0 21 * * *)
- **Function**: `checkAustralianCompliance()`
- **Purpose**: Monitor Australian regulatory deadlines

### Weekly Grant Scan
- **Schedule**: Monday 9:00 AM (0 9 * * 1)
- **Function**: `scanGrantOpportunities()`
- **Purpose**: Discover new funding opportunities

### Financial Monitoring
- **Schedule**: Every 4 hours (0 */4 * * *)
- **Function**: `analyzeFinancials()`
- **Purpose**: Monitor cash flow, invoices, expenses

### Relationship Review
- **Schedule**: Friday 4:00 PM (0 16 * * 5)
- **Function**: `analyzeRelationships()`
- **Purpose**: Review LinkedIn network engagement

## Australian Compliance Monitoring

The agent tracks the following Australian business obligations:

### BAS (Business Activity Statement)
- **Frequency**: Quarterly
- **Deadline**: 28 days after quarter end
- **Quarters**: Oct 31, Jan 31, Apr 30, Jul 31

### PAYG Withholding
- **Frequency**: Monthly
- **Deadline**: 21st of following month
- **Requirements**: Employee tax withholding payments

### Superannuation Guarantee
- **Frequency**: Quarterly
- **Rate**: 11.5% (2024-25)
- **Deadline**: End of quarter
- **Requirements**: Super payments for eligible employees

### R&D Tax Incentive
- **Frequency**: Annual
- **Deadline**: 30 April (following financial year)
- **Benefit**: 38.5% - 43.5% of eligible R&D expenditure
- **Tracking**: Continuous documentation of R&D activities

### Indigenous Business Requirements
- Supply Nation certification renewal
- Indigenous employment reporting
- Community consultation documentation
- Cultural heritage compliance

## Grant Opportunities

The agent monitors and discovers:

### Government Programs
- **Indigenous Business Direct**: $10,000 - $250,000
- **R&D Tax Incentive**: 38.5% - 43.5% of R&D spend
- **Entrepreneurs' Programme**: Up to $1 million

### Data Sources
- grants.gov.au
- business.gov.au
- Indigenous Advancement Strategy
- CSIRO Innovation Fund
- Department of Industry, Science and Resources

## Configuration

### Environment Variables

```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Notion (Required for project monitoring)
NOTION_TOKEN=secret_xxxxx
NOTION_PROJECTS_DATABASE_ID=your-db-id

# Optional: For future integrations
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-secret
```

### Agent Configuration

Edit in `agentScheduler.js`:

```javascript
const agent = new BusinessAgentAustralia({
  analysisIntervalMinutes: 60,      // How often to analyze
  enableComplianceMonitoring: true, // Track AU compliance
  enableGrantDiscovery: true,       // Scan for grants
  enableNotifications: true         // Send alerts
});
```

## Database Schema

### Agent Insights Table

```sql
CREATE TABLE agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  insights JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Run migration:
```bash
psql $SUPABASE_URL -f apps/backend/sql/create-agent-insights-table.sql
```

## Notifications (Future)

The agent is designed to integrate with:

### Critical Alerts (SMS via Twilio)
- BAS deadlines within 7 days
- Cash flow below threshold
- Blocked projects requiring attention

### High Priority (Slack)
- Upcoming compliance deadlines (14 days)
- New high-value grant opportunities
- Strategic relationship engagement suggestions

### Medium Priority (Email)
- Weekly summary reports
- Grant application deadlines
- Relationship review reminders

## Development

### Running Tests

```bash
cd apps/backend
npm test
```

### Manual Analysis

```bash
curl -X POST http://localhost:4001/api/v2/agents/business-australia/analyze
```

### View Logs

The agent logs all activities to console:
```
🔍 Running business analysis cycle...
💰 Analyzing financial health...
📋 Checking Australian compliance requirements...
🎯 Scanning for grant opportunities...
🤝 Analyzing relationship intelligence...
📁 Analyzing project health...
✅ Analysis cycle completed in 2.34s
```

## Troubleshooting

### Agent Not Starting

1. Check Supabase connection:
```bash
curl http://localhost:4001/api/real/health
```

2. Verify environment variables:
```bash
echo $SUPABASE_URL
echo $NOTION_TOKEN
```

3. Check server logs for errors

### Analysis Failing

- **Consecutive Errors**: Agent stops after 5 consecutive failures
- **Solution**: Fix underlying issue and restart agent via API or server restart

### Database Connection Issues

```javascript
// Test Supabase connection
import { createSupabaseClient } from './core/src/config/supabase.js';
const supabase = createSupabaseClient();
const { data, error } = await supabase.from('stories').select('id').limit(1);
console.log(error || 'Connected successfully');
```

## Security Considerations

### API Key Management
- All sensitive keys stored in environment variables
- Never commit `.env` files to version control
- Use Supabase RLS for data access control

### Data Privacy
- Compliant with Australian Privacy Act 1988
- Data residency in AU region (Supabase Sydney)
- Encryption at rest for sensitive financial data

### Access Control
- Role-based access (Admin, Co-founder, Staff)
- API rate limiting per user role
- Audit trail for all agent actions

## Roadmap

### Phase 2 (Next Sprint)
- [ ] Real-time Xero integration for live financial data
- [ ] SMS notifications via Twilio
- [ ] Slack integration for alerts
- [ ] Email digest automation

### Phase 3
- [ ] Machine learning for opportunity scoring
- [ ] Predictive cash flow modeling
- [ ] Automated grant application assistance
- [ ] LinkedIn outreach automation

### Phase 4
- [ ] Mobile app notifications
- [ ] Voice briefings (Alexa/Google Home)
- [ ] Multi-business support
- [ ] White-label capability for other Indigenous businesses

## Contributing

This agent is part of ACT's commitment to Beautiful Obsolescence - building technology that enables communities to become independent of ACT.

To contribute:
1. Review the PRD: `.taskmaster/docs/prd.txt`
2. Check open tasks: `.taskmaster/tasks/tasks.json`
3. Follow the coding standards
4. Ensure all tests pass
5. Update documentation

## Support

For issues or questions:
- GitHub Issues: https://github.com/ACT/placemat/issues
- Email: support@acurioustractor.com.au
- Slack: #business-agent channel

## License

Copyright © 2025 A Curious Tractor
All Rights Reserved

---

**Built with ❤️ for Australian Indigenous communities**

*"Communities don't need external saviors - they need superior tools, authentic partnerships, and systems designed for their ownership rather than institutional extraction."*