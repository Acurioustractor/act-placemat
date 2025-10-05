#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Test table structure
async function testTableStructure() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
    url.searchParams.append('select', '*');
    url.searchParams.append('limit', '1');

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test simple insert
async function testSimpleInsert() {
  return new Promise((resolve, reject) => {
    const testData = {
      first_name: "Test",
      last_name: "User",
      data_source: "test"
    };

    const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
    const postData = JSON.stringify(testData);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Insert Status: ${res.statusCode}`);
        console.log('Insert Response:', data);
        resolve(data);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Testing LinkedIn table structure...\n');
  
  try {
    await testTableStructure();
    console.log('\n✅ Table query successful');
    
    console.log('\n🧪 Testing simple insert...');
    await testSimpleInsert();
    console.log('\n✅ Insert test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
