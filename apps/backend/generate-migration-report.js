/**
 * Generate Final Migration-Ready Report
 *
 * Comprehensive report showing:
 * 1. Current email account distribution (which ACT email has which subscriptions)
 * 2. Vendor contact email status
 * 3. Migration priorities
 * 4. Next action items
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📊 SUBSCRIPTION MIGRATION READINESS REPORT\n');
console.log('='.repeat(80));

async function generateReport() {
  try {
    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('migration_priority', { ascending: false });

    if (error) throw error;

    console.log(`\n📋 Total Subscriptions: ${subscriptions.length}\n`);

    // ========================================
    // 1. EMAIL ACCOUNT DISTRIBUTION
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('1. CURRENT EMAIL ACCOUNT DISTRIBUTION');
    console.log('='.repeat(80));

    const byEmail = subscriptions.reduce((acc, sub) => {
      const email = sub.account_email || 'UNKNOWN';
      if (!acc[email]) acc[email] = [];
      acc[email].push(sub);
      return acc;
    }, {});

    for (const [email, subs] of Object.entries(byEmail).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n📧 ${email.toUpperCase()} (${subs.length} subscriptions)`);
      console.log('-'.repeat(80));

      const monthlyTotal = subs.reduce((sum, sub) => {
        if (!sub.amount) return sum;
        const multiplier = { monthly: 1, quarterly: 0.33, yearly: 0.083 }[sub.frequency] || 0;
        return sum + (sub.amount * multiplier);
      }, 0);

      console.log(`Monthly cost: $${monthlyTotal.toFixed(2)}\n`);

      subs.forEach((sub, i) => {
        const priority = sub.migration_priority >= 60 ? '🔴' : sub.migration_priority >= 40 ? '🟡' : '🟢';
        const hasVendorEmail = sub.vendor_contact_email ? '✅' : '❌';

        console.log(`${i + 1}. ${priority} ${sub.vendor}`);
        console.log(`   Amount: $${sub.amount?.toFixed(2) || '?'}/${sub.frequency || '?'}`);
        console.log(`   Priority: ${sub.migration_priority}/100`);
        console.log(`   Vendor Email: ${hasVendorEmail} ${sub.vendor_contact_email || 'NOT FOUND'}`);
        if (sub.vendor_contact_source) {
          console.log(`   Source: ${sub.vendor_contact_source}`);
        }
        console.log('');
      });
    }

    // ========================================
    // 2. VENDOR EMAIL STATUS
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. VENDOR CONTACT EMAIL STATUS');
    console.log('='.repeat(80));

    const withEmail = subscriptions.filter(s => s.vendor_contact_email);
    const withoutEmail = subscriptions.filter(s => !s.vendor_contact_email);

    console.log(`\n✅ Ready to Contact: ${withEmail.length}/${subscriptions.length} (${(withEmail.length/subscriptions.length*100).toFixed(1)}%)`);
    console.log(`❌ Missing Vendor Email: ${withoutEmail.length}/${subscriptions.length}\n`);

    const bySource = withEmail.reduce((acc, sub) => {
      const source = sub.vendor_contact_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    console.log('Vendor Email Sources:');
    for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${source}: ${count}`);
    }

    if (withoutEmail.length > 0) {
      console.log(`\n\n⚠️  Subscriptions Missing Vendor Emails:\n`);
      withoutEmail.forEach((sub, i) => {
        console.log(`${i + 1}. ${sub.vendor}`);
        console.log(`   Current Email: ${sub.account_email || 'unknown'}`);
        console.log(`   Amount: $${sub.amount?.toFixed(2) || '?'}/${sub.frequency || '?'}`);
        console.log(`   Has Xero Contact: ${sub.xero_contact_id ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // ========================================
    // 3. MIGRATION PRIORITIES
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('3. MIGRATION PRIORITY BREAKDOWN');
    console.log('='.repeat(80));

    const highPriority = subscriptions.filter(s => s.migration_priority >= 60);
    const mediumPriority = subscriptions.filter(s => s.migration_priority >= 40 && s.migration_priority < 60);
    const lowPriority = subscriptions.filter(s => s.migration_priority < 40);

    console.log(`\n🔴 High Priority (60+): ${highPriority.length}`);
    console.log(`🟡 Medium Priority (40-59): ${mediumPriority.length}`);
    console.log(`🟢 Low Priority (<40): ${lowPriority.length}\n`);

    if (highPriority.length > 0) {
      console.log('High Priority Subscriptions:\n');
      highPriority.forEach((sub, i) => {
        const hasEmail = sub.vendor_contact_email ? '✅' : '❌';
        console.log(`${i + 1}. ${sub.vendor} (Priority: ${sub.migration_priority})`);
        console.log(`   ${hasEmail} Vendor: ${sub.vendor_contact_email || 'NEEDS EMAIL'}`);
        console.log(`   Current: ${sub.account_email || 'unknown'}`);
        console.log(`   Amount: $${sub.amount?.toFixed(2) || '?'}/${sub.frequency || '?'}`);
        console.log('');
      });
    }

    // ========================================
    // 4. FINANCIAL SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('4. FINANCIAL SUMMARY');
    console.log('='.repeat(80));

    const totalAnnual = subscriptions.reduce((sum, sub) => {
      if (!sub.amount) return sum;
      const multiplier = {
        monthly: 12,
        quarterly: 4,
        yearly: 1
      }[sub.frequency] || 0;
      return sum + (sub.amount * multiplier);
    }, 0);

    const totalMonthly = totalAnnual / 12;

    console.log(`\nTotal Annual Cost: $${totalAnnual.toFixed(2)}`);
    console.log(`Average Monthly Cost: $${totalMonthly.toFixed(2)}\n`);

    // By frequency
    const byFrequency = subscriptions.reduce((acc, sub) => {
      const freq = sub.frequency || 'unknown';
      if (!acc[freq]) acc[freq] = { count: 0, total: 0 };
      acc[freq].count++;
      if (sub.amount) {
        const annualAmount = {
          monthly: sub.amount * 12,
          quarterly: sub.amount * 4,
          yearly: sub.amount
        }[freq] || 0;
        acc[freq].total += annualAmount;
      }
      return acc;
    }, {});

    console.log('By Frequency:');
    for (const [freq, data] of Object.entries(byFrequency)) {
      console.log(`  ${freq}: ${data.count} subscriptions ($${data.total.toFixed(2)}/year)`);
    }

    // ========================================
    // 5. NEXT ACTION ITEMS
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('5. NEXT ACTION ITEMS');
    console.log('='.repeat(80));

    console.log('\n📋 Immediate Actions:\n');

    if (withoutEmail.length > 0) {
      console.log(`1. 🔍 Find Vendor Emails for ${withoutEmail.length} Subscriptions:`);
      withoutEmail.forEach(sub => {
        console.log(`   - ${sub.vendor}`);
      });
      console.log('');
    }

    const readyToContact = withEmail.filter(s => s.account_email && s.account_email !== 'unknown');
    const needAccountEmail = withEmail.filter(s => !s.account_email || s.account_email === 'unknown');

    if (needAccountEmail.length > 0) {
      console.log(`2. 📧 Identify Current Email Account for ${needAccountEmail.length} Subscriptions:`);
      console.log(`   These have vendor emails but we don't know which ACT email receives them`);
      needAccountEmail.forEach(sub => {
        console.log(`   - ${sub.vendor} (vendor: ${sub.vendor_contact_email})`);
      });
      console.log('');
    }

    console.log(`3. 📤 Ready to Contact Vendors: ${readyToContact.length} Subscriptions`);
    console.log(`   These have both vendor email AND current account email`);
    console.log(`   Can use automated email system to request migration to accounts@act.place\n`);

    const hiAtMissing = byEmail['hi@act.place']?.length || 0;
    const nicholasMissing = byEmail['nicholas@act.place']?.length || 0;

    if (hiAtMissing === 0 || nicholasMissing === 0) {
      console.log('4. 🔄 Configure Multi-Account Gmail Scanning:');
      if (hiAtMissing === 0) {
        console.log('   - Add OAuth for hi@act.place (0 subscriptions found - likely incomplete)');
      }
      if (nicholasMissing === 0) {
        console.log('   - Add OAuth for nicholas@act.place (0 subscriptions found - likely incomplete)');
      }
      console.log('   - Re-run discovery to find all subscriptions\n');
    }

    // ========================================
    // 6. MIGRATION TEMPLATE PREVIEW
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('6. EMAIL TEMPLATE PREVIEW (First Ready Subscription)');
    console.log('='.repeat(80));

    if (readyToContact.length > 0) {
      const example = readyToContact[0];
      console.log(`\nTo: ${example.vendor_contact_email}`);
      console.log(`Subject: Update Billing Email for ${example.vendor} - A Curious Tractor\n`);
      console.log(`Hi ${example.vendor} Team,`);
      console.log(``);
      console.log(`I'm writing to update our billing email address for our subscription.`);
      console.log(``);
      console.log(`Current Email: ${example.account_email}`);
      console.log(`New Email: accounts@act.place`);
      console.log(``);
      console.log(`Could you please update your records to send all invoices and billing`);
      console.log(`notifications to the new email address?`);
      console.log(``);
      console.log(`Thank you!`);
      console.log(``);
      console.log(`Best regards,`);
      console.log(`Nicholas Morgan`);
      console.log(`A Curious Tractor`);
      console.log(`accounts@act.place`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ REPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nSummary:`);
    console.log(`  Total Subscriptions: ${subscriptions.length}`);
    console.log(`  Ready to Migrate: ${readyToContact.length} (${(readyToContact.length/subscriptions.length*100).toFixed(1)}%)`);
    console.log(`  Missing Vendor Email: ${withoutEmail.length}`);
    console.log(`  Missing Account Email: ${needAccountEmail.length}`);
    console.log(`  Annual Cost: $${totalAnnual.toFixed(2)}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

generateReport()
  .then(() => {
    console.log('Report generated successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Report failed:', error);
    process.exit(1);
  });
