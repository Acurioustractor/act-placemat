/**
 * PICC Cultural Mentoring - Batch Contact Matching
 *
 * Runs alignment scoring for PICC project against all enriched contacts
 * Saves top matches to database for GHL integration
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  batchMatchContactsToProject,
  saveProjectContactMatches,
  getAlignmentTier,
  getAlignmentColor,
  type Contact,
  type Project,
} from './services/unifiedAlignmentScoring';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// PICC PROJECT DEFINITION
// ============================================================================

async function getPICCProject(): Promise<Project> {
  // Try to get actual PICC project from Notion cache
  const { data: cachedProject } = await supabase
    .from('notion_projects_cache')
    .select('*')
    .ilike('project_name', '%PICC%')
    .limit(1)
    .single();

  if (cachedProject) {
    console.log(`✅ Found PICC project in cache: ${cachedProject.project_name}\n`);
    return {
      notion_project_id: cachedProject.notion_project_id,
      project_name: cachedProject.project_name,
      project_source: cachedProject.project_source || 'justicehub',
      tags: cachedProject.tags || ['indigenous', 'youth_justice', 'mentoring', 'cultural', 'palm_island'],
      location: cachedProject.location || 'Palm Island, QLD',
      required_expertise: cachedProject.required_expertise || ['youth work', 'cultural practice', 'mentoring'],
      alma_intervention_id: cachedProject.alma_intervention_id,
    };
  }

  // Fallback: Use sample PICC project
  console.log('⚠️  PICC project not found in cache, using sample definition\n');
  return {
    notion_project_id: 'picc-cultural-mentoring-sample',
    project_name: 'PICC Cultural Mentoring Program',
    project_source: 'justicehub',
    tags: ['indigenous', 'youth_justice', 'mentoring', 'cultural', 'palm_island'],
    location: 'Palm Island, QLD',
    required_expertise: ['youth work', 'cultural practice', 'mentoring', 'social work'],
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function runPICCMatching() {
  console.log('⚖️  PICC CULTURAL MENTORING - CONTACT MATCHING\n');
  console.log('=' .repeat(80));

  try {
    // =========================================================================
    // 1. Get PICC Project
    // =========================================================================
    console.log('\n📋 Step 1: Loading PICC project...\n');

    const piccProject = await getPICCProject();

    console.log('Project Details:');
    console.log(`  Name: ${piccProject.project_name}`);
    console.log(`  Source: ${piccProject.project_source}`);
    console.log(`  Location: ${piccProject.location}`);
    console.log(`  Tags: ${piccProject.tags?.join(', ')}`);
    console.log(`  Required Expertise: ${piccProject.required_expertise?.join(', ')}`);
    if (piccProject.alma_intervention_id) {
      console.log(`  ALMA Intervention: ${piccProject.alma_intervention_id}`);
    }
    console.log('');

    // =========================================================================
    // 2. Fetch All Contacts
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n📊 Step 2: Fetching enriched contacts...\n');

    const { data: contacts, error: contactsError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .not('bio', 'is', null);

    if (contactsError) {
      console.error('❌ Error fetching contacts:', contactsError);
      return;
    }

    console.log(`✅ Fetched ${contacts?.length || 0} enriched contacts\n`);

    if (!contacts || contacts.length === 0) {
      console.log('⚠️  No contacts found');
      return;
    }

    // Show tag stats
    const taggedContacts = contacts.filter(c => c.alignment_tags && c.alignment_tags.length > 0);
    console.log(`Tagged contacts: ${taggedContacts.length} (${Math.round((taggedContacts.length / contacts.length) * 100)}%)`);

    // Count relevant tags
    const indigenousCount = contacts.filter(c => c.alignment_tags?.includes('indigenous')).length;
    const youthJusticeCount = contacts.filter(c => c.alignment_tags?.includes('youth_justice')).length;
    const mentoringCount = contacts.filter(c => c.alignment_tags?.includes('mentoring')).length;
    const justiceCount = contacts.filter(c => c.alignment_tags?.includes('justice')).length;

    console.log(`\nRelevant tag counts:`);
    console.log(`  Indigenous: ${indigenousCount} contacts`);
    console.log(`  Youth Justice: ${youthJusticeCount} contacts`);
    console.log(`  Mentoring: ${mentoringCount} contacts`);
    console.log(`  Justice: ${justiceCount} contacts`);
    console.log('');

    // =========================================================================
    // 3. Run Batch Matching
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🎯 Step 3: Running alignment scoring (ALMA-aware)...\n');

    const matches = await batchMatchContactsToProject(
      contacts as Contact[],
      piccProject,
      {
        supabase,
        useALMA: !!piccProject.alma_intervention_id,
        minScore: 40, // Include POTENTIAL and above
      }
    );

    console.log(`✅ Matching complete!\n`);
    console.log(`Total matches (score ≥ 40): ${matches.length}\n`);

    // =========================================================================
    // 4. Show Results by Tier
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n📊 Step 4: Results by Alignment Tier\n');

    const topPriority = matches.filter(m => m.alignment_score >= 80);
    const highValue = matches.filter(m => m.alignment_score >= 60 && m.alignment_score < 80);
    const potential = matches.filter(m => m.alignment_score >= 40 && m.alignment_score < 60);

    console.log(`🎯 TOP PRIORITY (80-100): ${topPriority.length} matches`);
    console.log(`✅ HIGH VALUE (60-79): ${highValue.length} matches`);
    console.log(`💡 POTENTIAL (40-59): ${potential.length} matches\n`);

    // =========================================================================
    // 5. Show Top 20 Matches
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🌟 TOP 20 MATCHES FOR PICC CULTURAL MENTORING\n');

    const topMatches = matches.slice(0, 20);

    topMatches.forEach((match, index) => {
      const contact = contacts.find(c => c.id === match.contact_id);
      if (!contact) return;

      console.log(`${(index + 1).toString().padStart(2)}. ${contact.full_name}`);
      console.log(`    Score: ${match.alignment_score}/100 (${getAlignmentTier(match.alignment_score)})`);
      console.log(`    Position: ${contact.current_position || 'Unknown'}`);
      console.log(`    Strategic Value: ${contact.strategic_value || 'unknown'}`);

      if (match.matched_keywords.length > 0) {
        console.log(`    Keywords: ${match.matched_keywords.slice(0, 5).join(', ')}${match.matched_keywords.length > 5 ? '...' : ''}`);
      }

      if (match.alma_signal_boost) {
        console.log(`    🌟 ALMA Boost: +${match.alma_signal_boost} points`);
      }

      console.log(`    Reason: ${match.match_reason}`);

      if (match.recommendations.length > 0) {
        console.log(`    Recommendations:`);
        match.recommendations.slice(0, 2).forEach(rec => {
          console.log(`      • ${rec}`);
        });
      }

      console.log('');
    });

    // =========================================================================
    // 6. Save Top Matches to Database
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n💾 Step 5: Saving top 30 matches to database...\n');

    const matchesToSave = matches.slice(0, 30);
    const saveResult = await saveProjectContactMatches(matchesToSave, supabase);

    console.log(`✅ Saved ${saveResult.success} matches`);
    if (saveResult.failed > 0) {
      console.log(`❌ Failed: ${saveResult.failed} matches`);
    }
    console.log('');

    // =========================================================================
    // 7. Indigenous & Youth Justice Highlights
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n⚖️  INDIGENOUS & YOUTH JUSTICE HIGHLIGHTS (ALMA Priority)\n');

    const indigenousMatches = matches.filter(m => {
      const contact = contacts.find(c => c.id === m.contact_id);
      return contact?.alignment_tags?.includes('indigenous');
    });

    const youthJusticeMatches = matches.filter(m => {
      const contact = contacts.find(c => c.id === m.contact_id);
      return contact?.alignment_tags?.includes('youth_justice') || contact?.alignment_tags?.includes('youth');
    });

    console.log(`Indigenous contacts matched: ${indigenousMatches.length}`);
    console.log(`Youth justice contacts matched: ${youthJusticeMatches.length}\n`);

    if (indigenousMatches.length > 0) {
      console.log('Top Indigenous Matches:\n');
      indigenousMatches.slice(0, 5).forEach((match, index) => {
        const contact = contacts.find(c => c.id === match.contact_id);
        if (!contact) return;

        console.log(`${index + 1}. ${contact.full_name}`);
        console.log(`   Score: ${match.alignment_score}/100`);
        console.log(`   Tags: ${contact.alignment_tags?.join(', ')}`);
        if (match.alma_signal_boost) {
          console.log(`   ALMA Boost: +${match.alma_signal_boost}`);
        }
        console.log('');
      });
    }

    if (youthJusticeMatches.length > 0) {
      console.log('Top Youth Justice Matches:\n');
      youthJusticeMatches.slice(0, 5).forEach((match, index) => {
        const contact = contacts.find(c => c.id === match.contact_id);
        if (!contact) return;

        console.log(`${index + 1}. ${contact.full_name}`);
        console.log(`   Score: ${match.alignment_score}/100`);
        console.log(`   Tags: ${contact.alignment_tags?.join(', ')}`);
        if (match.alma_signal_boost) {
          console.log(`   ALMA Boost: +${match.alma_signal_boost}`);
        }
        console.log('');
      });
    }

    // =========================================================================
    // SUCCESS
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n✅ PICC MATCHING COMPLETE!\n');
    console.log('SUMMARY:');
    console.log(`  • Total contacts analyzed: ${contacts.length}`);
    console.log(`  • Matches found (≥40): ${matches.length}`);
    console.log(`  • TOP PRIORITY (≥80): ${topPriority.length}`);
    console.log(`  • HIGH VALUE (60-79): ${highValue.length}`);
    console.log(`  • POTENTIAL (40-59): ${potential.length}`);
    console.log(`  • Saved to database: ${saveResult.success}`);
    console.log(`  • Indigenous matches: ${indigenousMatches.length}`);
    console.log(`  • Youth justice matches: ${youthJusticeMatches.length}\n`);

    console.log('NEXT STEPS:');
    console.log('  1. Review top matches above');
    console.log('  2. Add high-priority contacts to GHL pipeline');
    console.log('  3. Build UI dashboard to visualize all matches');
    console.log('  4. Set up Beautiful Obsolescence tracking\n');

  } catch (error) {
    console.error('❌ Matching failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

runPICCMatching()
  .then(() => {
    console.log('🎉 PICC matching complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 PICC matching failed:', error);
    process.exit(1);
  });
