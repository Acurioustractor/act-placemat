// Check different API approaches to find the 51st project
const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DB_ID = '177ebcf981cf80dd9514f1ec32f3314c';
const NOTION_API_VERSION = '2022-06-28';

async function checkDatabaseInfo() {
  console.log('🔍 CHECKING DATABASE ACCESS & PERMISSIONS');
  console.log('=========================================\n');
  
  try {
    // 1. Get database metadata
    console.log('📊 DATABASE METADATA:');
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${PROJECTS_DB_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log(`   Database title: ${dbData.title?.[0]?.plain_text || 'Unknown'}`);
      console.log(`   Database ID: ${dbData.id}`);
      console.log(`   Created time: ${dbData.created_time}`);
      console.log(`   Last edited: ${dbData.last_edited_time}`);
      console.log(`   Properties count: ${Object.keys(dbData.properties).length}`);
      console.log(`   Database URL: ${dbData.url}`);
    } else {
      console.log(`   ❌ Failed to get database metadata: ${dbResponse.status}`);
    }
    
    console.log('\n');
    
    // 2. Try different query approaches
    const queryVariations = [
      {
        name: 'Standard Query (page_size: 100)',
        body: { page_size: 100 }
      },
      {
        name: 'Larger Page Size (page_size: 200)', 
        body: { page_size: 200 }
      },
      {
        name: 'Include Archived Records',
        body: { 
          page_size: 100,
          filter: {
            "or": [
              {
                "property": "object",
                "select": {
                  "equals": "page"
                }
              },
              {
                "property": "archived",
                "checkbox": {
                  "equals": false
                }
              },
              {
                "property": "archived", 
                "checkbox": {
                  "equals": true
                }
              }
            ]
          }
        }
      },
      {
        name: 'Sort by Creation Time (oldest first)',
        body: {
          page_size: 100,
          sorts: [
            {
              "timestamp": "created_time",
              "direction": "ascending"
            }
          ]
        }
      },
      {
        name: 'Sort by Last Edit Time (newest first)',
        body: {
          page_size: 100,
          sorts: [
            {
              "timestamp": "last_edited_time", 
              "direction": "descending"
            }
          ]
        }
      }
    ];
    
    for (const variation of queryVariations) {
      console.log(`🧪 TESTING: ${variation.name}`);
      
      try {
        const response = await fetch(`https://api.notion.com/v1/databases/${PROJECTS_DB_ID}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': NOTION_API_VERSION,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(variation.body)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success: ${data.results?.length || 0} records`);
          console.log(`   Has more: ${data.has_more}`);
          console.log(`   Next cursor: ${data.next_cursor ? 'Present' : 'null'}`);
          
          if (data.results?.length > 50) {
            console.log(`   🎉 FOUND MORE RECORDS! Got ${data.results.length} instead of 50`);
            
            // Show the extra records
            const extraRecords = data.results.slice(50);
            console.log(`   📋 Extra records (${extraRecords.length}):`);
            extraRecords.forEach((record, index) => {
              const title = record.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
              console.log(`      ${index + 51}. ${record.id} - "${title}"`);
            });
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.log(`   ❌ Failed: ${response.status} - ${errorData.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 3. Check integration permissions
    console.log('🔑 CHECKING INTEGRATION PERMISSIONS:');
    try {
      const userResponse = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log(`   Integration name: ${userData.name}`);
        console.log(`   Integration type: ${userData.type}`);
        console.log(`   Integration ID: ${userData.id}`);
        console.log(`   Owner: ${userData.owner?.type || 'Unknown'}`);
      } else {
        console.log(`   ❌ Failed to get integration info: ${userResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking integration: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Overall error: ${error.message}`);
  }
}

// Run the check
checkDatabaseInfo()
  .then(() => {
    console.log('\n✅ Access check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });