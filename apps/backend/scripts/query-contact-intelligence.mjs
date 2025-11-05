#!/usr/bin/env node
/**
 * Query Contact Intelligence Data
 * Run SQL queries to view tier distribution, promotion candidates, and newsletter segments
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

console.log('📊 CONTACT INTELLIGENCE DASHBOARD\n');
console.log('='.repeat(80));

// Query 1: Tier Distribution Stats
console.log('\n📈 TIER DISTRIBUTION STATS');
console.log('-'.repeat(80));

const { data: stats, error: statsError } = await supabase
  .from('vw_engagement_tier_stats')
  .select('*');

if (statsError) {
  console.error('❌ Error:', statsError.message);
} else if (stats && stats.length > 0) {
  console.log('\nTier                Total    In Notion    Government');
  console.log('-'.repeat(60));
  stats.forEach(row => {
    const tier = row.tier.padEnd(15);
    const total = String(row.total_contacts).padStart(5);
    const notion = String(row.synced_to_notion || 0).padStart(5);
    const gov = String(row.government_contacts || 0).padStart(5);
    console.log(`${tier} ${total}    ${notion}         ${gov}`);
  });

  const totalContacts = stats.reduce((sum, row) => sum + row.total_contacts, 0);
  console.log('-'.repeat(60));
  console.log(`TOTAL           ${String(totalContacts).padStart(5)}`);
} else {
  console.log('⚠️  No tier stats available yet');
}

// Query 2: Notion Promotion Candidates
console.log('\n\n🎯 NOTION PROMOTION CANDIDATES (Tier 1)');
console.log('-'.repeat(80));

const { data: candidates, error: candidatesError } = await supabase
  .from('vw_notion_promotion_candidates')
  .select('*')
  .limit(20);

if (candidatesError) {
  console.error('❌ Error:', candidatesError.message);
} else if (candidates && candidates.length > 0) {
  console.log(`\nFound ${candidates.length} Tier 1 contacts ready for Notion promotion:\n`);

  candidates.forEach((contact, i) => {
    console.log(`${i + 1}. ${contact.full_name}`);
    console.log(`   Email: ${contact.email}`);
    console.log(`   Company: ${contact.current_company || 'N/A'}`);
    console.log(`   Composite Score: ${contact.composite_score} | Influence: ${contact.influence_score} | Strategic: ${contact.strategic_value_score}`);
    console.log(`   Interactions: ${contact.total_interactions}`);
    console.log('');
  });
} else {
  console.log('⚠️  No promotion candidates found');
}

// Query 3: Newsletter Segments
console.log('\n📧 NEWSLETTER SEGMENTS');
console.log('-'.repeat(80));

const { data: segments, error: segmentsError } = await supabase
  .from('vw_newsletter_segments')
  .select('*');

if (segmentsError) {
  console.error('❌ Error:', segmentsError.message);
} else if (segments && segments.length > 0) {
  // Group by newsletter type
  const grouped = segments.reduce((acc, contact) => {
    const type = contact.newsletter_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(contact);
    return acc;
  }, {});

  console.log('\nNewsletter Type              Count   Description');
  console.log('-'.repeat(80));

  const types = {
    'executive_summary': 'Personalized executive summaries (Tier 1)',
    'tailored_content': 'Quarterly tailored content (Tier 2)',
    'general_newsletter': 'General quarterly newsletter (Tier 3)',
    'annual_summary': 'Annual summary only (Tier 4)'
  };

  Object.entries(types).forEach(([type, desc]) => {
    const count = grouped[type]?.length || 0;
    console.log(`${type.padEnd(25)} ${String(count).padStart(5)}   ${desc}`);
  });

  console.log('-'.repeat(80));
  console.log(`TOTAL                     ${String(segments.length).padStart(5)}`);
} else {
  console.log('⚠️  No newsletter segments available yet');
}

// Query 4: Sample Contacts by Tier
console.log('\n\n👥 SAMPLE CONTACTS BY TIER');
console.log('-'.repeat(80));

for (const tier of ['critical', 'high', 'medium', 'low']) {
  const { data: contacts } = await supabase
    .from('person_identity_map')
    .select(`
      full_name,
      email,
      current_company,
      contact_intelligence_scores (composite_score)
    `)
    .eq('engagement_priority', tier)
    .limit(5);

  if (contacts && contacts.length > 0) {
    console.log(`\n${tier.toUpperCase()} (${contacts.length} shown):`);
    contacts.forEach(contact => {
      const score = contact.contact_intelligence_scores?.[0]?.composite_score || 'N/A';
      console.log(`  • ${contact.full_name} (${contact.email}) - Score: ${score}`);
    });
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Query complete!');
console.log('\nNext steps:');
console.log('1. Review promotion candidates above');
console.log('2. Promote Tier 1 contacts to Notion manually or via API');
console.log('3. Set up newsletter campaigns using the segments');
