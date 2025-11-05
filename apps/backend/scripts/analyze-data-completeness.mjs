#!/usr/bin/env node

/**
 * Analyze Infrastructure Data Completeness
 *
 * Shows which projects have infrastructure tracking data and which don't
 * Helps prioritize data collection efforts
 *
 * Run: node analyze-data-completeness.mjs
 */

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PROJECTS_DB_ID = '177ebcf981cf80dd9514f1ec32f3314c';

async function getProjects() {
  const response = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    sorts: [{ property: 'Name', direction: 'ascending' }]
  });

  return response.results.map(page => {
    const props = page.properties;

    // Parse Community Labor Metrics JSON if present
    let communityLaborMetrics = null;
    const clmText = props['Community Labor Metrics']?.rich_text?.[0]?.plain_text;
    if (clmText) {
      try {
        communityLaborMetrics = JSON.parse(clmText);
      } catch (e) {
        // Not JSON, ignore
      }
    }

    // Parse Storytelling Metrics JSON if present
    let storytellingMetrics = null;
    const smText = props['Storytelling Metrics']?.rich_text?.[0]?.plain_text;
    if (smText) {
      try {
        storytellingMetrics = JSON.parse(smText);
      } catch (e) {
        // Not JSON, ignore
      }
    }

    // Parse Grant Dependency Metrics JSON if present
    let grantDependencyMetrics = null;
    const gdmText = props['Grant Dependency Metrics']?.rich_text?.[0]?.plain_text;
    if (gdmText) {
      try {
        grantDependencyMetrics = JSON.parse(gdmText);
      } catch (e) {
        // Not JSON, ignore
      }
    }

    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text || 'Untitled',
      status: props.Status?.status?.name || 'Unknown',
      projectType: props['Project Type']?.select?.name || null,
      hasCommunitylabor: !!communityLaborMetrics,
      hasStorytelling: !!storytellingMetrics,
      hasGrantDependency: !!grantDependencyMetrics,
      actualIncoming: props['Actual Incoming (AUD)']?.number || 0,
      potentialIncoming: props['Potential Incoming (AUD)']?.number || 0,
      revenueActual: props['Revenue Actual (AUD)']?.number || 0
    };
  });
}

function isActiveStatus(status) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes('active') ||
    normalized.includes('progress') ||
    normalized.includes('delivery') ||
    normalized.includes('🔥')
  );
}

