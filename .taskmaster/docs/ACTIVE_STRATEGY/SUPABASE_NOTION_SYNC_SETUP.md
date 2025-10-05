# Supabase ↔ Notion Sync Setup Guide
**Purpose**: Connect your existing world-class Supabase intelligence system to Notion's daily workflow

---

## 🎯 What This Achieves

**Before**:
- 20,042 LinkedIn contacts in Supabase
- Relationship intelligence isolated from daily workflow
- Manual tracking of 234 people in Notion
- Communications Dashboard with only 6 records

**After**:
- Automated relationship tracking for all 234 people
- Communications Dashboard auto-populated from Gmail/Calendar data
- Never manually track "Last Contact Date" again
- Habitual check-ins driven by intelligent cadence calculations
- ACT's principles: Support without empire-building, through automation

---

## 📋 Prerequisites

### 1. Environment Variables

Add to `apps/backend/.env`:

```bash
# === NOTION DATABASES (if not already set) ===
NOTION_TOKEN=secret_your_notion_integration_token
NOTION_PEOPLE_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_COMMUNICATIONS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_ACTIONS_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# === SUPABASE (should already exist) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Notion Communications Dashboard Properties

Your Communications Dashboard needs these properties (manually add if missing):

**Core Properties**:
- ✅ `Contact Person` - Relation to People database
- ✅ `Last Contact Date` - Date property
- ✅ `Next Contact Due` - Date property

**Intelligence Properties** (will be auto-populated):
- `Touchpoints (7d)` - Number property
- `Touchpoints (30d)` - Number property
- `Total Touchpoints` - Number property
- `Active Sources` - Multi-select property (email, calendar, linkedin)

**Optional** (already exist based on your design):
- Current Mood/Energy
- Delight Factor
- Fun Element
- Funding Potential
- Empathy Ledger Connection

### 3. Supabase Tables

Should already exist from your existing system:
- ✅ `contact_cadence_metrics` - Relationship tracking
- ✅ `community_emails` - Gmail intelligence
- ✅ `gmail_notion_contacts` - Email ↔ Person mapping
- ✅ `project_support_graph` - Project supporters
- ✅ `outreach_tasks` - Automated outreach

---

## 🚀 Getting Started

### Step 1: Verify Schema

Check that Communications Dashboard has required properties:

```bash
cd "/Users/benknight/Code/ACT Placemat"
node verify-communications-dashboard-schema.js
```

**Expected output**:
```
✅ All required properties exist!
```

If properties are missing, manually add them in Notion before proceeding.

### Step 2: Test Sync (Dry Run)

Run a dry run to see what will happen without making changes:

```bash
node test-supabase-notion-sync.js
```

**Expected output**:
```
📊 Dry Run Results:
  - Contacts matched: 10
  - Records would update: 10
  - Records would create: 0
  - Errors: 0
```

### Step 3: Live Sync (First 10 Contacts)

Once dry run looks good:

```bash
node test-supabase-notion-sync.js --live
```

**Expected output**:
```
📊 Live Sync Results:
  - Contacts matched: 10
  - Records updated: 8
  - Records created: 2
  - Errors: 0
```

### Step 4: Full Sync (All 234 People)

After validating with 10 contacts, run full sync:

```bash
node apps/backend/core/scripts/daily-sync.js --full
```

---

## 🔄 Daily Automation

### Create Daily Cron Job

Add to your system cron or use `node-cron`:

```javascript
// apps/backend/core/scripts/daily-sync.js
import { SupabaseNotionSync } from '../src/services/supabaseNotionSync.js';
import cron from 'node-cron';

const sync = new SupabaseNotionSync();

// Run every day at 6am
cron.schedule('0 6 * * *', async () => {
  console.log('🔄 Running daily sync...');

  try {
    await sync.initialize();

    // Sync contact cadence → Communications Dashboard
    const results = await sync.syncContactCadenceToNotion({
      dryRun: false,
      onlyRecentlyActive: true // Only sync active relationships
    });

    console.log(`✅ Synced ${results.recordsUpdated} contacts`);

  } catch (error) {
    console.error('❌ Daily sync failed:', error);
    // TODO: Send alert to Slack/email
  }
});

console.log('✅ Daily sync scheduled for 6am');
```

Run with:
```bash
node apps/backend/core/scripts/daily-sync.js
```

Or add to `package.json`:
```json
{
  "scripts": {
    "sync:daily": "node apps/backend/core/scripts/daily-sync.js"
  }
}
```

---

## 📊 What Gets Synced

### Supabase → Notion Flow

```
contact_cadence_metrics (Supabase)
  ↓
