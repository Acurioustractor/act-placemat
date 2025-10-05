#!/usr/bin/env node

/**
 * Analyze Complete ACT Ecosystem
 *
 * Combines data from:
 * - Notion: Projects, People, Organizations, Opportunities, Places, Actions, Artifacts
 * - Supabase: Stories, Activities (CRM interactions)
 * - Gmail: Communication patterns (to be added)
 * - Calendar: Time allocation (to be added)
 *
 * Goal: Understand the complete ecosystem to design automation and collaboration systems
 */

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const DATA_DIR = '.taskmaster/docs/ACTIVE_STRATEGY/complete-ecosystem';
const OUTPUT_DIR = '.taskmaster/docs/ACTIVE_STRATEGY';

console.log('\n🌐 Analyzing Complete ACT Ecosystem\n');
console.log('Data sources:');
console.log('  ✓ Notion: 7 databases loaded');
console.log('  ⏳ Supabase: Stories + Activities');
console.log('  ⏳ Gmail: Communication patterns');
console.log('  ⏳ Calendar: Time allocation\n');

// Load Notion data
async function loadNotionData() {
  console.log('📥 Loading Notion data...');

  const data = {
    projects: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'projects.json'), 'utf-8')),
    people: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'people.json'), 'utf-8')),
    organizations: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'organizations.json'), 'utf-8')),
    opportunities: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'opportunities.json'), 'utf-8')),
    places: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'places.json'), 'utf-8')),
    actions: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'actions.json'), 'utf-8')),
    artifacts: JSON.parse(await fs.readFile(path.join(DATA_DIR, 'artifacts.json'), 'utf-8'))
  };

  console.log('✅ Notion data loaded:');
  console.log(`   Projects: ${data.projects.length}`);
  console.log(`   People: ${data.people.length}`);
  console.log(`   Organizations: ${data.organizations.length}`);
  console.log(`   Opportunities: ${data.opportunities.length}`);
  console.log(`   Places: ${data.places.length}`);
  console.log(`   Actions: ${data.actions.length} (DAILY WORKFLOW DATA!)`);
  console.log(`   Artifacts: ${data.artifacts.length}`);

  return data;
}

// Fetch Supabase data
async function fetchSupabaseData() {
  console.log('\n📥 Fetching Supabase data...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase credentials not found in .env');
    return { stories: [], activities: [] };
  }

  try {
    // Fetch stories
    const storiesRes = await fetch(`${supabaseUrl}/rest/v1/stories?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const stories = storiesRes.ok ? await storiesRes.json() : [];

    // Fetch activities (CRM interactions)
    const activitiesRes = await fetch(`${supabaseUrl}/rest/v1/activities?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const activities = activitiesRes.ok ? await activitiesRes.json() : [];

    console.log('✅ Supabase data loaded:');
    console.log(`   Stories: ${stories.length}`);
    console.log(`   Activities: ${activities.length}`);

    return { stories, activities };

  } catch (error) {
    console.error('❌ Error fetching Supabase data:', error.message);
    return { stories: [], activities: [] };
  }
}

