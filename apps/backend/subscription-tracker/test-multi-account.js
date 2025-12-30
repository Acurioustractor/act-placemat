#!/usr/bin/env node
/**
 * Multi-Account Gmail Scanner Test Script
 *
 * Tests Google Workspace service account configuration
 * Run: node test-multi-account.js
 */

import { MultiAccountScanner } from './services/gmail/multiAccountScanner.js';

console.log('🔍 Testing Multi-Account Gmail Scanning...\n');
console.log('═'.repeat(60));

const scanner = new MultiAccountScanner();

async function test() {
  try {
    console.log('\n📧 Scanning accounts for subscription receipts...');
    console.log('   - Timeframe: Last 1 month');
    console.log('   - Max results: 5 per query');
    console.log('');

    const messages = await scanner.scanAllAccounts({
      maxResults: 5,
      timeframe: '1m'
    });

    if (messages === null) {
      console.error('\n❌ FAILED: Multi-account scanning not available');
      console.error('');
      console.error('Possible reasons:');
      console.error('  1. Service account file not found at config/service-account.json');
      console.error('  2. GOOGLE_WORKSPACE_MULTI_ACCOUNT not set to true in .env');
      console.error('  3. Domain-wide delegation not configured in Admin Console');
      console.error('');
      console.error('See GOOGLE_WORKSPACE_SETUP_GUIDE.md for setup instructions');
      console.error('');
      console.error('Note: System will fall back to single-account OAuth automatically');
      process.exit(1);
    }

    console.log('\n✅ SUCCESS! Multi-account scanning is working!\n');
    console.log('═'.repeat(60));
    console.log(`\n📊 Results: Found ${messages.length} total messages\n`);

    // Calculate distribution by account
    const accountDist = {};
    messages.forEach(msg => {
      const acct = msg.accountEmail || 'unknown';
      accountDist[acct] = (accountDist[acct] || 0) + 1;
    });

    console.log('📈 Message Distribution:');
    Object.entries(accountDist).forEach(([email, count]) => {
      const percentage = ((count / messages.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`   ${email.padEnd(30)} ${count.toString().padStart(2)} (${percentage}%) ${bar}`);
    });

    // Show sample messages
    if (messages.length > 0) {
      console.log('\n📝 Sample Messages:');
      messages.slice(0, 3).forEach((msg, i) => {
        console.log(`\n   ${i + 1}. From: ${msg.accountEmail || 'unknown'}`);
        console.log(`      Subject: ${msg.payload?.headers?.find(h => h.name === 'Subject')?.value || 'N/A'}`);
        console.log(`      ID: ${msg.id}`);
      });
    }

    console.log('\n═'.repeat(60));
    console.log('\n✨ Multi-account scanning is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run full discovery scan across all accounts');
    console.log('  2. Monitor scan performance (target: <45s for 3 accounts)');
    console.log('  3. Compare results vs single-account scanning');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    console.error('Check the following:');
    console.error('  1. Service account JSON file exists and is valid');
    console.error('  2. Domain-wide delegation is configured correctly');
    console.error('  3. Account emails match exactly (case-sensitive)');
    console.error('  4. Gmail API is enabled in Google Cloud Console');
    console.error('');
    process.exit(1);
  }
}

test();
