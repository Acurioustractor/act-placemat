/**
 * Enrich Subscriptions with Gmail Account Emails
 *
 * For each subscription with a Gmail message ID, fetch the message
 * and extract the "To" header to identify which email account received it
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

console.log('\n📧 ENRICHING SUBSCRIPTIONS WITH GMAIL ACCOUNT EMAILS\n');
console.log('='.repeat(80));

async function initializeGmail() {
  // Load OAuth tokens
  const tokens = JSON.parse(fs.readFileSync('.gmail_tokens.json', 'utf8'));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function enrichSubscriptions() {
  try {
    const gmail = await initializeGmail();

    // Fetch all subscriptions with Gmail IDs
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('id, vendor, gmail_message_id, account_email')
      .eq('tenant_id', TENANT_ID)
      .not('gmail_message_id', 'is', null);

    if (error) throw error;

    console.log(`\n📋 Found ${subscriptions.length} subscriptions with Gmail IDs\n`);

    let enriched = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      try {
        // Fetch the Gmail message
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: sub.gmail_message_id,
          format: 'metadata',
          metadataHeaders: ['To', 'Delivered-To', 'X-Received-For']
        });

        const headers = response.data.payload.headers;

        // Try different headers to find the recipient
        let recipientEmail = null;

        const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
        const deliveredToHeader = headers.find(h => h.name.toLowerCase() === 'delivered-to');
        const xReceivedFor = headers.find(h => h.name.toLowerCase() === 'x-received-for');

        if (deliveredToHeader) {
          recipientEmail = deliveredToHeader.value;
        } else if (toHeader) {
          // Extract email from "Name <email@domain.com>" format
          const match = toHeader.value.match(/<([^>]+)>/);
          recipientEmail = match ? match[1] : toHeader.value;
        } else if (xReceivedFor) {
          recipientEmail = xReceivedFor.value;
        }

        if (recipientEmail) {
          // Clean up email
          recipientEmail = recipientEmail.trim().toLowerCase();

          // Update in database
          await supabase
            .from('discovered_subscriptions')
            .update({
              account_email: recipientEmail,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          console.log(`   ✅ ${sub.vendor}: ${recipientEmail}`);
          enriched++;
        } else {
          console.log(`   ⚠️ ${sub.vendor}: No recipient email found`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`   ❌ ${sub.vendor}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Enrichment Summary:`);
    console.log(`   Enriched: ${enriched}`);
    console.log(`   Errors: ${errors}`);

    // Show email breakdown
    const { data: finalSubs } = await supabase
      .from('discovered_subscriptions')
      .select('account_email')
      .eq('tenant_id', TENANT_ID)
      .not('account_email', 'is', null);

    const emailBreakdown = finalSubs.reduce((acc, s) => {
      acc[s.account_email] = (acc[s.account_email] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📧 Subscriptions by email account:`);
    Object.entries(emailBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([email, count]) => {
        console.log(`   ${email}: ${count} subscription${count > 1 ? 's' : ''}`);
      });

    console.log('\n✅ ENRICHMENT COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

enrichSubscriptions()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
