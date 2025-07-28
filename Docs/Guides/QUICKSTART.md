# 🚀 ACT Placemat Quick Start Guide

## ✅ Current Status

The ACT Placemat system is **ready to use** with mock data. All components are working:

- ✅ Enhanced Notion integration (supports 5 database types)
- ✅ Opportunity alerts automation
- ✅ Weekly action email generator
- ✅ Daily monitoring dashboard
- ✅ All files properly configured

## 🎯 To Activate with Real Data

### Step 1: Create Notion Opportunities Database (15 minutes)

1. **Open Notion** and create a new database called "Opportunities Pipeline"

2. **Add these properties** (exact names important):
   - `Opportunity Name` (Title)
   - `Stage` (Select): 
     - Discovery 🔍
     - Qualification 📋
     - Proposal 📄
     - Negotiation 🤝
     - Closed Won ✅
     - Closed Lost ❌
   - `Revenue Amount` (Number)
   - `Probability` (Select): 10%, 25%, 50%, 75%, 90%, 100%
   - `Opportunity Type` (Select): Grant, Contract, Partnership, Investment
   - `Deadline` (Date)
   - `Next Action` (Text)
   - `Next Action Date` (Date)
   - `Description` (Text)

3. **Add Weighted Revenue formula**:
   ```
   prop("Revenue Amount") * prop("Probability") / 100
   ```

4. **Share with integration**:
   - Click Share → Add integration → Select your ACT Placemat integration

5. **Copy database ID** from URL (after notion.so/)

### Step 2: Configure Environment (2 minutes)

1. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Add your Notion credentials**:
   ```env
   NOTION_TOKEN=your_integration_token_here
   NOTION_DATABASE_ID=your_projects_database_id
   NOTION_OPPORTUNITIES_DB=your_opportunities_database_id
   ```

### Step 3: Test the System (5 minutes)

1. **Run complete system test**:
   ```bash
   node test-complete-system.js
   ```

2. **Test opportunity alerts**:
   ```bash
   node automations/opportunity-alerts.js
   ```

3. **Generate weekly email**:
   ```bash
   node automations/weekly-action-email.js
   ```

4. **Check generated files**:
   ```bash
   ls -la alerts/
   ```

### Step 4: View Dashboard (2 minutes)

1. **Start the server** (different terminal):
   ```bash
   npm start
   ```

2. **Open dashboard**:
   - Open `daily-dashboard.html` in your browser
   - Or visit `http://localhost:3000/daily-dashboard.html`

## 📊 What You'll See

### With Mock Data (Now):
- 2 sample opportunities ($230K pipeline)
- 1 urgent deadline alert
- 2 incomplete data alerts
- Weekly action email with financials
- Working dashboard

### With Real Data (After Setup):
- Your actual opportunities pipeline
- Real-time alerts for deadlines
- Automated weekly priorities
- Live financial tracking

## 🔧 Common Issues

**"Port already in use"**
```bash
# Check what's using the port
lsof -i :3000
# Kill the process or use different port
PORT=3002 npm start
```

**"Opportunities not found"**
- Check database ID in .env file
- Ensure integration has access
- Restart server after changes

**"No alerts showing"**
- Add test opportunity with deadline < 7 days
- Check Stage values match exactly
- Run alerts manually first

## 🎉 Success Checklist

- [ ] Created Opportunities database in Notion
- [ ] Added database ID to .env
- [ ] Ran system test successfully
- [ ] Saw alerts in console
- [ ] Generated weekly email
- [ ] Viewed dashboard in browser

## 📅 Daily Use

### Manual (for testing):
```bash
# Morning alerts
node automations/opportunity-alerts.js

# Weekly summary (Mondays)
node automations/weekly-action-email.js

# View dashboard
open daily-dashboard.html
```

### Automated (production):
```bash
# Add to crontab
crontab -e

# Add these lines:
0 8 * * * cd /path/to/ACT-Placemat && node automations/opportunity-alerts.js
0 7 * * 1 cd /path/to/ACT-Placemat && node automations/weekly-action-email.js
```

## 💡 Next Steps

1. **This Week**: Set up Opportunities database
2. **Next Week**: Add 10 real opportunities
3. **Month 2**: Add Organizations & People databases
4. **Month 3**: Full CRM with automated workflows

---

**Need help?** The system works with mock data out of the box. Test everything first, then add real data when ready.