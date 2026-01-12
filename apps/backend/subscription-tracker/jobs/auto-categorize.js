#!/usr/bin/env node
/**
 * Auto-Categorize Subscriptions
 *
 * Runs auto-categorization on all subscriptions to assign category tags
 * based on vendor name matching and keyword detection.
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/auto-categorize.js
 *
 * Can be run:
 * - Manually when needed
 * - After new subscriptions are discovered
 * - As part of data quality improvements
 */

import { AutoCategorizer } from '../services/autoCategorizer.js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function main() {
  console.log('🏷️  Starting Auto-Categorization...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const categorizer = new AutoCategorizer(supabase);

  try {
    // Run categorization
    console.log('📊 CATEGORIZATION PROCESS');
    console.log('═══════════════════════════════════════\n');

    const results = await categorizer.categorizeAllSubscriptions(TENANT_ID);

    // Print results
    console.log('\n\n📊 CATEGORIZATION RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`Total subscriptions: ${results.total}`);
    console.log(`✅ Updated: ${results.updated}`);
    console.log(`⏭️  Already categorized: ${results.alreadyCategorized}`);

    if (Object.keys(results.byCategory).length > 0) {
      console.log('\n\n📦 BY CATEGORY');
      console.log('═══════════════════════════════════════\n');

      // Sort categories by count
      const sortedCategories = Object.entries(results.byCategory)
        .map(([category, vendors]) => ({
          category,
          count: vendors.length,
          vendors,
        }))
        .sort((a, b) => b.count - a.count);

      for (const { category, count, vendors } of sortedCategories) {
        console.log(`${category} (${count} ${count === 1 ? 'subscription' : 'subscriptions'})`);
        console.log('─'.repeat(70));

        // Show first 5 vendors
        for (const vendor of vendors.slice(0, 5)) {
          console.log(`  • ${vendor}`);
        }

        if (vendors.length > 5) {
          console.log(`  ... and ${vendors.length - 5} more`);
        }

        console.log('');
      }
    }

    // Get cost summary
    console.log('\n💰 COST BREAKDOWN BY CATEGORY');
    console.log('═══════════════════════════════════════\n');

    const summary = await categorizer.getCategorySummary(TENANT_ID);

    // Calculate totals
    const totalMonthly = summary.reduce((sum, cat) => sum + cat.totalMonthly, 0);
    const totalYearly = summary.reduce((sum, cat) => sum + cat.totalYearly, 0);

    console.log('Category'.padEnd(30) + 'Count'.padEnd(10) + 'Monthly'.padEnd(15) + 'Yearly');
    console.log('─'.repeat(70));

    for (const cat of summary) {
      const categoryName = cat.category.padEnd(30);
      const count = cat.count.toString().padEnd(10);
      const monthly = `$${cat.totalMonthly.toFixed(2)}`.padEnd(15);
      const yearly = `$${cat.totalYearly.toFixed(2)}`;

      console.log(`${categoryName}${count}${monthly}${yearly}`);
    }

    console.log('─'.repeat(70));
    console.log(
      'TOTAL'.padEnd(30) +
      summary.reduce((sum, cat) => sum + cat.count, 0).toString().padEnd(10) +
      `$${totalMonthly.toFixed(2)}`.padEnd(15) +
      `$${totalYearly.toFixed(2)}`
    );

    console.log('\n\n📈 INSIGHTS');
    console.log('═══════════════════════════════════════');

    // Find highest cost category
    const highestCost = summary[0];
    if (highestCost) {
      console.log(`\n💸 Highest spending category: ${highestCost.category}`);
      console.log(`   ${highestCost.count} subscriptions costing $${highestCost.totalYearly.toFixed(2)}/year`);
    }

    // Find most subscriptions
    const mostSubs = [...summary].sort((a, b) => b.count - a.count)[0];
    if (mostSubs && mostSubs.category !== highestCost?.category) {
      console.log(`\n📦 Most subscriptions: ${mostSubs.category}`);
      console.log(`   ${mostSubs.count} subscriptions`);
    }

    // Calculate percentage coverage
    const uncategorized = summary.find(cat => cat.category === 'Uncategorized');
    if (uncategorized) {
      const coverage = ((results.total - uncategorized.count) / results.total) * 100;
      console.log(`\n✅ Categorization coverage: ${coverage.toFixed(1)}%`);
      console.log(`   ${uncategorized.count} subscriptions remain uncategorized`);
    } else {
      console.log('\n✅ All subscriptions successfully categorized!');
    }

    console.log('\n✨ Categorization complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the job
main();
