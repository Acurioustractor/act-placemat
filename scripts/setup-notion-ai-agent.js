#!/usr/bin/env node

/**
 * Notion AI Business Agent Setup Script
 * Creates all required databases in your Notion workspace
 * Run this after creating your Notion integration
 */

import { Client } from '@notion/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_INTEGRATION_TOKEN,
});

// Database schemas
const DATABASE_SCHEMAS = {
  ideas: {
    title: 'AI Agent - Ideas & Captures',
    properties: {
      Title: { title: {} },
      Content: { rich_text: {} },
      Type: {
        select: {
          options: [
            { name: 'Voice Note', color: 'blue' },
            { name: 'Text Input', color: 'green' },
            { name: 'Email Forward', color: 'orange' },
            { name: 'Meeting Note', color: 'purple' }
          ]
        }
      },
      Status: {
        select: {
          options: [
            { name: 'New', color: 'red' },
            { name: 'Processing', color: 'yellow' },
            { name: 'Processed', color: 'green' },
            { name: 'Archived', color: 'gray' }
          ]
        }
      },
      'AI Intent': { rich_text: {} },
      Priority: {
        select: {
          options: [
            { name: 'High', color: 'red' },
            { name: 'Medium', color: 'yellow' },
            { name: 'Low', color: 'green' },
            { name: 'Someday', color: 'gray' }
          ]
        }
      },
      Source: {
        select: {
          options: [
            { name: 'Phone Voice', color: 'blue' },
            { name: 'Desktop', color: 'green' },
            { name: 'Email', color: 'orange' },
            { name: 'API', color: 'purple' }
          ]
        }
      },
      Created: { created_time: {} },
      'Processed At': { date: {} },
      'ACT Backend ID': { rich_text: {} }
    }
  },

  tasks: {
    title: 'AI Agent - Tasks & Automations',
    properties: {
      Task: { title: {} },
      Status: {
        select: {
          options: [
            { name: 'New', color: 'red' },
            { name: 'In Progress', color: 'yellow' },
            { name: 'Waiting', color: 'orange' },
            { name: 'Done', color: 'green' },
            { name: 'Automated', color: 'blue' }
          ]
        }
      },
      Type: {
        select: {
          options: [
            { name: 'Manual Task', color: 'default' },
            { name: 'Automated Process', color: 'blue' },
            { name: 'Recurring', color: 'purple' },
            { name: 'One-off', color: 'green' }
          ]
        }
      },
      'Automation Trigger': { rich_text: {} },
      'API Endpoint': { rich_text: {} },
      'Assigned To': { people: {} },
      'Due Date': { date: {} },
      'Automation Status': {
        select: {
          options: [
            { name: 'Active', color: 'green' },
            { name: 'Paused', color: 'yellow' },
            { name: 'Failed', color: 'red' },
            { name: 'Not Automated', color: 'gray' }
          ]
        }
      },
      'Last Executed': { date: {} },
      'Success Rate': { number: { format: 'percent' } },
      'ACT Backend ID': { rich_text: {} }
    }
  },

  people: {
    title: 'AI Agent - People & Relationships',
    properties: {
      Name: { title: {} },
      Role: {
        select: {
          options: [
            { name: 'Team Member', color: 'blue' },
            { name: 'Partner', color: 'green' },
            { name: 'Client', color: 'orange' },
            { name: 'Supplier', color: 'purple' },
            { name: 'Community Member', color: 'default' }
          ]
        }
      },
      Organization: { rich_text: {} },
      'Contact Info': { rich_text: {} },
      'Relationship Strength': {
        select: {
          options: [
            { name: 'Strong', color: 'green' },
            { name: 'Medium', color: 'yellow' },
            { name: 'Weak', color: 'orange' },
            { name: 'New', color: 'red' }
          ]
        }
      },
      'Last Contact': { date: {} },
      'Next Action': { rich_text: {} },
      'Skills & Expertise': { multi_select: { options: [] } },
      Notes: { rich_text: {} },
      'LinkedIn Profile': { url: {} },
      'Knowledge Graph Score': { number: {} },
      'ACT Backend ID': { rich_text: {} }
    }
  },

  projects: {
    title: 'AI Agent - Projects & Opportunities',
    properties: {
      Project: { title: {} },
      Status: {
        select: {
          options: [
            { name: 'Discovery', color: 'blue' },
            { name: 'Active', color: 'green' },
            { name: 'On Hold', color: 'yellow' },
            { name: 'Completed', color: 'green' },
            { name: 'Rejected', color: 'red' }
          ]
        }
      },
      Type: {
        select: {
          options: [
            { name: 'Internal Project', color: 'blue' },
            { name: 'Client Work', color: 'green' },
            { name: 'Partnership', color: 'purple' },
            { name: 'Investment', color: 'orange' }
          ]
        }
      },
      Priority: {
        select: {
          options: [
            { name: 'Critical', color: 'red' },
            { name: 'High', color: 'orange' },
            { name: 'Medium', color: 'yellow' },
            { name: 'Low', color: 'green' }
          ]
        }
      },
      'Impact Score': { number: {} },
      Budget: { number: { format: 'dollar' } },
      Timeline: { date: {} },
      'Success Metrics': { rich_text: {} },
      'AI Recommendations': { rich_text: {} },
      'Risk Assessment': {
        select: {
          options: [
            { name: 'Low', color: 'green' },
            { name: 'Medium', color: 'yellow' },
            { name: 'High', color: 'red' }
          ]
        }
      },
      'Community Alignment': { number: {} },
      'ACT Backend ID': { rich_text: {} }
    }
  },

  playbooks: {
    title: 'AI Agent - Automation Playbooks',
    properties: {
      'Playbook Name': { title: {} },
      Trigger: { rich_text: {} },
      Steps: { rich_text: {} },
      'API Calls': { rich_text: {} },
      'Success Criteria': { rich_text: {} },
      'Fallback Actions': { rich_text: {} },
      Active: { checkbox: {} },
      'Last Run': { date: {} },
      'Success Rate': { number: { format: 'percent' } }
    }
  },

  memory: {
    title: 'AI Agent - Process Memory',
    properties: {
      Process: { title: {} },
      Pattern: { rich_text: {} },
      Frequency: {
        select: {
          options: [
            { name: 'Daily', color: 'red' },
            { name: 'Weekly', color: 'orange' },
            { name: 'Monthly', color: 'yellow' },
            { name: 'Quarterly', color: 'green' },
            { name: 'Ad-hoc', color: 'blue' }
          ]
        }
      },
      'Last Occurrence': { date: {} },
      'Next Predicted': { date: {} },
      'Automation Opportunity': { rich_text: {} },
      'Resources Needed': { rich_text: {} },
      'Confidence Score': { number: {} },
      'ACT Pattern ID': { rich_text: {} }
    }
  }
};

