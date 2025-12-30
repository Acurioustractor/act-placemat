/**
 * Extract Vendor Emails from Xero and Dext
 *
 * Attempts to find vendor contact emails from:
 * 1. Xero contact email addresses
 * 2. Xero contact person emails
 * 3. Xero invoice/bill emails
 * 4. Dext receipt metadata (if available)
 */

import { createClient } from '@supabase/supabase-js';
import xeroTokenManager from './core/src/services/xeroTokenManager.js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📧 EXTRACTING VENDOR EMAILS FROM XERO & DEXT\n');
console.log('='.repeat(80));

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

async function extractFromXeroAndDext() {
  try {
    // Initialize Xero client
    const client = await xeroTokenManager.getAuthenticatedClient();
    const xeroTenantId = process.env.XERO_TENANT_ID;

    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('id, vendor, xero_contact_id, vendor_contact_email, vendor_contact_source')
      .eq('tenant_id', TENANT_ID);

    if (error) throw error;

    console.log(`\n📋 Processing ${subscriptions.length} subscriptions\n`);

    let fromXeroContact = 0;
    let fromXeroPerson = 0;
    let fromXeroInvoice = 0;
    let skipped = 0;
    let noXeroContact = 0;
    let noEmailFound = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      try {
        // Skip if already has vendor email from a reliable source
        if (sub.vendor_contact_email && sub.vendor_contact_source !== 'known_vendor') {
          console.log(`   ⏭️  ${sub.vendor}: Already has ${sub.vendor_contact_source} email (${sub.vendor_contact_email})`);
          skipped++;
          continue;
        }

        // Skip if no Xero contact
        if (!sub.xero_contact_id) {
          console.log(`   ⚠️ ${sub.vendor}: No Xero contact linked`);
          noXeroContact++;
          continue;
        }

        // Get Xero contact details
        const contactResponse = await client.accountingApi.getContact(xeroTenantId, sub.xero_contact_id);
        const contact = contactResponse.body.contacts?.[0];

        if (!contact) {
          console.log(`   ❌ ${sub.vendor}: Xero contact not found`);
          errors++;
          continue;
        }

        let vendorEmail = null;
        let source = null;

        // Strategy 1: Direct contact email
        if (contact.emailAddress && isValidVendorEmail(contact.emailAddress)) {
          vendorEmail = contact.emailAddress;
          source = 'xero_contact';
          fromXeroContact++;
        }

        // Strategy 2: Contact person email
        if (!vendorEmail && contact.contactPersons?.length > 0) {
          const person = contact.contactPersons.find(p => p.emailAddress && isValidVendorEmail(p.emailAddress));
          if (person?.emailAddress) {
            vendorEmail = person.emailAddress;
            source = 'xero_contact_person';
            fromXeroPerson++;
          }
        }

        // Strategy 3: Look at recent invoices/bills for this contact
        if (!vendorEmail) {
          try {
            const invoicesResponse = await client.accountingApi.getInvoices(
              xeroTenantId,
              undefined, // ifModifiedSince
              undefined, // where
              undefined, // order
              undefined, // ids
              undefined, // invoiceNumbers
              undefined, // contactIDs
              [contact.contactID], // contactIDs array
              undefined, // statuses
              undefined, // page
              undefined, // includeArchived
              undefined, // createdByMyApp
              undefined, // unitdp
              1 // pageSize - just get 1 to check
            );

            // Check if invoice has any email in notes or reference
            const invoice = invoicesResponse.body.invoices?.[0];
            if (invoice?.reference) {
              const emailMatch = invoice.reference.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (emailMatch && isValidVendorEmail(emailMatch[1])) {
                vendorEmail = emailMatch[1];
                source = 'xero_invoice_reference';
                fromXeroInvoice++;
              }
            }
          } catch (invoiceError) {
            // Ignore invoice errors, continue with other strategies
          }
        }

        if (vendorEmail) {
          // Update subscription with vendor email
          await supabase
            .from('discovered_subscriptions')
            .update({
              vendor_contact_email: vendorEmail,
              vendor_contact_source: source,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          console.log(`   ✅ ${sub.vendor}: ${vendorEmail} (${source})`);
        } else {
          console.log(`   ⚠️ ${sub.vendor}: Has Xero contact but no email found`);
          noEmailFound++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (error) {
        console.log(`   ❌ ${sub.vendor}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Extraction Summary:`);
    console.log(`   From Xero Contact: ${fromXeroContact}`);
    console.log(`   From Xero Contact Person: ${fromXeroPerson}`);
    console.log(`   From Xero Invoice: ${fromXeroInvoice}`);
    console.log(`   Skipped (already set): ${skipped}`);
    console.log(`   No Xero contact: ${noXeroContact}`);
    console.log(`   No email found: ${noEmailFound}`);
    console.log(`   Errors: ${errors}`);

    // Show final state
    const { data: withEmail } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, vendor_contact_email, vendor_contact_source, account_email')
      .eq('tenant_id', TENANT_ID)
      .not('vendor_contact_email', 'is', null)
      .order('vendor');

    const { data: withoutEmail } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, account_email, xero_contact_id')
      .eq('tenant_id', TENANT_ID)
      .is('vendor_contact_email', null)
      .order('vendor');

    console.log(`\n\n✅ SUBSCRIPTIONS WITH VENDOR EMAILS (${withEmail?.length || 0}):\n`);
    withEmail?.forEach(sub => {
      console.log(`   ${sub.vendor}`);
      console.log(`      Vendor: ${sub.vendor_contact_email}`);
      console.log(`      Source: ${sub.vendor_contact_source}`);
      console.log(`      Current: ${sub.account_email || 'unknown'}`);
      console.log('');
    });

    console.log(`\n⚠️  STILL NEED VENDOR EMAILS (${withoutEmail?.length || 0}):\n`);
    withoutEmail?.forEach(sub => {
      console.log(`   ${sub.vendor} (currently: ${sub.account_email || 'unknown'})`);
      console.log(`      Has Xero contact: ${sub.xero_contact_id ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('\n✅ EXTRACTION COMPLETE!\n');
    console.log(`Ready to migrate: ${withEmail?.length || 0}/${subscriptions.length} (${((withEmail?.length || 0)/subscriptions.length*100).toFixed(1)}%)\\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

extractFromXeroAndDext()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
