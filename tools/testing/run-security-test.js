#!/usr/bin/env node

import SecurityPenetrationTest from './security-penetration-test.js';

async function runTest() {
  const securityTest = new SecurityPenetrationTest({
    baseURL: process.env.SECURITY_TEST_URL || 'http://localhost:4000'
  });
  
  try {
    console.log('Starting security test...');
    const initialized = await securityTest.initialize();
    if (initialized) {
      console.log('Running authentication tests...');
      const results = await securityTest.runAllTests();
      console.log('Generating report...');
      const report = await securityTest.generateReport();
      console.log('Security test completed successfully');
    } else {
      console.log('Failed to initialize security test');
    }
  } catch (error) {
    console.error('❌ Security testing failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest();