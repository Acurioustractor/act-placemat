/**
 * Test Julie Christensen's alignment score for PICC project
 * She should score 85-95 (TOP PRIORITY tier)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  calculateUnifiedProjectAlignment,
  type Contact,
  type Project,
} from './services/unifiedAlignmentScoring';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testJulieScoring() {
  console.log('🧪 TESTING JULIE CHRISTENSEN ALIGNMENT SCORING\n');
  console.log('=' .repeat(80));

  // 1. Fetch Julie Christensen from database
  const { data: julie, error: julieError } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .ilike('full_name', '%Julie%Christensen%')
    .single();

  if (julieError || !julie) {
    console.error('❌ Could not find Julie Christensen:', julieError);
    return;
  }

  console.log('\n📋 JULIE CHRISTENSEN PROFILE:\n');
  console.log(`Name: ${julie.full_name}`);
  console.log(`Position: ${julie.current_position}`);
  console.log(`Strategic Value: ${julie.strategic_value || 'unknown'}`);
  console.log(`Alignment Tags (${julie.alignment_tags?.length || 0}): ${julie.alignment_tags?.join(', ')}`);
  console.log(`Bio snippet: ${julie.bio?.substring(0, 200)}...`);

  // 2. Get PICC project
  const { data: picc, error: piccError } = await supabase
    .from('notion_projects_cache')
    .select('*')
    .ilike('project_name', '%PICC%Storm%')
    .single();

  if (piccError || !picc) {
    console.error('❌ Could not find PICC project:', piccError);
    return;
  }

  console.log('\n\n📋 PICC PROJECT PROFILE:\n');
  console.log(`Name: ${picc.project_name}`);
  console.log(`Tags: ${picc.tags?.join(', ')}`);
  console.log(`Required Expertise: ${picc.required_expertise?.join(', ')}`);
  console.log(`Location: ${picc.location || 'N/A'}`);

  // 3. Calculate alignment score
  console.log('\n\n🎯 CALCULATING ALIGNMENT SCORE...\n');
  console.log('=' .repeat(80));

  const project: Project = {
    notion_project_id: picc.notion_project_id,
    project_name: picc.project_name,
    project_source: picc.project_source || 'placemat',
    tags: picc.tags,
    location: picc.location,
    required_expertise: picc.required_expertise,
    alma_intervention_id: picc.alma_intervention_id,
  };

  const result = await calculateUnifiedProjectAlignment(
    julie as Contact,
    project,
    {
      supabase,
      useALMA: true,
      includeBreakdown: true,
    }
  );

  // 4. Display detailed results
  console.log(`\n✅ FINAL SCORE: ${result.alignment_score}/100\n`);
  console.log(`Tier: ${result.alignment_score >= 80 ? '🎯 TOP PRIORITY' : result.alignment_score >= 60 ? '✅ HIGH VALUE' : '💡 POTENTIAL'}\n`);
  console.log(`Matched Keywords (${result.matched_keywords.length}): ${result.matched_keywords.join(', ')}\n`);
  console.log(`Match Reason: ${result.match_reason}\n`);

  console.log('SCORE BREAKDOWN:');
  console.log(`  • Keyword Score: ${result.breakdown.keyword_score}/50`);
  console.log(`  • Strategic Value: ${result.breakdown.strategic_value_score}/30`);
  console.log(`  • Location Match: ${result.breakdown.location_score}/10`);
  console.log(`  • Expertise Match: ${result.breakdown.expertise_score}/15`);
  console.log(`  • Exa Confidence: ${result.breakdown.exa_confidence_score}/5`);
  if (result.breakdown.alma_boost) {
    console.log(`  • ALMA Signal Boost: ${result.breakdown.alma_boost}/85`);
  }
  console.log('');

  console.log('RECOMMENDATIONS:');
  result.recommendations.forEach(rec => {
    console.log(`  • ${rec}`);
  });

  console.log('\n' + '=' .repeat(80));

  // 5. Analysis
  console.log('\n📊 ANALYSIS:\n');

  const tagOverlap = (julie.alignment_tags || []).filter((tag: string) =>
    (picc.tags || []).includes(tag)
  );

  console.log(`Julie's tags that match PICC: ${tagOverlap.join(', ')}`);
  console.log(`Expected score range: 75-95 (she has youth_justice + youth + justice + practitioner + educator + government)`);
  console.log(`Actual score: ${result.alignment_score}/100`);

  if (result.alignment_score < 75) {
    console.log('\n⚠️  SCORE LOWER THAN EXPECTED!\n');
    console.log('Possible reasons:');
    console.log('  1. strategic_value is "unknown" (should be "high") - missing 30 points');
    console.log('  2. No ALMA intervention linked to PICC project - missing potential ALMA boost');
    console.log('  3. Location not matching (Julie location vs PICC location)');
  } else {
    console.log('\n✅ SCORE WITHIN EXPECTED RANGE!\n');
  }
}

testJulieScoring()
  .then(() => {
    console.log('\n🎉 Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
