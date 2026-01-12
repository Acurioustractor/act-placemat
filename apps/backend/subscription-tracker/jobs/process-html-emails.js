#!/usr/bin/env node
/**
 * Process HTML Email Receipts - Extract Missing Amounts
 *
 * Runs HTML email parser on subscriptions that don't have PDF attachments
 * (Canva, Figma, Xero) to extract amounts from inline receipts.
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/process-html-emails.js
 *
 * Can be run:
 * - Manually when needed
 * - As part of daily enrichment workflow
 * - Triggered by new subscription detection
 */

import { HtmlEmailParser } from '../services/htmlEmailParser.js';
import { GmailClient } from '../../../../mcp-servers/gmail-workspace/services/gmailClient.js';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/service-account.json');

async function main() {
  console.log('🚀 Starting HTML Email Processing...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Initialize clients
  const gmailClient = new GmailClient(SERVICE_ACCOUNT_PATH);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const parser = new HtmlEmailParser(gmailClient, supabase, anthropic);

  try {
    // Get summary first
    console.log('📊 SUMMARY OF HTML-ONLY SUBSCRIPTIONS');
    console.log('═══════════════════════════════════════\n');

    const summary = await parser.getSummary(TENANT_ID);

    console.log(`Total subscriptions missing amounts: ${summary.total}`);
    console.log(`Vendors: ${summary.vendors.join(', ')}\n`);

    if (summary.total === 0) {
      console.log('✅ No HTML subscriptions need processing!');
      console.log('All Canva, Figma, and Xero subscriptions have amounts.\n');
      process.exit(0);
    }

    console.log('By Vendor:');
    console.log('─'.repeat(70));

    for (const [vendor, subs] of Object.entries(summary.byVendor)) {
      console.log(`\n  📦 ${vendor} (${subs.length} ${subs.length === 1 ? 'receipt' : 'receipts'})`);
      for (const sub of subs.slice(0, 3)) {
        console.log(`     • ${sub.account_email}: ${sub.subject.substring(0, 50)}...`);
      }
      if (subs.length > 3) {
        console.log(`     ... and ${subs.length - 3} more`);
      }
    }

    console.log('\n\n🔄 PROCESSING HTML EMAILS');
    console.log('═══════════════════════════════════════\n');

    // Process subscriptions
    const results = await parser.processHtmlSubscriptions(TENANT_ID);

    // Print results
    console.log('\n\n📊 PROCESSING RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successfully extracted: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Skipped (no HTML): ${results.skipped.length}`);

    if (results.success.length > 0) {
      console.log('\n✅ Successful Extractions:');
      console.log('─'.repeat(70));
      for (const item of results.success) {
        console.log(`   • ${item.vendor}: $${item.amount} ${item.currency}`);
      }
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Extractions:');
      console.log('─'.repeat(70));
      for (const item of results.failed) {
        console.log(`   • ${item.vendor}: ${item.reason}`);
      }
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Skipped (no HTML content):');
      console.log('─'.repeat(70));
      for (const item of results.skipped) {
        console.log(`   • ${item.vendor}: ${item.reason}`);
      }
    }

    // Calculate impact
    const totalExtracted = results.success.reduce((sum, item) => sum + item.amount, 0);

    console.log('\n\n💰 FINANCIAL IMPACT');
    console.log('═══════════════════════════════════════');
    console.log(`Total amounts extracted: $${totalExtracted.toFixed(2)}`);
    console.log(`Data completeness improved by: ${results.success.length} subscriptions`);

    // Calculate new coverage percentage
    const { data: totalSubs } = await supabase
      .from('email_financial_documents')
      .select('id', { count: 'exact' })
      .eq('tenant_id', TENANT_ID)
      .eq('is_subscription', true);

    const { data: withAmounts } = await supabase
      .from('email_financial_documents')
      .select('id', { count: 'exact' })
      .eq('tenant_id', TENANT_ID)
      .eq('is_subscription', true)
      .not('amount', 'is', null);

    if (totalSubs && withAmounts) {
      const coverage = (withAmounts.length / totalSubs.length) * 100;
      console.log(`\nNew data coverage: ${withAmounts.length}/${totalSubs.length} (${coverage.toFixed(1)}%)`);
    }

    console.log('\n✨ Processing complete!');

    // Exit with error if any failures
    process.exit(results.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the job
main();
