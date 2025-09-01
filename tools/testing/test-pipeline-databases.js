// ACT Pipeline Database Testing - Focused on Core 5 Databases
// Quick test of your Projects, Opportunities, People, Organizations, and Artefacts

const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API_VERSION = '2022-06-28';

// Core Pipeline Databases - YOUR ACTUAL DATABASE IDs
const pipelineDatabases = {
    'Projects': '177ebcf981cf80dd9514f1ec32f3314c',
    'Opportunities': '234ebcf981cf804e873ff352f03c36da',
    'People': '47bdc1c4df994ddc81c4a0214c919d69',
    'Organizations': '948f39467d1c42f2bd7e1317a755e67b',
    'Artefacts': '234ebcf981cf8015878deadb337662e4'
};

async function quickTestDatabase(name, databaseId) {
    if (!databaseId) {
        console.log(`⚠️  ${name}: No database ID provided - please add to script`);
        return null;
    }

    try {
        console.log(`🧪 Testing ${name}...`);
        
        // Quick query to get record count and sample data
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_API_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ page_size: 3 })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`   ✅ ${name}: ${data.results.length} records (sample)`);
        
        // Show first record properties to understand structure
        if (data.results.length > 0) {
            const properties = Object.keys(data.results[0].properties);
            console.log(`   📋 Properties: ${properties.slice(0, 4).join(', ')}${properties.length > 4 ? '...' : ''}`);
        }
        
        return {
            name,
            id: databaseId,
            recordCount: data.results.length,
            sampleData: data.results,
            working: true
        };
        
    } catch (error) {
        console.log(`   ❌ ${name}: FAILED - ${error.message}`);
        return { name, id: databaseId, working: false, error: error.message };
    }
}

async function testPipelineDatabases() {
    console.log('🚀 ACT Pipeline Database Test\n');
    console.log('Testing your 5 core databases...\n');
    
    const results = {};
    
    for (const [name, id] of Object.entries(pipelineDatabases)) {
        const result = await quickTestDatabase(name, id);
        results[name] = result;
    }
    
    console.log('\n📊 PIPELINE STATUS:');
    console.log('==================');
    
    const working = Object.values(results).filter(r => r?.working).length;
    const total = Object.keys(pipelineDatabases).length;
    
    console.log(`✅ Working Databases: ${working}/${total}`);
    
    if (working > 0) {
        console.log('\n🎯 Ready to test dashboard with:');
        Object.values(results).forEach(r => {
            if (r?.working) {
                console.log(`   • ${r.name} (${r.recordCount} records)`);
            }
        });
    }
    
    if (working < total) {
        console.log('\n⚠️  Missing Database IDs:');
        Object.values(results).forEach(r => {
            if (!r?.working) {
                console.log(`   • ${r.name} - Add database ID to script`);
            }
        });
    }
    
    return results;
}

// Quick function to get database IDs from URLs
function extractDatabaseId(notionUrl) {
    // Extract ID from URLs like: https://notion.so/workspace/database-name-1a2b3c4d5e6f...
    const match = notionUrl.match(/([a-f0-9]{32})/);
    return match ? match[1] : null;
}

console.log('💡 TIP: To get database IDs:');
console.log('1. Open each database in Notion');
console.log('2. Copy the URL');
console.log('3. Extract the 32-character ID');
console.log('4. Add to pipelineDatabases object above\n');

// Run the test
testPipelineDatabases().catch(console.error);