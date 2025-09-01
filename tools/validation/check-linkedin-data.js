#!/usr/bin/env node

/**
 * Simple LinkedIn Data Check Script
 * 
 * Basic validation of LinkedIn data files using only Node.js built-ins
 */

import fs from 'fs/promises';
import { readFileSync } from 'fs';

const LINKEDIN_DATA_PATH = '/Users/benknight/Code/ACT Placemat/Docs/LinkedIn';

const REQUIRED_FILES = [
  { name: 'Connections.csv', description: 'Professional connections data' },
  { name: 'Profile.csv', description: 'Personal profile information' },
  { name: 'Positions.csv', description: 'Career history and positions' },
  { name: 'Skills.csv', description: 'Professional skills list' }
];

async function checkLinkedInData() {
  console.log('🤝 LinkedIn Data Integration Check\n');
  console.log('=================================\n');
  
  try {
    // Check if LinkedIn directory exists
    console.log(`📁 Checking LinkedIn data directory...`);
    await fs.access(LINKEDIN_DATA_PATH);
    console.log('✅ LinkedIn data directory found at:', LINKEDIN_DATA_PATH, '\n');
    
    let validFiles = 0;
    const fileSummary = [];
    
    // Check each required file
    for (const file of REQUIRED_FILES) {
      const filePath = `${LINKEDIN_DATA_PATH}/${file.name}`;
      console.log(`📊 Checking ${file.name}...`);
      
      try {
        const stats = await fs.stat(filePath);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const dataRows = Math.max(0, lines.length - 1); // Subtract header row
        
        console.log(`   ✅ Found: ${file.name} (${dataRows} data rows, ${(stats.size / 1024).toFixed(1)}KB)`);
        
        fileSummary.push({
          name: file.name,
          rows: dataRows,
          size: stats.size,
          description: file.description
        });
        
        validFiles++;
        
      } catch (error) {
        console.log(`   ❌ Missing: ${file.name}`);
        fileSummary.push({
          name: file.name,
          rows: 0,
          size: 0,
          description: file.description,
          missing: true
        });
      }
    }
    
    console.log('\n📈 LinkedIn Data Summary:');
    console.log('========================');
    console.log(`Files Found: ${validFiles}/${REQUIRED_FILES.length}`);
    
    let totalConnections = 0;
    let totalSkills = 0;
    let totalPositions = 0;
    
    fileSummary.forEach(file => {
      if (!file.missing) {
        console.log(`📄 ${file.name}: ${file.rows} records (${file.description})`);
        
        if (file.name === 'Connections.csv') totalConnections = file.rows;
        if (file.name === 'Skills.csv') totalSkills = file.rows;
        if (file.name === 'Positions.csv') totalPositions = file.rows;
      }
    });
    
    if (validFiles === REQUIRED_FILES.length) {
      console.log('\n🎉 All LinkedIn data files are ready for integration!\n');
      
      console.log('📊 Professional Network Overview:');
      console.log(`🤝 Professional Connections: ${totalConnections}`);
      console.log(`💪 Skills & Expertise: ${totalSkills}`);
      console.log(`💼 Career Positions: ${totalPositions}`);
      
      console.log('\n🚀 ACT Farmhand AI - Connection Intelligence Ready!');
      console.log('==================================================');
      console.log('Your LinkedIn data is now ready to be integrated into the');
      console.log('ACT Farmhand AI system for world-class relationship intelligence.\n');
      
      console.log('🧠 Connection Intelligence Features:');
      console.log('• Network analysis and professional relationship mapping');
      console.log('• Relationship strength scoring with cultural sensitivity');
      console.log('• Networking opportunity identification and recommendations');
      console.log('• Privacy-first professional connection management');
      console.log('• Community-focused networking strategies');
      console.log('• Cultural protocol-aware relationship building\n');
      
      console.log('💡 Next Steps:');
      console.log('1. ✅ LinkedIn data validation complete');
      console.log('2. 🏗️ Set up infrastructure (Neo4j, Redis, Kafka)');
      console.log('3. 📥 Import LinkedIn data into ACT Farmhand AI');
      console.log('4. 🤖 Query Connection Intelligence through the AI system');
      
      console.log('\n🎯 Example AI Queries:');
      console.log('• "Import my LinkedIn data and analyze my professional network"');
      console.log('• "Who are my most valuable connections for Indigenous community work?"');
      console.log('• "Suggest networking strategies that align with ACT values"');
      console.log('• "Find collaboration opportunities in my professional network"');
      console.log('• "Help me strengthen relationships with community-focused contacts"\n');
      
    } else {
      console.log(`\n⚠️  ${REQUIRED_FILES.length - validFiles} files missing for complete integration.`);
      
      console.log('\n📋 Missing Files:');
      fileSummary.forEach(file => {
        if (file.missing) {
          console.log(`❌ ${file.name} - ${file.description}`);
        }
      });
      
      console.log('\n🔧 How to get LinkedIn data:');
      console.log('1. Go to LinkedIn Settings & Privacy');
      console.log('2. Select "Data Privacy" → "Get a copy of your data"');
      console.log('3. Request CSV format export');
      console.log('4. Download and extract to:', LINKEDIN_DATA_PATH);
    }
    
  } catch (error) {
    console.log('❌ LinkedIn data directory not found');
    console.log('\n📁 Expected location:', LINKEDIN_DATA_PATH);
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Create the LinkedIn data directory');
    console.log('2. Export your LinkedIn data from LinkedIn');
    console.log('3. Place CSV files in the directory above');
  }
}

// Run the check
checkLinkedInData().catch(error => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});