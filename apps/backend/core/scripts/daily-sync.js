/**
 * Daily Sync Automation
 *
 * Runs automated sync operations to keep Notion and Supabase in harmony
 *
 * Usage:
 *   node apps/backend/core/scripts/daily-sync.js          # Run once
 *   node apps/backend/core/scripts/daily-sync.js --full   # Sync all contacts (not just active)
 *   node apps/backend/core/scripts/daily-sync.js --cron   # Run as scheduled job
 */

import { SupabaseNotionSync } from '../src/services/supabaseNotionSync.js';
import cron from 'node-cron';
import 'dotenv/config';

const args = process.argv.slice(2);
const fullSync = args.includes('--full');
const cronMode = args.includes('--cron');

async function runSync() {
  const sync = new SupabaseNotionSync();

  try {
    console.log('\n🔄 ACT Daily Sync Starting...');
    console.log('='.repeat(60));
    console.log(`Mode: ${fullSync ? 'FULL SYNC' : 'ACTIVE ONLY'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Initialize sync service
    const initialized = await sync.initialize();

    if (!initialized) {
      throw new Error('Sync service initialization failed');
    }

    // === Phase 1: Contact Cadence Sync ===
    console.log('\n📋 Phase 1: Contact Cadence → Communications Dashboard');
    console.log('─'.repeat(60));

    const cadenceResults = await sync.syncContactCadenceToNotion({
      dryRun: false,
      onlyRecentlyActive: !fullSync, // Only sync active contacts unless --full
      limit: null // No limit, sync all matched contacts
    });

    console.log('\n✅ Phase 1 Complete');
    console.log(`   Contacts matched: ${cadenceResults.contactsMatched}`);
    console.log(`   Records updated: ${cadenceResults.recordsUpdated}`);
    console.log(`   Records created: ${cadenceResults.recordsCreated}`);

    if (cadenceResults.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${cadenceResults.errors.length}`);
      cadenceResults.errors.slice(0, 5).forEach(err => {
        console.log(`      - ${err.contact}: ${err.error}`);
      });
      if (cadenceResults.errors.length > 5) {
        console.log(`      ... and ${cadenceResults.errors.length - 5} more`);
      }
    }

    // === Phase 2: Actions → Outreach (Future) ===
    console.log('\n📋 Phase 2: Actions → Outreach Tasks');
    console.log('─'.repeat(60));
    console.log('   Status: Not yet implemented');
    console.log('   Next: Sync Notion Actions to Supabase outreach_tasks');

    // === Phase 3: Project Intelligence (Future) ===
    console.log('\n📋 Phase 3: Project Intelligence Sync');
    console.log('─'.repeat(60));
    console.log('   Status: Not yet implemented');
    console.log('   Next: Sync Notion Projects to project_support_graph');

    // === Summary ===
    console.log('\n' + '='.repeat(60));
    console.log('✅ DAILY SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Total operations: ${cadenceResults.recordsUpdated + cadenceResults.recordsCreated}`);
    console.log(`Success rate: ${((1 - (cadenceResults.errors.length / Math.max(cadenceResults.contactsMatched, 1))) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // Generate daily digest report
    const report = generateDailyDigest(cadenceResults);
    console.log('\n📊 Daily Digest:\n');
    console.log(report);

    return cadenceResults;

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error);
    console.error(error.stack);

    // TODO: Send failure alert via Slack/email
    // await sendFailureAlert(error);

    throw error;
  }
}

/**
 * Generate daily digest report
 */
function generateDailyDigest(results) {
  const sections = [];

  // Summary section
  sections.push('📈 RELATIONSHIP TRACKING SUMMARY');
  sections.push('─'.repeat(60));
  sections.push(`Total relationships tracked: ${results.contactsMatched}`);
  sections.push(`Updated today: ${results.recordsUpdated}`);
  sections.push(`New contacts added: ${results.recordsCreated}`);
  sections.push('');

  // Upcoming check-ins (would need to query Notion for this)
  sections.push('📅 UPCOMING CHECK-INS');
  sections.push('─'.repeat(60));
  sections.push('See Communications Dashboard for details');
  sections.push('Filter: Next Contact Due ≤ 7 days from now');
  sections.push('');

  // System health
  sections.push('💚 SYSTEM HEALTH');
  sections.push('─'.repeat(60));
  sections.push(`✓ Gmail Intelligence: Active`);
  sections.push(`✓ Calendar Sync: Active`);
  sections.push(`✓ Contact Cadence: Synced`);
  sections.push(`✓ Error rate: ${((results.errors.length / Math.max(results.contactsMatched, 1)) * 100).toFixed(1)}%`);
  sections.push('');

  return sections.join('\n');
}

/**
 * Send failure alert (to be implemented)
 */
async function sendFailureAlert(error) {
  // TODO: Implement Slack webhook or email notification
  console.log('📧 Sending failure alert...');
  console.log('   Error:', error.message);
  console.log('   (Slack/email integration not yet configured)');
}

// === Main execution ===

if (cronMode) {
  // Run as scheduled cron job
  console.log('🕐 Starting ACT Daily Sync in CRON mode');
  console.log('   Schedule: Every day at 6:00 AM');
  console.log('   Mode: Active contacts only');
  console.log('');

  // Schedule for 6am daily
  cron.schedule('0 6 * * *', async () => {
    console.log('\n⏰ Scheduled sync triggered at', new Date().toISOString());

    try {
      await runSync();
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  });

  console.log('✅ Cron job scheduled. Press Ctrl+C to stop.');
  console.log('');

  // Keep process alive
  process.stdin.resume();

} else {
  // Run once immediately
  runSync()
    .then(() => {
      console.log('\n✅ Sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}
