# Notion Databases Setup Guide

This guide will help you set up all 5 Notion databases for the ACT Placemat ecosystem.

## Quick Setup Steps

### 1. Projects Database ✅ (Already exists)
Your existing projects database is ready. Just make sure it has these fields:
- Name (Title)
- Area (Select)
- Status (Select) 
- Revenue Actual (Number)
- Revenue Potential (Number)
- Next Milestone Date (Date)

### 2. Create Opportunities Database 💰

1. **Create new database in Notion**
   - Click "New page" → Select "Database - Full page"
   - Name it "Opportunities Pipeline"

2. **Add these properties** (copy & paste names exactly):
   ```
   Opportunity Name (Title - already exists)
   Organization (Text for now, will be Relation later)
   Stage (Select): Discovery 🔍, Qualification 📋, Proposal 📄, Negotiation 🤝, Closed Won ✅, Closed Lost ❌
   Revenue Amount (Number)
   Probability (Select): 10%, 25%, 50%, 75%, 90%, 100%
   Opportunity Type (Select): Grant, Contract, Partnership, Investment, License, Donation
   Description (Text)
   Primary Contact (Text for now)
   Next Action (Text)
   Next Action Date (Date)
   Deadline (Date)
   Notes (Text)
   ```

3. **Add a formula for Weighted Revenue**:
   - Property name: `Weighted Revenue`
   - Formula: `prop("Revenue Amount") * prop("Probability") / 100`

### 3. Share with Integration

1. Open each database
2. Click "Share" (top right)
3. Click "Add people, emails, groups, or integrations"
4. Search for your ACT Placemat integration
5. Click "Invite"

### 4. Get Database IDs

1. Open each database
2. Look at the URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. Copy the 32-character DATABASE_ID

### 5. Update Your .env File

```env
# Your existing token and projects database
NOTION_TOKEN=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
NOTION_DATABASE_ID=177ebcf981cf80dd9514f1ec32f3314c

# Add your new Opportunities database ID
NOTION_OPPORTUNITIES_DB=YOUR_OPPORTUNITIES_DATABASE_ID_HERE

# Optional: Add these later as you create them
# NOTION_ORGANIZATIONS_DB=
# NOTION_PEOPLE_DB=
# NOTION_ARTIFACTS_DB=
```

## Test Your Setup

1. **Restart the server**:
   ```bash
   npm start
   ```

2. **Run the test script**:
   ```bash
   npm test
   ```

3. **Check the daily dashboard**:
   - Open `daily-dashboard.html` in your browser
   - You should see opportunities appear

4. **Test opportunity alerts**:
   ```bash
   node automations/opportunity-alerts.js
   ```

## Sample Opportunities to Add

Create a few test opportunities in your Notion database:

1. **High Value Grant**
   - Name: "Government Innovation Grant 2024"
   - Stage: Proposal
   - Amount: $150,000
   - Probability: 75%
   - Deadline: 7 days from today
   - Type: Grant

2. **Urgent Partnership**
   - Name: "Tech Company Partnership"
   - Stage: Negotiation
   - Amount: $80,000
   - Probability: 90%
   - Deadline: 3 days from today
   - Type: Partnership

3. **Discovery Opportunity**
   - Name: "Foundation Funding Round"
   - Stage: Discovery
   - Amount: $200,000
   - Probability: 25%
   - Deadline: 30 days from today
   - Type: Grant

## Verify It's Working

After adding test opportunities:

1. **Check alerts**: Run `node automations/opportunity-alerts.js`
   - Should show high-value opportunities
   - Should show urgent deadlines

2. **Check dashboard**: Refresh `daily-dashboard.html`
   - Opportunities count should update
   - Pipeline value should calculate

3. **Check weekly email**: Run `node automations/weekly-action-email.js`
   - Should include opportunities in the report

## Next Databases (Optional)

Once opportunities are working, you can add:

### Organizations Database
- Track partners and funders
- Link to opportunities

### People Database  
- CRM for contacts
- Track relationship strength

### Artifacts Database
- Document management
- Link to projects and opportunities

## Troubleshooting

**"Opportunities database not configured"**
- Check NOTION_OPPORTUNITIES_DB is set in .env
- Verify the database ID is correct
- Make sure integration has access

**No opportunities showing**
- Add test opportunities to your Notion database
- Check the Stage field values match exactly
- Refresh the page/re-run scripts

**Formula not working**
- Make sure Probability is a Select field with percentage values
- Revenue Amount should be a Number field
- Copy the formula exactly as shown

## Quick Win 🎯

Add one real opportunity you're currently pursuing:
1. Add it to the Opportunities database
2. Set a deadline within the next 2 weeks  
3. Run the opportunity alerts
4. See it appear in your dashboard!

This will immediately make the system valuable for your team.