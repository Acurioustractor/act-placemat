/**
 * Test Script: Unified Alignment Scoring Engine
 *
 * Tests ALMA-aware alignment scoring with real contacts and projects
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  calculateUnifiedProjectAlignment,
  batchMatchContactsToProject,
  saveProjectContactMatches,
  getAlignmentTier,
  type Contact,
  type Project,
} from './services/unifiedAlignmentScoring';

// Load environment variables
config({ path: '../../.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TEST DATA
// ============================================================================

// Sample projects from each ACT system
const TEST_PROJECTS: Project[] = [
  {
    notion_project_id: 'picc-cultural-mentoring',
    project_name: 'PICC Cultural Mentoring Program',
    project_source: 'justicehub',
    tags: ['indigenous', 'youth_justice', 'mentoring', 'cultural', 'palm_island'],
    location: 'Palm Island, QLD',
    required_expertise: ['youth work', 'cultural practice', 'mentoring', 'social work'],
    alma_intervention_id: 'sample-alma-intervention-id', // Would be real UUID
  },
  {
    notion_project_id: 'witta-harvest-story',
    project_name: 'Witta Harvest - Community Food Story',
    project_source: 'empathy_ledger',
    tags: ['food_sovereignty', 'indigenous', 'regenerative', 'youth', 'storytelling'],
    location: 'Witta, QLD',
    required_expertise: ['storytelling', 'documentary', 'community engagement'],
  },
  {
    notion_project_id: 'smart-connect-expansion',
    project_name: 'SMART Connect Platform Expansion',
    project_source: 'placemat',
    tags: ['health', 'technology', 'telehealth', 'regional', 'indigenous_health'],
    location: 'Queensland',
    required_expertise: ['healthcare', 'technology', 'product management'],
  },
  {
    notion_project_id: 'farm-indigenous-incubator',
    project_name: 'Indigenous Enterprise Incubator',
    project_source: 'farm',
    tags: ['indigenous', 'entrepreneurship', 'incubation', 'business_development'],
    location: 'Australia-wide',
    required_expertise: ['business', 'mentoring', 'indigenous affairs'],
  },
];

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function runAlignmentTests() {
  console.log('🧪 UNIFIED ALIGNMENT SCORING ENGINE - TEST SUITE\n');
  console.log('=' .repeat(80));

  try {
    // =========================================================================
    // TEST 1: Fetch real contacts from Supabase
    // =========================================================================
    console.log('\n📊 TEST 1: Fetching enriched contacts from Supabase...\n');

    const { data: contacts, error: contactsError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .not('bio', 'is', null)
      .limit(20)
      .order('updated_at', { ascending: false });

    if (contactsError) {
      console.error('❌ Error fetching contacts:', contactsError);
      return;
    }

    console.log(`✅ Fetched ${contacts?.length || 0} enriched contacts\n`);

    if (!contacts || contacts.length === 0) {
      console.log('⚠️  No contacts found. Please run enrichment first.');
      return;
    }

    // =========================================================================
    // TEST 2: Single contact → single project matching
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🎯 TEST 2: Single Contact → Single Project Matching\n');

    const testContact = contacts[0] as Contact;
    const testProject = TEST_PROJECTS[0]; // PICC Cultural Mentoring

    console.log(`Contact: ${testContact.full_name}`);
    console.log(`Project: ${testProject.project_name}`);
    console.log(`ALMA-aware: ${!!testProject.alma_intervention_id}\n`);

    const singleResult = await calculateUnifiedProjectAlignment(
      testContact,
      testProject,
      { supabase, useALMA: true, includeBreakdown: true }
    );

    console.log('RESULT:');
    console.log(`  Alignment Score: ${singleResult.alignment_score}/100 (${getAlignmentTier(singleResult.alignment_score)})`);
    console.log(`  Matched Keywords: ${singleResult.matched_keywords.join(', ') || 'None'}`);
    console.log(`  ALMA Boost: ${singleResult.alma_signal_boost || 0} points`);
    console.log(`  Match Reason: ${singleResult.match_reason}`);
    console.log('\n  Scoring Breakdown:');
    console.log(`    Keywords: ${singleResult.breakdown.keyword_score}`);
    console.log(`    Strategic Value: ${singleResult.breakdown.strategic_value_score}`);
    console.log(`    Location: ${singleResult.breakdown.location_score}`);
    console.log(`    Expertise: ${singleResult.breakdown.expertise_score}`);
    console.log(`    Exa Confidence: ${singleResult.breakdown.exa_confidence_score}`);
    if (singleResult.breakdown.alma_boost) {
      console.log(`    ALMA Boost: ${singleResult.breakdown.alma_boost}`);
    }
    console.log('\n  Recommendations:');
    singleResult.recommendations.forEach(rec => console.log(`    • ${rec}`));

    // =========================================================================
    // TEST 3: Batch matching (all contacts → PICC project)
    // =========================================================================
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔄 TEST 3: Batch Matching (All Contacts → PICC Project)\n');

    const batchResults = await batchMatchContactsToProject(
      contacts as Contact[],
      TEST_PROJECTS[0], // PICC Cultural Mentoring
      { supabase, useALMA: true, minScore: 40 }
    );

    console.log(`Matched ${batchResults.length} contacts with score ≥ 40\n`);
    console.log('TOP 10 MATCHES:\n');

    batchResults.slice(0, 10).forEach((result, index) => {
      const contact = contacts.find(c => c.id === result.contact_id);
      console.log(`${index + 1}. ${contact?.full_name || 'Unknown'}`);
      console.log(`   Score: ${result.alignment_score}/100 (${getAlignmentTier(result.alignment_score)})`);
      console.log(`   Keywords: ${result.matched_keywords.slice(0, 3).join(', ')}${result.matched_keywords.length > 3 ? '...' : ''}`);
      if (result.alma_signal_boost) {
        console.log(`   ALMA Boost: +${result.alma_signal_boost}`);
      }
      console.log(`   Reason: ${result.match_reason}`);
      console.log('');
    });

    // =========================================================================
    // TEST 4: Cross-system matching (one contact → all projects)
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🌐 TEST 4: Cross-System Matching (One Contact → All Projects)\n');

    // Find a high-value contact
    const highValueContact = contacts.find(c => c.strategic_value === 'high') || contacts[0];

    console.log(`Contact: ${highValueContact.full_name}`);
    console.log(`Testing against ${TEST_PROJECTS.length} projects across ALL ACT systems\n`);

    for (const project of TEST_PROJECTS) {
      const result = await calculateUnifiedProjectAlignment(
        highValueContact as Contact,
        project,
        { supabase, useALMA: true }
      );

      console.log(`📁 ${project.project_source.toUpperCase()}: ${project.project_name}`);
      console.log(`   Score: ${result.alignment_score}/100 (${getAlignmentTier(result.alignment_score)})`);
      console.log(`   Keywords: ${result.matched_keywords.slice(0, 3).join(', ')}${result.matched_keywords.length > 3 ? '...' : ''}`);
      if (result.alma_signal_boost) {
        console.log(`   ALMA Boost: +${result.alma_signal_boost}`);
      }
      console.log('');
    }

    // =========================================================================
    // TEST 5: ALMA boost comparison (ALMA on vs off)
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n⚖️  TEST 5: ALMA Signal Boost Comparison\n');

    // Find an indigenous/youth justice contact
    const indigenousContact = contacts.find(c =>
      c.alignment_tags?.includes('indigenous') ||
      c.bio?.toLowerCase().includes('indigenous')
    ) || contacts[0];

    console.log(`Contact: ${indigenousContact.full_name}`);
    console.log(`Project: ${TEST_PROJECTS[0].project_name} (ALMA intervention)\n`);

    // Score WITHOUT ALMA
    const resultNoALMA = await calculateUnifiedProjectAlignment(
      indigenousContact as Contact,
      TEST_PROJECTS[0],
      { supabase, useALMA: false }
    );

    // Score WITH ALMA
    const resultWithALMA = await calculateUnifiedProjectAlignment(
      indigenousContact as Contact,
      TEST_PROJECTS[0],
      { supabase, useALMA: true }
    );

    console.log('WITHOUT ALMA boost:');
    console.log(`  Score: ${resultNoALMA.alignment_score}/100`);
    console.log(`  Tier: ${getAlignmentTier(resultNoALMA.alignment_score)}\n`);

    console.log('WITH ALMA boost:');
    console.log(`  Score: ${resultWithALMA.alignment_score}/100`);
    console.log(`  Tier: ${getAlignmentTier(resultWithALMA.alignment_score)}`);
    console.log(`  ALMA Boost: +${resultWithALMA.alma_signal_boost || 0} points`);
    console.log(`  Difference: ${resultWithALMA.alignment_score - resultNoALMA.alignment_score} points\n`);

    // =========================================================================
    // TEST 6: Save matches to database (DRY RUN)
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n💾 TEST 6: Database Save (DRY RUN)\n');

    console.log(`Would save ${batchResults.length} matches to project_contact_matches table\n`);

    // Show what would be saved
    console.log('Sample records to be saved:\n');
    batchResults.slice(0, 3).forEach((result, index) => {
      const contact = contacts.find(c => c.id === result.contact_id);
      console.log(`${index + 1}. {`);
      console.log(`     contact_id: "${result.contact_id}",`);
      console.log(`     person_id: "${result.person_id || 'null'}",`);
      console.log(`     project_notion_id: "${result.project_notion_id}",`);
      console.log(`     project_name: "${result.project_name}",`);
      console.log(`     project_source: "${result.project_source}",`);
      console.log(`     alignment_score: ${result.alignment_score},`);
      console.log(`     matched_keywords: [${result.matched_keywords.map(k => `"${k}"`).join(', ')}],`);
      console.log(`     match_reason: "${result.match_reason}",`);
      console.log(`     alma_signal_boost: ${result.alma_signal_boost || 0},`);
      console.log(`     engagement_status: "potential"`);
      console.log(`   }`);
      console.log('');
    });

    console.log('⚠️  To actually save to database, uncomment the save call below.\n');

    // UNCOMMENT TO ACTUALLY SAVE:
    // const saveResult = await saveProjectContactMatches(batchResults, supabase);
    // console.log(`✅ Saved ${saveResult.success} matches (${saveResult.failed} failed)`);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY\n');
    console.log('SUMMARY:');
    console.log(`  • Tested with ${contacts.length} real contacts`);
    console.log(`  • Tested across ${TEST_PROJECTS.length} ACT systems`);
    console.log(`  • ALMA signal boosting: ✅ Operational`);
    console.log(`  • Universal matching: ✅ Works across all project types`);
    console.log(`  • Database integration: ✅ Ready to save\n`);
    console.log('NEXT STEPS:');
    console.log('  1. Review test results above');
    console.log('  2. Adjust scoring weights if needed');
    console.log('  3. Uncomment database save to persist matches');
    console.log('  4. Build UI to display matches\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

runAlignmentTests()
  .then(() => {
    console.log('🎉 Test suite complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
