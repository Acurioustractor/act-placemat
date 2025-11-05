#!/usr/bin/env node

/**
 * Populate Goods Project with Infrastructure Metrics
 *
 * Goods is building essential household items with community production!
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@notionhq/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../../../.env');
config({ path: envPath });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DATABASE_ID = '177ebcf981cf80dd9514f1ec32f3314c';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('🚀 Populating Goods Project with Infrastructure Data');
console.log('');

// Goods infrastructure data - community manufacturing!
const GOODS_DATA = {
  projectType: 'Mixed', // Both infrastructure building AND production
  communityLaborMetrics: {
    youngPeople: {
      count: 18,
      hoursContributed: 420
    },
    communityMembers: {
      count: 35,
      hoursContributed: 890
    },
    livedExperience: {
      count: 8,
      hoursContributed: 160,
      description: 'Community members with lived experience in overcrowding, health challenges'
    },
    unskilledLabor: {
      count: 28,
      hoursContributed: 640
    },
    skilledLabor: {
      count: 7,
      hoursContributed: 120
    },
    skillsTransferred: [
      { skill: 'Product assembly', peopleTrained: 35, certificationsEarned: 0 },
      { skill: 'Quality control', peopleTrained: 18, certificationsEarned: 12 },
      { skill: 'Inventory management', peopleTrained: 12, certificationsEarned: 8 },
      { skill: 'Community production coordination', peopleTrained: 7, certificationsEarned: 5 }
    ],
    contractorEquivalentCost: 95000,
    actualCost: 31000,
    communityValueCreated: 64000,
    employabilityOutcomes: '12 community members gained employment in local manufacturing, 5 started own micro-enterprises',
    physicalAssets: [
      { type: 'Household items produced', quantity: 850, unit: 'items' },
      { type: 'Families served', quantity: 180, unit: 'households' }
    ]
  },
  storytellingMetrics: {
    activeStorytellers: 8,
    potentialStorytellers: 45,
    storiesCaptured: 23,
    storyOpportunities: 180,
    trainingGap: 37,
    captureRate: 0.128,
    averageStoryReach: 8500,
    totalCurrentReach: 68000,
    potentialReach: 382500,
    storytellersInTraining: 5,
    storiesInProduction: 7
  },
  grantDependencyMetrics: {
    grantFunding: 89000,
    marketRevenue: 67000,
    totalRevenue: 156000,
    grantDependencyPercentage: 57.1,
    historicalData: [
      { year: 2023, grantPercentage: 85.0, marketPercentage: 15.0 },
      { year: 2024, grantPercentage: 70.0, marketPercentage: 30.0 },
      { year: 2025, grantPercentage: 57.1, marketPercentage: 42.9 }
    ],
    targetGrantIndependenceDate: '2026-12-31',
    targetGrantPercentage: 25,
    socialImpactPerGrantDollar: 4.1,
    socialImpactPerMarketDollar: 5.7
  }
};

async function populateGoods() {
  try {
    console.log('🔍 Searching for Goods project...');

    const response = await notion.databases.query({
      database_id: PROJECTS_DATABASE_ID
    });

    const goods = response.results.find(page => {
      const titleProp = page.properties.Name || page.properties.name || page.properties.title;
      const projectName = titleProp?.title?.[0]?.plain_text || '';
      return projectName.toLowerCase().includes('goods');
    });

    if (!goods) {
      console.log('❌ Goods project not found');
      return;
    }

    const titleProp = goods.properties.Name || goods.properties.name || goods.properties.title;
    const projectName = titleProp?.title?.[0]?.plain_text || 'Goods';

    console.log(`✅ Found: ${projectName} (${goods.id})`);
    console.log('');
    console.log('🔧 Updating with infrastructure metrics...');

    const properties = {
      'Project Type': {
        select: {
          name: GOODS_DATA.projectType
        }
      },
      'Community Labor Metrics': {
        rich_text: [{
          text: {
            content: JSON.stringify(GOODS_DATA.communityLaborMetrics, null, 2)
          }
        }]
      },
      'Storytelling Metrics': {
        rich_text: [{
          text: {
            content: JSON.stringify(GOODS_DATA.storytellingMetrics, null, 2)
          }
        }]
      },
      'Grant Dependency Metrics': {
        rich_text: [{
          text: {
            content: JSON.stringify(GOODS_DATA.grantDependencyMetrics, null, 2)
          }
        }]
      }
    };

    await notion.pages.update({
      page_id: goods.id,
      properties
    });

    console.log(`✅ Updated: ${projectName}`);
    console.log(`   - Project Type: ${GOODS_DATA.projectType}`);
    console.log(`   - Community Value: $${(GOODS_DATA.communityLaborMetrics.communityValueCreated / 1000).toFixed(0)}k`);
    console.log(`   - Young People: ${GOODS_DATA.communityLaborMetrics.youngPeople.count}`);
    console.log(`   - Storytellers: ${GOODS_DATA.storytellingMetrics.activeStorytellers}`);
    console.log(`   - Story Reach: ${(GOODS_DATA.storytellingMetrics.totalCurrentReach / 1000).toFixed(0)}k`);
    console.log(`   - Grant Dependency: ${GOODS_DATA.grantDependencyMetrics.grantDependencyPercentage}%`);
    console.log(`   - Employment Outcomes: ${GOODS_DATA.communityLaborMetrics.employabilityOutcomes}`);
    console.log('');
    console.log('✅ SUCCESS! Goods project now has full infrastructure tracking');
    console.log('');
    console.log('📋 Next: Refresh frontend to see the metrics!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateGoods();
