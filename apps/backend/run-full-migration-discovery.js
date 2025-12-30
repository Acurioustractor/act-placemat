/**
 * Full Migration Discovery Script
 *
 * Comprehensive backend process to:
 * 1. Discover all subscriptions from Gmail & Xero
 * 2. Find vendor contact emails (Gmail From headers, Xero contacts)
 * 3. Reconcile with Xero transactions
 * 4. Calculate migration priorities
 * 5. Output detailed report
 */

import { createClient } from '@supabase/supabase-js';
import { SubscriptionDetector } from './subscription-tracker/services/discovery/subscriptionDetector.js';
import { VendorEmailDiscovery } from './subscription-tracker/services/migration/vendorEmailDiscovery.js';
import { ReconciliationEngine } from './subscription-tracker/services/reconciliation/reconciliationEngine.js';
import { MigrationWorkflow } from './subscription-tracker/services/migration/migrationWorkflow.js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📋 FULL MIGRATION DISCOVERY PROCESS\n');
console.log('=' .repeat(80));

async function runFullDiscovery() {
  try {
    // ========================================
    // STEP 1: Discover Subscriptions
    // ========================================
    console.log('\n🔍 STEP 1: Discovering subscriptions from Gmail & Xero...\n');

    const detector = new SubscriptionDetector(null, supabase);

    // Discover all subscriptions (Gmail + Xero combined)
    console.log('   📧 Scanning Gmail receipts and Xero transactions...');
    const allSubs = await detector.discoverSubscriptions(TENANT_ID);
    console.log(`   ✅ Found ${allSubs.length} total subscriptions`);

    // Store in database
    console.log('\n   💾 Storing in database...');
    await detector.storeSubscriptions(TENANT_ID, allSubs);
    console.log(`   ✅ Stored successfully`);

    // ========================================
    // STEP 2: Discover Vendor Emails
    // ========================================
    console.log('\n\n🔍 STEP 2: Discovering vendor contact emails...\n');

    const emailDiscovery = new VendorEmailDiscovery(null, supabase);

    // Fetch all stored subscriptions
    const { data: subscriptions, error } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'active');

    if (error) throw error;

    console.log(`   📋 Processing ${subscriptions.length} subscriptions...\n`);

    // Batch discover emails
    const emailResults = await emailDiscovery.batchDiscover(subscriptions, {
      concurrency: 5
    });

    // Update database with discovered emails
    await emailDiscovery.batchUpdateEmails(emailResults);

    // Calculate statistics
    const discovered = Array.from(emailResults.values()).filter(r => r.email !== null);
    const discoveryRate = (discovered.length / subscriptions.length * 100).toFixed(1);

    console.log(`\n   📊 Email Discovery Summary:`);
    console.log(`      Total: ${subscriptions.length}`);
    console.log(`      Discovered: ${discovered.length} (${discoveryRate}%)`);
    console.log(`      Manual needed: ${subscriptions.length - discovered.length}`);

    // Breakdown by source
    const bySource = discovered.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
    console.log(`\n   📍 By source:`, bySource);

    // ========================================
    // STEP 3: Reconcile with Xero
    // ========================================
    console.log('\n\n🔍 STEP 3: Reconciling Gmail receipts with Xero transactions...\n');

    const reconciliation = new ReconciliationEngine(supabase);
    const reconResults = await reconciliation.reconcileSubscriptions(TENANT_ID);

    console.log(`   📊 Reconciliation Summary:`);
    console.log(`      Total matches: ${reconResults.matches}`);
    console.log(`      Gmail only: ${reconResults.gmailOnly}`);
    console.log(`      Xero only: ${reconResults.xeroOnly}`);
    console.log(`      Confidence avg: ${(reconResults.avgConfidence * 100).toFixed(1)}%`);

    // ========================================
    // STEP 4: Calculate Migration Priorities
    // ========================================
    console.log('\n\n🔍 STEP 4: Calculating migration priorities...\n');

    const workflow = new MigrationWorkflow(null, supabase);

    // Update priorities for all subscriptions
    let prioritized = 0;
    for (const sub of subscriptions) {
      const priority = workflow.calculatePriority(sub);

      const { error: updateError } = await supabase
        .from('discovered_subscriptions')
        .update({
          migration_priority: priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (!updateError) prioritized++;
    }

    console.log(`   ✅ Calculated priorities for ${prioritized} subscriptions`);

    // Get priority breakdown
    const { data: prioData } = await supabase
      .from('discovered_subscriptions')
      .select('migration_priority')
      .eq('tenant_id', TENANT_ID);

    const prioBreakdown = prioData.reduce((acc, s) => {
      const p = s.migration_priority || 0;
      if (p >= 80) acc.high++;
      else if (p >= 60) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    console.log(`\n   📊 Priority Breakdown:`);
    console.log(`      High (80+): ${prioBreakdown.high}`);
    console.log(`      Medium (60-79): ${prioBreakdown.medium}`);
    console.log(`      Low (<60): ${prioBreakdown.low}`);

    // ========================================
    // STEP 5: Generate Detailed Report
    // ========================================
    console.log('\n\n📊 STEP 5: Generating detailed report...\n');

    // Fetch complete data
    const { data: finalSubs } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('migration_priority', { ascending: false });

    console.log('\n' + '='.repeat(80));
    console.log('DETAILED SUBSCRIPTION REPORT');
    console.log('='.repeat(80));

    // Group by email source
    const withEmail = finalSubs.filter(s => s.vendor_contact_email);
    const withoutEmail = finalSubs.filter(s => !s.vendor_contact_email);

    console.log(`\n✅ READY TO CONTACT (${withEmail.length} subscriptions):\n`);
    withEmail.forEach((sub, i) => {
      console.log(`${i + 1}. ${sub.vendor}`);
      console.log(`   Amount: $${sub.amount || '?'}/${sub.frequency || '?'}`);
      console.log(`   Current email: ${sub.account_email || 'unknown'}`);
      console.log(`   Vendor email: ${sub.vendor_contact_email}`);
      console.log(`   Source: ${sub.vendor_contact_source}`);
      console.log(`   Priority: ${sub.migration_priority}/100`);
      console.log(`   Xero contact: ${sub.xero_contact_id ? 'Yes' : 'No'}`);
      console.log(`   Gmail receipts: ${sub.metadata?.gmail_emails?.length || 0}`);
      console.log('');
    });

    console.log(`\n⚠️  MANUAL EMAIL NEEDED (${withoutEmail.length} subscriptions):\n`);
    withoutEmail.forEach((sub, i) => {
      console.log(`${i + 1}. ${sub.vendor}`);
      console.log(`   Amount: $${sub.amount || '?'}/${sub.frequency || '?'}`);
      console.log(`   Current email: ${sub.account_email || 'unknown'}`);
      console.log(`   Priority: ${sub.migration_priority}/100`);
      console.log(`   Why: No email found in Gmail From headers or Xero contacts`);
      console.log('');
    });

    // Calculate totals
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
    console.log(`Ready to migrate: ${withEmail.length} (${(withEmail.length / finalSubs.length * 100).toFixed(1)}%)`);
    console.log(`Require manual work: ${withoutEmail.length}`);

    // Current email breakdown
    const emailBreakdown = finalSubs.reduce((acc, s) => {
      const email = s.account_email || 'unknown';
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📧 Current Email Addresses:`);
    Object.entries(emailBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([email, count]) => {
        console.log(`   ${email}: ${count} subscription${count > 1 ? 's' : ''}`);
      });

    console.log('\n' + '='.repeat(80));
    console.log('✅ DISCOVERY COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ Error during discovery:', error);
    throw error;
  }
}

// Run the script
runFullDiscovery()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
