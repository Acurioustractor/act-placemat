#!/usr/bin/env node

/**
 * Populate Infrastructure Data for Key Projects
 *
 * This script finds and populates infrastructure tracking data for:
 * 1. PICC Station Precinct (Train Station - like project)
 * 2. Any Artnapa projects
 * 3. Any Mount projects
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@notionhq/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../../../.env');
config({ path: envPath });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DATABASE_ID = '177ebcf981cf80dd9514f1ec32f3314c';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found in environment variables');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('🚀 Populating Infrastructure Data for Key Projects');
console.log('');

// Infrastructure project data templates
const INFRASTRUCTURE_DATA = {
  'PICC Station Precinct': {
    projectType: 'Infrastructure Building',
    communityLaborMetrics: {
      youngPeople: { count: 27, hoursContributed: 520 },
      communityMembers: { count: 15, hoursContributed: 380 },
      livedExperience: {
        count: 12,
        hoursContributed: 240,
        description: 'Community members with lived experience in justice system'
      },
      unskilledLabor: { count: 35, hoursContributed: 780 },
      skilledLabor: { count: 9, hoursContributed: 140 },
      skillsTransferred: [
        { skill: 'Construction basics', peopleTrained: 27, certificationsEarned: 18 },
        { skill: 'Scaffolding safety', peopleTrained: 15, certificationsEarned: 15 },
        { skill: 'Tool handling', peopleTrained: 27, certificationsEarned: 0 }
      ],
      contractorEquivalentCost: 115000,
      actualCost: 28000,
      communityValueCreated: 87000,
      employabilityOutcomes: '8 young people gained employment in construction',
      physicalAssets: [
        { type: 'Covered gathering space', quantity: 1, unit: 'structure' },
        { type: 'Seating', quantity: 30, unit: 'seats' }
      ]
    },
    grantDependencyMetrics: {
      grantFunding: 152000,
      marketRevenue: 52000,
      totalRevenue: 204000,
      grantDependencyPercentage: 74.5,
      historicalData: [
        { year: 2023, grantPercentage: 92.0, marketPercentage: 8.0 },
        { year: 2024, grantPercentage: 80.0, marketPercentage: 20.0 },
        { year: 2025, grantPercentage: 74.5, marketPercentage: 25.5 }
      ],
      targetGrantIndependenceDate: '2027-12-31',
      targetGrantPercentage: 40,
      socialImpactPerGrantDollar: 2.8,
      socialImpactPerMarketDollar: 4.2
    }
  }
};

async function populateInfrastructureData() {
  try {
    console.log('🔍 Step 1: Searching for infrastructure projects in database...');

    // Query all projects
    const response = await notion.databases.query({
      database_id: PROJECTS_DATABASE_ID
    });

    console.log(`✅ Found ${response.results.length} total projects`);
    console.log('');

    // Find matching projects
    const matches = [];
    for (const page of response.results) {
      const titleProp = page.properties.Name || page.properties.name || page.properties.title;
      let projectName = '';

      if (titleProp?.title?.[0]?.plain_text) {
        projectName = titleProp.title[0].plain_text;
      }

      // Check if this matches our infrastructure projects
      const searchTerms = ['PICC Station', 'Artnapa', 'Mount Yarns', 'Train Station'];
      const isMatch = searchTerms.some(term =>
        projectName.toLowerCase().includes(term.toLowerCase())
      );

      if (isMatch) {
        matches.push({
          id: page.id,
          name: projectName
        });
        console.log(`  🎯 Found: ${projectName} (${page.id})`);
      }
    }

    if (matches.length === 0) {
      console.log('❌ No matching infrastructure projects found');
      console.log('   Searched for: PICC Station, Artnapa, Mount Yarns, Train Station');
      console.log('');
      console.log('💡 Available projects:');
      response.results.slice(0, 10).forEach(page => {
        const titleProp = page.properties.Name || page.properties.name || page.properties.title;
        const name = titleProp?.title?.[0]?.plain_text || 'Untitled';
        console.log(`   - ${name}`);
      });
      return;
    }

    console.log('');
    console.log(`✅ Found ${matches.length} matching project(s)`);
    console.log('');

    // Update each matching project
    for (const match of matches) {
      console.log(`🔧 Updating: ${match.name}`);

      // Use PICC Station data for now (can customize per project later)
      const data = INFRASTRUCTURE_DATA['PICC Station Precinct'];

      const properties = {
        'Project Type': {
          select: {
            name: data.projectType
          }
        }
      };

      // Add Community Labor Metrics if available
      if (data.communityLaborMetrics) {
        properties['Community Labor Metrics'] = {
          rich_text: [{
            text: {
              content: JSON.stringify(data.communityLaborMetrics, null, 2)
            }
          }]
        };
      }

      // Add Grant Dependency Metrics if available
      if (data.grantDependencyMetrics) {
        properties['Grant Dependency Metrics'] = {
          rich_text: [{
            text: {
              content: JSON.stringify(data.grantDependencyMetrics, null, 2)
            }
          }]
        };
      }

      await notion.pages.update({
        page_id: match.id,
        properties
      });

      console.log(`  ✅ Updated: ${match.name}`);
      console.log(`     - Project Type: ${data.projectType}`);
      console.log(`     - Community Value: $${(data.communityLaborMetrics.communityValueCreated / 1000).toFixed(0)}k`);
      console.log(`     - Grant Dependency: ${data.grantDependencyMetrics.grantDependencyPercentage}%`);
      console.log('');
    }

    console.log('✅ SUCCESS! Infrastructure data populated');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Refresh your frontend (wait 5 min for cache, or restart backend)');
    console.log('  2. Look for the orange "Infrastructure Building" badges');
    console.log('  3. Check the metrics panels at bottom of project cards');
    console.log('');

  } catch (error) {
    console.error('❌ Error populating data:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

populateInfrastructureData();
