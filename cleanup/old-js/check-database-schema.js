#!/usr/bin/env node

/**
 * Check Notion Database Schema
 * This script retrieves and displays the actual properties of your Notion databases
 */

const { Client } = require('@notionhq/client');
require('dotenv').config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Database IDs from environment
const DATABASES = {
  projects: process.env.NOTION_DATABASE_ID || process.env.NOTION_PROJECTS_DB,
  opportunities: process.env.NOTION_OPPORTUNITIES_DB,
  organizations: process.env.NOTION_ORGANIZATIONS_DB,
  people: process.env.NOTION_PEOPLE_DB,
  artifacts: process.env.NOTION_ARTIFACTS_DB,
};

console.log('🔍 Checking Notion Database Schemas');
console.log('===================================\n');

async function checkDatabaseSchema(name, databaseId) {
  if (!databaseId) {
    console.log(`❌ ${name} database: Not configured\n`);
    return;
  }
  
  try {
    console.log(`📊 ${name} Database`);
    console.log(`ID: ${databaseId}`);
    console.log('Properties:');
    
    const database = await notion.databases.retrieve({ database_id: databaseId });
    
    // Sort properties alphabetically
    const properties = Object.entries(database.properties).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [propName, propConfig] of properties) {
      let details = `  - ${propName} (${propConfig.type})`;
      
      // Add additional details based on type
      switch (propConfig.type) {
        case 'select':
          if (propConfig.select?.options) {
            const options = propConfig.select.options.map(opt => opt.name).join(', ');
            details += ` - Options: ${options}`;
          }
          break;
        case 'multi_select':
          if (propConfig.multi_select?.options) {
            const options = propConfig.multi_select.options.map(opt => opt.name).join(', ');
            details += ` - Options: ${options}`;
          }
          break;
        case 'relation':
          if (propConfig.relation?.database_id) {
            details += ` → Related to: ${propConfig.relation.database_id.substring(0, 8)}...`;
          }
          break;
        case 'formula':
          if (propConfig.formula?.expression) {
            details += ` - Formula: ${propConfig.formula.expression}`;
          }
          break;
      }
      
      console.log(details);
    }
    
    console.log('\n');
    
  } catch (error) {
    console.log(`❌ ${name} database: Error - ${error.message}\n`);
  }
}

async function checkAllDatabases() {
  for (const [name, id] of Object.entries(DATABASES)) {
    await checkDatabaseSchema(name, id);
  }
  
  console.log('💡 Tip: To create the complete example, ensure your databases have the properties');
  console.log('   defined in NOTION_DATABASE_SCHEMAS.md or update the create-complete-example.js');
  console.log('   script to match your actual database schema.');
}

checkAllDatabases().catch(console.error);