#!/usr/bin/env node

/**
 * Simple LinkedIn Data Validation Script
 * 
 * Validates that LinkedIn data files are present and properly formatted
 */

import fs from 'fs/promises';
import { createReadStream } from 'fs';
import csv from 'csv-parser';

const LINKEDIN_DATA_PATH = '/Users/benknight/Code/ACT Placemat/Docs/LinkedIn';

const REQUIRED_FILES = [
  { name: 'Connections.csv', description: 'Professional connections data' },
  { name: 'Profile.csv', description: 'Personal profile information' },
  { name: 'Positions.csv', description: 'Career history and positions' },
  { name: 'Skills.csv', description: 'Professional skills list' }
];

async function validateLinkedInData() {
  console.log('🤝 LinkedIn Data Integration Validation\n');
  console.log('====================================\n');
  
  try {
    // Check if LinkedIn directory exists
    console.log(`📁 Checking LinkedIn data directory: ${LINKEDIN_DATA_PATH}`);
    await fs.access(LINKEDIN_DATA_PATH);
    console.log('✅ LinkedIn data directory found\n');
    
    let totalValidFiles = 0;
    let totalConnections = 0;
    let totalSkills = 0;
    let totalPositions = 0;
    
    // Validate each required file
    for (const file of REQUIRED_FILES) {
      const filePath = `${LINKEDIN_DATA_PATH}/${file.name}`;
      console.log(`📊 Validating ${file.name} (${file.description})...`);
      
      try {
        await fs.access(filePath);
        
        // Quick row count and validation
        const rowCount = await countRowsInCSV(filePath);
        console.log(`   ✅ File exists with ${rowCount} data rows`);
        
        if (file.name === 'Connections.csv') totalConnections = rowCount;
        if (file.name === 'Skills.csv') totalSkills = rowCount;
        if (file.name === 'Positions.csv') totalPositions = rowCount;
        
        totalValidFiles++;
        
      } catch (error) {
        console.log(`   ❌ File missing: ${file.name}`);
      }
    }
    
    console.log('\n📈 LinkedIn Data Summary:');
    console.log('========================');
    console.log(`✅ Valid Files: ${totalValidFiles}/${REQUIRED_FILES.length}`);
    console.log(`🤝 Connections: ${totalConnections}`);
    console.log(`💪 Skills: ${totalSkills}`);
    console.log(`💼 Positions: ${totalPositions}`);
    
    if (totalValidFiles === REQUIRED_FILES.length) {
      console.log('\n🎉 All LinkedIn data files are present and ready for import!\n');
      
      console.log('🚀 Next Steps:');
      console.log('1. ✅ LinkedIn data validation complete');
      console.log('2. 🔧 Set up database infrastructure (Neo4j, Redis, Supabase)');
      console.log('3. 📥 Run LinkedIn data import process');
      console.log('4. 🧠 Access Connection Intelligence through ACT Farmhand AI');
      
      console.log('\n🤝 Connection Intelligence Features:');
      console.log('• Professional network analysis and insights');
      console.log('• Relationship strength scoring and recommendations');
      console.log('• Networking opportunity identification');
      console.log('• Cultural protocol-aware relationship management');
      console.log('• Privacy-first professional connection tracking');
      
      console.log('\n💡 Example Queries for ACT Farmhand AI:');
      console.log('• "Analyze my professional network and suggest networking strategies"');
      console.log('• "Who are my most valuable connections for community development?"');
      console.log('• "Import my LinkedIn data and create a relationship intelligence system"');
      console.log('• "Find collaboration opportunities within my professional network"');
      
    } else {
      console.log(`\n⚠️ ${REQUIRED_FILES.length - totalValidFiles} LinkedIn data files are missing.`);
      console.log('Please ensure all LinkedIn export files are placed in the Docs/LinkedIn directory.');
    }
    
  } catch (error) {
    console.error('❌ LinkedIn data validation failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Export your LinkedIn data from LinkedIn Settings → Data Privacy → Get a copy of your data');
    console.log('2. Extract the CSV files to: /Users/benknight/Code/ACT Placemat/Docs/LinkedIn/');
    console.log('3. Ensure files are named: Connections.csv, Profile.csv, Positions.csv, Skills.csv');
    
    process.exit(1);
  }
}

async function countRowsInCSV(filePath) {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Only count rows with actual data (skip empty rows)
        const hasData = Object.values(row).some(value => value && value.trim() !== '');
        if (hasData) rowCount++;
      })
      .on('end', () => resolve(rowCount))
      .on('error', (error) => reject(error));
  });
}

// Run validation
validateLinkedInData().catch(error => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});