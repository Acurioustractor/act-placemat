#!/usr/bin/env node

/**
 * ACT Ecosystem API Test Suite
 * End-to-end testing of unified ecosystem data systems
 */

async function testEcosystemAPIs() {
  console.log('🧪 Testing ACT Unified Ecosystem APIs...\n');

  const baseURL = 'http://localhost:4000';
  const tests = [];

  // Test 1: Basic health check
  tests.push({
    name: 'Basic server health',
    endpoint: '/health',
    expected: (data) => data.status === 'healthy'
  });

  // Test 2: Ecosystem health
  tests.push({
    name: 'Ecosystem health monitoring',
    endpoint: '/api/ecosystem-data/health',
    expected: (data) => data.success && data.data.all_systems_healthy
  });

  // Test 3: Ecosystem overview
  tests.push({
    name: 'Ecosystem overview dashboard',
    endpoint: '/api/ecosystem-data/overview',
    expected: (data) => data.success && data.data.ecosystem_summary
  });

  // Test 4: Data integrity check
  tests.push({
    name: 'Data integrity verification',
    endpoint: '/api/ecosystem-data/integrity',
    expected: (data) => data.success && data.ecosystem_ready
  });

  // Test 5: Sync status
  tests.push({
    name: 'Synchronization status',
    endpoint: '/api/ecosystem-data/sync/status',
    expected: (data) => data.success && data.data.overall_sync_health > 0.8
  });

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      
      const response = await fetch(`${baseURL}${test.endpoint}`);
      const data = await response.json();
      
      if (response.ok && test.expected(data)) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} - ${JSON.stringify(data).slice(0, 100)}...`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ FAIL: ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }

  // Test 6: Value event creation
  console.log('\n🔍 Testing: Value generation event creation');
  try {
    const valueEventResponse = await fetch(`${baseURL}/api/ecosystem-data/value-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        community_id: 'test_community_123',
        event_type: 'api_test',
        event_description: 'Testing value event creation via API',
        total_value_generated: 1000,
        value_dimensions: { monetary: 600, social: 250, cultural: 150 }
      })
    });

    const valueEventData = await valueEventResponse.json();
    
    if (valueEventResponse.ok && valueEventData.success && valueEventData.community_benefit_amount === 400) {
      console.log('✅ PASS: Value generation event creation (40% guarantee verified)');
      passed++;
    } else {
      console.log('❌ FAIL: Value generation event creation');
      failed++;
    }
    
  } catch (error) {
    console.log(`❌ FAIL: Value generation event creation - Error: ${error.message}`);
    failed++;
  }

  // Test 7: Governance decision creation
  console.log('\n🔍 Testing: Governance decision creation');
  try {
    const governanceResponse = await fetch(`${baseURL}/api/ecosystem-data/governance/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        community_id: 'test_community_123',
        decision_type: 'api_test',
        decision_title: 'Test governance decision via API',
        decision_description: 'Testing democratic decision making API endpoint'
      })
    });

    const governanceData = await governanceResponse.json();
    
    if (governanceResponse.ok && governanceData.success && governanceData.cultural_consultation_required) {
      console.log('✅ PASS: Governance decision creation (cultural protocols verified)');
      passed++;
    } else {
      console.log('❌ FAIL: Governance decision creation');
      failed++;
    }
    
  } catch (error) {
    console.log(`❌ FAIL: Governance decision creation - Error: ${error.message}`);
    failed++;
  }

  // Results summary
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ACT ECOSYSTEM API TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed} tests`);
  console.log(`❌ Failed: ${failed} tests`);
  console.log(`📊 Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Unified ecosystem data systems are operational!');
    console.log('💚 ACT community ecosystem is ready for community value creation');
    console.log('🚜 Data systems connecting everything systematically as requested');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review and fix before deployment.`);
  }
  
  console.log('\n📋 Available API Endpoints:');
  console.log('   🏥 Health: /api/ecosystem-data/health');
  console.log('   📊 Overview: /api/ecosystem-data/overview');
  console.log('   🏘️ Communities: /api/ecosystem-data/communities');
  console.log('   💎 Value Events: POST /api/ecosystem-data/value-events');
  console.log('   🗳️ Governance: POST /api/ecosystem-data/governance/decisions');
  console.log('   💰 Profit Distribution: /api/ecosystem-data/community/:id/profit-distribution');
  console.log('   🔄 Sync Control: /api/ecosystem-data/sync/status');
  console.log('   ✅ Data Integrity: /api/ecosystem-data/integrity');
}

testEcosystemAPIs();