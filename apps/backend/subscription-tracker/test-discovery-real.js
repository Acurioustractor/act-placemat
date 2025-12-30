/**
 * Test subscription discovery with real ACT data
 */

import { SubscriptionDetector } from './services/discovery/subscriptionDetector.js';
import gmailService from '../core/src/services/gmailService.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚜 ACT Subscription Tracker - Real Data Discovery Test');
console.log('='.repeat(60));
console.log('');
console.log('Using real ACT Gmail and Xero data...');
console.log('');

const testTenantId = 'act-tenant-production';

async function runRealDiscovery() {
  try {
    console.log('[Test] Initializing discovery with real services...');

    // Authenticate Gmail service with tokens
    // Note: gmailService expects GOOGLE_CALENDAR_CLIENT_ID env vars
    // Setting them from GOOGLE_CLIENT_ID if not present
    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CLIENT_ID) {
      process.env.GOOGLE_CALENDAR_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
    }

    const tokensPath = path.resolve(__dirname, '../.gmail_tokens.json');
    const tokens = JSON.parse(await fs.readFile(tokensPath, 'utf-8'));

    await gmailService.authenticate(tokens.access_token, tokens.refresh_token);
    console.log('[Test] ✅ Gmail authenticated successfully');

    // Initialize detector with real Gmail service
    const detector = new SubscriptionDetector(gmailService, supabase);

    console.log('[Test] Starting discovery scan...');
    console.log('');

    const startTime = Date.now();
    const subscriptions = await detector.discoverSubscriptions(testTenantId);
    const elapsed = Date.now() - startTime;

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Discovery Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log(`⏱️  Processing Time: ${elapsed}ms`);
    console.log(`📊 Subscriptions Found: ${subscriptions.length}`);
    console.log('');

    if (subscriptions.length > 0) {
      console.log('');
      console.log('Top 10 Subscriptions (by confidence):');
      console.log('-'.repeat(60));

      subscriptions.slice(0, 10).forEach((sub, i) => {
        console.log(`\n${i + 1}. ${sub.vendor}`);
        console.log(`   Confidence: ${(sub.confidence * 100).toFixed(1)}%`);
        console.log(`   Amount: ${sub.amount ? `$${sub.amount}` : 'N/A'}`);
        console.log(`   Frequency: ${sub.frequency || 'unknown'}`);
        console.log(`   Signals: Gmail=${sub.signals.gmail.toFixed(2)} Xero=${sub.signals.xero.toFixed(2)} AI=${sub.signals.ai.toFixed(2)}`);
        console.log(`   Sources: ${sub.sources.hasGmail ? 'Gmail ' : ''}${sub.sources.hasXero ? 'Xero' : ''}`);
      });

      console.log('');
      console.log('Signal Distribution:');
      const dist = detector.signalDistribution(subscriptions);
      console.log(`  📧 Gmail only: ${dist.gmailOnly}`);
      console.log(`  💰 Xero only: ${dist.xeroOnly}`);
      console.log(`  🎯 Both signals: ${dist.both}`);
      console.log(`  📊 Total: ${dist.total}`);

      // Calculate potential savings
      const lowConfidence = subscriptions.filter(s => s.confidence < 0.8 && s.amount);
      if (lowConfidence.length > 0) {
        const savings = lowConfidence.reduce((sum, sub) => {
          const annual = sub.frequency === 'monthly' ? sub.amount * 12 :
                        sub.frequency === 'yearly' ? sub.amount : sub.amount * 12;
          return sum + annual;
        }, 0);

        console.log('');
        console.log('💡 Potential Savings Opportunity:');
        console.log(`   ${lowConfidence.length} low-confidence subscriptions`);
        console.log(`   Est. annual cost: $${savings.toFixed(2)}`);
        console.log('   Consider reviewing these for cancellation');
      }
    } else {
      console.log('');
      console.log('ℹ️  No subscriptions found in this scan.');
      console.log('');
      console.log('Possible reasons:');
      console.log('  • No subscription-related emails in Gmail');
      console.log('  • No recurring Xero transactions in last 90 days');
      console.log('  • Confidence threshold too high (current: 0.6)');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Discovery Failed:');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack:');
    console.error(error.stack);
    process.exit(1);
  }
}

runRealDiscovery()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
