// Notion API Diagnostic Tool
// Run this to test Notion API connection step by step

const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API_VERSION = '2022-06-28';

// Database IDs from .env
const databases = {
  projects: process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID,
  opportunities: process.env.NOTION_OPPORTUNITIES_DB,
  organizations: process.env.NOTION_ORGANIZATIONS_DB,
  people: process.env.NOTION_PEOPLE_DB,
  artifacts: process.env.NOTION_ARTIFACTS_DB,
};

console.log('🔍 NOTION API DIAGNOSTIC TOOL');
console.log('================================\n');

// Test 1: Check Environment Variables
function testEnvironmentVariables() {
  console.log('📋 TEST 1: Environment Variables');
  console.log('Token present:', NOTION_TOKEN ? `Yes (${NOTION_TOKEN.length} chars)` : 'No');
  console.log('Token starts with:', NOTION_TOKEN ? NOTION_TOKEN.substring(0, 10) + '...' : 'N/A');
  
  console.log('\nDatabase IDs:');
  Object.entries(databases).forEach(([key, value]) => {
    console.log(`  ${key}: ${value || 'MISSING'}`);
  });
  console.log('');
  
  return Boolean(NOTION_TOKEN);
}

// Test 2: Test Notion Token Validity
async function testNotionToken() {
  console.log('🔑 TEST 2: Token Validity');
  
  if (!NOTION_TOKEN) {
    console.log('❌ No token provided\n');
    return false;
  }
  
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Token is valid');
      console.log(`   User: ${data.name || 'Unknown'}`);
      console.log(`   Type: ${data.type || 'Unknown'}`);
      console.log(`   ID: ${data.id || 'Unknown'}\n`);
      return true;
    } else {
      console.log('❌ Token is invalid');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error testing token');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test 3: Test Database Access
async function testDatabaseAccess(dbId, dbName) {
  console.log(`🗄️  TEST 3: Database Access (${dbName})`);
  
  if (!dbId) {
    console.log(`❌ No database ID provided for ${dbName}\n`);
    return false;
  }
  
  // Clean the database ID (remove dashes and ensure proper format)
  const cleanDbId = dbId.replace(/-/g, '');
  
  try {
    // First, try to get database info
    const dbInfoResponse = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    const dbInfo = await dbInfoResponse.json();
    
    if (dbInfoResponse.ok) {
      console.log(`✅ Database accessible: ${dbInfo.title?.[0]?.plain_text || 'Untitled'}`);
      console.log(`   Properties: ${Object.keys(dbInfo.properties || {}).length}`);
      
      // Try to query the database
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page_size: 5 // Just get a few records
        })
      });
      
      const queryData = await queryResponse.json();
      
      if (queryResponse.ok) {
        console.log(`✅ Query successful: ${queryData.results?.length || 0} records found`);
        console.log(`   Sample properties: ${Object.keys(queryData.results?.[0]?.properties || {}).slice(0, 3).join(', ')}\n`);
        return true;
      } else {
        console.log(`❌ Query failed: ${queryData.message}`);
        console.log(`   Status: ${queryResponse.status}\n`);
        return false;
      }
    } else {
      console.log(`❌ Database not accessible`);
      console.log(`   Status: ${dbInfoResponse.status}`);
      console.log(`   Error: ${dbInfo.message || 'Unknown error'}`);
      console.log(`   Code: ${dbInfo.code || 'Unknown'}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Network error accessing ${dbName}`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test 4: Test Full API Request (like the app does)
async function testFullAPIRequest() {
  console.log('🚀 TEST 4: Full API Request (App Simulation)');
  
  const projectsDbId = databases.projects;
  if (!projectsDbId) {
    console.log('❌ No projects database ID to test\n');
    return false;
  }
  
  const cleanDbId = projectsDbId.replace(/-/g, '');
  
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100
        // No filter or sorts - just like the fixed server does
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Full API request successful');
      console.log(`   Records returned: ${data.results?.length || 0}`);
      console.log(`   Has more: ${data.has_more || false}`);
      
      if (data.results && data.results.length > 0) {
        const firstRecord = data.results[0];
        console.log(`   Sample record ID: ${firstRecord.id}`);
        console.log(`   Properties available: ${Object.keys(firstRecord.properties || {}).length}`);
        console.log(`   Properties: ${Object.keys(firstRecord.properties || {}).slice(0, 5).join(', ')}`);
      }
      console.log('');
      return true;
    } else {
      console.log('❌ Full API request failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.message || 'Unknown error'}`);
      console.log(`   Code: ${data.code || 'Unknown'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error in full API request');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('Starting comprehensive Notion API diagnostics...\n');
  
  // Test 1: Environment Variables
  const envOk = testEnvironmentVariables();
  if (!envOk) {
    console.log('🛑 Cannot proceed without environment variables');
    return;
  }
  
  // Test 2: Token Validity
  const tokenOk = await testNotionToken();
  if (!tokenOk) {
    console.log('🛑 Cannot proceed with invalid token');
    return;
  }
  
  // Test 3: Database Access
  console.log('Testing all databases...\n');
  const dbResults = {};
  for (const [name, id] of Object.entries(databases)) {
    if (id) {
      dbResults[name] = await testDatabaseAccess(id, name);
    }
  }
  
  // Test 4: Full API Request
  await testFullAPIRequest();
  
  // Summary
  console.log('🎯 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log(`Token Valid: ${tokenOk ? '✅' : '❌'}`);
  Object.entries(dbResults).forEach(([name, success]) => {
    console.log(`${name} Database: ${success ? '✅' : '❌'}`);
  });
  
  const allDbsWorking = Object.values(dbResults).every(Boolean);
  console.log(`\nOverall Status: ${tokenOk && allDbsWorking ? '✅ ALL SYSTEMS GO' : '❌ ISSUES FOUND'}`);
  
  if (!tokenOk || !allDbsWorking) {
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    if (!tokenOk) {
      console.log('1. Check your NOTION_TOKEN in .env file');
      console.log('2. Regenerate token at https://www.notion.so/my-integrations');
    }
    if (!allDbsWorking) {
      console.log('3. Check database IDs in .env file');
      console.log('4. Ensure integration has access to databases');
      console.log('5. Share databases with your integration');
    }
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);