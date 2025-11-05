#!/usr/bin/env node
/**
 * Check which tables exist in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking Supabase database structure...\n');

// Check person_identity_map columns
console.log('📋 person_identity_map columns:');
const { data: personSample, error: personError } = await supabase
  .from('person_identity_map')
  .select('*')
  .limit(1);

if (personError) {
  console.error('❌ Error:', personError.message);
} else {
  const columns = personSample && personSample.length > 0 ? Object.keys(personSample[0]) : [];
  console.log('  ', columns.join(', '));

  // Check for required columns
  const requiredColumns = ['engagement_priority', 'youth_justice_relevance_score', 'contact_data', 'sector'];
  const missingColumns = requiredColumns.filter(col => !columns.includes(col));

  if (missingColumns.length > 0) {
    console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
    console.log('   → Need to apply migration: 20250913160000_contact_intelligence_system.sql');
  } else {
    console.log('\n✅ All required columns exist!');
  }
}

// Check for contact_intelligence_scores table
console.log('\n📊 contact_intelligence_scores table:');
const { data: scoresSample, error: scoresError } = await supabase
  .from('contact_intelligence_scores')
  .select('*')
  .limit(1);

if (scoresError) {
  console.error('❌ Table does not exist:', scoresError.message);
  console.log('   → Need to apply migration: 20250913160000_contact_intelligence_system.sql');
} else {
  console.log('✅ Table exists');
  const { count } = await supabase
    .from('contact_intelligence_scores')
    .select('*', { count: 'exact', head: true });
  console.log(`   ${count} records`);
}

// Check for linkedin_contacts table
console.log('\n👔 linkedin_contacts table:');
const { data: linkedinSample, error: linkedinError } = await supabase
  .from('linkedin_contacts')
  .select('*', { count: 'exact', head: true });

if (linkedinError) {
  console.error('❌ Table does not exist:', linkedinError.message);
} else {
  console.log(`✅ Table exists - ${linkedinSample.count} records`);
}

// Check for linkedin_project_connections table
console.log('\n🔗 linkedin_project_connections table:');
const { data: projectConnSample, error: projectConnError } = await supabase
  .from('linkedin_project_connections')
  .select('*', { count: 'exact', head: true });

if (projectConnError) {
  console.error('❌ Table does not exist:', projectConnError.message);
} else {
  console.log(`✅ Table exists - ${projectConnSample.count} records`);
}

// Check for contact_interactions table
console.log('\n💬 contact_interactions table:');
const { data: interactionsSample, error: interactionsError } = await supabase
  .from('contact_interactions')
  .select('*', { count: 'exact', head: true });

if (interactionsError) {
  console.error('❌ Table does not exist:', interactionsError.message);
  console.log('   → Need to apply migration: 20250913160000_contact_intelligence_system.sql');
} else {
  console.log(`✅ Table exists - ${interactionsSample.count} records`);
}

console.log('\n' + '='.repeat(60));
console.log('MIGRATION STATUS:');
console.log('='.repeat(60));

const hasIntelligenceSystem = !scoresError && !interactionsError;
const hasEngagementPriority = personSample && personSample.length > 0 &&
  Object.keys(personSample[0]).includes('engagement_priority');

if (hasIntelligenceSystem) {
  console.log('✅ contact_intelligence_system migration applied');
} else {
  console.log('❌ contact_intelligence_system migration NOT applied');
  console.log('   → Apply: supabase/migrations/20250913160000_contact_intelligence_system.sql');
}

if (hasEngagementPriority) {
  console.log('✅ engagement_tier_assignment migration applied');
} else {
  console.log('❌ engagement_tier_assignment migration NOT applied');
  console.log('   → Apply: supabase/migrations/20251026000000_engagement_tier_assignment.sql');
}

console.log('\n');