async function createDatabase(key, schema, parentPageId) {
  console.log(`📋 Creating ${schema.title}...`);
  
  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId,
      },
      title: [
        {
          type: 'text',
          text: { content: schema.title },
        },
      ],
      properties: schema.properties,
    });

    console.log(`✅ Created ${schema.title}: ${response.id}`);
    return response.id;
  } catch (error) {
    console.error(`❌ Failed to create ${schema.title}:`, error.message);
    throw error;
  }
}

async function setupNotionAIAgent() {
  console.log('🚀 Starting Notion AI Business Agent setup...\n');

  if (!process.env.NOTION_INTEGRATION_TOKEN) {
    console.error('❌ NOTION_INTEGRATION_TOKEN not found in environment variables');
    console.log('\nPlease follow these steps:');
    console.log('1. Go to https://www.notion.so/my-integrations');
    console.log('2. Create a new integration for your workspace');
    console.log('3. Copy the "Internal Integration Token"');
    console.log('4. Add NOTION_INTEGRATION_TOKEN=your_token to your .env file');
    process.exit(1);
  }

  try {
    // Test Notion API connection
    console.log('🔍 Testing Notion API connection...');
    const me = await notion.users.me();
    console.log(`✅ Connected as: ${me.name} (${me.person?.email || 'no email'})\n`);

    // Get workspace info
    console.log('📝 Searching for workspace...');
    const search = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 10
    });

    if (search.results.length === 0) {
      console.error('❌ No accessible pages found. Please ensure:');
      console.log('1. The integration has access to at least one page');
      console.log('2. You\'ve shared pages/databases with the integration');
      process.exit(1);
    }

    const rootPage = search.results[0];
    console.log(`✅ Using root page: ${rootPage.properties?.title?.title?.[0]?.text?.content || 'Untitled'}\n`);

    // Create all databases
    const databaseIds = {};
    for (const [key, schema] of Object.entries(DATABASE_SCHEMAS)) {
      databaseIds[key] = await createDatabase(key, schema, rootPage.id);
      
      // Small delay between database creations to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎯 Database creation complete!\n');

    // Generate environment variables
    const envContent = `
# Notion AI Agent Database IDs (generated ${new Date().toISOString()})
NOTION_IDEAS_DB_ID=${databaseIds.ideas}
NOTION_TASKS_DB_ID=${databaseIds.tasks}
NOTION_PEOPLE_DB_ID=${databaseIds.people}
NOTION_PROJECTS_DB_ID=${databaseIds.projects}
NOTION_PLAYBOOKS_DB_ID=${databaseIds.playbooks}
NOTION_MEMORY_DB_ID=${databaseIds.memory}
`;

    // Write to env file
    const envFilePath = path.join(process.cwd(), '.env.notion-databases');
    fs.writeFileSync(envFilePath, envContent.trim());

    console.log('📄 Environment variables saved to: .env.notion-databases');
    console.log('🔧 Please copy these to your main .env file\n');

    // Create relations between databases
    console.log('🔗 Setting up database relations...');
    await setupDatabaseRelations(databaseIds);

    console.log('\n✨ Notion AI Business Agent setup complete!');
    console.log('\n📚 Next steps:');
    console.log('1. Copy database IDs from .env.notion-databases to your main .env file');
    console.log('2. Restart your ACT backend server');
    console.log('3. Test voice capture: POST /api/notion-ai-agent/capture/voice');
    console.log('4. Test text capture: POST /api/notion-ai-agent/capture/text');
    console.log('5. Check health: GET /api/notion-ai-agent/health');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.code === 'unauthorized') {
      console.log('\n🔐 Authorization error. Please ensure:');
      console.log('1. Your integration token is correct');
      console.log('2. The integration has access to your workspace');
      console.log('3. You\'ve shared at least one page with the integration');
    }
    
    process.exit(1);
  }
}