Match by email
  ↓
Communications Dashboard (Notion)
```

**Data synced**:
1. **Last Contact Date** ← `last_interaction` from Supabase
2. **Next Contact Due** ← Calculated from touchpoint frequency
3. **Touchpoints (7d)** ← `touchpoints_last_7`
4. **Touchpoints (30d)** ← `touchpoints_last_30`
5. **Total Touchpoints** ← `total_touchpoints`
6. **Active Sources** ← `active_sources` (email, calendar, linkedin)

### Cadence Calculation Logic

The system calculates "Next Contact Due" based on relationship activity:

- **Very Active** (>2 touchpoints in 7 days) → Check in weekly
- **Active** (>3 touchpoints in 30 days) → Check in bi-weekly
- **Established** (>10 total touchpoints) → Check in monthly
- **Nurturing** (new relationships) → Check in quarterly

This ensures habitual check-ins without manual tracking!

---

## 🎯 Success Metrics

After implementing, you should see:

### Week 1
- ✅ Communications Dashboard: 6 → 234 records
- ✅ All contact dates auto-populated
- ✅ Zero manual data entry
- ✅ Overdue check-ins flagged automatically

### Week 2
- ✅ Daily sync running automatically
- ✅ Relationship cadence visible at-a-glance
- ✅ Time saved: ~10 hours/week (no more manual CRM)

### Month 1
- ✅ 100% relationship tracking coverage
- ✅ Actions → Outreach automation (Phase 2)
- ✅ Collaboration matchmaking active (Phase 3)

---

## 🔧 Troubleshooting

### "API token is invalid"
- Check `NOTION_TOKEN` in `.env`
- Ensure Notion integration has access to Communications Dashboard
- Verify integration has "Update content" permissions

### "No contacts matched"
- Check that People database has email addresses
- Verify `contact_cadence_metrics` table has data
- Run: `SELECT COUNT(*) FROM contact_cadence_metrics;` in Supabase

### "Property not found"
- Check Communications Dashboard schema with verify script
- Manually add missing properties in Notion
- Or modify sync service to use your existing property names

### Sync is slow
- Use `onlyRecentlyActive: true` to sync only last 90 days
- Add `limit` parameter to test with smaller batches
- Consider running sync less frequently (daily vs hourly)

---

## 🚀 Next Steps (Phases 2-4)

After Contact Cadence sync is working:

### Phase 2: Actions → Outreach Automation
- Sync Notion Actions (Type: Conversation) → Supabase outreach_tasks
- AI-draft messages based on conversation context
- Surface in daily digest email

### Phase 3: Project Intelligence
- Sync Notion Projects → Supabase project_support_graph
- Track project health automatically
- Map supporter networks

### Phase 4: Collaboration Matchmaking
- Analyze projects for shared supporters
- Detect similar keywords/outcomes
- Generate strategic introduction opportunities
- **This is ACT's core purpose**: Bringing leaders together!

---

## 📝 Files Created

1. **`apps/backend/core/src/services/supabaseNotionSync.js`**
   - Main sync service implementation
   - Contact matching logic
   - Cadence calculations

2. **`test-supabase-notion-sync.js`**
   - Test script for dry run and live sync
   - Use to validate before full deployment

3. **`verify-communications-dashboard-schema.js`**
   - Schema verification utility
   - Checks for required properties

4. **`apps/backend/core/scripts/daily-sync.js`** (to be created)
   - Daily cron job for automated sync
   - Production automation

---

## 💡 Design Philosophy

This sync bridges two systems:

**Supabase** = Intelligence Engine
- AI-powered email classification
- Relationship frequency analysis
- Contact cadence tracking
- Automated insights generation

**Notion** = Daily Workflow
- Where you actually work
- Where decisions are made
- Where relationships are nurtured
- Where collaboration happens

**The Gap**: Intelligence was isolated from workflow.

**The Fix**: Bidirectional sync makes intelligence actionable.

**The Result**: ACT's principles in action:
- Support 234 relationships systematically
- Automate tracking, not reduce work
- Enable habitual check-ins
- Facilitate collaboration vs empire-building
- Become obsolete as communities thrive

---

**Next**: Run the verification and test scripts, then we'll create the daily automation!
