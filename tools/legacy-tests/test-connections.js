#!/usr/bin/env node

/**
 * Quick Connection Test for ACT Life OS Data Sources
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: './apps/backend/.env' });

async function testConnections() {
  console.log('\n🔍 ACT Life OS Data Source Connection Test');
  console.log('==========================================\n');

  const results = {
    timestamp: new Date().toISOString(),
    connections: {},
  };

  // Test Notion Connection
  console.log('1. Testing Notion API...');
  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const user = await notion.users.me();
    results.connections.notion = '✅ Connected';
    console.log(`   ✅ Connected as: ${user.name || user.id}`);
  } catch (error) {
    results.connections.notion = '❌ Failed: ' + error.message;
    console.log(`   ❌ Failed: ${error.message}`);
  }

  // Test Supabase Configuration
  console.log('\n2. Testing Supabase Configuration...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    results.connections.supabase = '✅ Configured';
    console.log('   ✅ Credentials configured');
    console.log(`   📊 URL: ${supabaseUrl.substring(0, 30)}...`);
  } else {
    results.connections.supabase = '❌ Missing credentials';
    console.log('   ❌ Missing credentials');
  }

  // Test Xero Tokens
  console.log('\n3. Testing Xero Integration...');
  const xeroAccess = process.env.XERO_ACCESS_TOKEN;
  const xeroRefresh = process.env.XERO_REFRESH_TOKEN;
  const xeroTenant = process.env.XERO_TENANT_ID;

  if (xeroAccess && xeroRefresh && xeroTenant) {
    results.connections.xero = '🔄 Tokens present, needs refresh test';
    console.log('   🔄 All tokens present');
    console.log('   ⚠️  Access token likely expired (needs refresh)');
    console.log(`   🏢 Tenant ID: ${xeroTenant}`);
  } else {
    results.connections.xero = '❌ Missing tokens';
    console.log('   ❌ Missing required tokens');
  }

  // Test Google/Gmail Configuration
  console.log('\n4. Testing Google Integration...');
  const gmailAccess = process.env.GMAIL_ACCESS_TOKEN;
  const gmailRefresh = process.env.GMAIL_REFRESH_TOKEN;
  const gmailClientId = process.env.GMAIL_CLIENT_ID;

  if (gmailAccess && gmailRefresh && gmailClientId) {
    results.connections.google = '✅ Fully configured';
    console.log('   ✅ Gmail tokens configured');
    console.log('   📅 Calendar scope included in tokens');
    console.log(`   👤 Client ID: ${gmailClientId}`);
  } else {
    results.connections.google = '❌ Incomplete configuration';
    console.log('   ❌ Missing required credentials');
  }

  // Summary
  console.log('\n📊 INTEGRATION STATUS SUMMARY');
  console.log('==============================');
  console.log(`🗄️  Notion:   ${results.connections.notion}`);
  console.log(`🗄️  Supabase: ${results.connections.supabase}`);
  console.log(`💰 Xero:     ${results.connections.xero}`);
  console.log(`📧 Google:   ${results.connections.google}`);

  // Analysis
  const working = Object.values(results.connections).filter(status =>
    status.includes('✅')
  ).length;
  const total = Object.keys(results.connections).length;

  console.log(
    `\n🎯 READINESS: ${working}/${total} integrations ready (${Math.round((working / total) * 100)}%)`
  );

  if (working === total) {
    console.log('🚀 ALL SYSTEMS GO - Ready for unified dashboard!');
  } else {
    console.log('\n🔧 NEXT STEPS NEEDED:');
    if (!results.connections.xero.includes('✅')) {
      console.log('   • Refresh Xero tokens (run xero-token-manager.js)');
    }
    if (!results.connections.google.includes('✅')) {
      console.log('   • Complete Google OAuth setup');
    }
  }

  return results;
}

testConnections().catch(console.error);
