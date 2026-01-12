/**
 * Comprehensive Subscription Discovery
 *
 * Scans ALL act.place accounts for subscription receipts over 2 years
 * to build complete picture of all recurring expenses
 */

import { MultiAccountScanner } from './subscription-tracker/services/gmail/multiAccountScanner.js';

console.log('🔍 COMPREHENSIVE SUBSCRIPTION DISCOVERY');
console.log('='.repeat(80));
console.log('');
console.log('Scanning ALL act.place accounts for subscription receipts...');
console.log('Timeframe: Last 2 years (to catch annual subscriptions)');
console.log('Max results: 500 per query');
console.log('');

const scanner = new MultiAccountScanner();

// Comprehensive scan with broader search
const messages = await scanner.scanAllAccounts({
  maxResults: 500,  // More results per query
  timeframe: '2y'   // 2 years back
});

console.log('');
console.log('='.repeat(80));
console.log('📊 SCAN RESULTS');
console.log('='.repeat(80));
console.log('');
console.log('Total financial messages found:', messages.length);
console.log('');

// Group by account
const byAccount = {};
messages.forEach(msg => {
  if (!byAccount[msg.accountEmail]) {
    byAccount[msg.accountEmail] = [];
  }
  byAccount[msg.accountEmail].push(msg);
});

console.log('Distribution by account:');
for (const [email, msgs] of Object.entries(byAccount)) {
  console.log('  ' + email.padEnd(25) + ': ' + msgs.length + ' messages');
}

console.log('');
console.log('Sample message IDs (for detailed extraction):');
Object.entries(byAccount).forEach(([email, msgs]) => {
  if (msgs.length > 0) {
    console.log('');
    console.log('  ' + email + ':');
    msgs.slice(0, 5).forEach((msg, i) => {
      console.log('    ' + (i+1) + '. ' + msg.id);
    });
  }
});

console.log('');
console.log('='.repeat(80));
console.log('✅ FULL SCAN COMPLETE!');
console.log('');
console.log('Next steps:');
console.log('1. Extract vendor names and amounts from these messages');
console.log('2. Deduplicate subscriptions (same vendor across accounts)');
console.log('3. Reconcile with Xero bank transactions');
console.log('4. Build automated monitoring and alerting');
console.log('');
