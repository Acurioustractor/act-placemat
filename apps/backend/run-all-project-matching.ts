/**
 * ALL PROJECTS BATCH MATCHING
 *
 * Runs alignment scoring for ALL 70 Notion projects against 268 enriched contacts
 * Identifies "polymaths" who match multiple projects across different domains
 * Saves results to database for Intelligence Hub + GHL integration
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  batchMatchContactsToProject,
  saveProjectContactMatches,
  getAlignmentTier,
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

async function runAllProjectMatching() {
  console.log('🌐 ALL PROJECTS BATCH MATCHING\n');
  console.log('=' .repeat(80));

  try {
    // =========================================================================
    // 1. Fetch All Projects
    // =========================================================================
    console.log('\n📋 Step 1: Loading all Notion projects...\n');

    const { data: projects, error: projectsError } = await supabase
      .from('notion_projects_cache')
      .select('*')
      .order('project_name');

    if (projectsError || !projects) {
      console.error('❌ Error fetching projects:', projectsError);
      return;
    }

    console.log(`✅ Loaded ${projects.length} projects\n`);

    // Show breakdown by status
    const activeProjects = projects.filter(p => p.status?.includes('Active'));
    const ideationProjects = projects.filter(p => p.status?.includes('Ideation'));
    const sunsetProjects = projects.filter(p => p.status?.includes('Sunset'));

    console.log('Project breakdown:');
    console.log(`  Active: ${activeProjects.length}`);
    console.log(`  Ideation: ${ideationProjects.length}`);
    console.log(`  Sunsetting: ${sunsetProjects.length}`);
    console.log(`  Other: ${projects.length - activeProjects.length - ideationProjects.length - sunsetProjects.length}`);
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

    if (contactsError || !contacts) {
      console.error('❌ Error fetching contacts:', contactsError);
      return;
    }

    console.log(`✅ Fetched ${contacts.length} enriched contacts\n`);

    // =========================================================================
    // 3. Clear Previous Matches
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🗑️  Step 3: Clearing previous matches...\n');

    const { error: deleteError } = await supabase
      .from('project_contact_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('⚠️  Warning: Could not clear previous matches:', deleteError.message);
    } else {
      console.log('✅ Previous matches cleared\n');
    }

    // =========================================================================
    // 4. Run Batch Matching for Each Project
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🎯 Step 4: Running batch matching for all projects...\n');

    let totalMatches = 0;
    let totalTopPriority = 0;
    let totalHighValue = 0;
    let totalPotential = 0;
    const projectResults: Array<{
      name: string;
      matches: number;
      topPriority: number;
      highValue: number;
      potential: number;
    }> = [];

    // Process projects in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);

      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(projects.length / BATCH_SIZE)} (${batch.length} projects)...`);

      for (const project of batch) {
        const projectData: Project = {
          notion_project_id: project.notion_project_id,
          project_name: project.project_name,
          project_source: project.project_source || 'placemat',
          tags: project.tags || [],
          location: project.location,
          required_expertise: project.required_expertise || [],
          alma_intervention_id: project.alma_intervention_id,
        };

        // Skip projects with no tags
        if (!projectData.tags || projectData.tags.length === 0) {
          console.log(`  ⏭️  Skipping "${project.project_name}" (no tags)`);
          continue;
        }

        // Run matching
        const matches = await batchMatchContactsToProject(
          contacts as Contact[],
          projectData,
          {
            supabase,
            useALMA: !!project.alma_intervention_id,
            minScore: 40, // Include POTENTIAL and above
          }
        );

        // Count by tier
        const topPriority = matches.filter(m => m.alignment_score >= 80).length;
        const highValue = matches.filter(m => m.alignment_score >= 60 && m.alignment_score < 80).length;
        const potential = matches.filter(m => m.alignment_score >= 40 && m.alignment_score < 60).length;

        // Save top 30 matches for this project
        if (matches.length > 0) {
          const matchesToSave = matches.slice(0, 30);
          await saveProjectContactMatches(matchesToSave, supabase);

          console.log(`  ✅ ${project.project_name}: ${matches.length} matches (🎯 ${topPriority} | ✅ ${highValue} | 💡 ${potential})`);

          projectResults.push({
            name: project.project_name,
            matches: matches.length,
            topPriority,
            highValue,
            potential,
          });

          totalMatches += matches.length;
          totalTopPriority += topPriority;
          totalHighValue += highValue;
          totalPotential += potential;
        } else {
          console.log(`  ⚠️  ${project.project_name}: 0 matches`);
        }
      }
    }

    // =========================================================================
    // 5. Identify Polymath Contacts (Match Multiple Projects)
    // =========================================================================
    console.log('\n' + '=' .repeat(80));
    console.log('\n🌟 Step 5: Identifying polymath contacts (match multiple projects)...\n');

    const { data: polymathData } = await supabase.rpc('get_polymath_contacts', {}, { count: 'exact' });

    // If the RPC doesn't exist, query manually
    const polymathQuery = `
      SELECT
        c.id,
        c.full_name,
        c.current_position,
        c.strategic_value,
        c.alignment_tags,
        COUNT(DISTINCT pcm.project_notion_id) as project_count,
        ARRAY_AGG(DISTINCT pcm.project_name) as matched_projects,
        ROUND(AVG(pcm.alignment_score)) as avg_score,
        MAX(pcm.alignment_score) as max_score
      FROM linkedin_contacts c
      JOIN project_contact_matches pcm ON c.id = pcm.contact_id
      GROUP BY c.id, c.full_name, c.current_position, c.strategic_value, c.alignment_tags
      HAVING COUNT(DISTINCT pcm.project_notion_id) >= 3
      ORDER BY project_count DESC, avg_score DESC
      LIMIT 20
    `;

    const { data: polymaths, error: polymathError } = await supabase.rpc('exec_sql', {
      sql: polymathQuery
    });

    if (!polymathError && polymaths && polymaths.length > 0) {
      console.log(`✅ Found ${polymaths.length} polymath contacts (3+ project matches)\n`);

      polymaths.slice(0, 10).forEach((contact: any, index: number) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${contact.full_name}`);
        console.log(`    Position: ${contact.current_position || 'Unknown'}`);
        console.log(`    Projects Matched: ${contact.project_count}`);
        console.log(`    Avg Score: ${contact.avg_score}/100 | Max: ${contact.max_score}/100`);
        console.log(`    Strategic Value: ${contact.strategic_value || 'unknown'}`);
        console.log(`    Tags: ${(contact.alignment_tags || []).slice(0, 5).join(', ')}`);
        console.log('');
      });
    } else {
      // Fallback: Query directly
      const { data: fallbackPolymaths } = await supabase
        .from('project_contact_matches')
        .select('contact_id, project_name, alignment_score')
        .order('alignment_score', { ascending: false });

      if (fallbackPolymaths) {
        // Group by contact_id
        const contactProjectCounts = new Map<string, { count: number; projects: string[]; scores: number[] }>();

        fallbackPolymaths.forEach((match: any) => {
          if (!contactProjectCounts.has(match.contact_id)) {
            contactProjectCounts.set(match.contact_id, { count: 0, projects: [], scores: [] });
          }
          const data = contactProjectCounts.get(match.contact_id)!;
          data.count++;
          data.projects.push(match.project_name);
          data.scores.push(match.alignment_score);
        });

        // Find contacts with 3+ matches
        const polymathIds = Array.from(contactProjectCounts.entries())
          .filter(([_, data]) => data.count >= 3)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20);

        console.log(`✅ Found ${polymathIds.length} polymath contacts (3+ project matches)\n`);

        for (let i = 0; i < Math.min(10, polymathIds.length); i++) {
          const [contactId, data] = polymathIds[i];
          const { data: contact } = await supabase
            .from('linkedin_contacts')
            .select('*')
            .eq('id', contactId)
            .single();

          if (contact) {
            const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
            const maxScore = Math.max(...data.scores);

            console.log(`${(i + 1).toString().padStart(2)}. ${contact.full_name}`);
            console.log(`    Position: ${contact.current_position || 'Unknown'}`);
            console.log(`    Projects Matched: ${data.count}`);
            console.log(`    Avg Score: ${avgScore}/100 | Max: ${maxScore}/100`);
            console.log(`    Strategic Value: ${contact.strategic_value || 'unknown'}`);
            console.log(`    Example Projects: ${data.projects.slice(0, 3).join(', ')}`);
            console.log('');
          }
        }
      }
    }

    // =========================================================================
    // 6. Summary Statistics
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n📊 SUMMARY STATISTICS\n');

    console.log('OVERALL RESULTS:');
    console.log(`  Total projects analyzed: ${projects.length}`);
    console.log(`  Projects with matches: ${projectResults.length}`);
    console.log(`  Total matches (all projects): ${totalMatches}`);
    console.log(`  🎯 TOP PRIORITY (≥80): ${totalTopPriority}`);
    console.log(`  ✅ HIGH VALUE (60-79): ${totalHighValue}`);
    console.log(`  💡 POTENTIAL (40-59): ${totalPotential}`);
    console.log('');

    console.log('TOP 10 PROJECTS BY MATCH COUNT:');
    const topProjects = [...projectResults]
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 10);

    topProjects.forEach((project, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${project.name}: ${project.matches} matches`);
    });
    console.log('');

    console.log('TOP 10 PROJECTS BY TOP PRIORITY MATCHES:');
    const topPriorityProjects = [...projectResults]
      .sort((a, b) => b.topPriority - a.topPriority)
      .slice(0, 10);

    topPriorityProjects.forEach((project, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${project.name}: ${project.topPriority} TOP PRIORITY matches`);
    });
    console.log('');

    // =========================================================================
    // SUCCESS
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n✅ ALL PROJECTS MATCHING COMPLETE!\n');

    console.log('NEXT STEPS:');
    console.log('  1. Review polymath contacts (match 3+ projects)');
    console.log('  2. Build UI dashboard to visualize all matches');
    console.log('  3. Set up GHL webhook to auto-add TOP PRIORITY matches');
    console.log('  4. Enable Intelligence Hub queries ("Who for JusticeHub?")');
    console.log('  5. Begin Beautiful Obsolescence journey with top contacts\n');

  } catch (error) {
    console.error('❌ Matching failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

runAllProjectMatching()
  .then(() => {
    console.log('🎉 All project matching complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Matching failed:', error);
    process.exit(1);
  });
