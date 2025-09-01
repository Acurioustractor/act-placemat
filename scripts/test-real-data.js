#!/usr/bin/env node

/**
 * Test script to check what REAL data is available from ACT backend
 * This will tell us what's working vs what's bullshit
 */

const endpoints = [
  'http://localhost:4000/',
  'http://localhost:4000/api/health',
  'http://localhost:4000/api/notion/projects',
  'http://localhost:4000/api/notion/people',
  'http://localhost:4000/api/intelligence/health',
  'http://localhost:4000/api/intelligence/system-health',
  'http://localhost:4000/api/supabase/health'
];

async function testEndpoint(url) {
  try {
    console.log(`\n🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const status = response.status;
    
    if (status === 200) {
      const data = await response.text();
      const isJson = response.headers.get('content-type')?.includes('application/json');
      
      if (isJson && data) {
        const json = JSON.parse(data);
        console.log(`✅ SUCCESS (${status}): ${Object.keys(json).length} keys`);
        
        // Show sample data structure
        if (Array.isArray(json)) {
          console.log(`   📊 Array with ${json.length} items`);
          if (json.length > 0) {
            console.log(`   📝 Sample item keys: ${Object.keys(json[0]).join(', ')}`);
          }
        } else {
          console.log(`   📝 Object keys: ${Object.keys(json).slice(0, 10).join(', ')}`);
        }
      } else {
        console.log(`✅ SUCCESS (${status}): ${data.length} chars of data`);
      }
    } else {
      console.log(`❌ FAILED (${status}): ${response.statusText}`);
    }
  } catch (error) {
    console.log(`🔴 ERROR: ${error.message}`);
  }
}

async function main() {
  console.log('🚜 ACT REAL DATA TEST');
  console.log('====================================');
  console.log('Testing what actually works vs what\'s fake...\n');

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }

  console.log('\n====================================');
  console.log('🎯 CONCLUSION: Use the ✅ SUCCESS endpoints for REAL data');
  console.log('🔴 Ignore anything that fails - those are the fake/broken parts');
}

main().catch(console.error);
