/**
 * POLYMATH CONTACT ANALYSIS
 *
 * Analyzes contacts who match 3+ projects (polymaths)
 * Identifies ecosystem connectors and cross-domain opportunities
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function analyzePolymaths() {
  console.log('🌟 POLYMATH CONTACT ANALYSIS\n');
  console.log('=' .repeat(80));

  try {
    // =========================================================================
    // 1. Fetch All Matches
    // =========================================================================
    console.log('\n📊 Step 1: Loading all project matches...\n');

    const { data: matches, error: matchesError } = await supabase
      .from('project_contact_matches')
      .select(`
        *,
        contact:linkedin_contacts(*)
      `)
      .order('alignment_score', { ascending: false });

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      return;
    }

    console.log(`✅ Loaded ${matches?.length || 0} total matches\n`);

    if (!matches || matches.length === 0) {
      console.log('⚠️  No matches found. Run batch matching first.\n');
      return;
    }

    // =========================================================================
    // 2. Group by Contact
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n📋 Step 2: Grouping matches by contact...\n');

    const contactMap = new Map<string, {
      contact: any;
      matches: any[];
      projects: Set<string>;
      avgScore: number;
      maxScore: number;
      topPriorityCount: number;
      highValueCount: number;
      potentialCount: number;
    }>();

    matches.forEach(match => {
      if (!contactMap.has(match.contact_id)) {
        contactMap.set(match.contact_id, {
          contact: match.contact,
          matches: [],
          projects: new Set(),
          avgScore: 0,
          maxScore: 0,
          topPriorityCount: 0,
          highValueCount: 0,
          potentialCount: 0,
        });
      }

      const data = contactMap.get(match.contact_id)!;
      data.matches.push(match);
      data.projects.add(match.project_notion_id);

      // Update score stats
      const scores = data.matches.map(m => m.alignment_score);
      data.avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      data.maxScore = Math.max(...scores);

      // Count by tier
      data.topPriorityCount = data.matches.filter(m => m.alignment_score >= 80).length;
      data.highValueCount = data.matches.filter(m => m.alignment_score >= 60 && m.alignment_score < 80).length;
      data.potentialCount = data.matches.filter(m => m.alignment_score >= 40 && m.alignment_score < 60).length;
    });

    console.log(`✅ Analyzed ${contactMap.size} unique contacts\n`);

    // =========================================================================
    // 3. Identify Polymaths (3+ projects)
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🌟 Step 3: Identifying polymath contacts (3+ projects)...\n');

    const polymaths = Array.from(contactMap.entries())
      .filter(([_, data]) => data.projects.size >= 3)
      .map(([contactId, data]) => ({
        id: contactId,
        full_name: data.contact?.full_name || 'Unknown',
        current_position: data.contact?.current_position || 'Unknown',
        current_company: data.contact?.current_company,
        strategic_value: data.contact?.strategic_value || 'unknown',
        alignment_tags: data.contact?.alignment_tags || [],
        project_count: data.projects.size,
        match_count: data.matches.length,
        matched_projects: data.matches.map(m => m.project_name),
        avg_score: data.avgScore,
        max_score: data.maxScore,
        top_priority_count: data.topPriorityCount,
        high_value_count: data.highValueCount,
        potential_count: data.potentialCount,
        matches: data.matches,
      }))
      .sort((a, b) => b.project_count - a.project_count || b.avg_score - a.avg_score);

    console.log(`✅ Found ${polymaths.length} polymath contacts\n`);

    if (polymaths.length === 0) {
      console.log('⚠️  No polymaths found yet. Wait for more project matching to complete.\n');
      return;
    }

    // =========================================================================
    // 4. Polymath Tiers
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🏆 Step 4: Polymath Tier Breakdown\n');

    const superConnectors = polymaths.filter(p => p.project_count >= 5);
    const domainConnectors = polymaths.filter(p => p.project_count >= 3 && p.project_count < 5);

    console.log(`🌟 SUPER CONNECTORS (5+ projects): ${superConnectors.length}`);
    console.log(`✨ DOMAIN CONNECTORS (3-4 projects): ${domainConnectors.length}\n`);

    // =========================================================================
    // 5. Top 20 Polymaths
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n👑 TOP 20 POLYMATH CONTACTS\n');

    polymaths.slice(0, 20).forEach((polymath, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${polymath.full_name}`);
      console.log(`    Position: ${polymath.current_position}`);
      if (polymath.current_company) {
        console.log(`    Company: ${polymath.current_company}`);
      }
      console.log(`    Projects Matched: ${polymath.project_count} (${polymath.match_count} total matches)`);
      console.log(`    Scores: Avg ${polymath.avg_score}/100 | Max ${polymath.max_score}/100`);
      console.log(`    Tier Breakdown: 🎯 ${polymath.top_priority_count} | ✅ ${polymath.high_value_count} | 💡 ${polymath.potential_count}`);

      if (polymath.strategic_value === 'high') {
        console.log(`    Strategic Value: ⭐ HIGH`);
      }

      if (polymath.alignment_tags.length > 0) {
        console.log(`    Tags (${polymath.alignment_tags.length}): ${polymath.alignment_tags.slice(0, 6).join(', ')}${polymath.alignment_tags.length > 6 ? '...' : ''}`);
      }

      console.log(`    Projects: ${polymath.matched_projects.slice(0, 3).join(', ')}${polymath.project_count > 3 ? ` +${polymath.project_count - 3} more` : ''}`);
      console.log('');
    });

    // =========================================================================
    // 6. Tag Analysis
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🏷️  Step 5: Tag Analysis for Polymaths\n');

    const tagCounts = new Map<string, number>();
    polymaths.forEach(polymath => {
      polymath.alignment_tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    console.log('Most common tags among polymaths:\n');
    topTags.forEach(([tag, count], index) => {
      const percentage = Math.round((count / polymaths.length) * 100);
      console.log(`  ${(index + 1).toString().padStart(2)}. ${tag}: ${count} polymaths (${percentage}%)`);
    });
    console.log('');

    // =========================================================================
    // 7. Cross-Domain Opportunities
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🌐 Step 6: Cross-Domain Opportunities\n');

    console.log('Polymaths with diverse tag portfolios (6+ tags):\n');
    const diversePolymaths = polymaths
      .filter(p => p.alignment_tags.length >= 6)
      .slice(0, 10);

    diversePolymaths.forEach((polymath, index) => {
      console.log(`${index + 1}. ${polymath.full_name} (${polymath.alignment_tags.length} tags)`);
      console.log(`   ${polymath.project_count} projects | Avg score: ${polymath.avg_score}/100`);
      console.log(`   Tags: ${polymath.alignment_tags.join(', ')}`);
      console.log('');
    });

    // =========================================================================
    // 8. Strategic Value Analysis
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n⭐ Step 7: Strategic Value Analysis\n');

    const highValuePolymaths = polymaths.filter(p => p.strategic_value === 'high');
    const unknownValuePolymaths = polymaths.filter(p => p.strategic_value === 'unknown');

    console.log(`High strategic value polymaths: ${highValuePolymaths.length}`);
    console.log(`Unknown strategic value polymaths: ${unknownValuePolymaths.length}\n`);

    if (unknownValuePolymaths.length > 0) {
      console.log('⚠️  RECOMMENDATION: Assess strategic value for these high-potential polymaths:\n');
      unknownValuePolymaths.slice(0, 5).forEach(polymath => {
        console.log(`  • ${polymath.full_name} (${polymath.project_count} projects, avg score ${polymath.avg_score})`);
        console.log(`    ${polymath.current_position}`);
      });
      console.log('');
    }

    // =========================================================================
    // 9. Project Overlap Analysis
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n📊 Step 8: Project Overlap Analysis\n');

    const projectCounts = new Map<string, number>();
    matches.forEach(match => {
      projectCounts.set(match.project_name, (projectCounts.get(match.project_name) || 0) + 1);
    });

    const topProjects = Array.from(projectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('Top 10 projects by match count:\n');
    topProjects.forEach(([project, count], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${project}: ${count} matches`);
    });
    console.log('');

    // =========================================================================
    // SUCCESS
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n✅ POLYMATH ANALYSIS COMPLETE!\n');

    console.log('SUMMARY:');
    console.log(`  • Total contacts analyzed: ${contactMap.size}`);
    console.log(`  • Polymath contacts (3+ projects): ${polymaths.length}`);
    console.log(`  • Super connectors (5+ projects): ${superConnectors.length}`);
    console.log(`  • Domain connectors (3-4 projects): ${domainConnectors.length}`);
    console.log(`  • Total matches: ${matches.length}`);
    console.log(`  • Average projects per polymath: ${Math.round(polymaths.reduce((sum, p) => sum + p.project_count, 0) / polymaths.length)}`);
    console.log('');

    console.log('NEXT STEPS:');
    console.log('  1. Review top polymaths for Beautiful Obsolescence opportunities');
    console.log('  2. Assess strategic value for unknown-value polymaths');
    console.log('  3. Add high-value polymaths to GHL pipelines');
    console.log('  4. Enable natural language queries ("Who can help with X and Y?")');
    console.log('  5. Track engagement status (Potential → Active → Obsolete)\n');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

analyzePolymaths()
  .then(() => {
    console.log('🎉 Polymath analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
