// Debug pagination for projects database
const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DB_ID = '177ebcf981cf80dd9514f1ec32f3314c';
const NOTION_API_VERSION = '2022-06-28';

async function debugPaginationDetailed() {
  console.log('🔍 DETAILED PAGINATION DEBUG');
  console.log('============================\n');
  
  let allResults = [];
  let hasMore = true;
  let nextCursor = null;
  let pageCount = 0;
  let totalTime = 0;
  
  console.log(`📊 Database ID: ${PROJECTS_DB_ID}`);
  console.log(`🔑 Token length: ${NOTION_TOKEN?.length || 0} chars\n`);
  
  while (hasMore) {
    pageCount++;
    const startTime = Date.now();
    
    console.log(`📄 PAGE ${pageCount}:`);
    console.log(`   Cursor: ${nextCursor || 'null (first page)'}`);
    
    const requestBody = {
      page_size: 100
    };
    
    if (nextCursor) {
      requestBody.start_cursor = nextCursor;
    }
    
    console.log(`   Request body: ${JSON.stringify(requestBody)}`);
    
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${PROJECTS_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const requestTime = Date.now() - startTime;
      totalTime += requestTime;
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Request time: ${requestTime}ms`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log(`   ❌ ERROR: ${JSON.stringify(errorData, null, 2)}`);
        break;
      }
      
      const pageData = await response.json();
      const pageResults = pageData.results || [];
      
      console.log(`   Records in page: ${pageResults.length}`);
      console.log(`   Has more: ${pageData.has_more}`);
      console.log(`   Next cursor: ${pageData.next_cursor || 'null'}`);
      
      // Log first and last record IDs for verification
      if (pageResults.length > 0) {
        console.log(`   First record ID: ${pageResults[0].id}`);
        console.log(`   Last record ID: ${pageResults[pageResults.length - 1].id}`);
      }
      
      allResults = allResults.concat(pageResults);
      hasMore = pageData.has_more;
      nextCursor = pageData.next_cursor;
      
      console.log(`   Total records so far: ${allResults.length}\n`);
      
      // Add a small delay to avoid rate limiting
      if (hasMore) {
        console.log('   ⏱️  Adding 100ms delay to avoid rate limiting...\n');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.log(`   ❌ NETWORK ERROR: ${error.message}`);
      break;
    }
  }
  
  console.log('🎯 FINAL RESULTS:');
  console.log('================');
  console.log(`Total pages requested: ${pageCount}`);
  console.log(`Total records retrieved: ${allResults.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per page: ${Math.round(totalTime / pageCount)}ms`);
  
  // Check for duplicate records
  const uniqueIds = new Set(allResults.map(r => r.id));
  console.log(`Unique record IDs: ${uniqueIds.size}`);
  
  if (uniqueIds.size !== allResults.length) {
    console.log(`⚠️  WARNING: Found ${allResults.length - uniqueIds.size} duplicate records!`);
  }
  
  // Sample some record IDs
  console.log('\n📋 Sample Record IDs:');
  allResults.slice(0, 5).forEach((record, index) => {
    const title = record.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
    console.log(`   ${index + 1}. ${record.id} - "${title}"`);
  });
  
  if (allResults.length > 5) {
    console.log('   ...');
    allResults.slice(-2).forEach((record, index) => {
      const title = record.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
      const actualIndex = allResults.length - 2 + index + 1;
      console.log(`   ${actualIndex}. ${record.id} - "${title}"`);
    });
  }
  
  return allResults.length;
}

// Run the debug
debugPaginationDetailed()
  .then(count => {
    console.log(`\n✅ Successfully retrieved ${count} projects`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });