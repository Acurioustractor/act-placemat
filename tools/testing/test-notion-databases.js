// Notion Database Discovery and Testing Script
// This script will help us discover and test all your Notion databases

const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';

// Known database IDs (add more as you create them)
const knownDatabases = {
    'Main Projects': '177ebcf981cf80dd9514f1ec32f3314c',
    // Add your new database IDs here:
    // 'Opportunities': 'your-opportunities-db-id',
    // 'Organizations': 'your-organizations-db-id',
    // 'People': 'your-people-db-id',
    // 'Artifacts': 'your-artifacts-db-id'
};

async function testNotionAPI() {
    console.log('🔍 Testing Notion API Connection...\n');
    
    try {
        // Test basic API access
        const response = await fetch('https://api.notion.com/v1/users/me', {
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_API_VERSION
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            console.log('✅ Notion API Connection: SUCCESS');
            console.log(`   User: ${user.name || 'Unknown'}`);
            console.log(`   Workspace: ${user.owner?.workspace ? 'Connected' : 'Personal'}\n`);
        } else {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Notion API Connection: FAILED');
        console.error(`   Error: ${error.message}\n`);
        return false;
    }
    
    return true;
}

async function searchForDatabases() {
    console.log('🔍 Searching for Notion Databases...\n');
    
    try {
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_API_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    value: 'database',
                    property: 'object'
                },
                page_size: 100
            })
        });
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const databases = data.results;
        
        console.log(`📊 Found ${databases.length} databases:\n`);
        
        databases.forEach((db, index) => {
            console.log(`${index + 1}. ${db.title?.[0]?.plain_text || 'Untitled Database'}`);
            console.log(`   ID: ${db.id}`);
            console.log(`   Created: ${new Date(db.created_time).toLocaleDateString()}`);
            console.log(`   Last Edited: ${new Date(db.last_edited_time).toLocaleDateString()}\n`);
        });
        
        return databases;
    } catch (error) {
        console.error('❌ Database Search: FAILED');
        console.error(`   Error: ${error.message}\n`);
        return [];
    }
}

async function testDatabase(name, databaseId) {
    console.log(`🧪 Testing Database: ${name}`);
    console.log(`   ID: ${databaseId}`);
    
    try {
        // Get database schema
        const schemaResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_API_VERSION
            }
        });
        
        if (!schemaResponse.ok) {
            throw new Error(`Schema fetch failed: ${schemaResponse.status}`);
        }
        
        const schema = await schemaResponse.json();
        const properties = Object.keys(schema.properties);
        
        console.log(`   Properties (${properties.length}): ${properties.slice(0, 5).join(', ')}${properties.length > 5 ? '...' : ''}`);
        
        // Get sample data
        const dataResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_API_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_size: 5
            })
        });
        
        if (!dataResponse.ok) {
            throw new Error(`Data fetch failed: ${dataResponse.status}`);
        }
        
        const data = await dataResponse.json();
        console.log(`   Records: ${data.results.length} (showing sample of total)`);
        
        // Show sample record structure
        if (data.results.length > 0) {
            const sampleRecord = data.results[0];
            const recordProperties = Object.keys(sampleRecord.properties);
            console.log(`   Sample Record Properties: ${recordProperties.slice(0, 3).join(', ')}...`);
        }
        
        console.log('   Status: ✅ SUCCESS\n');
        
        return {
            name,
            id: databaseId,
            properties,
            recordCount: data.results.length,
            schema: schema.properties,
            sampleData: data.results
        };
        
    } catch (error) {
        console.log(`   Status: ❌ FAILED - ${error.message}\n`);
        return null;
    }
}

async function generateDashboardConfig(databases) {
    console.log('⚙️  Generating Dashboard Configuration...\n');
    
    const config = {
        databases: {},
        apiEndpoints: {},
        frontendConfig: {}
    };
    
    databases.forEach(db => {
        if (db) {
            config.databases[db.name] = {
                id: db.id,
                properties: db.properties,
                recordCount: db.recordCount
            };
            
            config.apiEndpoints[db.name.toLowerCase().replace(/\s+/g, '-')] = {
                endpoint: `/api/notion/${db.name.toLowerCase().replace(/\s+/g, '-')}`,
                databaseId: db.id,
                method: 'POST'
            };
        }
    });
    
    console.log('📋 Suggested .env additions:');
    databases.forEach(db => {
        if (db) {
            const envName = `NOTION_${db.name.toUpperCase().replace(/\s+/g, '_')}_DB_ID`;
            console.log(`${envName}=${db.id}`);
        }
    });
    
    console.log('\n📊 Dashboard Integration Ready!\n');
    
    return config;
}

async function main() {
    console.log('🚀 ACT Placemat - Notion Database Testing\n');
    console.log('==========================================\n');
    
    // Test API connection
    const apiWorking = await testNotionAPI();
    if (!apiWorking) {
        console.log('❌ Cannot proceed without working API connection');
        return;
    }
    
    // Search for all databases
    const allDatabases = await searchForDatabases();
    
    // Test known databases
    console.log('🧪 Testing Known Databases...\n');
    const testedDatabases = [];
    
    for (const [name, id] of Object.entries(knownDatabases)) {
        const result = await testDatabase(name, id);
        if (result) {
            testedDatabases.push(result);
        }
    }
    
    // Test any additional databases found
    if (allDatabases.length > Object.keys(knownDatabases).length) {
        console.log('🔍 Testing Additional Databases Found...\n');
        
        for (const db of allDatabases) {
            const dbName = db.title?.[0]?.plain_text || 'Untitled';
            const dbId = db.id;
            
            // Skip if already tested
            if (!Object.values(knownDatabases).includes(dbId)) {
                const result = await testDatabase(dbName, dbId);
                if (result) {
                    testedDatabases.push(result);
                }
            }
        }
    }
    
    // Generate configuration
    const config = await generateDashboardConfig(testedDatabases);
    
    // Summary
    console.log('📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Working Databases: ${testedDatabases.length}`);
    console.log(`📋 Total Records: ${testedDatabases.reduce((sum, db) => sum + db.recordCount, 0)}`);
    console.log(`🔗 Ready for Dashboard Integration: ${testedDatabases.length > 0 ? 'YES' : 'NO'}\n`);
    
    if (testedDatabases.length > 0) {
        console.log('🎯 Next Steps:');
        console.log('1. Add the suggested database IDs to your .env file');
        console.log('2. Update your dashboard to use the new databases');
        console.log('3. Test the opportunities pipeline with real data');
        console.log('4. Configure the relationships between databases\n');
    }
    
    return {
        databases: testedDatabases,
        config
    };
}

// Run the test
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testNotionAPI, searchForDatabases, testDatabase, generateDashboardConfig };