#!/usr/bin/env node
/**
 * Generate Data Quality Report
 *
 * Analyzes subscription data completeness and generates a detailed
 * quality report with grades, gaps, and recommendations.
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/quality-report.js
 *
 * Can be run:
 * - Manually when needed
 * - Weekly via cron for tracking progress
 * - Before/after enrichment to measure impact
 */

import { QualityAnalyzer } from '../services/qualityAnalyzer.js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function main() {
  console.log('🚀 Starting Data Quality Analysis...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const analyzer = new QualityAnalyzer(supabase);

  try {
    // Generate full report
    const quality = await analyzer.generateReport(TENANT_ID);

    // Summary footer
    console.log('\n\n📈 QUALITY TRENDS');
    console.log('═══════════════════════════════════════');
    console.log('Track these metrics over time to measure enrichment progress:');
    console.log(`  • Overall Score: ${quality.overallScore.score}%`);
    console.log(`  • Amount Coverage: ${quality.fields.amount.percentage}%`);
    console.log(`  • Frequency Detection: ${quality.fields.frequency.percentage}%`);
    console.log('');

    console.log('Next Actions:');
    console.log('─'.repeat(70));

    if (quality.gaps.length > 0) {
      for (const gap of quality.gaps.slice(0, 3)) {
        console.log(`  ${gap.count} subscriptions: ${gap.recommendation}`);
      }
    } else {
      console.log('  ✅ No critical gaps identified!');
    }

    console.log('\n✨ Quality analysis complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the job
main();
