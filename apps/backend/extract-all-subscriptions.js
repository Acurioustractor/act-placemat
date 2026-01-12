/**
 * Extract ALL Subscription Details - Full Run
 *
 * Processes all 191 subscription messages found across accounts
 * Extracts vendor, amount, frequency and stores in database
 */

import { MultiAccountScanner } from './subscription-tracker/services/gmail/multiAccountScanner.js';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('💰 FULL SUBSCRIPTION EXTRACTION - ALL 191 MESSAGES');
console.log('='.repeat(80));
console.log('');

const scanner = new MultiAccountScanner();

// Step 1: Scan for all messages
console.log('Step 1: Scanning for ALL subscription messages...\n');
const messages = await scanner.scanAllAccounts({
  maxResults: 500,
  timeframe: '2y'
});

console.log(`✅ Found ${messages.length} messages\n`);

// Step 2: Extract details from ALL messages
console.log('Step 2: Extracting details from ALL messages...\n');
console.log('This will take ~2-3 minutes with rate limiting...\n');

const subscriptions = [];
const BATCH_SIZE = 10;
const DELAY_MS = 2000;

for (let i = 0; i < messages.length; i += BATCH_SIZE) {
  const batch = messages.slice(i, i + BATCH_SIZE);
  const progress = ((i / messages.length) * 100).toFixed(1);

  console.log(`[${progress}%] Processing ${i+1}-${Math.min(i+BATCH_SIZE, messages.length)} of ${messages.length}...`);

  const batchPromises = batch.map(async (msg) => {
    try {
      const gmail = await scanner.getGmailClient(msg.accountEmail);
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const date = getHeader('Date');

      // Extract body
      let body = '';
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload?.parts) {
        const textPart = message.payload.parts.find(p =>
          p.mimeType === 'text/plain' || p.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      // Extract vendor from sender
      let vendor = from.match(/([^<]+)</)?.[1]?.trim() || from.split('@')[0];
      vendor = vendor.replace(/["\s]+/g, ' ').trim();

      // Extract amount - multiple patterns
      const amountPatterns = [
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,
        /(?:AUD|USD|EUR)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /total[:\s]+\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount[:\s]+\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /(?:paid|charged|billed)[:\s]+\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i
      ];

      let amount = null;
      for (const pattern of amountPatterns) {
        const match = body.match(pattern) || subject.match(pattern);
        if (match) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 100000) break; // Sanity check
        }
      }

      // Detect frequency
      let frequency = 'monthly'; // Default
      const text = (subject + ' ' + body).toLowerCase();
      if (text.includes('annual') || text.includes('yearly') || text.includes('/year')) {
        frequency = 'yearly';
      } else if (text.includes('quarterly') || text.includes('quarter')) {
        frequency = 'quarterly';
      } else if (text.includes('weekly') || text.includes('/week')) {
        frequency = 'weekly';
      }

      return {
        vendor,
        amount,
        frequency,
        accountEmail: msg.accountEmail,
        subject: subject.substring(0, 500),
        from,
        date,
        gmailMessageId: msg.id
      };

    } catch (error) {
      console.error(`  ❌ Error ${msg.id}:`, error.message.substring(0, 50));
      return null;
    }
  });

  const batchResults = await Promise.all(batchPromises);
  subscriptions.push(...batchResults.filter(r => r !== null));

  // Rate limiting delay
  if (i + BATCH_SIZE < messages.length) {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
}

console.log('');
console.log('='.repeat(80));
console.log('📊 EXTRACTION COMPLETE');
console.log('='.repeat(80));
console.log('');
console.log(`✅ Successfully extracted: ${subscriptions.length} subscriptions`);
console.log(`❌ Failed to extract: ${messages.length - subscriptions.length}`);
console.log('');

// Analyze by vendor
const byVendor = {};
subscriptions.forEach(sub => {
  const key = sub.vendor.toLowerCase().replace(/\s+/g, '');
  if (!byVendor[key]) {
    byVendor[key] = {
      vendor: sub.vendor,
      count: 0,
      accounts: new Set(),
      amounts: [],
      frequencies: new Set()
    };
  }
  byVendor[key].count++;
  byVendor[key].accounts.add(sub.accountEmail);
  if (sub.amount) byVendor[key].amounts.push(sub.amount);
  byVendor[key].frequencies.add(sub.frequency);
});

console.log('='.repeat(80));
console.log('💎 TOP VENDORS');
console.log('='.repeat(80));
console.log('');

const sorted = Object.values(byVendor).sort((a, b) => b.count - a.count);

sorted.forEach((v, i) => {
  const avgAmount = v.amounts.length > 0
    ? (v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length).toFixed(2)
    : 'N/A';

  const totalAnnual = v.amounts.length > 0
    ? v.amounts.reduce((sum, amt) => {
        const freq = Array.from(v.frequencies)[0] || 'monthly';
        const multiplier = freq === 'yearly' ? 1 : freq === 'quarterly' ? 4 : freq === 'weekly' ? 52 : 12;
        return sum + (amt * multiplier);
      }, 0).toFixed(2)
    : 'N/A';

  if (i < 30) { // Top 30
    console.log(`${(i+1).toString().padStart(2)}. ${v.vendor.padEnd(35)} | ${v.count} msgs | ${v.accounts.size} accts | avg $${avgAmount} | ~$${totalAnnual}/yr`);
  }
});

// Calculate total annual cost
const totalAnnualCost = Object.values(byVendor).reduce((sum, v) => {
  if (v.amounts.length === 0) return sum;
  const avgAmount = v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length;
  const freq = Array.from(v.frequencies)[0] || 'monthly';
  const multiplier = freq === 'yearly' ? 1 : freq === 'quarterly' ? 4 : freq === 'weekly' ? 52 : 12;
  return sum + (avgAmount * multiplier * v.count);
}, 0);

console.log('');
console.log('='.repeat(80));
console.log(`💰 ESTIMATED TOTAL ANNUAL COST: $${totalAnnualCost.toFixed(2)} AUD`);
console.log('='.repeat(80));
console.log('');

// Save to database
console.log('='.repeat(80));
console.log('💾 SAVING TO DATABASE');
console.log('='.repeat(80));
console.log('');

let savedCount = 0;
let duplicateCount = 0;
let errorCount = 0;

for (const sub of subscriptions) {
  try {
    const { error } = await supabase
      .from('email_financial_documents')
      .insert({
        tenant_id: TENANT_ID,
        document_type: 'subscription_receipt',
        vendor: sub.vendor,
        amount: sub.amount,
        currency: 'AUD',
        transaction_date: sub.date ? new Date(sub.date) : null,
        gmail_message_id: sub.gmailMessageId,
        account_email: sub.accountEmail,
        subject: sub.subject,
        from_email: sub.from,
        is_subscription: true,
        subscription_frequency: sub.frequency,
        extraction_method: 'structured_data',
        reconciliation_status: 'unmatched',
        processed_by: 'extract-all-subscriptions',
        created_at: new Date()
      });

    if (!error) {
      savedCount++;
    } else if (error.message.includes('duplicate key')) {
      duplicateCount++;
    } else {
      errorCount++;
      console.error(`❌ Error saving ${sub.vendor}:`, error.message.substring(0, 80));
    }
  } catch (error) {
    errorCount++;
  }
}

console.log(`✅ Saved: ${savedCount} new subscriptions`);
console.log(`⚠️  Duplicates: ${duplicateCount} (already in database)`);
console.log(`❌ Errors: ${errorCount}`);
console.log('');
console.log('='.repeat(80));
console.log('🎉 COMPLETE!');
console.log('='.repeat(80));
console.log('');
console.log('Next steps:');
console.log('1. Review subscriptions in database');
console.log('2. Run Xero reconciliation');
console.log('3. Build consolidation plan');
console.log('');
