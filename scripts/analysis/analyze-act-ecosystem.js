#!/usr/bin/env node

/**
 * ACT Ecosystem Analysis
 *
 * Analyze the actual ACT ecosystem to understand:
 * - Gmail: Who are we communicating with? What patterns emerge?
 * - Calendar: Where does time actually go? Who do we meet with?
 * - CRM/Notion: What relationships exist? What collaborations?
 * - Projects: How do organizations connect? What outcomes are shared?
 *
 * Goal: Find pathways to bring leaders together on outcomes,
 * create habitual check-ins, automate support, work toward obsolescence
 */

import fetch from 'node-fetch';
import { Client } from '@notionhq/client';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n🌱 ACT Ecosystem Analysis - First Principles Approach\n');
console.log('Core Question: How does ACT support organizations to thrive and become obsolete?');
console.log('Not: How to maximize profit');
console.log('But: How to create conditions for community-led impact\n');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

const CONFIG = {
  notionProjects: process.env.NOTION_PROJECTS_DATABASE_ID,
  notionPeople: process.env.NOTION_PEOPLE_DATABASE_ID,
  notionOrgs: process.env.NOTION_ORGANIZATIONS_DATABASE_ID,
  notionOpportunities: process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  outputDir: '.taskmaster/docs/ACTIVE_STRATEGY',
  researchModel: 'llama3.1:8b'
};

// Utility: Save JSON
async function saveJSON(filename, data) {
  const filepath = path.join(CONFIG.outputDir, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filepath}`);
}

// Utility: Save Markdown
async function saveMarkdown(filename, content) {
  const filepath = path.join(CONFIG.outputDir, filename);
  await fs.writeFile(filepath, content);
  console.log(`✅ Saved: ${filepath}`);
}

// Step 1: Fetch People (relationships)
async function fetchPeople() {
  console.log('\n👥 Fetching People/Relationships from Notion...');

  try {
    const response = await notion.databases.query({
      database_id: CONFIG.notionPeople,
      page_size: 100
    });

    const people = response.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || 'Unnamed',
        organization: props.Organization?.relation?.[0]?.id || null,
        role: props.Role?.select?.name || null,
        tags: props.Tags?.multi_select?.map(t => t.name) || [],
        email: props.Email?.email || null,
        created: page.created_time,
        url: page.url
      };
    });

    console.log(`✅ Found ${people.length} people in CRM`);
    await saveJSON('crm-people.json', people);
    return people;

  } catch (error) {
    console.error('❌ Error fetching people:', error.message);
    return [];
  }
}

// Step 2: Fetch Organizations
async function fetchOrganizations() {
  console.log('\n🏢 Fetching Organizations from Notion...');

  try {
    const response = await notion.databases.query({
      database_id: CONFIG.notionOrgs,
      page_size: 100
    });

    const orgs = response.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || 'Unnamed',
        type: props.Type?.select?.name || null,
        sector: props.Sector?.select?.name || null,
        tags: props.Tags?.multi_select?.map(t => t.name) || [],
        created: page.created_time,
        url: page.url
      };
    });

    console.log(`✅ Found ${orgs.length} organizations`);
    await saveJSON('crm-organizations.json', orgs);
    return orgs;

  } catch (error) {
    console.error('❌ Error fetching organizations:', error.message);
    return [];
  }
}

// Step 3: Fetch Opportunities (potential collaborations)
async function fetchOpportunities() {
  console.log('\n💡 Fetching Opportunities from Notion...');

  try {
    const response = await notion.databases.query({
      database_id: CONFIG.notionOpportunities,
      page_size: 100
    });

    const opportunities = response.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || 'Unnamed',
        status: props.Status?.status?.name || props.Status?.select?.name || null,
        type: props.Type?.select?.name || null,
        organizations: props.Organizations?.relation?.map(r => r.id) || [],
        created: page.created_time,
        url: page.url
      };
    });

    console.log(`✅ Found ${opportunities.length} opportunities`);
    await saveJSON('crm-opportunities.json', opportunities);
    return opportunities;

  } catch (error) {
    console.error('❌ Error fetching opportunities:', error.message);
    return [];
  }
}

// Step 4: Analyze with Ollama
async function analyzeWithOllama(prompt) {
  try {
    const response = await fetch(`${CONFIG.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.researchModel,
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('❌ Ollama analysis failed:', error.message);
    return null;
  }
}

