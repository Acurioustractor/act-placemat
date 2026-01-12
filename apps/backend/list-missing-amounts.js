/**
 * List subscriptions missing amounts with Gmail links for manual review
 *
 * Since domain-wide delegation isn't configured, this script provides
 * a manual workflow: generate Gmail links for each subscription so the
 * user can review the PDF attachments and manually enter amounts.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function listMissingAmounts() {
  console.log('🔍 Finding subscriptions missing amounts...\n');

  // Query subscriptions with high quality score but missing amounts
  const { data: subscriptions, error } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true)
    .gte('data_quality_score', 7)
    .is('amount', null)
    .not('gmail_message_id', 'is', null)
    .order('vendor');

  if (error) {
    console.error('Database query failed:', error);
    return;
  }

  console.log(`Found ${subscriptions.length} subscriptions to review\n`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Group by vendor for better organization
  const byVendor = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.vendor]) acc[sub.vendor] = [];
    acc[sub.vendor].push(sub);
    return acc;
  }, {});

  for (const [vendor, subs] of Object.entries(byVendor)) {
    console.log(`📦 ${vendor} (${subs.length} ${subs.length === 1 ? 'receipt' : 'receipts'})`);
    console.log('─'.repeat(70));

    for (const sub of subs) {
      console.log(`\n  📧 Email: ${sub.account_email}`);
      console.log(`  📝 Subject: ${sub.subject}`);
      console.log(`  📅 Date: ${sub.transaction_date || 'Unknown'}`);
      console.log(`  🔗 Gmail: https://mail.google.com/mail/u/0/#all/${sub.gmail_message_id}`);
      console.log(`  🆔 ID: ${sub.id}`);
    }

    console.log('\n');
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📋 MANUAL REVIEW WORKFLOW:');
  console.log('─'.repeat(70));
  console.log('1. Click each Gmail link above');
  console.log('2. Download and review the PDF attachment');
  console.log('3. Extract the total amount from the invoice');
  console.log('4. Update the database with this SQL:');
  console.log('\n   UPDATE email_financial_documents');
  console.log('   SET amount = <AMOUNT>,');
  console.log('       metadata = jsonb_set(');
  console.log('         COALESCE(metadata, \'{}\'::jsonb),');
  console.log('         \'{manual_entry}\',');
  console.log('         \'true\'');
  console.log('       )');
  console.log('   WHERE id = \'<ID>\';');
  console.log('\n   Example:');
  console.log('   UPDATE email_financial_documents');
  console.log('   SET amount = 29.99,');
  console.log('       metadata = jsonb_set(');
  console.log('         COALESCE(metadata, \'{}\'::jsonb),');
  console.log('         \'{manual_entry}\',');
  console.log('         \'true\'');
  console.log('       )');
  console.log('   WHERE id = \'12345678-1234-1234-1234-123456789012\';');
  console.log('\n');

  // Also generate a CSV for bulk import
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📊 CSV FORMAT (for bulk update):');
  console.log('─'.repeat(70));
  console.log('id,vendor,subject,gmail_link,amount');

  for (const sub of subscriptions) {
    const gmailLink = `https://mail.google.com/mail/u/0/#all/${sub.gmail_message_id}`;
    console.log(`${sub.id},${sub.vendor},"${sub.subject}",${gmailLink},`);
  }

  console.log('\n');
  console.log('💡 TIP: Copy the CSV output above, add amounts in the last column,');
  console.log('   then use a script to bulk update the database.');
  console.log('\n');
}

listMissingAmounts()
  .then(() => {
    console.log('✨ Review list complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Error:', err);
    process.exit(1);
  });
