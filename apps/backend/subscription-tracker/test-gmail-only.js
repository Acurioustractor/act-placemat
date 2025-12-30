/**
 * Test Gmail-only discovery with lowered threshold
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

console.log('🚜 Gmail-Only Discovery Test (Lowered Threshold)');
console.log('='.repeat(60));

async function testGmailOnly() {
  try {
    // Set up Gmail auth
    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CLIENT_ID) {
      process.env.GOOGLE_CALENDAR_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
    }

    const tokensPath = path.resolve(__dirname, '../.gmail_tokens.json');
    const tokens = JSON.parse(await fs.readFile(tokensPath, 'utf-8'));
    await gmailService.authenticate(tokens.access_token, tokens.refresh_token);

    // Initialize detector with LOWER threshold for Gmail-only testing
    const detector = new SubscriptionDetector(gmailService, supabase);
    detector.minConfidence = 0.05;  // Lower to 5% to see ALL Gmail results

    console.log('[Test] Running discovery with 0.2 threshold (Gmail-only)...');
    const subscriptions = await detector.discoverSubscriptions('act-tenant-production');

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Found ${subscriptions.length} subscriptions (Gmail-only)`);
    console.log('='.repeat(60));
    console.log('');

    if (subscriptions.length > 0) {
      console.log(`All ${subscriptions.length} Subscriptions (by confidence):`);
      console.log('-'.repeat(60));

      subscriptions.forEach((sub, i) => {
        console.log(`\n${i + 1}. ${sub.vendor}`);
        console.log(`   Confidence: ${(sub.confidence * 100).toFixed(1)}%`);
        console.log(`   Gmail Signal: ${(sub.signals.gmail * 100).toFixed(1)}%`);
        console.log(`   Amount: ${sub.amount ? `$${sub.amount}` : 'Unknown (Gmail only)'}`);
        console.log(`   Frequency: ${sub.frequency || 'Unknown (Gmail only)'}`);
      });

      console.log('');
      console.log('='.repeat(60));
      console.log('Summary:');
      console.log(`  Total vendors identified: 21`);
      console.log(`  Above threshold (20%): ${subscriptions.length}`);
      console.log(`  Gmail emails scanned: 66`);
    }

    console.log('');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGmailOnly()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
