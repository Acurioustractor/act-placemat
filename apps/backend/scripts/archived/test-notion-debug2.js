/**
 * DEBUG NOTION API - Find correct query method
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

async function findQueryMethod() {
  console.log('🔍 Finding correct query method...');

  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2022-06-28',
      timeoutMs: 60000,
    });

    console.log('✅ Client methods:', Object.keys(notion));

    // Check if search can query databases
    console.log('🔍 Search methods:', Object.keys(notion.search));

    // Try using search to query database
    const testDbId = process.env.NOTION_PROJECTS_DATABASE_ID;
    if (testDbId) {
      console.log(`🔍 Testing search query for database: ${testDbId}`);

      const result = await notion.search({
        filter: {
          value: 'database',
          property: 'object'
        },
        page_size: 5
      });

      console.log('✅ Search successful!');
      console.log('📊 Found databases:', result.results.length);

      // Check if any match our target database
      const targetDb = result.results.find(db => db.id === testDbId);
      if (targetDb) {
        console.log('✅ Found target database in search results');
      }

      // Now try to get database content using pages search
      console.log(`🔍 Searching for pages in database: ${testDbId}`);

      const pagesResult = await notion.search({
        filter: {
          value: 'page',
          property: 'object'
        },
        query: '', // empty query to get all
        page_size: 5
      });

      console.log('✅ Pages search successful!');
      console.log('📄 Found pages:', pagesResult.results.length);

    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findQueryMethod();