/**
 * Test Multi-Account Gmail Scanner
 *
 * Tests if service account delegation is working properly
 * to scan all ACT email accounts (hi@, nicholas@, accounts@, benjamin@)
 */

import { MultiAccountScanner } from './subscription-tracker/services/gmail/multiAccountScanner.js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

console.log('\n🔍 TESTING MULTI-ACCOUNT GMAIL SCANNER\n');
console.log('='.repeat(80));

async function testMultiAccountScan() {
  try {
    const scanner = new MultiAccountScanner();

    console.log('\n📋 Configuration:');
    console.log(`   Service Account Path: ${scanner.serviceAccountPath}`);
    console.log(`   Accounts to scan: ${scanner.accounts.join(', ')}`);
    console.log(`   Domain: ${scanner.domain}\n`);

    console.log('🔄 Starting multi-account scan...\n');

    const messages = await scanner.scanAllAccounts({
      maxResults: 200,  // More messages to find subscriptions
      timeframe: '1y'   // Last 1 year
    });

    if (messages === null) {
      console.log('\n❌ Multi-account scan failed - check domain-wide delegation setup');
      console.log('\nTo fix:');
      console.log('1. Go to https://admin.google.com');
      console.log('2. Security → API Controls → Domain-wide Delegation');
      console.log('3. Add service account client ID with scope: https://www.googleapis.com/auth/gmail.readonly');
      console.log('4. Client ID can be found in service-account.json → client_id\n');
      process.exit(1);
    }

    console.log(`\n✅ Scan successful! Found ${messages.length} messages\n`);

    // Group by account
    const byAccount = messages.reduce((acc, msg) => {
      const email = msg.accountEmail || 'unknown';
      if (!acc[email]) acc[email] = [];
      acc[email].push(msg);
      return acc;
    }, {});

    console.log('📧 Messages by account:\n');
    for (const [email, msgs] of Object.entries(byAccount)) {
      console.log(`   ${email}: ${msgs.length} messages`);
    }

    console.log('\n📊 Sample messages:\n');
    messages.slice(0, 5).forEach((msg, i) => {
      console.log(`${i + 1}. Account: ${msg.accountEmail}`);
      console.log(`   Message ID: ${msg.id}`);
      console.log(`   Thread ID: ${msg.threadId}`);
      console.log('');
    });

    console.log('✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testMultiAccountScan();
