/**
 * Debug test to see exact matching logic for Julie
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugMatching() {
  console.log('🔍 DEBUG: Tag Matching Logic\n');

  // 1. Fetch Julie
  const { data: julie } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .ilike('full_name', '%Julie%Christensen%')
    .single();

  // 2. Get PICC tags
  const { data: picc } = await supabase
    .from('notion_projects_cache')
    .select('*')
    .ilike('project_name', '%PICC%Storm%')
    .single();

  if (!julie || !picc) {
    console.error('Missing data');
    return;
  }

  console.log('PICC Tags:', picc.tags);
  console.log('Julie Tags:', julie.alignment_tags);
  console.log('');

  // Simulate the algorithm's matching logic
  const contactTagsLower = (julie.alignment_tags || []).map((t: string) => t.toLowerCase());
  const bioLower = (julie.bio || '').toLowerCase();

  console.log('Contact tags (lowercase):', contactTagsLower);
  console.log('Bio contains "youth justice"?', bioLower.includes('youth justice'));
  console.log('Bio contains "mentoring"?', bioLower.includes('mentoring'));
  console.log('');

  const tagMatches: string[] = [];
  const bioMatches: string[] = [];

  for (const tag of picc.tags || []) {
    const tagLower = tag.toLowerCase();

    console.log(`\nChecking PICC tag: "${tag}"`);

    // Check contact alignment tags
    if (contactTagsLower.includes(tagLower)) {
      console.log(`  ✅ MATCH in alignment_tags!`);
      tagMatches.push(tag);
    }
    // Check bio text
    else if (bioLower && bioLower.includes(tagLower)) {
      console.log(`  ✅ MATCH in bio text!`);
      bioMatches.push(tag);
    } else {
      console.log(`  ❌ No match`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\nRESULTS:');
  console.log(`Tag Matches: ${tagMatches.join(', ') || 'none'} (${tagMatches.length} × 15 = ${tagMatches.length * 15} points)`);
  console.log(`Bio Matches: ${bioMatches.join(', ') || 'none'} (${bioMatches.length} × 10 = ${bioMatches.length * 10} points)`);
  console.log(`Total Keyword Score: ${Math.min((tagMatches.length * 15) + (bioMatches.length * 10), 50)}/50`);

  // Check why strategic_value is unknown
  console.log('\n' + '='.repeat(80));
  console.log('\nOTHER SCORING FACTORS:');
  console.log(`Strategic Value: ${julie.strategic_value || 'unknown'} → ${julie.strategic_value === 'high' ? 30 : 0} points`);
  console.log(`Exa Confidence: ${julie.exa_confidence || 0} → ${Math.round((julie.exa_confidence || 0) * 5)} points`);
  console.log(`Location: ${julie.location || 'N/A'} vs PICC: ${picc.location || 'N/A'}`);

  console.log('\n' + '='.repeat(80));
  console.log('\nPROBLEM DIAGNOSIS:');
  console.log('1. Julie has "youth_justice" tag → matches PICC → +15 points ✅');
  console.log('2. Julie has "youth" tag but PICC doesn\'t have "youth" → no match ❌');
  console.log('3. Julie has "justice" tag but PICC doesn\'t have "justice" → no match ❌');
  console.log('4. Julie has "educator" but PICC has "mentoring" → no match ❌ (should relate!)');
  console.log('5. Julie has "practitioner" but PICC doesn\'t → no match ❌');
  console.log('6. Julie\'s strategic_value is "unknown" → missing 30 points ❌');
  console.log('7. Bio text contains "Youth Justice" → should match! Let me check...');

  console.log('\nBio text snippet:');
  console.log(julie.bio.substring(0, 300));
}

debugMatching()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