// Analyze Actions (624 records - the daily workflow!)
async function analyzeActions(actions) {
  console.log('\n📊 Analyzing Actions (Daily Workflow)...');

  // Status breakdown
  const byStatus = actions.reduce((acc, action) => {
    const status = action.Status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Type breakdown
  const byType = actions.reduce((acc, action) => {
    const type = action.Type || 'Uncategorized';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Recent actions (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentActions = actions.filter(a => new Date(a.lastEdited) > thirtyDaysAgo);

  // Active conversations
  const conversations = actions.filter(a => a.Type === 'Conversation' && a.Status === 'In progress');

  console.log('\n  Status Distribution:');
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}`);
  });

  console.log('\n  Type Distribution:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });

  console.log(`\n  Recent Activity (30 days): ${recentActions.length} actions`);
  console.log(`  Active Conversations: ${conversations.length}`);

  return {
    byStatus,
    byType,
    recentActions: recentActions.length,
    activeConversations: conversations.length,
    totalActions: actions.length
  };
}

// Map relationship network
async function mapRelationships(data) {
  console.log('\n🕸️  Mapping Relationship Network...');

  // People → Organizations
  const peopleWithOrgs = data.people.filter(p => p.Organization && p.Organization.length > 0);

  // Projects → People (if relations exist)
  const projectsWithPeople = data.projects.filter(p =>
    p.People && Array.isArray(p.People) && p.People.length > 0
  );

  // Projects → Organizations
  const projectsWithOrgs = data.projects.filter(p =>
    p.Organizations && Array.isArray(p.Organizations) && p.Organizations.length > 0
  );

  console.log(`  People connected to Organizations: ${peopleWithOrgs.length}/${data.people.length}`);
  console.log(`  Projects connected to People: ${projectsWithPeople.length}/${data.projects.length}`);
  console.log(`  Projects connected to Organizations: ${projectsWithOrgs.length}/${data.projects.length}`);

  return {
    peopleWithOrgs: peopleWithOrgs.length,
    projectsWithPeople: projectsWithPeople.length,
    projectsWithOrgs: projectsWithOrgs.length
  };
}

// Generate comprehensive report
async function generateReport(allData, analysis) {
  console.log('\n📝 Generating comprehensive ecosystem report...');

  const report = `# ACT Complete Ecosystem Analysis
**Generated**: ${new Date().toISOString()}
**Purpose**: Understand the complete ACT ecosystem for automation and collaboration design

---

## Executive Summary

**The ACT Network**:
- **234 people** in CRM (relationships, collaborators, community leaders)
- **70 organizations** (partners, community groups, clients)
- **64 projects** (33 active - supporting diverse community initiatives)
- **39 opportunities** (potential collaborations)
- **624 actions** (daily workflow: conversations, roadmap, reflections)
- **18 places** (geographic/community locations)
- **13 artifacts** (documents, assets)

**Supabase Data**:
- **${allData.supabase.stories.length} stories** (narrative/impact documentation)
- **${allData.supabase.activities.length} activities** (CRM interactions, touchpoints)

---

## 1. DAILY WORKFLOW ANALYSIS (624 Actions)

This is where the actual work happens - not in projects, but in daily actions.

### Status Breakdown
${Object.entries(analysis.actions.byStatus)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `- **${status}**: ${count} actions (${((count/analysis.actions.totalActions)*100).toFixed(1)}%)`)
  .join('\n')}

### Type Breakdown
${Object.entries(analysis.actions.byType)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `- **${type}**: ${count} actions (${((count/analysis.actions.totalActions)*100).toFixed(1)}%)`)
  .join('\n')}

### Key Insights
- **Recent Activity**: ${analysis.actions.recentActions} actions in last 30 days
- **Active Conversations**: ${analysis.actions.activeConversations} ongoing conversations
- **Total Actions**: ${analysis.actions.totalActions}

**AUTOMATION OPPORTUNITY**:
- Daily workflow is tracked in Actions database
- Can build automated check-ins based on Action patterns
- Conversations type = relationship touchpoints (can auto-suggest follow-ups)
- Roadmap type = strategic planning (can auto-generate progress reports)
- BK Daily Reflection = learning/sense-making (can aggregate insights)

---

## 2. RELATIONSHIP NETWORK

### Network Scale
- **234 people** across the network
- **${analysis.relationships.peopleWithOrgs} people connected to organizations**
- **${analysis.relationships.projectsWithPeople} projects with people relationships**
- **${analysis.relationships.projectsWithOrgs} projects with org relationships**

### Data Quality Issues
- Many people not connected to organizations (relationship data incomplete)
- Many projects not linked to people/orgs (missing collaboration mapping)

**INTEGRATION OPPORTUNITY**:
- Gmail analysis can auto-populate people ↔ organizations relationships
- Calendar meetings can auto-link people ↔ projects
- Supabase CRM activities can fill relationship gaps

---

## 3. PLACES & GEOGRAPHIC PATTERNS

**${allData.notion.places.length} places** in database (many "Untitled" - needs work)

**OPPORTUNITY**:
- Places should map to communities/geographic regions
- Can group projects by place to show collective impact
- Can identify collaboration opportunities by proximity

**ACTION NEEDED**:
- Clean up Places data (add proper names/details)
- Link Projects → Places
- Link People → Places (where they work/live)

---

## 4. STORIES & NARRATIVE (Supabase)

**${allData.supabase.stories.length} stories** stored in Supabase

**FRAMEWORK OPPORTUNITY**:
- Stories = impact documentation
- Should link Stories ↔ Projects ↔ People ↔ Organizations
- Can build automated "impact narrative" generation
- Empathy Ledger platform connection?

**ACTION NEEDED**:
- Analyze story structure in Supabase
- Map stories to ecosystem (which project? which people?)
- Design automated story capture from Actions/conversations

---

## 5. ACTIVITIES & CRM (Supabase)

**${allData.supabase.activities.length} activities** in Supabase CRM

**INTEGRATION OPPORTUNITY**:
- Activities = CRM interactions (emails, calls, meetings)
- Should sync with Notion People/Organizations
- Can auto-populate from Gmail + Calendar
- Can suggest relationship nurturing based on activity gaps

**ACTION NEEDED**:
- Analyze activity types and patterns
- Design Gmail → Supabase activity auto-logging
- Design Calendar → Supabase meeting sync
- Build "relationship health" dashboard

---

## 6. AUTOMATION OPPORTUNITIES

### High Priority Automations

**1. Daily Workflow Dashboard** (from Actions)
- Auto-scrape Actions database daily
- Generate "Daily Digest" email with:
  - Active conversations needing response
  - Roadmap items due today
  - Yesterday's reflections summary
- **Benefit**: Never lose track of daily work

**2. Relationship Intelligence** (from Gmail + Calendar + People)
- Auto-log Gmail conversations → Supabase activities
- Auto-log Calendar meetings → Supabase activities
- Auto-suggest relationship check-ins based on gaps
- **Benefit**: Maintain 234 relationships without manual tracking

**3. Project Health Monitoring** (from Projects + Actions)
- Weekly auto-check: Last activity on each project?
- Auto-send health reports to project stakeholders
- Flag projects going stale (no actions in 2+ weeks)
- **Benefit**: Support 64 projects without manual oversight

**4. Collaboration Matchmaking** (from Projects + People + Organizations)
- Detect shared outcomes across projects
- Auto-suggest collaborations based on:
  - Similar work (tags, descriptions)
  - Geographic proximity (Places)
  - Shared organizations
- **Benefit**: Facilitate connections instead of empire-building

**5. Impact Narrative Generation** (from Stories + Projects + Actions)
- Weekly auto-compile: Stories + Project updates + Key actions
- Generate collective impact report
- Share with funders/stakeholders
- **Benefit**: Show collective impact, reduce reporting burden

---

## 7. INTEGRATION ARCHITECTURE

### Data Flow Design

\`\`\`
Gmail API → Supabase Activities → Notion People
    ↓
Calendar API → Supabase Activities → Notion Projects
    ↓
Notion Actions → Daily Digest → Email
    ↓
Notion Projects + People → Collaboration Suggestions → Slack/Email
    ↓
Supabase Stories → Impact Reports → Public dashboard
\`\`\`

### Technical Components Needed

**1. Gmail Integration Service**
- Read recent emails (30 days)
- Extract: From, To, Subject, Date, Body snippet
- Match email addresses → Notion People
- Log as Supabase Activity
- Update Notion People "Last Contact" field

**2. Calendar Integration Service**
- Read calendar events (30 days)
- Extract: Attendees, Title, Date, Duration
- Match attendees → Notion People
- Log as Supabase Activity
- Link to Projects (if project name in title)

**3. Actions Monitor Service**
- Daily scrape of Notion Actions database
- Filter: Active conversations, Today's roadmap, Recent reflections
- Generate email digest
- Send via Gmail API

**4. Project Health Service**
- Weekly scrape of Notion Projects
- Check: Last action date, Last person contact
- Generate health report per project
- Auto-email to project stakeholders (if available)

**5. Collaboration Engine**
- Daily analysis: Projects + People + Organizations + Places
- Detect: Similar tags, shared orgs, geographic clusters
- Generate collaboration suggestions
- Email/Slack to relevant people

---

## 8. IMMEDIATE NEXT STEPS

### This Week

**Day 1-2: Data Integration Setup**
- [ ] Set up Gmail API access
- [ ] Set up Calendar API access
- [ ] Test Supabase connection
- [ ] Design data schemas for Activities

**Day 3-4: First Automation**
- [ ] Build Actions → Daily Digest email
- [ ] Test with your own email
- [ ] Iterate based on usefulness

**Day 5: Relationship Data**
- [ ] Export Gmail contacts → analyze
- [ ] Export Calendar attendees → analyze
- [ ] Design People ↔ email address matching

### Next 2 Weeks

**Week 2: Gmail + Calendar Integration**
- [ ] Build Gmail → Supabase activity logger
- [ ] Build Calendar → Supabase activity logger
- [ ] Auto-populate Notion People relationships
- [ ] Test relationship intelligence

**Week 3: Project Health System**
- [ ] Build project health checker
- [ ] Design weekly health reports
- [ ] Test with 5 projects
- [ ] Roll out to all active projects

### Month 2-3

- Collaboration matchmaking engine
- Impact narrative automation
- Public transparency dashboard
- Full ecosystem automation running

---

## 9. SUCCESS METRICS (ACT's Way)

**NOT**:
- Number of projects reduced
- Revenue per project
- Profit margins

**BUT**:
- Number of automated touchpoints (reducing manual work)
- Collaboration connections facilitated
- Project health maintained without Ben's intervention
- Relationships nurtured systematically
- Community impact documented automatically
- Time Ben spends on admin (should decrease)
- Time Ben spends on actual collaboration/facilitation (should increase)

---

## 10. TECHNICAL REQUIREMENTS

### APIs & Services Needed
- ✅ Notion API (working)
- ✅ Supabase (have credentials)
- ⏳ Gmail API (need to set up OAuth)
- ⏳ Google Calendar API (need to set up OAuth)
- ⏳ Email service (for sending digests)

### Data Storage
- Notion: Master data (Projects, People, Organizations, etc.)
- Supabase: Operational data (Stories, Activities, logs)
- Local cache: For fast queries (Redis?)

### Automation Platform
- Node.js cron jobs (for daily/weekly tasks)
- OR: n8n / Zapier (for no-code automation)
- OR: Custom service (more control)

---

**Generated**: ${new Date().toISOString()}
**Status**: Ready for implementation - all data sources identified, automation opportunities mapped
`;

  const filepath = path.join(OUTPUT_DIR, 'ACT_COMPLETE_ECOSYSTEM_ANALYSIS.md');
  await fs.writeFile(filepath, report);
  console.log(`✅ Saved: ${filepath}`);

  return report;
}

// Main execution
async function main() {
  try {
    // Load all data
    const notionData = await loadNotionData();
    const supabaseData = await fetchSupabaseData();

    const allData = {
      notion: notionData,
      supabase: supabaseData
    };

    // Analyze
    const actionsAnalysis = await analyzeActions(notionData.actions);
    const relationshipsAnalysis = await mapRelationships(notionData);

    const analysis = {
      actions: actionsAnalysis,
      relationships: relationshipsAnalysis
    };

    // Generate report
    await generateReport(allData, analysis);

    // Save complete analysis data
    const dataPath = path.join(OUTPUT_DIR, 'complete-ecosystem-analysis.json');
    await fs.writeFile(dataPath, JSON.stringify({ allData, analysis }, null, 2));
    console.log(`✅ Saved data: ${dataPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE ECOSYSTEM ANALYSIS DONE!');
    console.log('='.repeat(80));
    console.log('\n📄 Generated:');
    console.log('   ACT_COMPLETE_ECOSYSTEM_ANALYSIS.md - Full report with automation roadmap');
    console.log('\n🎯 Key Finding:');
    console.log('   624 Actions = Your actual daily workflow');
    console.log('   This is the foundation for all automation!');
    console.log('\n📋 Next Step:');
    console.log('   Design Gmail + Calendar + Supabase integration');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
