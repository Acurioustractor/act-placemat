#!/usr/bin/env node

import IntegrationLoadTest from './integration-load-test.js';

async function runTest() {
  console.log('Starting integration and load test...');
  
  const integrationTest = new IntegrationLoadTest({
    maxUsers: 20, // Reduced for testing
    testDuration: 15000, // 15 seconds
    baseURL: 'http://localhost:4000',
    frontendURL: 'http://localhost:5173'
  });
  
  try {
    console.log('Initializing test suite...');
    await integrationTest.initialize();
    
    console.log('Running health checks...');
    await integrationTest.testSystemHealth();
    
    console.log('Running integration tests...');
    await integrationTest.testIntegrationScenarios();
    
    console.log('Monitoring system resources...');
    await integrationTest.monitorSystemResources();
    
    console.log('Running load tests...');
    await integrationTest.runAllLoadTests();
    
    console.log('Generating report...');
    const report = await integrationTest.generateReport();
    
    console.log('Integration and load testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration & Load testing failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest();