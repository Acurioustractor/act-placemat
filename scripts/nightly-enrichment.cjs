#!/usr/bin/env node
/**
 * Nightly Enrichment Pipeline
 *
 * Finds low-quality contacts and queues them for enrichment.
 * Uses existing exa_enrichment_queue table.
 *
 * Quality thresholds:
 * - High priority: score < 30 (missing basic info)
 * - Medium priority: score < 50 (incomplete)
 * - Low priority: score < 70 (could be better)
 *
 * Database: Intelligence Platform (person_identity_map, exa_enrichment_queue)
 *
 * Run: node scripts/nightly-enrichment.cjs [--dry-run] [--limit N]
 *
 * Note: Exa.ai free tier = 1,000 searches/month
 */

const { validateEnv, INTELLIGENCE_PLATFORM } = require('./lib/validate-env.cjs');
validateEnv(INTELLIGENCE_PLATFORM);

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || '50') : 50;

async function findLowQualityContacts(minScore = 0, maxScore = 50, limit = 50) {
  const { data, error } = await supabase
    .from('person_identity_map')
    .select('person_id, email, full_name, current_company, data_quality_score, exa_enriched')
    .gte('data_quality_score', minScore)
    .lt('data_quality_score', maxScore)
    .eq('exa_enriched', false)
    .not('email', 'is', null)
    .order('data_quality_score', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function checkExistingQueue() {
  const { data, error } = await supabase
    .from('exa_enrichment_queue')
    .select('person_id, status')
    .in('status', ['pending', 'processing']);

  if (error) {
    // Table might not exist
    if (error.code === '42P01') {
      console.log('Note: exa_enrichment_queue table does not exist. Creating...');
      return { exists: false, queued: [] };
    }
    throw error;
  }
  return { exists: true, queued: data || [] };
}

async function queueForEnrichment(contacts) {
  const items = contacts.map(c => ({
    person_id: c.person_id,
    email: c.email,
    full_name: c.full_name,
    current_company: c.current_company,
    priority: c.data_quality_score < 30 ? 'high' : c.data_quality_score < 50 ? 'medium' : 'low',
    status: 'pending',
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('exa_enrichment_queue')
    .upsert(items, { onConflict: 'person_id' })
    .select();

  if (error) throw error;
  return data;
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Nightly Contact Enrichment Pipeline      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Check current queue status
  console.log('Checking enrichment queue status...');
  const { exists, queued } = await checkExistingQueue();

  if (!exists) {
    console.log('Creating exa_enrichment_queue table...');
    // Table creation would normally be done via migration
    // For now, just note it needs to be created
    console.log('\n⚠️  Please run this migration first:');
    console.log(`
CREATE TABLE IF NOT EXISTS exa_enrichment_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID REFERENCES person_identity_map(person_id) UNIQUE,
  email TEXT,
  full_name TEXT,
  current_company TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_enrichment_queue_status ON exa_enrichment_queue(status, priority);
`);
    return;
  }

  const pendingCount = queued.filter(q => q.status === 'pending').length;
  const processingCount = queued.filter(q => q.status === 'processing').length;
  console.log(`  Pending: ${pendingCount}`);
  console.log(`  Processing: ${processingCount}`);

  // Find low quality contacts
  console.log('\nFinding low-quality contacts to enrich...');

  const highPriority = await findLowQualityContacts(0, 30, Math.floor(LIMIT * 0.5));
  const mediumPriority = await findLowQualityContacts(30, 50, Math.floor(LIMIT * 0.3));
  const lowPriority = await findLowQualityContacts(50, 70, Math.floor(LIMIT * 0.2));

  console.log(`  High priority (score < 30): ${highPriority.length}`);
  console.log(`  Medium priority (score 30-49): ${mediumPriority.length}`);
  console.log(`  Low priority (score 50-69): ${lowPriority.length}`);

  // Filter out already queued
  const queuedIds = new Set(queued.map(q => q.person_id));
  const allContacts = [...highPriority, ...mediumPriority, ...lowPriority];
  const toQueue = allContacts.filter(c => !queuedIds.has(c.person_id));

  console.log(`\nNew contacts to queue: ${toQueue.length}`);

  if (toQueue.length === 0) {
    console.log('No new contacts to queue. Done!');
    return;
  }

  console.log('\nSample contacts to enrich:');
  toQueue.slice(0, 5).forEach(c => {
    console.log(`  ${c.email || c.full_name} (score: ${c.data_quality_score})`);
  });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would queue ${toQueue.length} contacts for enrichment`);
    return;
  }

  // Queue contacts
  console.log('\nQueuing for enrichment...');
  const queued_items = await queueForEnrichment(toQueue);
  console.log(`✅ Queued ${queued_items.length} contacts for enrichment`);

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('Enrichment Pipeline Summary');
  console.log('════════════════════════════════════════');
  console.log(`Total in queue: ${pendingCount + queued_items.length}`);
  console.log(`New this run: ${queued_items.length}`);
  console.log(`\nTo process the queue, run:`);
  console.log(`  node scripts/process-enrichment-queue.cjs`);
  console.log(`\nNote: Exa.ai free tier = 1,000 searches/month`);
}

main().catch(console.error);