// Step 5: Map Relationship Networks
async function mapRelationshipNetworks(people, orgs, opportunities, projects) {
  console.log('\n🕸️  Mapping relationship networks...');

  const context = `
  ACT ECOSYSTEM DATA:

  People: ${people.length} individuals
  Organizations: ${orgs.length} organizations
  Opportunities: ${opportunities.length} potential collaborations
  Projects: ${projects.length} active initiatives

  PEOPLE SAMPLE:
  ${JSON.stringify(people.slice(0, 20), null, 2)}

  ORGANIZATIONS SAMPLE:
  ${JSON.stringify(orgs.slice(0, 20), null, 2)}

  PROJECTS SAMPLE:
  ${JSON.stringify(projects.slice(0, 20), null, 2)}

  Analyze this ecosystem from ACT's first principles:

  ACT's Purpose: Support organizations to thrive and become obsolete
  NOT: Build empire or maximize profit
  BUT: Create conditions for community-led impact

  Questions to answer:
  1. Who are the key leaders/connectors in this network?
  2. What organizations are working toward similar outcomes?
  3. Where are potential collaborations between leaders/orgs?
  4. What patterns of communication/connection exist?
  5. How can ACT bring people together on shared outcomes?
  6. What habitual check-ins would support these connections?
  7. Where can ACT automate support and step back?

  Provide specific examples from the data.
  `;

  const analysis = await analyzeWithOllama(context);
  await saveJSON('relationship-network-analysis.json', { analysis });

  return analysis;
}

// Step 6: Identify Shared Outcomes
async function identifySharedOutcomes(projects, people, orgs) {
  console.log('\n🎯 Identifying shared outcomes across projects...');

  const prompt = `
  ACT PROJECTS DATA:
  ${JSON.stringify(projects.slice(0, 40), null, 2)}

  ACT's principle: We struggle with logical pathways to philanthropy and money.
  We want to find ways to bring leaders together on OUTCOMES and work toward
  collaborative and sense-making impact as community-led projects.

  Analyze these projects to identify:
  1. What OUTCOMES are multiple projects working toward?
     (not outputs, but actual community/social outcomes)
  2. Which projects could collaborate on shared outcomes?
  3. What leaders/organizations should be connected?
  4. What are logical pathways from philanthropy → community impact?
  5. How can outcomes be measured collectively vs individually?
  6. What sense-making processes would help?

  Think about:
  - Justice outcomes (multiple justice projects)
  - Health/wellness outcomes (SMART, health projects)
  - Cultural preservation outcomes (Indigenous projects)
  - Storytelling/narrative outcomes (Empathy Ledger, etc)

  Provide specific collaboration opportunities and pathway recommendations.
  `;

  const analysis = await analyzeWithOllama(prompt);
  await saveJSON('shared-outcomes-analysis.json', { analysis });

  return analysis;
}

// Step 7: Design Habitual Check-in Systems
async function designCheckinSystems(ecosystemData) {
  console.log('\n⏰ Designing habitual check-in systems...');

  const prompt = `
  Based on ACT's ecosystem of projects and relationships, design habitual check-in systems.

  ACT's principle: Create tools and processes that support organizations,
  then ACT becomes obsolete as they thrive independently.

  Design check-in systems for:
  1. Project health monitoring (automated, non-intrusive)
  2. Relationship nurturing (regular touchpoints with leaders)
  3. Collaboration opportunities (when to connect people)
  4. Outcome tracking (collective impact measurement)
  5. Learning/sense-making (capture insights across projects)

  For each, specify:
  - Frequency (daily, weekly, monthly, quarterly)
  - Format (automated report, human conversation, etc)
  - Data sources (Gmail, Calendar, Notion, etc)
  - Automation potential (what can be automated?)
  - Human touch points (where does ACT/Ben need to show up?)
  - Obsolescence pathway (how does this become self-sustaining?)

  Think about tools like:
  - Automated weekly project health emails
  - Monthly leader roundtable invites (based on shared outcomes)
  - Quarterly collective impact reports
  - AI-assisted relationship suggestions
  `;

  const analysis = await analyzeWithOllama(prompt);
  await saveJSON('checkin-systems-design.json', { analysis });

  return analysis;
}

