/**
 * AI-Powered Amount Extraction
 *
 * Uses Claude to extract amounts from emails that have:
 * - amount = null
 * - amount = 0
 * - Missing financial data
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';
import Anthropic from '@anthropic-ai/sdk';
import { MultiAccountScanner } from './subscription-tracker/services/gmail/multiAccountScanner.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const scanner = new MultiAccountScanner();

console.log('🤖 AI-POWERED AMOUNT EXTRACTION');
console.log('='.repeat(80));
console.log('');

// Step 1: Find documents with missing amounts
console.log('Step 1: Finding subscriptions with missing amounts...\n');

const { data: missingAmounts, error } = await supabase
  .from('email_financial_documents')
  .select('*')
  .eq('tenant_id', TENANT_ID)
  .or('amount.is.null,amount.eq.0')
  .order('vendor');

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Found ${missingAmounts.length} documents with missing amounts\n`);

// Group by vendor
const byVendor = {};
missingAmounts.forEach(doc => {
  if (!byVendor[doc.vendor]) byVendor[doc.vendor] = [];
  byVendor[doc.vendor].push(doc);
});

console.log('Breakdown by vendor:');
Object.entries(byVendor)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([vendor, docs]) => {
    console.log(`  ${vendor}: ${docs.length} messages`);
  });

console.log('\n' + '='.repeat(80));
console.log('Step 2: Extracting amounts with AI...\n');

let processed = 0;
let extracted = 0;
let failed = 0;

for (const doc of missingAmounts) {
  processed++;

  try {
    // Fetch the full email content
    console.log(`[${processed}/${missingAmounts.length}] ${doc.vendor} (${doc.account_email})...`);

    // Get Gmail client for this account
    const gmailClient = await scanner.getGmailClient(doc.account_email);
    const gmail = gmailClient.gmail;

    // Fetch full message
    const gmailResponse = await gmail.users.messages.get({
      userId: 'me',
      id: doc.gmail_message_id,
      format: 'full'
    });

    const message = gmailResponse.data;

    if (!message) {
      console.log(`  ⚠️  No content found`);
      failed++;
      continue;
    }

    // Extract body text
    let body = '';
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    const snippet = message.snippet || body.substring(0, 200);

    // Use Claude to extract financial data
    const prompt = `Extract the subscription/payment amount from this email receipt.

Email from: ${doc.from_email || 'Unknown'}
Subject: ${doc.subject || 'Unknown'}
Content: ${snippet}
Body: ${body.substring(0, 1000)}

Return ONLY a JSON object with this exact format:
{
  "amount": <number or null>,
  "currency": "AUD" or "USD" or other,
  "frequency": "monthly" or "yearly" or "one-time" or null,
  "confidence": <0.0 to 1.0>
}

If no amount is found, return {"amount": null, "currency": null, "frequency": null, "confidence": 0.0}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0].text;
    const data = JSON.parse(text);

    if (data.amount && data.amount > 0) {
      // Update the database
      const { error: updateError } = await supabase
        .from('email_financial_documents')
        .update({
          amount: data.amount,
          currency: data.currency || 'AUD',
          subscription_frequency: data.frequency,
          confidence: data.confidence,
          extraction_method: 'ai'
        })
        .eq('id', doc.id);

      if (updateError) {
        console.log(`  ❌ Update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Extracted: $${data.amount} ${data.currency} (${data.frequency || 'unknown'} - ${(data.confidence * 100).toFixed(0)}% confidence)`);
        extracted++;
      }
    } else {
      console.log(`  ⚠️  No amount found (confidence: ${(data.confidence * 100).toFixed(0)}%)`);
      failed++;
    }

    // Rate limiting: 2 requests per second
    if (processed < missingAmounts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.log(`  ❌ Error: ${error.message.substring(0, 60)}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(80));
console.log('📊 AI EXTRACTION COMPLETE');
console.log('='.repeat(80));
console.log('');
console.log(`✅ Successfully extracted: ${extracted}`);
console.log(`⚠️  No amount found:       ${failed}`);
console.log(`📈 Success rate:          ${((extracted / processed) * 100).toFixed(1)}%`);
console.log('');
console.log('='.repeat(80));
console.log('🎯 NEXT STEP');
console.log('='.repeat(80));
console.log('');
console.log('Run reconciliation again:');
console.log('  node apps/backend/reconcile-direct.js');
console.log('');
