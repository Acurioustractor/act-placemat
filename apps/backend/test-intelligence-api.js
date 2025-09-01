#!/usr/bin/env node

/**
 * Test script for consolidated Intelligence API
 * Tests key endpoints to verify the consolidation is working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

// Test endpoints
const tests = [
  {
    name: 'Status Check',
    endpoint: '/api/v1/intelligence/status',
    method: 'GET',
  },
  {
    name: 'Health Check',
    endpoint: '/api/v1/intelligence/health',
    method: 'GET',
  },
  {
    name: 'Examples',
    endpoint: '/api/v1/intelligence/examples',
    method: 'GET',
  },
  {
    name: 'Universal Query (No Auth)',
    endpoint: '/api/v1/intelligence/query',
    method: 'POST',
    body: {
      query: 'Test intelligence consolidation',
      mode: 'universal',
    },
  },
  {
    name: 'Quick Insight',
    endpoint: '/api/v1/intelligence/quick-insight',
    method: 'POST',
    body: {
      topic: 'test',
      dataType: 'general',
      limit: 3,
    },
  },
];

async function runTest(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);

    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (test.body) {
      options.body = JSON.stringify(test.body);
      console.log(`   Body: ${JSON.stringify(test.body, null, 2)}`);
    }

    const response = await fetch(`${BASE_URL}${test.endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Response keys: ${Object.keys(data).join(', ')}`);

      // Show specific success indicators
      if (data.success !== undefined) {
        console.log(`   🎯 Success: ${data.success}`);
      }
      if (data.intelligence) {
        console.log(`   🤖 Intelligence status: ${data.intelligence.status}`);
        console.log(
          `   🔌 Available modes: ${Object.keys(data.intelligence.availableModes).length}`
        );
      }
      if (data.result) {
        console.log(`   🧠 AI Provider: ${data.result.provider || 'unknown'}`);
        console.log(`   🎯 Confidence: ${data.result.confidence || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ⚠️  Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Testing ACT Intelligence API v1 Consolidation');
  console.log('='.repeat(50));

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/health`);
    if (!healthCheck.ok) {
      console.log('❌ Server not responding. Make sure the backend is running:');
      console.log('   cd apps/backend && npm run dev');
      process.exit(1);
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Cannot connect to server. Make sure the backend is running:');
    console.log('   cd apps/backend && npm run dev');
    console.log(`   Error: ${error.message}`);
    process.exit(1);
  }

  // Run all tests
  for (const test of tests) {
    await runTest(test);
  }

  console.log('\n🎉 Intelligence API Consolidation Test Complete!');
  console.log('='.repeat(50));

  console.log('\n📚 Next Steps:');
  console.log('1. Review INTELLIGENCE_MIGRATION_GUIDE.md for endpoint changes');
  console.log('2. Update client code to use v1/intelligence endpoints');
  console.log('3. Test with actual AI providers (set API keys in .env)');
  console.log('4. Monitor /api/v1/intelligence/provider-status for AI health');
}

main().catch(console.error);
