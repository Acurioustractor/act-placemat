# 🚀 Quick Start Guide - ACT Business Agent

## What You Now Have

✅ **Always-On Business Intelligence Agent for Australia**
   - Monitors finances, compliance, opportunities, relationships, and projects
   - Runs automatically 24/7
   - Australian-specific (BAS, PAYG, Superannuation, R&D Tax Incentives)

## Start in 3 Steps

### Step 1: Start the Backend

```bash
cd apps/backend
node stable-real-data-server.js
```

**Expected Output:**
```
🚜 ACT STABLE DATA SERVICE
========================
✅ Server: http://localhost:4001
✅ Notion: Connected
✅ Database: 177ebcf981cf80dd9514f1ec32f3314c
🔄 Cache: 5 minutes (no spam)

🤖 Starting Business Agent for Australia...
🇦🇺 ACT Business Agent - Australia v1.0.0 initialized
   Analysis interval: 60 minutes
   Compliance monitoring: ENABLED
   Grant discovery: ENABLED

📅 Agent Scheduler initialized
🔄 [HOURLY] Running business analysis...
🔍 Running business analysis cycle...
📊 Gathering insights across all business domains...
💰 Analyzing financial health...
📋 Checking Australian compliance requirements...
🎯 Scanning for grant opportunities...
🤝 Analyzing relationship intelligence...
📁 Analyzing project health...
✅ Analysis cycle completed in 2.34s

✅ Business Agent is monitoring your business 24/7
```

### Step 2: Start the Frontend

```bash
cd apps/frontend
npm run dev
```

**Expected Output:**
```
VITE v7.1.2  ready in 423 ms

➜  Local:   http://localhost:5175/
➜  Network: use --host to expose
```

### Step 3: View the Dashboard

Open in your browser:
**http://localhost:5175/?tab=agent**

You should see:
- 🟢 Agent Status: Running
- 📊 Last Analysis time
- ⏰ Analysis interval
- 📋 Australian Compliance checks
- 🎯 Grant opportunities

## Test the Agent

### Check Agent Status
```bash
curl http://localhost:4001/api/v2/agents/business-australia/status
```

### Run Manual Analysis
```bash
curl -X POST http://localhost:4001/api/v2/agents/business-australia/analyze
```

### Get Morning Brief
```bash
curl http://localhost:4001/api/v2/agents/business-australia/morning-brief
```

## What Happens Automatically

The agent will automatically:

| When | What Happens |
|------|-------------|
| **Every hour** | Full business analysis across all domains |
| **6 AM daily** | Generate morning intelligence briefing |
| **9 PM daily** | Check Australian compliance deadlines |
| **Every 4 hours** | Monitor financial health |
| **Monday 9 AM** | Scan for new grant opportunities |
| **Friday 4 PM** | Review relationship intelligence |

## Key Endpoints

### Agent Control
- `POST /api/v2/agents/business-australia/start` - Start agent
- `POST /api/v2/agents/business-australia/stop` - Stop agent
- `GET /api/v2/agents/business-australia/status` - Get status

### Analysis Endpoints
- `POST /api/v2/agents/business-australia/analyze` - Run now
- `GET /api/v2/agents/business-australia/morning-brief` - Morning brief
- `GET /api/v2/agents/business-australia/analyze/financial` - Financial
- `GET /api/v2/agents/business-australia/analyze/compliance` - Compliance
- `GET /api/v2/agents/business-australia/analyze/opportunities` - Grants
- `GET /api/v2/agents/business-australia/analyze/relationships` - LinkedIn
- `GET /api/v2/agents/business-australia/analyze/projects` - Notion

## Monitoring Checklist

Every morning, check:
1. ✅ Agent is running (dashboard shows green status)
2. ✅ No critical compliance deadlines (dashboard alerts section)
3. ✅ Review new grant opportunities
4. ✅ Check for blocked projects

## Troubleshooting

### Agent Not Starting?

1. **Check Environment Variables**
   ```bash
   # Verify .env file exists
   ls apps/backend/.env

   # Check critical variables
   grep SUPABASE_URL apps/backend/.env
   grep NOTION_TOKEN apps/backend/.env
   ```

2. **Test Database Connection**
   ```bash
   curl http://localhost:4001/api/real/health
   ```

3. **Check Server Logs**
   Look for error messages in the terminal where you ran the server

### Frontend Not Loading?

1. **Check Port 5175 is Available**
   ```bash
   lsof -i :5175
   ```

2. **Clear Cache and Restart**
   ```bash
   cd apps/frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

### Agent Analysis Failing?

Check for:
- Database connectivity issues
- Missing environment variables
- API rate limiting from external services

The agent will automatically retry after failures.

## Next Steps

### Immediate
1. ✅ Verify agent is running
2. ✅ Check compliance deadlines
3. ✅ Review grant opportunities
4. ✅ Monitor for a few days

### This Week
1. Configure real Xero integration for live financial data
2. Set up notification channels (Slack, Email)
3. Review and adjust compliance monitoring

### This Month
1. Complete remaining tasks (23-27) from [.taskmaster/tasks/tasks.json]
2. Implement automated alerts
3. Gather feedback and iterate

## Documentation

- **[BUSINESS_AGENT_README.md](./BUSINESS_AGENT_README.md)** - Full agent documentation
- **[CODE_REVIEW_SUMMARY.md](./CODE_REVIEW_SUMMARY.md)** - Comprehensive review
- **[.taskmaster/docs/prd.txt]** - Product requirements
- **[.taskmaster/tasks/tasks.json]** - Development roadmap

## Support

If you have issues:
1. Check the troubleshooting section above
2. Review server console logs
3. Check browser console for errors
4. Refer to comprehensive documentation

## Success Indicators

You'll know it's working when:
- ✅ Dashboard shows agent status: Running
- ✅ Compliance checks display accurately
- ✅ Grant opportunities are listed
- ✅ Analysis completes every hour
- ✅ No errors in console logs

---

**You're all set! The agent is now monitoring your business 24/7 across all areas of Australian business operations.** 🇦🇺🤖

**Built with ❤️ for Australian Indigenous communities**