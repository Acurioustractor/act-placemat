#!/usr/bin/env node
/**
 * Xero Recurring Charge Watcher - Daily Job
 *
 * Runs daily to detect recurring charges in Xero bank transactions
 * and identify missing subscriptions (charges without email receipts)
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/xero-watcher.js
 *
 * Cron Setup (daily at 10am):
 *   0 10 * * * cd /path/to/project && node apps/backend/subscription-tracker/jobs/xero-watcher.js
 */

import { XeroWatcher } from '../services/xeroWatcher.js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function main() {
  console.log('🚀 Starting Xero Recurring Charge Analysis...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Initialize Xero watcher
  const watcher = new XeroWatcher(supabase);

  try {
    // Run daily check
    const results = await watcher.runDailyCheck(TENANT_ID);

    // Summary
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total recurring charges: ${results.total.length}`);
    console.log(`Tracked (have email): ${results.tracked.length}`);
    console.log(`Missing (Xero only): ${results.missing.length}`);
    console.log('');

    if (results.missing.length > 0) {
      console.log('⚠️  ACTION REQUIRED:');
      console.log('─'.repeat(70));
      console.log(`Found ${results.missing.length} recurring charges without email receipts.`);
      console.log('These may be legitimate subscriptions that need to be added.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Review each vendor manually');
      console.log('2. Search Gmail for missing receipts');
      console.log('3. Add to email_financial_documents if confirmed');
      console.log('');
    }

    // Calculate potential MRR from missing subscriptions
    const missingMRR = results.missing
      .filter(s => s.frequency === 'monthly')
      .reduce((sum, s) => sum + s.averageAmount, 0);

    if (missingMRR > 0) {
      console.log(`💰 Missing Monthly Recurring Revenue: $${missingMRR.toFixed(2)}/month`);
      console.log(`   Annual impact: $${(missingMRR * 12).toFixed(2)}/year`);
      console.log('');
    }

    // Exit successfully
    console.log('✅ Analysis complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error running Xero watcher:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the job
main();
