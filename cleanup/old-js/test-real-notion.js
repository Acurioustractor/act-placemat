#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config();

async function testRealNotionDB() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  
  console.log('🔍 Testing real Notion database connection...');
  console.log('Database ID:', databaseId);
  console.log('Token present:', !!token);
  
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to real Notion database!');
      console.log('📊 Real data found:');
      console.log('   Total pages:', data.results.length);
      
      if (data.results.length > 0) {
        console.log('\n📋 Real projects in your database:');
        
        data.results.forEach((page, index) => {
          console.log(`\n${index + 1}. Page ID: ${page.id}`);
          console.log(`   Created: ${page.created_time}`);
          console.log('   Properties:');
          
          // Show property values
          Object.entries(page.properties).forEach(([key, value]) => {
            if (value.type === 'title' && value.title.length > 0) {
              console.log(`     ${key}: "${value.title[0].plain_text}"`);
            } else if (value.type === 'rich_text' && value.rich_text.length > 0) {
              console.log(`     ${key}: "${value.rich_text[0].plain_text}"`);
            } else if (value.type === 'select' && value.select) {
              console.log(`     ${key}: "${value.select.name}"`);
            } else if (value.type === 'number' && value.number !== null) {
              console.log(`     ${key}: ${value.number}`);
            } else if (value.type === 'date' && value.date) {
              console.log(`     ${key}: ${value.date.start}`);
            } else if (value.type === 'checkbox') {
              console.log(`     ${key}: ${value.checkbox}`);
            }
          });
        });
      } else {
        console.log('\n📋 No pages found in this database.');
        console.log('   This might be a new/empty database or permissions issue.');
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ Notion API Error:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   Error:', errorText);
      
      if (response.status === 404) {
        console.log('\n💡 This usually means:');
        console.log('   - The database ID is incorrect');
        console.log('   - The integration doesn\'t have access to this database');
        console.log('   - The database was deleted or moved');
      }
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testRealNotionDB().catch(console.error);