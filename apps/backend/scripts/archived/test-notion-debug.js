/**
 * DEBUG NOTION API ISSUE
 * Test to isolate the exact problem with this.notion.databases.query
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

async function testNotionClient() {
  console.log('🔍 Testing Notion Client directly...');

  try {
    // Create client exactly like the service
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2022-06-28',
      timeoutMs: 60000,
    });

    console.log('✅ Notion client created');
    console.log('🔍 Client methods available:', Object.keys(notion));
    console.log('🔍 Databases object:', notion.databases);
    console.log('🔍 Databases methods:', notion.databases ? Object.keys(notion.databases) : 'undefined');

    // Test basic connection first
    console.log('🔍 Testing users.me endpoint...');
    const user = await notion.users.me();
    console.log('✅ User connection successful:', user.name);

    // Test if databases.query exists and is a function
    if (notion.databases && typeof notion.databases.query === 'function') {
      console.log('✅ notion.databases.query is available as function');

      // Try a minimal database query with a known database ID
      const testDbId = process.env.NOTION_PROJECTS_DATABASE_ID;
      if (testDbId) {
        console.log(`🔍 Testing database query with ID: ${testDbId}`);

        const result = await notion.databases.query({
          database_id: testDbId,
          page_size: 1
        });

        console.log('✅ Database query successful!');
        console.log('📊 Result:', result);
      } else {
        console.log('❌ No NOTION_PROJECTS_DATABASE_ID found in environment');
      }
    } else {
      console.log('❌ notion.databases.query is not a function');
      console.log('🔍 typeof notion.databases.query:', typeof notion.databases?.query);
    }

  } catch (error) {
    console.error('❌ Error testing Notion client:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testNotionClient();