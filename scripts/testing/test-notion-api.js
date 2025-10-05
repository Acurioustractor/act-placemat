#!/usr/bin/env node

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔑 Testing Notion API Connection...\n');
console.log('Environment Variables:');
console.log(`   NOTION_TOKEN: ${process.env.NOTION_TOKEN ? '✓ Set (' + process.env.NOTION_TOKEN.substring(0, 20) + '...)' : '✗ Missing'}`);
console.log(`   NOTION_PROJECTS_DATABASE_ID: ${process.env.NOTION_PROJECTS_DATABASE_ID || '✗ Missing'}`);
console.log('');

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found in environment');
  process.exit(1);
}

if (!process.env.NOTION_PROJECTS_DATABASE_ID) {
  console.error('❌ NOTION_PROJECTS_DATABASE_ID not found in environment');
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

async function testConnection() {
  try {
    console.log('📡 Attempting to query Notion database...');
    console.log(`   Database ID: ${process.env.NOTION_PROJECTS_DATABASE_ID}\n`);

    const response = await notion.databases.query({
      database_id: process.env.NOTION_PROJECTS_DATABASE_ID,
      page_size: 5 // Just get a few to test
    });

    console.log('✅ SUCCESS! Notion API connection working!\n');
    console.log(`📊 Found ${response.results.length} projects (showing first 5):\n`);

    response.results.forEach((page, index) => {
      const props = page.properties;
      const title = props.Name?.title?.[0]?.plain_text ||
                   props.Title?.title?.[0]?.plain_text ||
                   'Untitled';
      const status = props.Status?.status?.name ||
                    props.Status?.select?.name ||
                    'Unknown';

      console.log(`${index + 1}. ${title}`);
      console.log(`   Status: ${status}`);
      console.log(`   ID: ${page.id}`);
      console.log('');
    });

    console.log(`\n🎉 API is working! Ready to run full research.`);

  } catch (error) {
    console.error('❌ Failed to connect to Notion API:\n');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);

    if (error.message.includes('token')) {
      console.error('\n💡 Suggestion: Check that NOTION_TOKEN is valid and has not expired');
    }
    if (error.message.includes('database_id')) {
      console.error('\n💡 Suggestion: Check that NOTION_PROJECTS_DATABASE_ID is correct');
    }

    process.exit(1);
  }
}

testConnection();
