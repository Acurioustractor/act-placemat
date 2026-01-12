#!/usr/bin/env node
/**
 * Enable Gmail Watch for All ACT Email Accounts
 *
 * Sets up push notifications for all ACT email accounts to receive
 * real-time alerts when new emails arrive.
 *
 * Prerequisites:
 * 1. Google Cloud Pub/Sub topic created: gmail-subscription-notifications
 * 2. Gmail API has publish permission to the topic
 * 3. Domain-wide delegation configured for service account
 *
 * Usage:
 *   node apps/backend/subscription-tracker/setup/enable-gmail-watch.js
 *
 * Note: Gmail watch expires after 7 days, so this should be run weekly
 * via cron job or manually renewed.
 */

import { GmailWatcher } from '../services/gmailWatcher.js';

async function main() {
  console.log('🚀 Setting up Gmail Watch for ACT Email Accounts\n');
  console.log('═══════════════════════════════════════════════════\n');

  const watcher = new GmailWatcher();

  // Check current watch status first
  console.log('📊 Checking current watch status...\n');

  try {
    const statuses = await watcher.getWatchStatus();

    console.log('Current Status:');
    console.log('─'.repeat(70));

    for (const status of statuses) {
      if (status.active) {
        console.log(`✅ ${status.email}`);
        console.log(`   Messages: ${status.messagesTotal.toLocaleString()}`);
        console.log(`   Threads: ${status.threadsTotal.toLocaleString()}`);
      } else {
        console.log(`❌ ${status.email}`);
        console.log(`   Error: ${status.error}`);
      }
      console.log('');
    }

  } catch (error) {
    console.log(`⚠️  Could not check status: ${error.message}\n`);
  }

  // Enable watch for all accounts
  console.log('\n🔔 Enabling Gmail Watch...\n');

  try {
    const results = await watcher.enableWatchForAllAccounts();

    console.log('\nResults:');
    console.log('─'.repeat(70));

    for (const result of results) {
      if (result.success) {
        console.log(`\n✅ ${result.email}`);
        console.log(`   History ID: ${result.historyId}`);
        console.log(`   Expires: ${result.expirationDate}`);
        console.log(`   (${Math.round((new Date(result.expirationDate) - new Date()) / (1000 * 60 * 60 * 24))} days from now)`);
      } else {
        console.log(`\n❌ ${result.email}`);
        console.log(`   Error: ${result.error}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('\n\n📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Successfully enabled: ${successCount}/4 accounts`);
    console.log(`❌ Failed: ${failCount}/4 accounts`);

    if (successCount === 4) {
      console.log('\n🎉 All accounts are now watching for new subscription emails!');
      console.log('\nNext steps:');
      console.log('1. Deploy webhook handler to receive notifications');
      console.log('2. Test by sending a subscription receipt email');
      console.log('3. Set up cron job to renew watches weekly');
      console.log('\nRenewal command (run every 6 days):');
      console.log('   node apps/backend/subscription-tracker/setup/enable-gmail-watch.js');
    } else if (successCount > 0) {
      console.log('\n⚠️  Partial success. Check errors above.');
      console.log('\nTroubleshooting:');
      console.log('1. Verify domain-wide delegation is configured');
      console.log('2. Check service account has correct scopes');
      console.log('3. Ensure Pub/Sub topic exists and has permissions');
    } else {
      console.log('\n❌ Failed to enable any watches.');
      console.log('\nCommon issues:');
      console.log('1. Pub/Sub topic not created');
      console.log('   → gcloud pubsub topics create gmail-subscription-notifications');
      console.log('');
      console.log('2. Gmail API missing publish permission');
      console.log('   → gcloud pubsub topics add-iam-policy-binding gmail-subscription-notifications \\');
      console.log('       --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \\');
      console.log('       --role=roles/pubsub.publisher');
      console.log('');
      console.log('3. Domain-wide delegation not configured');
      console.log('   → See GMAIL_DOMAIN_DELEGATION_SETUP.md');
    }

    console.log('');

    process.exit(failCount === 4 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run setup
main();
