#!/usr/bin/env node
/**
 * Test Notion API Connection
 */

import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

console.log('Testing Notion API connection...\n');
console.log(`Token: ${process.env.NOTION_TOKEN?.substring(0, 10)}...`);
console.log(`Token length: ${process.env.NOTION_TOKEN?.length || 0}\n`);

try {
  // Try to list users (this should work with any valid token)
  const response = await notion.users.list({});
  console.log('✅ Connection successful!');
  console.log(`Found ${response.results.length} users in workspace\n`);

  // Try to search for pages
  const search = await notion.search({
    query: '',
    page_size: 5,
  });
  console.log(`✅ Search successful!`);
  console.log(`Found ${search.results.length} pages/databases\n`);

  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('\nPossible solutions:');
  console.error('1. Generate a new integration token at https://www.notion.so/my-integrations');
  console.error('2. Make sure the integration has access to your workspace');
  console.error('3. Update NOTION_TOKEN in your .env file\n');
  process.exit(1);
}
