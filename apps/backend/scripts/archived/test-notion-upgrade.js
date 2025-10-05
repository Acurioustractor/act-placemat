/**
 * NOTION API V5 UPGRADE TEST - 2025-09-03 API VERSION
 * Test the new Notion API structure with data sources and latest SDK
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

async function testNotionUpgrade() {
  console.log('🔍 Testing Notion API v5 with 2025-09-03 API version...');

  try {
    // Create client with new API version
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2025-09-03',  // Latest API version
      timeoutMs: 60000,
    });

    console.log('✅ Notion client created with v2025-09-03');
    console.log('🔍 Client methods available:', Object.keys(notion));

    // Check what methods are available now
    console.log('🔍 Database methods:', notion.databases ? Object.keys(notion.databases) : 'undefined');
    console.log('🔍 Data sources methods:', notion.dataSources ? Object.keys(notion.dataSources) : 'undefined');

    // Test basic connection first
    console.log('🔍 Testing users.me endpoint...');
    const user = await notion.users.me();
    console.log('✅ User connection successful:', user.name);

    // Test the new data sources approach
    if (notion.dataSources) {
      console.log('✅ Data sources available!');

      // Try to list data sources for a known database
      const testDbId = process.env.NOTION_PROJECTS_DATABASE_ID;
      if (testDbId) {
        console.log(`🔍 Testing new data sources approach for database: ${testDbId}`);

        try {
          // According to the upgrade guide, we need to discover data_source_id
          const dataSources = await notion.dataSources.list({
            database_id: testDbId
          });

          console.log('✅ Data sources list successful!');
          console.log('📊 Data sources found:', dataSources.results.length);

          if (dataSources.results.length > 0) {
            const dataSourceId = dataSources.results[0].id;
            console.log('🎯 First data source ID:', dataSourceId);

            // Now try querying using the new data source approach
            const queryResult = await notion.dataSources.query({
              data_source_id: dataSourceId,
              page_size: 1
            });

            console.log('✅ Data source query successful!');
            console.log('📄 Pages found:', queryResult.results.length);
          }
        } catch (dataSourceError) {
          console.log('❌ Data source query failed:', dataSourceError.message);
          console.log('💡 This may mean the database needs to be migrated to the new API');
        }
      }
    } else {
      console.log('❌ No dataSources method available');
    }

    // Try the old approach to see if it still works
    if (notion.databases && typeof notion.databases.query === 'function') {
      console.log('✅ Old databases.query still available');

      const testDbId = process.env.NOTION_PROJECTS_DATABASE_ID;
      if (testDbId) {
        try {
          const oldResult = await notion.databases.query({
            database_id: testDbId,
            page_size: 1
          });
          console.log('✅ Old database query still works!');
        } catch (oldError) {
          console.log('❌ Old database query failed:', oldError.message);
        }
      }
    } else {
      console.log('❌ Old databases.query not available');
    }

  } catch (error) {
    console.error('❌ Error testing Notion v5 upgrade:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testNotionUpgrade();