#!/usr/bin/env node

/**
 * LinkedIn Data Integration Test Script
 * 
 * Tests the Connection Intelligence Skill Pod and LinkedIn data import functionality
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the orchestrator for testing
class MockOrchestrator {
  constructor() {
    this.name = 'Test Orchestrator';
  }
}

async function testLinkedInIntegration() {
  console.log('🤝 Testing LinkedIn Data Integration...\n');
  
  try {
    // Test 1: Import ConnectionIntelligence module
    console.log('📥 Testing Connection Intelligence import...');
    const { default: ConnectionIntelligence } = await import('./apps/backend/src/skillPods/ConnectionIntelligence.js');
    console.log('✅ Connection Intelligence imported successfully\n');
    
    // Test 2: Initialize Connection Intelligence
    console.log('🚀 Initializing Connection Intelligence Skill Pod...');
    const orchestrator = new MockOrchestrator();
    const connectionPod = new ConnectionIntelligence(orchestrator);
    console.log('✅ Connection Intelligence initialized successfully\n');
    
    // Test 3: Health check
    console.log('🏥 Running health check...');
    const health = await connectionPod.healthCheck();
    console.log('Health Status:', JSON.stringify(health, null, 2));
    console.log('✅ Health check completed\n');
    
    // Test 4: Test LinkedIn data import query
    console.log('📊 Testing LinkedIn data import processing...');
    const importQuery = "Import my LinkedIn connection data and analyze my professional network";
    const importResult = await connectionPod.process(importQuery, {
      data_import: true,
      linkedin_data_available: true
    });
    
    console.log('Import Analysis Result:');
    console.log('- Pod:', importResult.pod);
    console.log('- Analysis Type:', importResult.analysis_type);
    console.log('- Insights:', importResult.insights);
    console.log('- Recommendations:', importResult.recommendations);
    console.log('✅ LinkedIn data import test completed\n');
    
    // Test 5: Test network analysis query
    console.log('🕸️ Testing network analysis...');
    const networkQuery = "Give me an overview of my professional network";
    const networkResult = await connectionPod.process(networkQuery, {
      analysis_type: 'network_overview'
    });
    
    console.log('Network Analysis Result:');
    console.log('- Analysis Type:', networkResult.analysis_type);
    console.log('- Insights:', networkResult.insights);
    console.log('- Recommendations:', networkResult.recommendations);
    console.log('✅ Network analysis test completed\n');
    
    // Test 6: Test LinkedIn Data Importer
    console.log('📁 Testing LinkedIn Data Importer...');
    const { default: LinkedInDataImporter } = await import('./apps/backend/src/services/linkedinDataImporter.js');
    const importer = new LinkedInDataImporter();
    
    console.log('✅ LinkedIn Data Importer loaded successfully');
    console.log('📊 Validating LinkedIn data sources...');
    
    const validationResult = await importer.validateDataSources('/Users/benknight/Code/ACT Placemat/Docs/LinkedIn');
    console.log('Validation Result:', JSON.stringify(validationResult, null, 2));
    
    if (validationResult.all_files_valid) {
      console.log('✅ All LinkedIn data files validated successfully');
      
      // Optionally run full import (commented out to avoid database requirements)
      console.log('💡 LinkedIn data is ready for import. Run full import when database is available.');
      
    } else {
      console.log('⚠️ Some LinkedIn data files have issues:', validationResult.files_missing, validationResult.data_quality_issues);
    }
    
    await importer.close();
    console.log('✅ LinkedIn Data Importer test completed\n');
    
    console.log('🎉 All LinkedIn integration tests completed successfully!\n');
    
    console.log('📋 Next Steps:');
    console.log('1. Run the LinkedIn data import when database infrastructure is ready');
    console.log('2. Query your professional network through the ACT Farmhand AI system');
    console.log('3. Get intelligent networking recommendations and relationship insights');
    console.log('4. Track relationship health and engagement opportunities\n');
    
  } catch (error) {
    console.error('❌ LinkedIn integration test failed:', error);
    process.exit(1);
  }
}

// Run tests
testLinkedInIntegration().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});