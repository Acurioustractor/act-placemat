#!/usr/bin/env node

/**
 * Add Infrastructure Tracking Fields to Notion Projects Database
 *
 * This script adds 4 new properties to the Projects database:
 * 1. Project Type (Select)
 * 2. Community Labor Metrics (Text - JSON)
 * 3. Storytelling Metrics (Text - JSON)
 * 4. Grant Dependency Metrics (Text - JSON)
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
const PROJECTS_DATABASE_ID = '177ebcf981cf80dd9514f1ec32f3314c'; // From server logs

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found in environment variables');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('🚀 Adding Infrastructure Tracking Fields to Notion Projects Database');
console.log('📊 Database ID:', PROJECTS_DATABASE_ID);
console.log('');

async function addInfrastructureFields() {
  try {
    console.log('🔧 Step 1: Fetching current database schema...');
    const database = await notion.databases.retrieve({
      database_id: PROJECTS_DATABASE_ID
    });

    console.log('✅ Current database has', Object.keys(database.properties).length, 'properties');
    console.log('');

    // Check if fields already exist
    const existingFields = Object.keys(database.properties);
    const fieldsToAdd = [
      'Project Type',
      'Community Labor Metrics',
      'Storytelling Metrics',
      'Grant Dependency Metrics'
    ];

    const missingFields = fieldsToAdd.filter(field => !existingFields.includes(field));

    if (missingFields.length === 0) {
      console.log('✅ All infrastructure tracking fields already exist!');
      console.log('');
      return;
    }

    console.log('📝 Fields to add:', missingFields.join(', '));
    console.log('');

    console.log('🔧 Step 2: Adding new properties to database...');

    const newProperties = {};

    if (!existingFields.includes('Project Type')) {
      newProperties['Project Type'] = {
        select: {
          options: [
            { name: 'Infrastructure Building', color: 'orange' },
            { name: 'Storytelling', color: 'blue' },
            { name: 'Regenerative Enterprise', color: 'green' },
            { name: 'Skills & Employment', color: 'purple' },
            { name: 'Mixed', color: 'pink' }
          ]
        }
      };
      console.log('  ✅ Will add: Project Type (Select)');
    }

    if (!existingFields.includes('Community Labor Metrics')) {
      newProperties['Community Labor Metrics'] = {
        rich_text: {}
      };
      console.log('  ✅ Will add: Community Labor Metrics (Text)');
    }

    if (!existingFields.includes('Storytelling Metrics')) {
      newProperties['Storytelling Metrics'] = {
        rich_text: {}
      };
      console.log('  ✅ Will add: Storytelling Metrics (Text)');
    }

    if (!existingFields.includes('Grant Dependency Metrics')) {
      newProperties['Grant Dependency Metrics'] = {
        rich_text: {}
      };
      console.log('  ✅ Will add: Grant Dependency Metrics (Text)');
    }

    console.log('');
    console.log('🔄 Updating database schema...');

    await notion.databases.update({
      database_id: PROJECTS_DATABASE_ID,
      properties: newProperties
    });

    console.log('');
    console.log('✅ SUCCESS! Infrastructure tracking fields added to Notion');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Open your Projects database in Notion');
    console.log('  2. You should see 4 new columns');
    console.log('  3. Run populate-infrastructure-data.mjs to add data for key projects');
    console.log('');

  } catch (error) {
    console.error('❌ Error adding fields:', error.message);
    if (error.code === 'object_not_found') {
      console.error('   The database ID may be incorrect or you may not have access');
    }
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

addInfrastructureFields();