// Step 8: Map Automation Opportunities
async function mapAutomationOpportunities(ecosystemData) {
  console.log('\n🤖 Mapping automation opportunities...');

  const prompt = `
  ACT's challenge: 33 active projects is unsustainable for one person.
  ACT's solution: NOT killing projects, but automating support and creating
  systems that help organizations thrive independently.

  Based on the ecosystem data, identify automation opportunities:

  1. What repetitive tasks across projects can be automated?
  2. What data/insights can be automatically collected and shared?
  3. What connections/introductions can be systematically suggested?
  4. What reporting/tracking can be automated?
  5. How can AI assist in relationship management at scale?

  For each automation:
  - What problem does it solve?
  - What tools/tech needed?
  - What's the implementation effort?
  - How does it support obsolescence (organizations become self-sufficient)?

  Think about:
  - Automated project health checks (scrape Notion, send summaries)
  - AI-powered relationship suggestions (Gmail + CRM data)
  - Collaborative opportunity detection (match projects on outcomes)
  - Collective impact dashboards (automated metric aggregation)
  - Knowledge base automation (capture learnings from emails/meetings)
  `;

  const analysis = await analyzeWithOllama(prompt);
  await saveJSON('automation-opportunities.json', { analysis });

  return analysis;
}

// Step 9: Design Philanthropy Pathways
async function designPhilanthropyPathways(projects, outcomes) {
  console.log('\n💰 Designing logical pathways from philanthropy to community impact...');

  const prompt = `
  ACT struggles with: Logical pathways to philanthropy and money.

  Current reality: Multiple projects, diverse outcomes, community-led impact.
  Challenge: How to create clear pathways from funding → outcomes?

  Based on the project data and shared outcomes analysis, design:

  1. OUTCOME-BASED FUNDING PATHWAYS
     - Group projects by shared outcomes (justice, health, culture, etc)
     - Show how funding one outcome supports multiple community initiatives
     - Create "outcome portfolios" that funders can support

  2. COLLABORATIVE FUNDING MODELS
     - How can multiple funders pool resources for shared outcomes?
     - What governance/decision-making supports community leadership?
     - How does ACT facilitate without controlling?

  3. TRANSPARENCY & ACCOUNTABILITY
     - How to show collective impact across projects?
     - What metrics matter to communities (not just funders)?
     - How to share learnings and failures openly?

  4. OBSOLESCENCE PATHWAY
     - How does funding support community capacity building?
     - When/how does ACT step back as communities lead?
     - What does "success" look like (for community, not ACT)?

  Provide specific pathway designs with:
  - Outcome groupings from actual projects
  - Funding models (philanthropic, government, earned income, etc)
  - Governance structures
  - Measurement frameworks
  - Exit strategies for ACT
  `;

  const analysis = await analyzeWithOllama(prompt);
  await saveJSON('philanthropy-pathways.json', { analysis });

  return analysis;
}

