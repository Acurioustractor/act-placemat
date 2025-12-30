/**
 * Queue enrichment candidates
 *
 * Takes tagged contacts from candidate views and queues them for enrichment
 *
 * Usage:
 *   node queue-candidates.js                    # Queue all candidates
 *   node queue-candidates.js --campaign=goods   # Queue Goods on Country only
 *   node queue-candidates.js --limit=20         # Queue first 20
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📥 Queue Enrichment Candidates\n');

async function queueCandidates(options = {}) {
  const {
    campaignType = null,
    limit = 100
  } = options;

  try {
    let view, campaign;

    if (campaignType === 'goods' || campaignType === 'goods-on-country') {
      view = 'vw_goods_enrichment_candidates';
      campaign = 'goods-on-country';
    } else if (campaignType === 'justice' || campaignType === 'justice-hub') {
      view = 'vw_justice_enrichment_candidates';
      campaign = 'justice-hub';
    } else {
      console.log('⚠️  No campaign specified - queuing from both campaigns\n');

      // Queue both campaigns
      await queueFromView('vw_goods_enrichment_candidates', 'goods-on-country', limit);
      await queueFromView('vw_justice_enrichment_candidates', 'justice-hub', limit);
      return;
    }

    await queueFromView(view, campaign, limit);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function queueFromView(viewName, campaignType, limit) {
  console.log(`📊 Fetching candidates from ${viewName}...`);

  // Get candidates
  const { data: candidates, error: fetchError } = await supabase
    .from(viewName)
    .select('person_id, full_name, email, enrichment_priority')
    .limit(limit);

  if (fetchError) {
    console.error(`❌ Failed to fetch: ${fetchError.message}\n`);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log(`✅ No candidates found in ${viewName}\n`);
    return;
  }

  console.log(`Found ${candidates.length} candidates\n`);

  let queued = 0;
  let skipped = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    process.stdout.write(`[${i+1}/${candidates.length}] ${candidate.full_name || 'Unknown'}... `);

    // Use the database function to queue
    const { data: result, error: queueError } = await supabase
      .rpc('queue_for_exa_enrichment', {
        p_person_id: candidate.person_id,
        p_campaign_type: campaignType,
        p_priority: candidate.enrichment_priority || 50,
        p_enrich_network: false
      });

    if (queueError) {
      // Check if already queued
      if (queueError.message.includes('duplicate') || queueError.code === '23505') {
        console.log('✓ (already queued)');
        skipped++;
      } else {
        console.log(`❌ ${queueError.message}`);
        skipped++;
      }
    } else {
      console.log('✅ Queued');
      queued++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Queuing complete for ${campaignType}!`);
  console.log('='.repeat(60));
  console.log(`Queued: ${queued}`);
  console.log(`Skipped: ${skipped} (already queued or errors)`);
  console.log(`Total: ${candidates.length}\n`);
}

// Parse command line args
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

const campaignArg = args.find(arg => arg.startsWith('--campaign='));
let campaignType = null;
if (campaignArg) {
  campaignType = campaignArg.split('=')[1];
}

console.log('Options:');
console.log(`  Campaign: ${campaignType || 'All'}`);
console.log(`  Limit: ${limit} per campaign\n`);

queueCandidates({ campaignType, limit });
