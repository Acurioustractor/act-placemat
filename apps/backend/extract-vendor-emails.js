/**
 * Extract Vendor Contact Emails from Gmail
 *
 * For all subscriptions with Gmail message IDs, fetch the messages
 * and extract the sender email (From header) as the vendor contact email
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📧 EXTRACTING VENDOR CONTACT EMAILS FROM GMAIL\n');
console.log('='.repeat(80));

async function initializeGmail() {
  // Check if tokens exist and are valid
  if (!fs.existsSync('.gmail_tokens.json')) {
    console.log('\n⚠️  Gmail tokens not found!');
    console.log('Please run the Gmail OAuth flow first.\n');
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync('.gmail_tokens.json', 'utf8'));

  // Check if expired
  if (tokens.expiry_date && new Date(tokens.expiry_date) < new Date()) {
    console.log('\n⚠️  Gmail tokens expired!');
    console.log('Tokens expired on:', new Date(tokens.expiry_date));
    console.log('Please refresh the OAuth tokens.\n');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function parseEmailAddress(rawEmail) {
  if (!rawEmail) return null;

  // Extract email from "Name <email@domain.com>" format
  const match = rawEmail.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }

  // Return as-is if it looks like an email
  const trimmed = rawEmail.trim().toLowerCase();
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function isValidVendorEmail(email) {
  if (!email) return false;

  // Reject noreply addresses
  const rejectPatterns = [
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /notifications?@/i,
    /bounce/i,
    /mailer-daemon/i
  ];

  for (const pattern of rejectPatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  return true;
}

async function extractVendorEmails() {
  try {
    const gmail = await initializeGmail();

    // Fetch all subscriptions with Gmail IDs
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('id, vendor, gmail_message_id, vendor_contact_email')
      .eq('tenant_id', TENANT_ID)
      .not('gmail_message_id', 'is', null);

    if (error) throw error;

    console.log(`\n📋 Found ${subscriptions.length} subscriptions with Gmail receipts\n`);

    let extracted = 0;
    let skipped = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      try {
        // Skip if already has vendor email
        if (sub.vendor_contact_email) {
          console.log(`   ⏭️  ${sub.vendor}: Already has vendor email (${sub.vendor_contact_email})`);
          skipped++;
          continue;
        }

        // Fetch the Gmail message
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: sub.gmail_message_id,
          format: 'metadata',
          metadataHeaders: ['From', 'Reply-To']
        });

        const headers = response.data.payload.headers;

        // Try From header first
        let vendorEmail = null;
        let source = null;

        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        const replyToHeader = headers.find(h => h.name.toLowerCase() === 'reply-to');

        if (fromHeader) {
          const email = parseEmailAddress(fromHeader.value);
          if (email && isValidVendorEmail(email)) {
            vendorEmail = email;
            source = 'gmail_from';
          }
        }

        // Try Reply-To if From was noreply
        if (!vendorEmail && replyToHeader) {
          const email = parseEmailAddress(replyToHeader.value);
          if (email && isValidVendorEmail(email)) {
            vendorEmail = email;
            source = 'gmail_reply_to';
          }
        }

        if (vendorEmail) {
          // Update in database
          await supabase
            .from('discovered_subscriptions')
            .update({
              vendor_contact_email: vendorEmail,
              vendor_contact_source: source,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          console.log(`   ✅ ${sub.vendor}: ${vendorEmail} (${source})`);
          extracted++;
        } else {
          console.log(`   ⚠️ ${sub.vendor}: No valid email found (noreply or invalid)`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`   ❌ ${sub.vendor}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Extraction Summary:`);
    console.log(`   Extracted: ${extracted}`);
    console.log(`   Skipped (already set): ${skipped}`);
    console.log(`   Failed: ${errors}`);

    // Show breakdown
    const { data: finalSubs } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, vendor_contact_email, vendor_contact_source, account_email')
      .eq('tenant_id', TENANT_ID)
      .not('vendor_contact_email', 'is', null)
      .order('vendor');

    console.log(`\n✅ SUBSCRIPTIONS WITH VENDOR EMAILS (${finalSubs.length}):\n`);
    finalSubs.forEach(sub => {
      console.log(`   ${sub.vendor}`);
      console.log(`      Vendor: ${sub.vendor_contact_email}`);
      console.log(`      Source: ${sub.vendor_contact_source}`);
      console.log(`      Current account: ${sub.account_email || 'unknown'}`);
      console.log('');
    });

    // Show remaining
    const { data: remaining } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, account_email, xero_contact_id')
      .eq('tenant_id', TENANT_ID)
      .is('vendor_contact_email', null)
      .order('vendor');

    console.log(`\n⚠️  STILL NEED VENDOR EMAILS (${remaining.length}):\n`);
    remaining.forEach(sub => {
      console.log(`   ${sub.vendor}`);
      console.log(`      Current account: ${sub.account_email || 'unknown'}`);
      console.log(`      Has Xero contact: ${sub.xero_contact_id ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('\n✅ EXTRACTION COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

extractVendorEmails()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
