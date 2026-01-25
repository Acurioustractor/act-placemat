#!/usr/bin/env node
/**
 * Calculate Data Quality Scores
 *
 * Updates person_identity_map with:
 * - data_quality_score (0-100)
 * - data_sources array
 * - needs_cleanup flag
 *
 * Scoring:
 * - +20 for email
 * - +20 for full_name
 * - +15 for current_company
 * - +15 for current_position
 * - +10 for linkedin_contact_id
 * - +10 for ghl_contact_id
 * - +10 for exa_enriched
 *
 * Database: Intelligence Platform (person_identity_map)
 *
 * Run: node scripts/calculate-data-quality.cjs [--dry-run]
 */

const { validateEnv, INTELLIGENCE_PLATFORM } = require('./lib/validate-env.cjs');
validateEnv(INTELLIGENCE_PLATFORM);

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

function calculateQualityScore(record) {
  let score = 0;

  // Core fields
  if (record.email && record.email.trim()) score += 20;
  if (record.full_name && record.full_name.trim()) score += 20;
  if (record.current_company && record.current_company.trim()) score += 15;
  if (record.current_position && record.current_position.trim()) score += 15;

  // Cross-system links
  if (record.linkedin_contact_id) score += 10;
  if (record.ghl_contact_id) score += 10;

  // Enrichment
  if (record.exa_enriched) score += 10;

  return score;
}

function getDataSources(record) {
  const sources = [];

  // From data_source field
  if (record.data_source) {
    sources.push(record.data_source);
  }

  // Infer from other fields
  if (record.linkedin_contact_id) {
    if (!sources.includes('linkedin_ben') && !sources.includes('linkedin_nic')) {
      sources.push('linkedin');
    }
  }

  if (record.gmail_id) {
    if (!sources.some(s => s.includes('gmail'))) {
      sources.push('gmail');
    }
  }

  if (record.ghl_contact_id) {
    sources.push('ghl');
  }

  if (record.exa_enriched) {
    sources.push('exa_enrichment');
  }

  return [...new Set(sources)]; // Dedupe
}

function needsCleanup(record, score) {
  // Flag for cleanup if:
  // - Score below 30 (very incomplete)
  // - Has email but no name
  // - Has conflicting data in contact_data
  if (score < 30) return true;
  if (record.email && !record.full_name) return true;

  return false;
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Calculate Data Quality Scores            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Fetch all records
  console.log('Fetching all person_identity_map records...');

  let allRecords = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('person_identity_map')
      .select('*')
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRecords = allRecords.concat(data);
    offset += 1000;
    if (offset >= 50000) break;
  }

  console.log(`Found ${allRecords.length} records\n`);

  // Calculate scores
  const scoreDistribution = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0
  };

  const updates = [];
  let needsCleanupCount = 0;

  for (const record of allRecords) {
    const score = calculateQualityScore(record);
    const sources = getDataSources(record);
    const cleanup = needsCleanup(record, score);

    if (cleanup) needsCleanupCount++;

    // Track distribution
    if (score <= 20) scoreDistribution['0-20']++;
    else if (score <= 40) scoreDistribution['21-40']++;
    else if (score <= 60) scoreDistribution['41-60']++;
    else if (score <= 80) scoreDistribution['61-80']++;
    else scoreDistribution['81-100']++;

    updates.push({
      person_id: record.person_id,
      data_quality_score: score,
      data_sources: sources,
      needs_cleanup: cleanup
    });
  }

  console.log('Score Distribution:');
  console.log('  0-20  (very poor):', scoreDistribution['0-20']);
  console.log('  21-40 (poor):     ', scoreDistribution['21-40']);
  console.log('  41-60 (fair):     ', scoreDistribution['41-60']);
  console.log('  61-80 (good):     ', scoreDistribution['61-80']);
  console.log('  81-100 (excellent):', scoreDistribution['81-100']);
  console.log('\nRecords needing cleanup:', needsCleanupCount);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would update', updates.length, 'records');

    // Show sample updates
    console.log('\nSample updates:');
    updates.slice(0, 5).forEach(u => {
      console.log(`  ${u.person_id.substring(0, 8)}... score=${u.data_quality_score} sources=[${u.data_sources.join(',')}] cleanup=${u.needs_cleanup}`);
    });
    return;
  }

  // Apply updates in batches
  console.log('\nUpdating records...');

  const batchSize = 100;
  let updated = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    for (const update of batch) {
      const { error } = await supabase
        .from('person_identity_map')
        .update({
          data_quality_score: update.data_quality_score,
          data_sources: update.data_sources,
          needs_cleanup: update.needs_cleanup
        })
        .eq('person_id', update.person_id);

      if (error) {
        console.error(`Error updating ${update.person_id}:`, error.message);
      } else {
        updated++;
      }
    }

    process.stdout.write(`\rUpdated ${updated}/${updates.length} records`);
  }

  console.log('\n\n✅ Data quality scores calculated!');
  console.log('\nTo find low-quality records:');
  console.log('  SELECT * FROM person_identity_map WHERE data_quality_score < 50 ORDER BY data_quality_score;');
  console.log('\nTo find records needing cleanup:');
  console.log('  SELECT * FROM person_identity_map WHERE needs_cleanup = true;');
}

main().catch(console.error);
