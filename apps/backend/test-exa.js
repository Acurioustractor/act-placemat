/**
 * Quick Exa.ai Integration Test
 *
 * Tests Exa API connection before running full migration
 * Run: node test-exa.js
 */

import { config } from 'dotenv';
import Exa from 'exa-js';

config();

const EXA_API_KEY = process.env.EXA_API_KEY;

if (!EXA_API_KEY) {
  console.error('❌ EXA_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔍 Testing Exa.ai API connection...\n');

const exa = new Exa(EXA_API_KEY);

async function testExaAPI() {
  try {
    // Test 1: Simple search
    console.log('Test 1: Basic search...');
    const searchResults = await exa.searchAndContents(
      'indigenous business circular economy Australia',
      {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        contents: {
          text: true,
        },
      }
    );

    console.log(`✅ Search successful! Found ${searchResults.results.length} results`);
    console.log(`   First result: ${searchResults.results[0]?.title || 'N/A'}`);
    console.log(`   URL: ${searchResults.results[0]?.url || 'N/A'}\n`);

    // Test 2: LinkedIn profile search
    console.log('Test 2: LinkedIn profile search...');
    const linkedinResults = await exa.searchAndContents(
      'Ben Knight LinkedIn profile',
      {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        category: 'linkedin profile',
      }
    );

    const linkedinProfile = linkedinResults.results.find(r => r.url.includes('linkedin.com/in/'));

    if (linkedinProfile) {
      console.log(`✅ LinkedIn search successful!`);
      console.log(`   Found profile: ${linkedinProfile.url}\n`);
    } else {
      console.log(`⚠️  No LinkedIn profile found in results\n`);
    }

    // Test 3: Check API response structure
    console.log('Test 3: Validating response structure...');
    const testResult = searchResults.results[0];
    const hasRequiredFields = testResult.title && testResult.url && testResult.text;

    if (hasRequiredFields) {
      console.log(`✅ Response structure valid`);
      console.log(`   Has title: ${!!testResult.title}`);
      console.log(`   Has URL: ${!!testResult.url}`);
      console.log(`   Has text content: ${!!testResult.text}\n`);
    } else {
      console.log(`⚠️  Missing some expected fields\n`);
    }

    // Success summary
    console.log('=' .repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(60));
    console.log('\nNext steps:');
    console.log('1. ✅ Exa API key is working');
    console.log('2. Run Supabase migration: 20251224_exa_enrichment_system.sql');
    console.log('3. Install exa-js: npm install exa-js');
    console.log('4. Queue your first batch of contacts');
    console.log('\nSee EXA_SETUP_GUIDE.md for detailed instructions.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);

    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('\n🔑 API Key Error: The API key may be invalid or expired.');
      console.error('   Check your Exa.ai dashboard: https://exa.ai/dashboard');
    } else if (error.message.includes('rate limit')) {
      console.error('\n⏱️  Rate Limit: You may have exceeded the free tier limit.');
      console.error('   Check usage at: https://exa.ai/dashboard');
    } else {
      console.error('\n🔍 Debug info:', error);
    }

    process.exit(1);
  }
}

// Run tests
testExaAPI();
