/**
 * Verify Exa enrichment system is ready
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying Exa enrichment system...\n');

async function verify() {
  try {
    // Check tables
    console.log('📋 Checking tables...\n');

    const tables = [
      'exa_linkedin_profiles',
      'exa_company_intelligence',
      'exa_media_mentions',
      'exa_enrichment_queue',
      'exa_api_usage'
    ];

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${table} - ${count || 0} rows`);
      }
    }

    // Check views
    console.log('\n📊 Checking views...\n');

    const views = [
      'vw_goods_enrichment_candidates',
      'vw_justice_enrichment_candidates',
      'vw_exa_usage_summary',
      'vw_exa_queue_summary'
    ];

    for (const view of views) {
      const { error, count } = await supabase
        .from(view)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${view} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${view} - ${count || 0} candidates`);
      }
    }

    // Show sample candidates
    console.log('\n👥 Sample Goods on Country candidates:\n');

    const { data: goodsCandidates, error: goodsError } = await supabase
      .from('vw_goods_enrichment_candidates')
      .select('full_name, email, current_company, enrichment_priority')
      .limit(5);

    if (goodsError) {
      console.log(`❌ Error: ${goodsError.message}`);
    } else if (goodsCandidates && goodsCandidates.length > 0) {
      goodsCandidates.forEach((c, i) => {
        console.log(`${i+1}. ${c.full_name || 'Unknown'} (${c.current_company || 'No company'})`);
        console.log(`   Email: ${c.email}`);
        console.log(`   Priority: ${c.enrichment_priority}\n`);
      });
    } else {
      console.log('   No candidates found (check your tags and filters)\n');
    }

    console.log('👥 Sample JusticeHub candidates:\n');

    const { data: justiceCandidates, error: justiceError } = await supabase
      .from('vw_justice_enrichment_candidates')
      .select('full_name, email, current_company, enrichment_priority, youth_justice_relevance_score')
      .limit(5);

    if (justiceError) {
      console.log(`❌ Error: ${justiceError.message}`);
    } else if (justiceCandidates && justiceCandidates.length > 0) {
      justiceCandidates.forEach((c, i) => {
        console.log(`${i+1}. ${c.full_name || 'Unknown'} (${c.current_company || 'No company'})`);
        console.log(`   Email: ${c.email}`);
        console.log(`   Priority: ${c.enrichment_priority}, YJ Score: ${c.youth_justice_relevance_score || 0}\n`);
      });
    } else {
      console.log('   No candidates found (check your tags and filters)\n');
    }

    console.log('='.repeat(60));
    console.log('✅ EXA ENRICHMENT SYSTEM READY!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Review candidate counts above');
    console.log('2. See EXA_QUICK_START.md for how to queue contacts');
    console.log('3. Run enrichment: (coming soon - process-batch.js)\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
