#!/usr/bin/env node

// Test Airtable Connection and List Available Tables
require('dotenv').config();

async function testAirtableConnection() {
    console.log('🔍 Testing Airtable Connection...\n');
    
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log('   Base ID:', process.env.AIRTABLE_BASE_ID || 'MISSING');
    console.log('   API Key:', process.env.AIRTABLE_API_KEY ? 'Present' : 'MISSING');
    
    if (!process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_API_KEY) {
        console.log('\n❌ Missing Airtable credentials in .env file');
        console.log('Expected:');
        console.log('   AIRTABLE_BASE_ID=app...');
        console.log('   AIRTABLE_API_KEY=pat...');
        return;
    }
    
    const fetch = require('node-fetch');
    const baseUrl = 'https://api.airtable.com/v0';
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    
    try {
        console.log('\n🌐 Connecting to Airtable API...');
        
        // Try to get base metadata to see what tables exist
        const response = await fetch(`${baseUrl}/meta/bases/${baseId}/tables`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Successfully connected to Airtable!\n');
            
            console.log('📋 Available Tables in Base:');
            console.log('==========================================');
            
            data.tables.forEach((table, index) => {
                console.log(`\n${index + 1}. ${table.name} (ID: ${table.id})`);
                console.log(`   Description: ${table.description || 'No description'}`);
                console.log(`   Fields (${table.fields.length}):`);
                
                table.fields.slice(0, 5).forEach(field => {
                    console.log(`     - ${field.name} (${field.type})`);
                });
                
                if (table.fields.length > 5) {
                    console.log(`     ... and ${table.fields.length - 5} more fields`);
                }
            });
            
            // Check for Stories and Storytellers specifically
            console.log('\n🎯 Stories Integration Check:');
            console.log('============================');
            
            const storiesTable = data.tables.find(t => 
                t.name.toLowerCase().includes('stories') || 
                t.name.toLowerCase().includes('story')
            );
            
            const storytellersTable = data.tables.find(t => 
                t.name.toLowerCase().includes('storyteller') || 
                t.name.toLowerCase().includes('people') ||
                t.name.toLowerCase().includes('contacts')
            );
            
            if (storiesTable) {
                console.log(`✅ Found stories-related table: "${storiesTable.name}"`);
                console.log(`   Fields: ${storiesTable.fields.map(f => f.name).join(', ')}`);
            } else {
                console.log('❌ No stories table found');
                console.log('   Suggested: Create a table named "Stories"');
            }
            
            if (storytellersTable) {
                console.log(`✅ Found storytellers-related table: "${storytellersTable.name}"`);
                console.log(`   Fields: ${storytellersTable.fields.map(f => f.name).join(', ')}`);
            } else {
                console.log('❌ No storytellers table found');
                console.log('   Suggested: Create a table named "Storytellers"');
            }
            
            // Test data fetching from first table
            if (data.tables.length > 0) {
                console.log('\n🧪 Testing Data Fetch:');
                console.log('======================');
                
                const firstTable = data.tables[0];
                console.log(`Fetching sample data from "${firstTable.name}"...`);
                
                try {
                    const dataResponse = await fetch(`${baseUrl}/${baseId}/${firstTable.name}?maxRecords=3`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (dataResponse.ok) {
                        const tableData = await dataResponse.json();
                        console.log(`✅ Successfully fetched ${tableData.records.length} records`);
                        
                        if (tableData.records.length > 0) {
                            const sampleRecord = tableData.records[0];
                            console.log('📄 Sample record:');
                            console.log(`   ID: ${sampleRecord.id}`);
                            console.log(`   Fields: ${Object.keys(sampleRecord.fields).join(', ')}`);
                        }
                    } else {
                        console.log('⚠️  Could not fetch data from table (permissions issue?)');
                    }
                } catch (error) {
                    console.log('⚠️  Error fetching table data:', error.message);
                }
            }
            
            return data.tables;
            
        } else {
            const errorText = await response.text();
            console.log('❌ Airtable API Error:');
            console.log(`   Status: ${response.status} ${response.statusText}`);
            console.log(`   Details: ${errorText}`);
            
            if (response.status === 401) {
                console.log('\n💡 Troubleshooting:');
                console.log('   - Check your AIRTABLE_API_KEY is correct');
                console.log('   - Ensure the API key has not expired');
                console.log('   - Verify permissions on the base');
            } else if (response.status === 404) {
                console.log('\n💡 Troubleshooting:');
                console.log('   - Check your AIRTABLE_BASE_ID is correct');
                console.log('   - Ensure you have access to this base');
            }
            
            return null;
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   - Check your internet connection');
        console.log('   - Verify Airtable API is accessible');
        console.log('   - Try the connection again in a few minutes');
        return null;
    }
}

async function main() {
    const tables = await testAirtableConnection();
    
    if (tables) {
        console.log('\n🎉 SUCCESS: Airtable connection working!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Review available tables above');
        console.log('   2. Create Stories and Storytellers tables if needed');
        console.log('   3. Test stories integration with ACT Placemat');
        console.log('   4. Link stories to Notion projects');
    } else {
        console.log('\n❌ FAILED: Could not connect to Airtable');
        console.log('\n📋 Required Actions:');
        console.log('   1. Verify .env file has correct credentials');
        console.log('   2. Check Airtable base permissions');
        console.log('   3. Ensure API key is valid and not expired');
    }
}

main().catch(console.error);