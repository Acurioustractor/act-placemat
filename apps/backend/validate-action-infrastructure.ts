/**
 * VALIDATE ACTION INFRASTRUCTURE
 *
 * Checks that all components of the action-oriented enrichment system are working:
 * 1. Intelligence layer (alignment scoring, polymath discovery)
 * 2. Understanding layer (strategic values, tag quality)
 * 3. Action layer (high-value contacts ready for outreach)
 * 4. Database integrity (contacts, projects, matches)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function validateActionInfrastructure() {
  console.log('🔍 VALIDATING ACTION INFRASTRUCTURE\n');
  console.log('='.repeat(80));

  try {
    let allChecks = true;

    // ========================================================================
    // 1. INTELLIGENCE LAYER
    // ========================================================================
    console.log('\n📊 INTELLIGENCE LAYER\n');

    // Check enriched contacts
    const { data: enrichedContacts, error: contactsError } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, alignment_tags, strategic_value, bio')
      .not('alignment_tags', 'is', null);

    if (contactsError) {
      console.error('❌ Error fetching enriched contacts:', contactsError);
      allChecks = false;
    } else {
      const taggedCount = enrichedContacts?.length || 0;
      const tagCoverage = enrichedContacts?.filter(c => c.alignment_tags.length > 0).length || 0;
      const avgTags = enrichedContacts && enrichedContacts.length > 0
        ? (enrichedContacts.reduce((sum, c) => sum + c.alignment_tags.length, 0) / enrichedContacts.length).toFixed(1)
        : 0;

      console.log(`✅ Enriched contacts: ${taggedCount}`);
      console.log(`✅ Contacts with tags: ${tagCoverage} (${((tagCoverage/taggedCount)*100).toFixed(1)}%)`);
      console.log(`✅ Average tags per contact: ${avgTags}`);
    }

    // Check synced projects
    const { data: projects, error: projectsError } = await supabase
      .from('notion_projects_cache')
      .select('notion_project_id, project_name, tags, status, alma_intervention_id');

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      allChecks = false;
    } else {
      const totalProjects = projects?.length || 0;
      const taggedProjects = projects?.filter(p => p.tags && p.tags.length > 0).length || 0;
      const almaProjects = projects?.filter(p => p.alma_intervention_id).length || 0;

      console.log(`✅ Synced projects: ${totalProjects}`);
      console.log(`✅ Projects with tags: ${taggedProjects} (${((taggedProjects/totalProjects)*100).toFixed(1)}%)`);
      console.log(`✅ Projects with ALMA interventions: ${almaProjects}`);
    }

    // Check project matches
    const { data: matches, error: matchesError } = await supabase
      .from('project_contact_matches')
      .select('id, alignment_score, contact_id, project_notion_id');

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      allChecks = false;
    } else {
      const totalMatches = matches?.length || 0;
      const topPriority = matches?.filter(m => m.alignment_score >= 80).length || 0;
      const highValue = matches?.filter(m => m.alignment_score >= 60 && m.alignment_score < 80).length || 0;
      const potential = matches?.filter(m => m.alignment_score >= 40 && m.alignment_score < 60).length || 0;

      console.log(`✅ Total matches: ${totalMatches}`);
      console.log(`✅ TOP PRIORITY (≥80): ${topPriority}`);
      console.log(`✅ HIGH VALUE (60-79): ${highValue}`);
      console.log(`✅ POTENTIAL (40-59): ${potential}`);
    }

    // ========================================================================
    // 2. UNDERSTANDING LAYER
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n🧠 UNDERSTANDING LAYER\n');

    // Check strategic values
    if (enrichedContacts) {
      const highValue = enrichedContacts.filter(c => c.strategic_value === 'high').length;
      const mediumValue = enrichedContacts.filter(c => c.strategic_value === 'medium').length;
      const unknownValue = enrichedContacts.filter(c => c.strategic_value === 'unknown' || !c.strategic_value).length;

      console.log(`✅ High strategic value: ${highValue}`);
      console.log(`✅ Medium strategic value: ${mediumValue}`);
      console.log(`⚠️  Unknown strategic value: ${unknownValue}`);

      if (highValue < 3) {
        console.log('⚠️  WARNING: Less than 3 high-value contacts. Review top polymaths.');
        allChecks = false;
      }
    }

    // Check polymaths
    if (matches && matches.length > 0) {
      const contactMap = new Map<string, Set<string>>();
      matches.forEach(match => {
        if (!contactMap.has(match.contact_id)) {
          contactMap.set(match.contact_id, new Set());
        }
        contactMap.get(match.contact_id)!.add(match.project_notion_id);
      });

      const polymaths = Array.from(contactMap.entries())
        .filter(([_, projects]) => projects.size >= 3)
        .map(([contactId, projects]) => ({ contactId, projectCount: projects.size }))
        .sort((a, b) => b.projectCount - a.projectCount);

      const superConnectors = polymaths.filter(p => p.projectCount >= 5);
      const domainConnectors = polymaths.filter(p => p.projectCount >= 3 && p.projectCount < 5);

      console.log(`✅ Total polymaths (3+ projects): ${polymaths.length}`);
      console.log(`✅ Super connectors (5+ projects): ${superConnectors.length}`);
      console.log(`✅ Domain connectors (3-4 projects): ${domainConnectors.length}`);

      if (polymaths.length < 10) {
        console.log('⚠️  WARNING: Less than 10 polymaths found. Consider expanding contact enrichment.');
      }
    }

    // ========================================================================
    // 3. ACTION LAYER
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n🚀 ACTION LAYER\n');

    // Check high-value contacts ready for outreach
    const { data: topContacts, error: topContactsError } = await supabase
      .from('project_contact_matches')
      .select(`
        *,
        contact:linkedin_contacts(full_name, current_position, email_address, linkedin_url, strategic_value)
      `)
      .gte('alignment_score', 80)
      .order('alignment_score', { ascending: false })
      .limit(10);

    if (topContactsError) {
      console.error('❌ Error fetching top contacts:', topContactsError);
      allChecks = false;
    } else if (topContacts && topContacts.length > 0) {
      console.log(`✅ TOP PRIORITY contacts ready for outreach: ${topContacts.length}\n`);

      // Check specific high-value polymaths
      const julie = topContacts.find(c => c.contact?.full_name?.includes('Julie') && c.contact?.full_name?.includes('Christensen'));
      const sara = topContacts.find(c => c.contact?.full_name?.includes('Sara') && c.contact?.full_name?.includes('Sieradzki'));
      const duncan = topContacts.find(c => c.contact?.full_name?.includes('Duncan') && c.contact?.full_name?.includes('Kerslake'));

      console.log('TOP 3 POLYMATHS STATUS:\n');

      if (julie) {
        console.log(`✅ Julie Christensen: ${julie.alignment_score}/100 (${julie.contact?.strategic_value || 'unknown'})`);
        console.log(`   Project: ${julie.project_name}`);
        console.log(`   Position: ${julie.contact?.current_position}`);
        if (julie.contact?.email_address) {
          console.log(`   ✅ Email available: ${julie.contact.email_address}`);
        } else {
          console.log(`   ⚠️  No email address`);
        }
      } else {
        console.log('⚠️  Julie Christensen not found in TOP PRIORITY');
        allChecks = false;
      }

      if (sara) {
        console.log(`\n✅ Sara Sieradzki: ${sara.alignment_score}/100 (${sara.contact?.strategic_value || 'unknown'})`);
        console.log(`   Project: ${sara.project_name}`);
        console.log(`   Position: ${sara.contact?.current_position}`);
        if (sara.contact?.email_address) {
          console.log(`   ✅ Email available: ${sara.contact.email_address}`);
        } else {
          console.log(`   ⚠️  No email address`);
        }
      } else {
        console.log('\n⚠️  Sara Sieradzki not found in TOP PRIORITY');
        allChecks = false;
      }

      if (duncan) {
        console.log(`\n✅ Duncan Kerslake: ${duncan.alignment_score}/100 (${duncan.contact?.strategic_value || 'unknown'})`);
        console.log(`   Project: ${duncan.project_name}`);
        console.log(`   Position: ${duncan.contact?.current_position}`);
        if (duncan.contact?.email_address) {
          console.log(`   ✅ Email available: ${duncan.contact.email_address}`);
        } else {
          console.log(`   ⚠️  No email address`);
        }
      }
    } else {
      console.log('⚠️  No TOP PRIORITY contacts found');
      allChecks = false;
    }

    // Check Beautiful Obsolescence journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('ghl_engagement_metrics')
      .select('id, contact_id, project_id, engagement_status, act_energy_percent');

    if (journeysError) {
      console.log('\n⚠️  No Beautiful Obsolescence journeys table found (this is OK for now)');
    } else {
      const totalJourneys = journeys?.length || 0;
      const activeJourneys = journeys?.filter(j => j.engagement_status !== 'obsolete').length || 0;
      const completedJourneys = journeys?.filter(j => j.act_energy_percent === 0).length || 0;

      console.log(`\n✅ Beautiful Obsolescence journeys: ${totalJourneys}`);
      console.log(`✅ Active journeys: ${activeJourneys}`);
      console.log(`✅ Completed journeys (0% ACT): ${completedJourneys}`);

      if (totalJourneys === 0) {
        console.log('ℹ️  No journeys yet - ready to start outreach!');
      }
    }

    // ========================================================================
    // 4. DATABASE INTEGRITY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n🗄️  DATABASE INTEGRITY\n');

    // Check ALMA interventions
    const { data: interventions, error: interventionsError } = await supabase
      .from('alma_interventions')
      .select('id, name, type, cultural_authority');

    if (interventionsError) {
      console.error('❌ Error fetching ALMA interventions:', interventionsError);
      allChecks = false;
    } else {
      console.log(`✅ ALMA interventions: ${interventions?.length || 0}`);
      if (interventions && interventions.length > 0) {
        interventions.forEach(i => {
          console.log(`   - ${i.name} (${i.type}) - Authority: ${i.cultural_authority}`);
        });
      } else {
        console.log('⚠️  No ALMA interventions found. Create interventions for better signal boosting.');
      }
    }

    // Check project-intervention links
    if (projects && interventions) {
      const linkedProjects = projects.filter(p => p.alma_intervention_id).length;
      console.log(`✅ Projects linked to interventions: ${linkedProjects}/${projects.length}`);

      if (linkedProjects === 0 && interventions.length > 0) {
        console.log('⚠️  WARNING: Interventions exist but no projects are linked. Link projects for signal boosting.');
        allChecks = false;
      }
    }

    // ========================================================================
    // 5. FRONTEND COMPONENTS
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n🎨 FRONTEND COMPONENTS\n');

    const componentsPath = path.join(__dirname, '../frontend/src/components/intelligence');
    const requiredComponents = [
      'ProjectMatchesDashboard.tsx',
      'BeautifulObsolescenceTracker.tsx',
      'NaturalLanguageQuery.tsx'
    ];

    requiredComponents.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      if (fs.existsSync(componentPath)) {
        const stats = fs.statSync(componentPath);
        const lines = fs.readFileSync(componentPath, 'utf-8').split('\n').length;
        console.log(`✅ ${component}: ${lines} lines`);
      } else {
        console.log(`❌ ${component}: NOT FOUND`);
        allChecks = false;
      }
    });

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 VALIDATION SUMMARY\n');

    if (allChecks) {
      console.log('✅ ALL CHECKS PASSED!\n');
      console.log('🎉 Action infrastructure is ready for production!\n');
      console.log('NEXT STEPS:');
      console.log('  1. Send outreach emails to Julie, Sara, Duncan');
      console.log('  2. Set up GHL webhook for auto-add (score ≥80)');
      console.log('  3. Start Beautiful Obsolescence journey tracking');
      console.log('  4. Expand contact enrichment to 2,000 contacts (10%)');
      console.log('  5. Create 5-10 ALMA interventions for broader coverage\n');
    } else {
      console.log('⚠️  SOME CHECKS FAILED\n');
      console.log('Review warnings above and address issues before production launch.\n');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

validateActionInfrastructure()
  .then(() => {
    console.log('🎉 Validation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
