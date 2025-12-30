/**
 * Final Comprehensive Subscription Report
 *
 * Shows current state of all subscriptions including:
 * - Which ACT email account they're sent to
 * - Vendor contact emails (if found)
 * - Migration status and priorities
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📊 COMPREHENSIVE SUBSCRIPTION REPORT\n');
console.log('='.repeat(100));

async function generateReport() {
  const { data: subscriptions } = await supabase
    .from('discovered_subscriptions')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('account_email', { ascending: true, nullsFirst: false });

  // Group by email account
  const byEmail = subscriptions.reduce((acc, sub) => {
    const email = sub.account_email || 'UNKNOWN';
    if (!acc[email]) acc[email] = [];
    acc[email].push(sub);
    return acc;
  }, {});

  // Print report
  for (const [email, subs] of Object.entries(byEmail).sort()) {
    console.log(`\n\n📧 ${email.toUpperCase()} (${subs.length} subscriptions)`);
    console.log('-'.repeat(100));

    // Sort by priority within each email
    subs.sort((a, b) => (b.migration_priority || 0) - (a.migration_priority || 0));

    subs.forEach((sub, i) => {
      const priority = sub.migration_priority >= 60 ? '🔴' :
                      sub.migration_priority >= 40 ? '🟡' : '🟢';

      console.log(`\n${i + 1}. ${priority} ${sub.vendor}`);
      console.log(`   💰 Amount: $${sub.amount?.toFixed(2) || '?'} / ${sub.frequency || '?'}`);
      console.log(`   📊 Priority: ${sub.migration_priority}/100`);
      console.log(`   📧 Vendor Email: ${sub.vendor_contact_email || 'NOT FOUND'}`);
      if (sub.vendor_contact_email) {
        console.log(`   📍 Source: ${sub.vendor_contact_source}`);
      }
      console.log(`   🏦 Xero Contact: ${sub.xero_contact_id ? 'Yes' : 'No'}`);
      console.log(`   📨 Gmail Receipt: ${sub.gmail_message_id ? 'Yes' : 'No'}`);

      // Show transaction dates if available
      if (sub.metadata?.transactionDates?.length > 0) {
        console.log(`   📅 Last seen: ${sub.metadata.transactionDates[sub.metadata.transactionDates.length - 1]}`);
      }
    });
  }

  // Summary statistics
  console.log('\n\n' + '='.repeat(100));
  console.log('📈 SUMMARY STATISTICS\n');

  const emailStats = Object.entries(byEmail).map(([email, subs]) => {
    const total = subs.reduce((sum, s) => {
      if (!s.amount) return sum;
      const mult = { monthly: 12, quarterly: 4, yearly: 1 }[s.frequency] || 0;
      return sum + (s.amount * mult);
    }, 0);

    return { email, count: subs.length, annualCost: total };
  });

  emailStats.sort((a, b) => b.count - a.count);

  console.log('By Email Account:');
  emailStats.forEach(stat => {
    console.log(`   ${stat.email}: ${stat.count} subs, $${stat.annualCost.toFixed(2)}/year`);
  });

  const withVendorEmail = subscriptions.filter(s => s.vendor_contact_email).length;
  const withXero = subscriptions.filter(s => s.xero_contact_id).length;
  const withGmail = subscriptions.filter(s => s.gmail_message_id).length;

  console.log(`\nData Sources:`);
  console.log(`   With Gmail receipts: ${withGmail}`);
  console.log(`   With Xero contacts: ${withXero}`);
  console.log(`   With vendor emails: ${withVendorEmail}`);

  const totalAnnual = subscriptions.reduce((sum, sub) => {
    if (!sub.amount) return sum;
    const mult = { monthly: 12, quarterly: 4, yearly: 1 }[sub.frequency] || 0;
    return sum + (sub.amount * mult);
  }, 0);

  console.log(`\nFinancial Summary:`);
  console.log(`   Total subscriptions: ${subscriptions.length}`);
  console.log(`   Estimated annual cost: $${totalAnnual.toFixed(2)}`);
  console.log(`   Monthly average: $${(totalAnnual / 12).toFixed(2)}`);

  console.log(`\n✅ Ready to migrate: ${withVendorEmail} subscriptions (${(withVendorEmail / subscriptions.length * 100).toFixed(1)}%)`);
  console.log(`⚠️  Need manual lookup: ${subscriptions.length - withVendorEmail} subscriptions`);

  console.log('\n' + '='.repeat(100));
  console.log('✅ REPORT COMPLETE!\n');
}

generateReport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
