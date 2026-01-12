#!/usr/bin/env node
/**
 * Setup Xero Learning Curriculum in Notion
 *
 * Creates 6 databases for the January 2026 Xero Mastery Sprint:
 * 1. Xero Learning Curriculum - Weekly curriculum tracking
 * 2. Learning Resources - Curated Xero guides and articles
 * 3. Practice Exercises - Daily hands-on exercises with ACT data
 * 4. Weekly Projects - 4 major projects (one per week)
 * 5. Xero Features Master List - Complete feature inventory
 * 6. Financial Infrastructure Checklist - Trust, cards, tax optimization
 *
 * Usage:
 *   node scripts/setup-xero-learning-curriculum.js
 */

import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Parent page ID for all learning databases (use your workspace root or create a dedicated page)
const PARENT_PAGE_ID = process.env.NOTION_XERO_LEARNING_PAGE_ID || '2d9ebcf9-81cf-812a-9dbd-fb5dcd1d48e9';

console.log('🚀 Starting Xero Learning Curriculum Setup...\n');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Parent Page: ${PARENT_PAGE_ID}\n`);

/**
 * Create a new database in Notion
 */
async function createDatabase(title, icon, properties, parentPageId) {
  try {
    console.log(`Creating database: ${title}...`);

    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId,
      },
      icon: {
        type: 'emoji',
        emoji: icon,
      },
      title: [
        {
          type: 'text',
          text: {
            content: title,
          },
        },
      ],
      properties,
    });

    console.log(`✅ Created: ${title} (ID: ${database.id})\n`);
    return database;
  } catch (error) {
    console.error(`❌ Failed to create ${title}:`, error.message);
    throw error;
  }
}

/**
 * Add pages to a database
 */
async function addPages(databaseId, pages) {
  console.log(`Adding ${pages.length} pages to database...`);

  const results = {
    success: 0,
    failed: 0,
  };

  for (const page of pages) {
    try {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: page.properties,
        children: page.children || [],
      });
      results.success++;
    } catch (error) {
      console.error(`  ❌ Failed to add page: ${error.message}`);
      results.failed++;
    }
  }

  console.log(`  ✅ Added ${results.success} pages successfully`);
  if (results.failed > 0) {
    console.log(`  ⚠️  ${results.failed} pages failed\n`);
  }

  return results;
}

/**
 * Database 1: Xero Learning Curriculum
 */
async function createXeroLearningCurriculum(parentPageId) {
  const properties = {
    'Name': { title: {} },
    'Week': {
      select: {
        options: [
          { name: 'Week 1', color: 'blue' },
          { name: 'Week 2', color: 'green' },
          { name: 'Week 3', color: 'orange' },
          { name: 'Week 4', color: 'purple' },
        ],
      },
    },
    'Topic': { rich_text: {} },
    'Status': {
      select: {
        options: [
          { name: 'Not Started', color: 'gray' },
          { name: 'In Progress', color: 'yellow' },
          { name: 'Completed', color: 'green' },
          { name: 'Blocked', color: 'red' },
        ],
      },
    },
    'Difficulty': {
      select: {
        options: [
          { name: 'Beginner', color: 'green' },
          { name: 'Intermediate', color: 'yellow' },
          { name: 'Advanced', color: 'red' },
        ],
      },
    },
    'Completion %': { number: { format: 'percent' } },
    'Notes': { rich_text: {} },
  };

  const database = await createDatabase(
    'Xero Learning Curriculum',
    '📚',
    properties,
    parentPageId
  );

  // Add 4 weeks of curriculum
  const weeks = [
    {
      properties: {
        'Name': { title: [{ text: { content: 'Week 1: Bank Reconciliation & Categorization Mastery' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Topic': { rich_text: [{ text: { content: 'Master daily transaction workflow and build muscle memory for accurate bookkeeping' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Difficulty': { select: { name: 'Beginner' } },
        'Completion %': { number: 0 },
      },
    },
    {
      properties: {
        'Name': { title: [{ text: { content: 'Week 2: Projects & Profitability - R&D Cost Tracking' } }] },
        'Week': { select: { name: 'Week 2' } },
        'Topic': { rich_text: [{ text: { content: 'Set up project tracking for R&D tax credit maximization' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Difficulty': { select: { name: 'Intermediate' } },
        'Completion %': { number: 0 },
      },
    },
    {
      properties: {
        'Name': { title: [{ text: { content: 'Week 3: Tax Optimization - BAS, GST, and Entity Structuring' } }] },
        'Week': { select: { name: 'Week 3' } },
        'Topic': { rich_text: [{ text: { content: 'Maximize tax efficiency through Xero\'s native tax features' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Difficulty': { select: { name: 'Advanced' } },
        'Completion %': { number: 0 },
      },
    },
    {
      properties: {
        'Name': { title: [{ text: { content: 'Week 4: Premium Credit Cards & Points Optimization' } }] },
        'Week': { select: { name: 'Week 4' } },
        'Topic': { rich_text: [{ text: { content: 'Set up world-class credit card infrastructure for maximum Qantas points' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Difficulty': { select: { name: 'Intermediate' } },
        'Completion %': { number: 0 },
      },
    },
  ];

  await addPages(database.id, weeks);
  return database;
}

/**
 * Database 2: Learning Resources
 */
async function createLearningResources(parentPageId) {
  const properties = {
    'Title': { title: {} },
    'Type': {
      select: {
        options: [
          { name: 'Xero Help Article', color: 'blue' },
          { name: 'Video Tutorial', color: 'green' },
          { name: 'Documentation', color: 'gray' },
          { name: 'Best Practice Guide', color: 'orange' },
          { name: 'API Reference', color: 'purple' },
        ],
      },
    },
    'Duration': { rich_text: {} },
    'URL': { url: {} },
    'Tags': { multi_select: {} },
    'Week': {
      select: {
        options: [
          { name: 'Week 1', color: 'blue' },
          { name: 'Week 2', color: 'green' },
          { name: 'Week 3', color: 'orange' },
          { name: 'Week 4', color: 'purple' },
          { name: 'General', color: 'gray' },
        ],
      },
    },
    'Priority': {
      select: {
        options: [
          { name: 'Must Read', color: 'red' },
          { name: 'Recommended', color: 'yellow' },
          { name: 'Optional', color: 'gray' },
        ],
      },
    },
  };

  const database = await createDatabase(
    'Learning Resources',
    '📖',
    properties,
    parentPageId
  );

  // Add curated resources
  const resources = [
    {
      properties: {
        'Title': { title: [{ text: { content: 'Bank Reconciliation Overview' } }] },
        'Type': { select: { name: 'Xero Help Article' } },
        'Duration': { rich_text: [{ text: { content: '15 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Bank-reconciliation-overview' },
        'Week': { select: { name: 'Week 1' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Create and Use Bank Rules' } }] },
        'Type': { select: { name: 'Xero Help Article' } },
        'Duration': { rich_text: [{ text: { content: '20 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Create-and-use-bank-rules' },
        'Week': { select: { name: 'Week 1' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Xero Projects Overview' } }] },
        'Type': { select: { name: 'Documentation' } },
        'Duration': { rich_text: [{ text: { content: '25 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Xero-Projects-overview' },
        'Week': { select: { name: 'Week 2' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Tracking Categories Setup' } }] },
        'Type': { select: { name: 'Xero Help Article' } },
        'Duration': { rich_text: [{ text: { content: '15 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Set-up-and-use-tracking-categories' },
        'Week': { select: { name: 'Week 2' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'BAS and GST in Xero' } }] },
        'Type': { select: { name: 'Best Practice Guide' } },
        'Duration': { rich_text: [{ text: { content: '30 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Prepare-and-lodge-BAS' },
        'Week': { select: { name: 'Week 3' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Multi-Organization Management' } }] },
        'Type': { select: { name: 'Documentation' } },
        'Duration': { rich_text: [{ text: { content: '20 min read' } }] },
        'URL': { url: 'https://central.xero.com/s/article/Manage-multiple-organisations' },
        'Week': { select: { name: 'Week 3' } },
        'Priority': { select: { name: 'Must Read' } },
      },
    },
  ];

  await addPages(database.id, resources);
  return database;
}

/**
 * Database 3: Practice Exercises
 */
async function createPracticeExercises(parentPageId) {
  const properties = {
    'Title': { title: {} },
    'Week': {
      select: {
        options: [
          { name: 'Week 1', color: 'blue' },
          { name: 'Week 2', color: 'green' },
          { name: 'Week 3', color: 'orange' },
          { name: 'Week 4', color: 'purple' },
        ],
      },
    },
    'Day': {
      select: {
        options: [
          { name: 'Monday', color: 'gray' },
          { name: 'Tuesday', color: 'gray' },
          { name: 'Wednesday', color: 'gray' },
          { name: 'Thursday', color: 'gray' },
          { name: 'Friday', color: 'gray' },
        ],
      },
    },
    'Difficulty': {
      select: {
        options: [
          { name: 'Beginner', color: 'green' },
          { name: 'Intermediate', color: 'yellow' },
          { name: 'Advanced', color: 'red' },
        ],
      },
    },
    'Time Estimate': { rich_text: {} },
    'Status': {
      select: {
        options: [
          { name: 'Not Started', color: 'gray' },
          { name: 'In Progress', color: 'yellow' },
          { name: 'Completed', color: 'green' },
        ],
      },
    },
    'Learnings': { rich_text: {} },
    'Questions': { rich_text: {} },
  };

  const database = await createDatabase(
    'Practice Exercises',
    '💪',
    properties,
    parentPageId
  );

  // Add Week 1 exercises
  const exercises = [
    {
      properties: {
        'Title': { title: [{ text: { content: 'Reconcile 30 NAB Visa Transactions' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Day': { select: { name: 'Monday' } },
        'Difficulty': { select: { name: 'Beginner' } },
        'Time Estimate': { rich_text: [{ text: { content: '45 minutes' } }] },
        'Status': { select: { name: 'Not Started' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Create 5 Bank Rules for Top Vendors' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Day': { select: { name: 'Tuesday' } },
        'Difficulty': { select: { name: 'Beginner' } },
        'Time Estimate': { rich_text: [{ text: { content: '30 minutes' } }] },
        'Status': { select: { name: 'Not Started' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Set Up R&D Tracking Categories' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Day': { select: { name: 'Wednesday' } },
        'Difficulty': { select: { name: 'Intermediate' } },
        'Time Estimate': { rich_text: [{ text: { content: '40 minutes' } }] },
        'Status': { select: { name: 'Not Started' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Review Cash Flow Report' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Day': { select: { name: 'Thursday' } },
        'Difficulty': { select: { name: 'Beginner' } },
        'Time Estimate': { rich_text: [{ text: { content: '30 minutes' } }] },
        'Status': { select: { name: 'Not Started' } },
      },
    },
    {
      properties: {
        'Title': { title: [{ text: { content: 'Analyze Auto-Categorization Accuracy' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Day': { select: { name: 'Friday' } },
        'Difficulty': { select: { name: 'Intermediate' } },
        'Time Estimate': { rich_text: [{ text: { content: '45 minutes' } }] },
        'Status': { select: { name: 'Not Started' } },
      },
    },
  ];

  await addPages(database.id, exercises);
  return database;
}

/**
 * Database 4: Weekly Projects
 */
async function createWeeklyProjects(parentPageId) {
  const properties = {
    'Project Name': { title: {} },
    'Week': {
      select: {
        options: [
          { name: 'Week 1', color: 'blue' },
          { name: 'Week 2', color: 'green' },
          { name: 'Week 3', color: 'orange' },
          { name: 'Week 4', color: 'purple' },
        ],
      },
    },
    'Description': { rich_text: {} },
    'Deliverables': { rich_text: {} },
    'Status': {
      select: {
        options: [
          { name: 'Not Started', color: 'gray' },
          { name: 'In Progress', color: 'yellow' },
          { name: 'Review', color: 'orange' },
          { name: 'Completed', color: 'green' },
        ],
      },
    },
    'Success Criteria': { rich_text: {} },
    'Completion Date': { date: {} },
  };

  const database = await createDatabase(
    'Weekly Projects',
    '🎯',
    properties,
    parentPageId
  );

  // Add 4 weekly projects
  const projects = [
    {
      properties: {
        'Project Name': { title: [{ text: { content: 'Smart Categorization Assistant' } }] },
        'Week': { select: { name: 'Week 1' } },
        'Description': { rich_text: [{ text: { content: 'Build auto-categorization system for 6,677 Xero transactions' } }] },
        'Deliverables': { rich_text: [{ text: { content: '80%+ auto-categorization rate, 20+ bank rules created' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Success Criteria': { rich_text: [{ text: { content: 'Zero transactions older than 7 days unreconciled' } }] },
      },
    },
    {
      properties: {
        'Project Name': { title: [{ text: { content: 'R&D Tax Credit Maximization System' } }] },
        'Week': { select: { name: 'Week 2' } },
        'Description': { rich_text: [{ text: { content: 'Map 10 Notion projects to Xero for R&D expense tracking' } }] },
        'Deliverables': { rich_text: [{ text: { content: 'Comprehensive R&D expense report ready for AusIndustry claim' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Success Criteria': { rich_text: [{ text: { content: 'All 10 Notion projects mapped to Xero tracking' } }] },
      },
    },
    {
      properties: {
        'Project Name': { title: [{ text: { content: 'Family Trust Setup & Multi-Entity Management' } }] },
        'Week': { select: { name: 'Week 3' } },
        'Description': { rich_text: [{ text: { content: 'Establish family trust structure and configure Xero multi-org' } }] },
        'Deliverables': { rich_text: [{ text: { content: 'Trust structure established, Xero configured for multi-entity tracking' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Success Criteria': { rich_text: [{ text: { content: 'BAS prepared for Q2 FY2025, multi-entity reporting working' } }] },
      },
    },
    {
      properties: {
        'Project Name': { title: [{ text: { content: 'Premium Card Strategy Implementation' } }] },
        'Week': { select: { name: 'Week 4' } },
        'Description': { rich_text: [{ text: { content: 'Apply for 3 premium cards and configure Xero bank feeds' } }] },
        'Deliverables': { rich_text: [{ text: { content: '3-card setup optimized for points, fees, and benefits' } }] },
        'Status': { select: { name: 'Not Started' } },
        'Success Criteria': { rich_text: [{ text: { content: '1.2M+ annual points earning projected' } }] },
      },
    },
  ];

  await addPages(database.id, projects);
  return database;
}

/**
 * Database 5: Xero Features Master List
 */
async function createXeroFeaturesMasterList(parentPageId) {
  const properties = {
    'Feature Name': { title: {} },
    'Category': {
      select: {
        options: [
          { name: 'Bank Reconciliation', color: 'blue' },
          { name: 'Invoicing', color: 'green' },
          { name: 'Projects', color: 'orange' },
          { name: 'Reporting', color: 'purple' },
          { name: 'Tax & Compliance', color: 'red' },
          { name: 'Payroll', color: 'yellow' },
          { name: 'Integrations', color: 'gray' },
        ],
      },
    },
    'Mastery Level': {
      select: {
        options: [
          { name: 'Never Used', color: 'gray' },
          { name: 'Aware', color: 'yellow' },
          { name: 'Basic', color: 'blue' },
          { name: 'Proficient', color: 'green' },
          { name: 'Expert', color: 'purple' },
        ],
      },
    },
    'Last Used': { date: {} },
    'Notes': { rich_text: {} },
    'Priority': {
      select: {
        options: [
          { name: 'High', color: 'red' },
          { name: 'Medium', color: 'yellow' },
          { name: 'Low', color: 'gray' },
        ],
      },
    },
  };

  const database = await createDatabase(
    'Xero Features Master List',
    '⚙️',
    properties,
    parentPageId
  );

  // Add key features
  const features = [
    {
      properties: {
        'Feature Name': { title: [{ text: { content: 'Bank Feeds' } }] },
        'Category': { select: { name: 'Bank Reconciliation' } },
        'Mastery Level': { select: { name: 'Never Used' } },
        'Priority': { select: { name: 'High' } },
      },
    },
    {
      properties: {
        'Feature Name': { title: [{ text: { content: 'Bank Rules' } }] },
        'Category': { select: { name: 'Bank Reconciliation' } },
        'Mastery Level': { select: { name: 'Never Used' } },
        'Priority': { select: { name: 'High' } },
      },
    },
    {
      properties: {
        'Feature Name': { title: [{ text: { content: 'Tracking Categories' } }] },
        'Category': { select: { name: 'Reporting' } },
        'Mastery Level': { select: { name: 'Never Used' } },
        'Priority': { select: { name: 'High' } },
      },
    },
    {
      properties: {
        'Feature Name': { title: [{ text: { content: 'Xero Projects' } }] },
        'Category': { select: { name: 'Projects' } },
        'Mastery Level': { select: { name: 'Never Used' } },
        'Priority': { select: { name: 'High' } },
      },
    },
    {
      properties: {
        'Feature Name': { title: [{ text: { content: 'BAS Module' } }] },
        'Category': { select: { name: 'Tax & Compliance' } },
        'Mastery Level': { select: { name: 'Never Used' } },
        'Priority': { select: { name: 'High' } },
      },
    },
  ];

  await addPages(database.id, features);
  return database;
}

/**
 * Database 6: Financial Infrastructure Checklist
 */
async function createFinancialInfrastructureChecklist(parentPageId) {
  const properties = {
    'Item': { title: {} },
    'Category': {
      select: {
        options: [
          { name: 'Trust Setup', color: 'blue' },
          { name: 'Credit Cards', color: 'green' },
          { name: 'Tax Optimization', color: 'orange' },
          { name: 'Xero Configuration', color: 'purple' },
          { name: 'Integrations', color: 'gray' },
        ],
      },
    },
    'Status': {
      select: {
        options: [
          { name: 'Not Started', color: 'gray' },
          { name: 'In Progress', color: 'yellow' },
          { name: 'Completed', color: 'green' },
          { name: 'Blocked', color: 'red' },
        ],
      },
    },
    'Priority': {
      select: {
        options: [
          { name: 'Critical', color: 'red' },
          { name: 'High', color: 'orange' },
          { name: 'Medium', color: 'yellow' },
          { name: 'Low', color: 'gray' },
        ],
      },
    },
    'Due Date': { date: {} },
    'Cost': { rich_text: {} },
    'Notes': { rich_text: {} },
  };

  const database = await createDatabase(
    'Financial Infrastructure Checklist',
    '✅',
    properties,
    parentPageId
  );

  // Add infrastructure items
  const items = [
    {
      properties: {
        'Item': { title: [{ text: { content: 'Apply for Amex Business Platinum' } }] },
        'Category': { select: { name: 'Credit Cards' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'High' } },
        'Cost': { rich_text: [{ text: { content: '$1,450/year' } }] },
      },
    },
    {
      properties: {
        'Item': { title: [{ text: { content: 'Apply for Qantas Business Rewards Card' } }] },
        'Category': { select: { name: 'Credit Cards' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'High' } },
        'Cost': { rich_text: [{ text: { content: '$700/year' } }] },
      },
    },
    {
      properties: {
        'Item': { title: [{ text: { content: 'Engage accountant for family trust setup' } }] },
        'Category': { select: { name: 'Trust Setup' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'Critical' } },
        'Cost': { rich_text: [{ text: { content: '$3,500 one-time' } }] },
      },
    },
    {
      properties: {
        'Item': { title: [{ text: { content: 'Purchase Xero Projects add-on' } }] },
        'Category': { select: { name: 'Xero Configuration' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'High' } },
        'Cost': { rich_text: [{ text: { content: '$78/month' } }] },
      },
    },
    {
      properties: {
        'Item': { title: [{ text: { content: 'Set up Hubdoc for receipt capture' } }] },
        'Category': { select: { name: 'Integrations' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'Medium' } },
        'Cost': { rich_text: [{ text: { content: 'Free with Xero' } }] },
      },
    },
    {
      properties: {
        'Item': { title: [{ text: { content: 'Create R&D expense accounts in Xero' } }] },
        'Category': { select: { name: 'Xero Configuration' } },
        'Status': { select: { name: 'Not Started' } },
        'Priority': { select: { name: 'High' } },
        'Cost': { rich_text: [{ text: { content: 'Free' } }] },
      },
    },
  ];

  await addPages(database.id, items);
  return database;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Create a child page under the parent for Xero Learning
    let parentPageId = PARENT_PAGE_ID;

    console.log('Creating Xero Learning page...\n');

    const xeroLearningPage = await notion.pages.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID,
      },
      icon: {
        type: 'emoji',
        emoji: '🎓',
      },
      properties: {
        title: [
          {
            text: {
              content: 'Xero Mastery - January 2026 Sprint',
            },
          },
        ],
      },
    });

    parentPageId = xeroLearningPage.id;
    console.log(`✅ Created Xero Learning page: ${parentPageId}\n`);
    console.log(`⚠️  Save this ID to your .env as NOTION_XERO_LEARNING_PAGE_ID\n`);

    console.log('📊 CREATING DATABASES');
    console.log('═══════════════════════════════════════\n');

    // Create all 6 databases
    const curriculum = await createXeroLearningCurriculum(parentPageId);
    const resources = await createLearningResources(parentPageId);
    const exercises = await createPracticeExercises(parentPageId);
    const projects = await createWeeklyProjects(parentPageId);
    const features = await createXeroFeaturesMasterList(parentPageId);
    const checklist = await createFinancialInfrastructureChecklist(parentPageId);

    // Summary
    console.log('\n📋 SETUP SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Xero Learning Curriculum: ${curriculum.id}`);
    console.log(`✅ Learning Resources: ${resources.id}`);
    console.log(`✅ Practice Exercises: ${exercises.id}`);
    console.log(`✅ Weekly Projects: ${projects.id}`);
    console.log(`✅ Xero Features Master List: ${features.id}`);
    console.log(`✅ Financial Infrastructure Checklist: ${checklist.id}`);

    console.log('\n\n💡 NEXT STEPS');
    console.log('═══════════════════════════════════════');
    console.log('1. Add database IDs to your .env file');
    console.log('2. Open Notion and navigate to your new databases');
    console.log('3. Start Week 1 exercises on Monday, January 6, 2026');
    console.log('4. Track daily progress in Practice Exercises database');
    console.log('5. Complete Week 1 Project by Friday, January 10, 2026\n');

    console.log('✨ Setup complete! Your Xero Mastery curriculum is ready.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run setup
main();