// Step 10: Generate Comprehensive Ecosystem Report
async function generateEcosystemReport(allData) {
  console.log('\n📝 Generating comprehensive ACT ecosystem report...');

  const report = `# ACT Ecosystem Analysis: First Principles Approach
**Generated**: ${new Date().toISOString()}
**Purpose**: Understand how ACT supports organizations to thrive and become obsolete

---

## Core Principle

**ACT is NOT about**:
- Maximizing profit
- Building an empire
- Reducing projects to focus

**ACT IS about**:
- Supporting organizations to thrive
- Creating conditions for community-led impact
- Bringing leaders together on shared outcomes
- Automating support and becoming obsolete
- Finding logical pathways from philanthropy → community impact

---

## 1. ECOSYSTEM OVERVIEW

### The Network
- **${allData.people.length} People** in CRM (leaders, collaborators, community members)
- **${allData.orgs.length} Organizations** (partners, clients, community groups)
- **${allData.opportunities.length} Opportunities** (potential collaborations)
- **${allData.projects.length} Projects** (33 active, serving diverse communities)

### Current State
This is not "too many projects" - this is ACT's purpose in action:
Supporting diverse community-led initiatives across justice, health, culture, and innovation.

The challenge is not to reduce, but to **systematize support** so ACT can serve well and become obsolete.

---

## 2. RELATIONSHIP NETWORK ANALYSIS

${allData.networkAnalysis}

---

## 3. SHARED OUTCOMES ACROSS PROJECTS

${allData.outcomesAnalysis}

---

## 4. HABITUAL CHECK-IN SYSTEMS DESIGN

${allData.checkinSystems}

---

## 5. AUTOMATION OPPORTUNITIES

${allData.automationMap}

---

## 6. PHILANTHROPY PATHWAYS

${allData.philanthropyPathways}

---

## 7. INTEGRATION WITH ACT PLATFORM

### Current Tools
- **Gmail**: Communication hub (needs analysis)
- **Calendar**: Time/meeting patterns (needs analysis)
- **Notion**: CRM + Projects (connected, needs automation)
- **Empathy Ledger**: Storytelling platform (underutilized?)

### Proposed Integration
1. **Automated Project Health Dashboard**
   - Daily scrape of Notion projects
   - Weekly health reports to stakeholders
   - Automated alerts for issues

2. **Relationship Intelligence System**
   - Gmail + Calendar analysis
   - Suggest connections based on shared outcomes
   - Automate introduction emails

3. **Collective Impact Dashboard**
   - Aggregate outcomes across projects
   - Share with funders and communities
   - Public transparency by default

4. **Leader Collaboration Platform**
   - Monthly roundtables on shared outcomes
   - Automated invitations based on project data
   - Capture and share learnings

---

## 8. SUSTAINABILITY MODEL (Not Traditional Revenue)

### How ACT Sustains While Supporting Obsolescence

**Earned Income** (to sustain operations):
- Platform development fees (building tools for communities)
- Facilitation fees (bringing leaders together)
- Knowledge sharing (workshops, documentation)

**Philanthropic Support**:
- Outcome-based pooled funding
- Support for collective impact infrastructure
- Capacity building grants

**Community Contribution**:
- As organizations thrive, they contribute to ecosystem
- Knowledge sharing, peer support, resource pooling
- Eventually, ACT becomes a node in community-led network

**Obsolescence Indicators** (success metrics):
- Organizations no longer need ACT's direct support
- Community networks are self-sustaining
- Tools/systems are maintained by communities
- ACT's role shifts from doing → supporting → observing

---

## 9. IMMEDIATE ACTIONS (This Week)

### 1. Gmail & Calendar Analysis
- [ ] Export recent Gmail data (last 6 months)
- [ ] Analyze: Who do we communicate with most?
- [ ] Identify: Relationship patterns and gaps
- [ ] Map: Time allocation from calendar

### 2. CRM Enhancement
- [ ] Add "Shared Outcomes" field to Projects
- [ ] Tag projects by outcome themes
- [ ] Map people ↔ organizations ↔ projects
- [ ] Identify collaboration opportunities

### 3. First Automation
- [ ] Weekly project health email (automated from Notion)
- [ ] Test with 5 projects
- [ ] Gather feedback, iterate

### 4. First Leader Roundtable
- [ ] Identify 5-8 leaders working on justice outcomes
- [ ] Send invitation for sense-making conversation
- [ ] Facilitate, capture learnings
- [ ] Design habitual version

---

## 10. 90-DAY ROADMAP

### Month 1: Understand
- Complete ecosystem analysis (Gmail, Calendar, CRM)
- Map all relationships and shared outcomes
- Design automation systems
- Test first check-in rhythms

### Month 2: Automate
- Build automated project health system
- Create relationship intelligence dashboard
- Launch first leader roundtables
- Develop collective impact reporting

### Month 3: Connect
- Facilitate collaborations on shared outcomes
- Test philanthropy pathway with 1-2 funders
- Document learnings and failures
- Design obsolescence pathways for mature projects

---

## 11. SUCCESS METRICS (ACT's Version)

**NOT**:
- Revenue maximization
- Project count reduction
- Profit margins

**BUT**:
- Number of organization-to-organization connections facilitated
- Projects that no longer need ACT's direct support
- Collective outcomes achieved across project portfolio
- Leaders collaborating on shared goals
- Communities self-organizing without ACT
- Funders supporting outcome portfolios vs individual projects

---

## 12. NEXT RESEARCH PHASES

### Phase A: Gmail Analysis
- Communication patterns over 6 months
- Relationship strength indicators
- Topic/outcome clustering
- Response time and engagement metrics

### Phase B: Calendar Analysis
- Time allocation across projects/relationships
- Meeting patterns and collaborations
- Energy/attention distribution
- Gaps and opportunities

### Phase C: Integration Design
- Connect Gmail + Calendar + Notion + projects
- Build unified relationship intelligence
- Automate insights and suggestions
- Create habitual check-in systems

---

**Generated by**: Multi-AI Research Stack (Ollama llama3.1:8b + Notion API)
**Research Time**: ${((Date.now() - allData.startTime) / 1000 / 60).toFixed(1)} minutes
**Status**: Ecosystem mapping complete - ready for integration and automation design
`;

  return report;
}

