#!/usr/bin/env node

/**
 * ACT Placemat Simple Example Creator
 * 
 * This script creates an example using only the existing Projects database
 * since the other databases haven't been created yet.
 */

const { Client } = require('@notionhq/client');
require('dotenv').config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Database ID from environment
const PROJECTS_DB = process.env.NOTION_DATABASE_ID || process.env.NOTION_PROJECTS_DB;

console.log('🚀 ACT Placemat Simple Example Creator');
console.log('=====================================\n');

async function createExampleProject() {
  try {
    console.log('📋 Creating example project in existing database...\n');
    
    // Create a project that demonstrates what the full ecosystem would look like
    const projectProperties = {
      'Name': {
        title: [{ text: { content: 'Climate Justice Innovation Lab' } }]
      },
      'Description': {
        rich_text: [{ text: { content: 'A collaborative platform bringing together communities, innovators, and funders to develop equitable climate solutions. Currently seeking $100K grant from Ford Foundation.' } }]
      },
      'Status': {
        select: { name: 'Active 🔥' }
      },
      'Place': {
        select: { name: 'Lab' }
      },
      'Location': {
        select: { name: 'Brisbane' }
      },
      'State': {
        select: { name: 'Queensland' }
      },
      'Theme': {
        multi_select: [
          { name: 'Indigenous' },
          { name: 'Health and wellbeing' },
          { name: 'Global community' }
        ]
      },
      'Tags': {
        multi_select: [
          { name: 'Collaboration' },
          { name: 'Research' },
          { name: 'Strategy' }
        ]
      },
      'Core Values': {
        select: { name: 'Radical Humility' }
      },
      'Revenue Potential': {
        number: 100000
      },
      'Potential Incoming': {
        number: 100000
      },
      'Next Milestone Date': {
        date: { start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      },
      'AI summary': {
        rich_text: [{ text: { content: 'High-impact initiative addressing climate justice through community-led innovation. Strong alignment with Ford Foundation priorities. Key contact: Jane Smith (Director of Climate Justice). Next step: Submit grant proposal by deadline.' } }]
      }
    };
    
    console.log('Creating project: Climate Justice Innovation Lab...');
    const project = await notion.pages.create({
      parent: { database_id: PROJECTS_DB },
      properties: projectProperties,
    });
    
    console.log('✅ Project created successfully!\n');
    console.log('📊 Project Details:');
    console.log('===================');
    console.log(`Name: Climate Justice Innovation Lab`);
    console.log(`ID: ${project.id}`);
    console.log(`URL: ${project.url}`);
    console.log(`Status: Active 🔥`);
    console.log(`Revenue Potential: $100,000`);
    console.log(`Next Milestone: Grant proposal submission\n`);
    
    console.log('💡 What This Demonstrates:');
    console.log('==========================\n');
    
    console.log('In a fully connected ACT Placemat system, this project would be linked to:\n');
    
    console.log('🏢 Organization: Ford Foundation');
    console.log('   - Type: Foundation');
    console.log('   - Funding Capacity: $1M+');
    console.log('   - Relationship: Active Partner\n');
    
    console.log('👤 Person: Jane Smith');
    console.log('   - Role: Director of Climate Justice Initiatives');
    console.log('   - Organization: Ford Foundation');
    console.log('   - Influence: Decision Maker\n');
    
    console.log('🎯 Opportunity: $100K Climate Justice Grant');
    console.log('   - Stage: Proposal 📄');
    console.log('   - Probability: 75%');
    console.log('   - Deadline: 30 days\n');
    
    console.log('📄 Artifact: Grant Proposal Draft');
    console.log('   - Type: Proposal');
    console.log('   - Status: Draft');
    console.log('   - Version: 2.0\n');
    
    console.log('🔗 Two-Way Relations Would Include:');
    console.log('===================================');
    console.log('• Project ↔️ Organization (Ford Foundation)');
    console.log('• Project ↔️ Opportunity (Grant)');
    console.log('• Opportunity ↔️ Person (Jane Smith as decision maker)');
    console.log('• Artifact ↔️ All entities (proposal linked to everything)\n');
    
    console.log('📚 Next Steps:');
    console.log('==============');
    console.log('1. Create the other 4 databases following NOTION_DATABASE_SCHEMAS.md');
    console.log('2. Configure database IDs in your .env file:');
    console.log('   - NOTION_OPPORTUNITIES_DB=<your_opportunities_db_id>');
    console.log('   - NOTION_ORGANIZATIONS_DB=<your_organizations_db_id>');
    console.log('   - NOTION_PEOPLE_DB=<your_people_db_id>');
    console.log('   - NOTION_ARTIFACTS_DB=<your_artifacts_db_id>');
    console.log('3. Run create-complete-example.js to see the full ecosystem in action!');
    
  } catch (error) {
    console.error('❌ Error creating example:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
  }
}

// Run the script
createExampleProject().catch(console.error);