async function analyzeCompleteness() {
  console.log('\n🔍 Analyzing Infrastructure Data Completeness...\n');

  const projects = await getProjects();

  // Group by status
  const active = projects.filter(p => isActiveStatus(p.status));
  const other = projects.filter(p => !isActiveStatus(p.status));

  // Data completeness metrics
  const hasProjectType = projects.filter(p => p.projectType).length;
  const hasCommunityLabor = projects.filter(p => p.hasCommunitylabor).length;
  const hasStorytelling = projects.filter(p => p.hasStorytelling).length;
  const hasGrantDependency = projects.filter(p => p.hasGrantDependency).length;
  const hasFullData = projects.filter(p =>
    p.projectType && p.hasCommunitylabor && p.hasStorytelling && p.hasGrantDependency
  ).length;

  console.log('📊 Overall Statistics');
  console.log('─'.repeat(60));
  console.log(`Total Projects: ${projects.length}`);
  console.log(`Active Projects: ${active.length}`);
  console.log(`Other Projects: ${other.length}\n`);

  console.log('📋 Data Completeness');
  console.log('─'.repeat(60));
  console.log(`Has Project Type: ${hasProjectType}/${projects.length} (${Math.round(hasProjectType/projects.length*100)}%)`);
  console.log(`Has Community Labor Metrics: ${hasCommunityLabor}/${projects.length} (${Math.round(hasCommunityLabor/projects.length*100)}%)`);
  console.log(`Has Storytelling Metrics: ${hasStorytelling}/${projects.length} (${Math.round(hasStorytelling/projects.length*100)}%)`);
  console.log(`Has Grant Dependency Metrics: ${hasGrantDependency}/${projects.length} (${Math.round(hasGrantDependency/projects.length*100)}%)`);
  console.log(`Has FULL Infrastructure Data: ${hasFullData}/${projects.length} (${Math.round(hasFullData/projects.length*100)}%)\n`);

  // Tier breakdown
  console.log('🎯 Recommended Prioritization (3-Tier Approach)');
  console.log('─'.repeat(60));

  // Tier 1: Active + has some funding/activity
  const tier1 = active.filter(p =>
    (p.actualIncoming > 0 || p.potentialIncoming > 0 || p.revenueActual > 0)
  );
  console.log(`\n🟢 TIER 1 (Active + Funded): ${tier1.length} projects`);
  console.log('   Priority: Full infrastructure tracking');
  console.log('   Projects with full data: ' + tier1.filter(p =>
    p.projectType && p.hasCommunitylabor && p.hasStorytelling && p.hasGrantDependency
  ).length);

  if (tier1.length > 0) {
    console.log('   \n   Top candidates:');
    tier1
      .slice(0, 10)
      .forEach(p => {
        const hasData = p.hasCommunitylabor && p.hasStorytelling && p.hasGrantDependency;
        const status = hasData ? '✅' : '⚪';
        console.log(`   ${status} ${p.name}`);
      });
  }

  // Tier 2: Active but early stage OR Other with funding
  const tier2 = [
    ...active.filter(p => !tier1.includes(p)),
    ...other.filter(p => p.actualIncoming > 0 || p.potentialIncoming > 0)
  ];
  console.log(`\n🟡 TIER 2 (In Motion): ${tier2.length} projects`);
  console.log('   Priority: Basic tracking + flag gaps');
  console.log('   Projects with some data: ' + tier2.filter(p =>
    p.hasCommunitylabor || p.hasStorytelling || p.hasGrantDependency
  ).length);

  // Tier 3: Everything else
  const tier3 = projects.filter(p => !tier1.includes(p) && !tier2.includes(p));
  console.log(`\n⚪ TIER 3 (Concept/Early Stage): ${tier3.length} projects`);
  console.log('   Priority: Project type only, mark "To be tracked"');
  console.log('   Projects with project type: ' + tier3.filter(p => p.projectType).length);

  // Missing data report
  console.log('\n\n❌ Projects Missing Critical Data');
  console.log('─'.repeat(60));

  const missingType = active.filter(p => !p.projectType);
  if (missingType.length > 0) {
    console.log(`\nActive projects missing Project Type (${missingType.length}):`);
    missingType.forEach(p => console.log(`   • ${p.name}`));
  }

  const missingAllMetrics = tier1.filter(p => !p.hasCommunitylabor && !p.hasStorytelling && !p.hasGrantDependency);
  if (missingAllMetrics.length > 0) {
    console.log(`\nTier 1 projects with NO infrastructure metrics (${missingAllMetrics.length}):`);
    missingAllMetrics.forEach(p => console.log(`   • ${p.name}`));
  }

  // Wins to celebrate
  console.log('\n\n✨ Projects with Full Infrastructure Tracking');
  console.log('─'.repeat(60));
  const complete = projects.filter(p =>
    p.projectType && p.hasCommunitylabor && p.hasStorytelling && p.hasGrantDependency
  );
  if (complete.length > 0) {
    complete.forEach(p => {
      console.log(`   ✅ ${p.name}`);
      console.log(`      Type: ${p.projectType}`);
    });
  } else {
    console.log('   None yet - let\'s change that!');
  }

  // Recommendations
  console.log('\n\n💡 Next Steps');
  console.log('─'.repeat(60));
  console.log('1. Run classify-projects-interactive.mjs to set Project Type for all projects');
  console.log(`2. Focus on ${tier1.length} Tier 1 projects for full data collection`);
  console.log('3. Use the project lead template to gather data async');
  console.log('4. Schedule community validation sessions for top 5 projects');
  console.log('\nSee INFRASTRUCTURE_DATA_COLLECTION_PROCESS.md for full plan\n');
}

// Run
analyzeCompleteness().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