async function setupDatabaseRelations(databaseIds) {
  // Add relation properties to link databases
  const relations = [
    {
      database: databaseIds.tasks,
      property: 'People',
      relation: { database_id: databaseIds.people, type: 'relation' }
    },
    {
      database: databaseIds.tasks,
      property: 'Projects', 
      relation: { database_id: databaseIds.projects, type: 'relation' }
    },
    {
      database: databaseIds.projects,
      property: 'People',
      relation: { database_id: databaseIds.people, type: 'relation' }
    },
    {
      database: databaseIds.projects,
      property: 'Tasks',
      relation: { database_id: databaseIds.tasks, type: 'relation' }
    },
    {
      database: databaseIds.memory,
      property: 'People',
      relation: { database_id: databaseIds.people, type: 'relation' }
    },
    {
      database: databaseIds.memory,
      property: 'Projects',
      relation: { database_id: databaseIds.projects, type: 'relation' }
    }
  ];

  for (const rel of relations) {
    try {
      await notion.databases.update({
        database_id: rel.database,
        properties: {
          [rel.property]: rel.relation
        }
      });
      console.log(`✅ Added ${rel.property} relation`);
    } catch (error) {
      console.warn(`⚠️  Failed to add ${rel.property} relation: ${error.message}`);
    }
    
    // Delay between updates
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupNotionAIAgent();
}

export { setupNotionAIAgent, DATABASE_SCHEMAS };