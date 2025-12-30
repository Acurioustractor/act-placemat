/**
 * Standalone Subscription Discovery Test
 * Tests the discovery algorithm without full server
 */

import { SubscriptionDetector } from './services/discovery/subscriptionDetector.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚜 ACT Subscription Tracker - Discovery Test');
console.log('=' .repeat(50));
console.log('');

// Test configuration
const testTenantId = 'test-tenant-' + Date.now();

async function runDiscoveryTest() {
  try {
    console.log(`[Test] Starting discovery for tenant: ${testTenantId}`);
    console.log('');

    // Initialize detector
    const detector = new SubscriptionDetector(null, supabase);

    // Run discovery
    const startTime = Date.now();
    const subscriptions = await detector.discoverSubscriptions(testTenantId);
    const elapsed = Date.now() - startTime;

    // Results
    console.log('✅ Discovery Complete!');
    console.log('');
    console.log(`⏱️  Processing Time: ${elapsed}ms`);
    console.log(`📊 Subscriptions Found: ${subscriptions.length}`);
    console.log('');

    if (subscriptions.length > 0) {
      console.log('Top 5 Subscriptions (by confidence):');
      console.log('-' .repeat(50));

      subscriptions.slice(0, 5).forEach((sub, i) => {
        console.log(`\n${i + 1}. ${sub.vendor}`);
        console.log(`   Confidence: ${(sub.confidence * 100).toFixed(1)}%`);
        console.log(`   Amount: ${sub.amount ? `$${sub.amount}` : 'N/A'}`);
        console.log(`   Frequency: ${sub.frequency || 'unknown'}`);
        console.log(`   Signals: Gmail=${sub.signals.gmail.toFixed(2)} Xero=${sub.signals.xero.toFixed(2)} AI=${sub.signals.ai.toFixed(2)}`);
      });

      console.log('');
      console.log('Signal Distribution:');
      const dist = detector.signalDistribution(subscriptions);
      console.log(`  Both signals: ${dist.both}`);
      console.log(`  Gmail only: ${dist.gmailOnly}`);
      console.log(`  Xero only: ${dist.xeroOnly}`);
      console.log(`  Total: ${dist.total}`);
    } else {
      console.log('⚠️  No subscriptions found.');
      console.log('');
      console.log('This could mean:');
      console.log('  1. No Gmail messages match subscription patterns');
      console.log('  2. No Xero transactions show recurring patterns');
      console.log('  3. Confidence threshold is too high (current: 0.6)');
      console.log('');
      console.log('Try:');
      console.log('  - Check Gmail API credentials');
      console.log('  - Check Xero API credentials');
      console.log('  - Lower minSubscriptionConfidence in config/settings.js');
    }

    console.log('');
    console.log('=' .repeat(50));
    console.log('✅ Test Complete!');

  } catch (error) {
    console.error('');
    console.error('❌ Discovery Failed:');
    console.error(error.message);
    console.error('');
    console.error('Stack:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runDiscoveryTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
