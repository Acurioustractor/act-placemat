/**
 * Add Known Vendor Emails
 *
 * Manually add known vendor billing/support emails for common services
 * This is faster than waiting for Gmail OAuth refresh
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📧 ADDING KNOWN VENDOR EMAILS\n');
console.log('='.repeat(80));

// Known vendor billing/support emails for common services
const KNOWN_VENDOR_EMAILS = {
  'Xero': 'support@xero.com',
  'Descript': 'support@descript.com',
  'Webflow': 'support@webflow.com',
  'Stripe': 'support@stripe.com',
  'Paddle': 'support@paddle.com',
  'Midjourney Inc': 'support@midjourney.com',
  'Midjourney': 'support@midjourney.com',
  'Amazon Prime': 'account-update@amazon.com',
  'Primevideo': 'account-update@amazon.com',
  'Cloudconvert': 'support@cloudconvert.com',
  'Garmin Australasia': 'support@garmin.com',
  'Garmin': 'support@garmin.com',
  'Vidzflow': 'support@vidzflow.io',
  'Only Domains': 'support@onlydomains.com',
  'noreply@tm.openai.com': 'team@openai.com', // OpenAI Team Management
  'Tm': 'team@openai.com',
  '13cabs': 'accounts@13cabs.com.au',
  'Greyhound': 'customerservice@greyhound.com.au',
  'BP': 'customerservice@bp.com',
  'Cars on Booking.com': 'customer.service@booking.com',
  'Booking.com': 'customer.service@booking.com',
  'Paystay South Wharf Melbourne': 'info@paystay.com.au',
  'Orange Sky Laund': 'admin@orangesky.org.au',
  'Accounts': null, // Unknown - needs manual lookup
  'Act': null // Unknown - needs manual lookup
};

async function addVendorEmails() {
  try {
    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('id, vendor, vendor_contact_email')
      .eq('tenant_id', TENANT_ID);

    if (error) throw error;

    console.log(`\n📋 Processing ${subscriptions.length} subscriptions\n`);

    let added = 0;
    let skipped = 0;
    let notFound = 0;

    for (const sub of subscriptions) {
      // Skip if already has vendor email
      if (sub.vendor_contact_email) {
        console.log(`   ⏭️  ${sub.vendor}: Already set (${sub.vendor_contact_email})`);
        skipped++;
        continue;
      }

      // Look up in known vendors
      const vendorEmail = KNOWN_VENDOR_EMAILS[sub.vendor];

      if (vendorEmail) {
        // Update database
        const { error: updateError } = await supabase
          .from('discovered_subscriptions')
          .update({
            vendor_contact_email: vendorEmail,
            vendor_contact_source: 'manual',
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.log(`   ❌ ${sub.vendor}: Database error - ${updateError.message}`);
        } else {
          console.log(`   ✅ ${sub.vendor}: ${vendorEmail}`);
          added++;
        }
      } else {
        console.log(`   ⚠️ ${sub.vendor}: Not in known vendors list`);
        notFound++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${added}`);
    console.log(`   Skipped (already set): ${skipped}`);
    console.log(`   Not found: ${notFound}`);

    // Show final state
    const { data: withEmail } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, vendor_contact_email, vendor_contact_source, account_email')
      .eq('tenant_id', TENANT_ID)
      .not('vendor_contact_email', 'is', null)
      .order('vendor');

    const { data: withoutEmail } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, account_email')
      .eq('tenant_id', TENANT_ID)
      .is('vendor_contact_email', null)
      .order('vendor');

    console.log(`\n\n✅ READY TO MIGRATE (${withEmail.length} subscriptions):\n`);
    withEmail.forEach(sub => {
      console.log(`   ${sub.vendor}`);
      console.log(`      Vendor: ${sub.vendor_contact_email}`);
      console.log(`      Source: ${sub.vendor_contact_source}`);
      console.log(`      Current: ${sub.account_email || 'unknown'}`);
      console.log('');
    });

    console.log(`\n⚠️  NEED MANUAL LOOKUP (${withoutEmail.length} subscriptions):\n`);
    withoutEmail.forEach(sub => {
      console.log(`   ${sub.vendor} (currently: ${sub.account_email || 'unknown'})`);
    });

    console.log('\n✅ COMPLETE!\n');
    console.log(`Ready to migrate: ${withEmail.length}/${subscriptions.length} (${(withEmail.length/subscriptions.length*100).toFixed(1)}%)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

addVendorEmails()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