// Main execution
async function main() {
  const startTime = Date.now();

  console.log('🚀 Starting ACT Ecosystem Analysis (First Principles)\n');

  try {
    // Load existing project data
    const projectsFile = path.join(CONFIG.outputDir, 'notion-projects-raw.json');
    const projectsData = await fs.readFile(projectsFile, 'utf-8');
    const projects = JSON.parse(projectsData);
    console.log(`✅ Loaded ${projects.length} projects from previous research`);

    // Fetch CRM data
    const people = await fetchPeople();
    const orgs = await fetchOrganizations();
    const opportunities = await fetchOpportunities();

    // Analyze ecosystem
    const networkAnalysis = await mapRelationshipNetworks(people, orgs, opportunities, projects);
    const outcomesAnalysis = await identifySharedOutcomes(projects, people, orgs);
    const checkinSystems = await designCheckinSystems({ projects, people, orgs, opportunities });
    const automationMap = await mapAutomationOpportunities({ projects, people, orgs });
    const philanthropyPathways = await designPhilanthropyPathways(projects, outcomesAnalysis);

    // Generate report
    const allData = {
      startTime,
      people,
      orgs,
      opportunities,
      projects,
      networkAnalysis,
      outcomesAnalysis,
      checkinSystems,
      automationMap,
      philanthropyPathways
    };

    const report = await generateEcosystemReport(allData);
    await saveMarkdown('ACT_ECOSYSTEM_ANALYSIS.md', report);
    await saveJSON('act-ecosystem-complete.json', allData);

    // Success summary
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ACT ECOSYSTEM ANALYSIS COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n⏱️  Duration: ${duration} minutes`);
    console.log('\n📄 Generated Documents:');
    console.log('   1. ACT_ECOSYSTEM_ANALYSIS.md (comprehensive ecosystem report)');
    console.log('   2. act-ecosystem-complete.json (all data)');
    console.log('   3. CRM data files (people, orgs, opportunities)');
    console.log('   4. Individual analysis JSON files');
    console.log('\n📁 Location: .taskmaster/docs/ACTIVE_STRATEGY/');
    console.log('\n🎯 Key Insights:');
    console.log(`   - ${people.length} people in network`);
    console.log(`   - ${orgs.length} organizations`);
    console.log(`   - ${projects.length} projects (not reducing - systematizing!)  `);
    console.log('\n📋 Next Steps:');
    console.log('   1. Review ACT_ECOSYSTEM_ANALYSIS.md');
    console.log('   2. Analyze Gmail and Calendar data');
    console.log('   3. Design integration systems');
    console.log('   4. Build first automation (project health checks)');
    console.log('   5. Facilitate first leader roundtable');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the analysis
main();
