/**
 * Analyze and Enrich Existing Subscriptions
 *
 * Reviews all existing subscriptions in the database and:
 * 1. Identifies which email account each subscription is from
 * 2. Enriches with Xero contact email addresses
 * 3. Calculates migration priorities
 * 4. Generates comprehensive report
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

console.log('\n📊 SUBSCRIPTION ANALYSIS & ENRICHMENT\n');
console.log('='.repeat(80));

async function analyzeSubscriptions() {
  try {
    // ========================================
    // STEP 1: Fetch all subscriptions
    // ========================================
    console.log('\n📋 STEP 1: Fetching all subscriptions...\n');

    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('amount', { ascending: false });

    if (error) throw error;

    console.log(`   ✅ Found ${subscriptions.length} subscriptions\n`);

    // ========================================
    // STEP 2: Identify email sources
    // ========================================
    console.log('\n📧 STEP 2: Identifying email sources...\n');

    let fromGmail = 0;
    let fromXero = 0;
    let fromBoth = 0;
    let noSource = 0;

    const emailSources = {};

    for (const sub of subscriptions) {
      const hasGmail = sub.gmail_message_id || sub.metadata?.gmail_emails?.length > 0;
      const hasXero = sub.xero_contact_id;

      if (hasGmail && hasXero) {
        fromBoth++;
      } else if (hasGmail) {
        fromGmail++;
      } else if (hasXero) {
        fromXero++;
      } else {
        noSource++;
      }

      // Extract account email from metadata
      const accountEmail = sub.account_email ||
                          sub.metadata?.accountEmail ||
                          sub.metadata?.gmail_emails?.[0]?.to ||
                          'unknown';

      emailSources[accountEmail] = (emailSources[accountEmail] || 0) + 1;

      // Update account_email if not set
      if (!sub.account_email && accountEmail !== 'unknown') {
        await supabase
          .from('discovered_subscriptions')
          .update({ account_email: accountEmail })
          .eq('id', sub.id);
      }
    }

    console.log(`   Source breakdown:`);
    console.log(`   - Gmail only: ${fromGmail}`);
    console.log(`   - Xero only: ${fromXero}`);
    console.log(`   - Both: ${fromBoth}`);
    console.log(`   - No source: ${noSource}`);

    console.log(`\n   📧 Subscriptions by email account:`);
    Object.entries(emailSources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([email, count]) => {
        console.log(`      ${email}: ${count} subscription${count > 1 ? 's' : ''}`);
      });

    // ========================================
    // STEP 3: Enrich with Xero contact emails
    // ========================================
    console.log('\n\n🔍 STEP 3: Enriching with Xero contact emails...\n');

    const client = await xeroTokenManager.getAuthenticatedClient();
    const tenantId = process.env.XERO_TENANT_ID;

    let enriched = 0;
    let noEmail = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      if (!sub.xero_contact_id) continue;

      try {
        // Get Xero contact
        const response = await client.accountingApi.getContact(tenantId, sub.xero_contact_id);
        const contact = response.body.contacts?.[0];

        if (!contact) {
          console.log(`   ⚠️ Contact not found: ${sub.vendor}`);
          errors++;
          continue;
        }

        let vendorEmail = null;
        let source = null;

        // Try direct email address
        if (contact.emailAddress) {
          vendorEmail = contact.emailAddress;
          source = 'xero_contact';
        }
        // Try contact persons
        else if (contact.contactPersons?.length > 0) {
          const person = contact.contactPersons.find(p => p.emailAddress);
          if (person?.emailAddress) {
            vendorEmail = person.emailAddress;
            source = 'xero_contact_person';
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
          enriched++;
        } else {
          console.log(`   ⚠️ ${sub.vendor}: No email in Xero contact`);
          noEmail++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`   ❌ ${sub.vendor}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n   📊 Enrichment summary:`);
    console.log(`      Enriched: ${enriched}`);
    console.log(`      No email in Xero: ${noEmail}`);
    console.log(`      Errors: ${errors}`);

    // ========================================
    // STEP 4: Calculate migration priorities
    // ========================================
    console.log('\n\n🎯 STEP 4: Calculating migration priorities...\n');

    const calculatePriority = (sub) => {
      const amount = parseFloat(sub.amount || 0);
      const confidence = parseFloat(sub.confidence || 0);
      const metadata = sub.metadata || {};

      // Amount score (max 40 points)
      const amountScore = Math.min(40, (amount / 100.0) * 40);

      // Recency score (max 30 points)
      let recencyScore = 15; // Default medium
      if (metadata.lastSeen) {
        const lastSeen = new Date(metadata.lastSeen);
        const daysSince = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));

        if (daysSince <= 7) recencyScore = 30;
        else if (daysSince <= 30) recencyScore = 20;
        else if (daysSince <= 90) recencyScore = 10;
        else recencyScore = 5;
      }

      // Confidence score (max 30 points)
      const confidenceScore = confidence * 30;

      return Math.min(100, Math.round(amountScore + recencyScore + confidenceScore));
    };

    let prioritized = 0;
    for (const sub of subscriptions) {
      const priority = calculatePriority(sub);

      await supabase
        .from('discovered_subscriptions')
        .update({
          migration_priority: priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      prioritized++;
    }

    console.log(`   ✅ Calculated priorities for ${prioritized} subscriptions`);

    // ========================================
    // STEP 5: Generate comprehensive report
    // ========================================
    console.log('\n\n📊 STEP 5: Generating final report...\n');

    // Refresh data
    const { data: finalSubs } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('migration_priority', { ascending: false });

    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE SUBSCRIPTION REPORT');
    console.log('='.repeat(80));

    // Group by priority
    const highPriority = finalSubs.filter(s => s.migration_priority >= 80);
    const mediumPriority = finalSubs.filter(s => s.migration_priority >= 60 && s.migration_priority < 80);
    const lowPriority = finalSubs.filter(s => s.migration_priority < 60);

    const withEmail = finalSubs.filter(s => s.vendor_contact_email);
    const withoutEmail = finalSubs.filter(s => !s.vendor_contact_email);

    console.log(`\n🎯 PRIORITY BREAKDOWN:`);
    console.log(`   High (80+): ${highPriority.length}`);
    console.log(`   Medium (60-79): ${mediumPriority.length}`);
    console.log(`   Low (<60): ${lowPriority.length}`);

    console.log(`\n✅ READY TO CONTACT (${withEmail.length} subscriptions):\n`);
    withEmail.forEach((sub, i) => {
      const priority = sub.migration_priority >= 80 ? '🔴' : sub.migration_priority >= 60 ? '🟡' : '🟢';
      console.log(`${i + 1}. ${priority} ${sub.vendor}`);
      console.log(`   Amount: $${sub.amount?.toFixed(2) || '?'}/${sub.frequency || '?'}`);
      console.log(`   Current email: ${sub.account_email || 'unknown'}`);
      console.log(`   Vendor email: ${sub.vendor_contact_email}`);
      console.log(`   Priority: ${sub.migration_priority}/100`);
      console.log(`   Source: ${sub.vendor_contact_source}`);
      console.log('');
    });

    console.log(`\n⚠️  MANUAL EMAIL LOOKUP NEEDED (${withoutEmail.length} subscriptions):\n`);
    withoutEmail.forEach((sub, i) => {
      const priority = sub.migration_priority >= 80 ? '🔴' : sub.migration_priority >= 60 ? '🟡' : '🟢';
      console.log(`${i + 1}. ${priority} ${sub.vendor}`);
      console.log(`   Amount: $${sub.amount?.toFixed(2) || '?'}/${sub.frequency || '?'}`);
      console.log(`   Current email: ${sub.account_email || 'unknown'}`);
      console.log(`   Priority: ${sub.migration_priority}/100`);
      console.log(`   Has Xero contact: ${sub.xero_contact_id ? 'Yes (but no email)' : 'No'}`);
      console.log('');
    });

    // Financial summary
    const totalAnnual = finalSubs.reduce((sum, sub) => {
      if (!sub.amount) return sum;
      const multiplier = {
        monthly: 12,
        quarterly: 4,
        yearly: 1
      }[sub.frequency] || 0;
      return sum + (sub.amount * multiplier);
    }, 0);

    console.log('\n' + '='.repeat(80));
    console.log('FINANCIAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total subscriptions: ${finalSubs.length}`);
    console.log(`Estimated annual cost: $${totalAnnual.toFixed(2)}`);
    console.log(`Monthly average: $${(totalAnnual / 12).toFixed(2)}`);
    console.log(`\nReady to migrate: ${withEmail.length} (${(withEmail.length / finalSubs.length * 100).toFixed(1)}%)`);
    console.log(`Need manual lookup: ${withoutEmail.length}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSIS COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run
analyzeSubscriptions()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
