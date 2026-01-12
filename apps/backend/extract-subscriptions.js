/**
 * Extract Subscription Details from Gmail Messages
 *
 * Fetches full message content and extracts vendor, amount, frequency
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

console.log('💰 EXTRACTING SUBSCRIPTION DETAILS');
console.log('='.repeat(80));
console.log('');

const scanner = new MultiAccountScanner();

// Step 1: Scan for messages
console.log('Step 1: Scanning for subscription messages...\n');
const messages = await scanner.scanAllAccounts({
  maxResults: 500,
  timeframe: '2y'
});

console.log(`Found ${messages.length} messages\n`);

// Step 2: Extract details from each message
console.log('Step 2: Extracting subscription details...\n');

const subscriptions = [];
const BATCH_SIZE = 10;

for (let i = 0; i < Math.min(messages.length, 50); i += BATCH_SIZE) {
  const batch = messages.slice(i, i + BATCH_SIZE);

  console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${i+1}-${Math.min(i+BATCH_SIZE, messages.length)} of ${messages.length})...`);

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

      // Extract amount using regex (looking for $XX.XX or AUD XX.XX patterns)
      const amountPatterns = [
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,
        /(?:AUD|USD|EUR)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /total[:\s]+\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount[:\s]+\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i
      ];

      let amount = null;
      for (const pattern of amountPatterns) {
        const match = body.match(pattern) || subject.match(pattern);
        if (match) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      // Detect frequency
      let frequency = 'monthly'; // Default
      const text = (subject + ' ' + body).toLowerCase();
      if (text.includes('annual') || text.includes('yearly') || text.includes('year')) {
        frequency = 'yearly';
      } else if (text.includes('quarterly') || text.includes('quarter')) {
        frequency = 'quarterly';
      } else if (text.includes('weekly') || text.includes('week')) {
        frequency = 'weekly';
      }

      return {
        vendor,
        amount,
        frequency,
        accountEmail: msg.accountEmail,
        subject,
        from,
        date,
        gmailMessageId: msg.id
      };

    } catch (error) {
      console.error(`  Error processing ${msg.id}:`, error.message);
      return null;
    }
  });

  const batchResults = await Promise.all(batchPromises);
  subscriptions.push(...batchResults.filter(r => r !== null));

  // Small delay between batches
  if (i + BATCH_SIZE < messages.length) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

console.log('');
console.log('='.repeat(80));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(80));
console.log('');
console.log(`Total subscriptions extracted: ${subscriptions.length}`);
console.log('');

// Group by vendor
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

// Show top vendors
console.log('Top 20 Vendors by message count:');
console.log('');

const sorted = Object.values(byVendor).sort((a, b) => b.count - a.count).slice(0, 20);

sorted.forEach((v, i) => {
  const avgAmount = v.amounts.length > 0
    ? (v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length).toFixed(2)
    : 'N/A';

  console.log(`${(i+1).toString().padStart(2)}. ${v.vendor.padEnd(30)} - ${v.count} messages, ${v.accounts.size} accounts, avg $${avgAmount}`);
});

console.log('');
console.log('='.repeat(80));
console.log('💾 SAVING TO DATABASE');
console.log('='.repeat(80));
console.log('');

// Save to email_financial_documents table
let savedCount = 0;
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
        subject: sub.subject?.substring(0, 500),
        from_email: sub.from,
        is_subscription: true,
        subscription_frequency: sub.frequency,
        extraction_method: 'structured_data',
        reconciliation_status: 'unmatched',
        processed_by: 'comprehensive-scan',
        created_at: new Date()
      })
      .select();

    if (!error) {
      savedCount++;
    } else if (!error.message.includes('duplicate key')) {
      console.error(`Error saving ${sub.vendor}:`, error.message);
    }
  } catch (error) {
    // Skip duplicates silently
  }
}

console.log(`✅ Saved ${savedCount} new subscriptions to database`);
console.log('');
console.log('Next: Run reconciliation with Xero to match bank transactions');
console.log('');
