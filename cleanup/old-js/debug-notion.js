#!/usr/bin/env node

const { NotionMCPEnhanced, PlacematNotionIntegrationEnhanced } = require('./notion-mcp-enhanced.js');
require('dotenv').config();

console.log('🔍 Debugging Notion Integration...\n');

console.log('Environment variables:');
console.log('  NOTION_TOKEN:', !!process.env.NOTION_TOKEN);
console.log('  NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID);
console.log('  NOTION_PROJECTS_DB:', process.env.NOTION_PROJECTS_DB);

console.log('\n--- NotionMCPEnhanced ---');
const notion = new NotionMCPEnhanced();
console.log('  Token present:', !!notion.token);
console.log('  Projects DB ID:', notion.databases.projects);
console.log('  Available databases:', notion.availableDatabases);
console.log('  Using mock data:', notion.useMockData);

console.log('\n--- PlacematNotionIntegrationEnhanced ---');
const placematNotion = new PlacematNotionIntegrationEnhanced();
console.log('  Token present:', !!placematNotion.notion.token);
console.log('  Projects DB ID:', placematNotion.notion.databases.projects);
console.log('  Using mock data:', placematNotion.notion.useMockData);

async function testReal() {
  try {
    console.log('\n--- Testing Real Data Fetch ---');
    const allData = await placematNotion.getAllData();
    console.log('  Projects count:', allData.projects?.length || 0);
    console.log('  Opportunities count:', allData.opportunities?.length || 0);
    
    if (allData.projects && allData.projects.length > 0) {
      console.log('  First project name:', allData.projects[0].name);
      console.log('  First project status:', allData.projects[0].status);
    }
  } catch (error) {
    console.error('  Error:', error.message);
  }
}

testReal();