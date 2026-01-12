/**
 * Sync Notion Projects to Supabase
 *
 * Fetches all projects from Notion and creates a cached version in Supabase
 * for use by the Unified Alignment Scoring Engine
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DATABASE_ID!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!NOTION_TOKEN || !NOTION_PROJECTS_DATABASE_ID) {
  console.error('❌ Missing Notion credentials');
  console.error('   NOTION_TOKEN:', NOTION_TOKEN ? '✅' : '❌');
  console.error('   NOTION_PROJECTS_DATABASE_ID:', NOTION_PROJECTS_DATABASE_ID ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const notion = new Client({ auth: NOTION_TOKEN });

// ============================================================================
// PROJECT CACHE TABLE
// ============================================================================

async function ensureProjectCacheTable() {
  // This table caches Notion projects for faster alignment matching
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS notion_projects_cache (
      notion_project_id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      project_source TEXT DEFAULT 'placemat' CHECK (project_source IN (
        'placemat', 'justicehub', 'farm', 'empathy_ledger', 'intelligence_hub'
      )),
      tags TEXT[],
      location TEXT,
      required_expertise TEXT[],
      alma_intervention_id TEXT,
      status TEXT,
      description TEXT,
      raw_data JSONB,
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notion_projects_source
      ON notion_projects_cache(project_source);

    CREATE INDEX IF NOT EXISTS idx_notion_projects_status
      ON notion_projects_cache(status);

    CREATE INDEX IF NOT EXISTS idx_notion_projects_tags
      ON notion_projects_cache USING GIN(tags);
  `;

  console.log('📊 Ensuring notion_projects_cache table exists...\n');

  // Note: Supabase client doesn't support raw SQL, so we'll need to use the REST API
  // For now, assume table exists or create manually via migration
  console.log('⚠️  Please ensure notion_projects_cache table exists in Supabase');
  console.log('    Run the migration SQL above manually if needed\n');
}

// ============================================================================
// FETCH PROJECTS FROM NOTION
// ============================================================================

interface NotionProject {
  id: string;
  properties: any;
}

async function fetchAllNotionProjects(): Promise<NotionProject[]> {
  console.log('📥 Fetching projects from Notion...\n');

  const projects: NotionProject[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    try {
      const response: any = await notion.databases.query({
        database_id: NOTION_PROJECTS_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100,
      });

      projects.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      console.log(`  Fetched ${projects.length} projects...`);
    } catch (error: any) {
      console.error('❌ Error fetching from Notion:', error.message);
      throw error;
    }
  }

  console.log(`\n✅ Fetched ${projects.length} total projects from Notion\n`);
  return projects;
}

// ============================================================================
// PARSE NOTION PROJECT
// ============================================================================

function parseNotionProject(notionPage: NotionProject) {
  const props = notionPage.properties;

  // Helper to extract text from Notion property
  const getText = (prop: any): string => {
    if (!prop) return '';
    if (prop.type === 'title') return prop.title[0]?.plain_text || '';
    if (prop.type === 'rich_text') return prop.rich_text[0]?.plain_text || '';
    if (prop.type === 'select') return prop.select?.name || '';
    return '';
  };

  // Helper to extract multi-select
  const getMultiSelect = (prop: any): string[] => {
    if (!prop || prop.type !== 'multi_select') return [];
    return prop.multi_select.map((item: any) => item.name);
  };

  const projectName = getText(props.Name || props.Project || props.Title);
  const status = getText(props.Status);
  const location = getText(props.Location);
  const description = getText(props.Description || props.Summary);

  // Tags (could be in Tags, Categories, or Focus Areas)
  const tags = [
    ...getMultiSelect(props.Tags),
    ...getMultiSelect(props.Categories),
    ...getMultiSelect(props['Focus Areas']),
  ].filter(Boolean);

  // Required expertise (could be in Skills, Expertise, or Required Skills)
  const requiredExpertise = [
    ...getMultiSelect(props.Skills),
    ...getMultiSelect(props.Expertise),
    ...getMultiSelect(props['Required Skills']),
  ].filter(Boolean);

  // Detect project source from database or tags
  let projectSource = 'placemat'; // Default
  const sourceTag = tags.find(t =>
    ['justicehub', 'farm', 'empathy_ledger', 'intelligence_hub'].includes(t.toLowerCase())
  );
  if (sourceTag) {
    projectSource = sourceTag.toLowerCase();
  }

  // ALMA intervention ID (if linked)
  const almaInterventionId = getText(props['ALMA Intervention'] || props['Intervention ID']);

  return {
    notion_project_id: notionPage.id,
    project_name: projectName,
    project_source: projectSource,
    tags,
    location,
    required_expertise: requiredExpertise,
    alma_intervention_id: almaInterventionId || null,
    status,
    description,
    raw_data: notionPage,
  };
}

// ============================================================================
// SYNC TO SUPABASE
// ============================================================================

async function syncProjectsToSupabase(projects: any[]) {
  console.log('💾 Syncing projects to Supabase...\n');

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const project of projects) {
    try {
      // Upsert (insert or update)
      const { error } = await supabase
        .from('notion_projects_cache')
        .upsert({
          ...project,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'notion_project_id'
        });

      if (error) {
        console.error(`❌ Failed to sync ${project.project_name}:`, error.message);
        failed++;
      } else {
        // Check if it was insert or update (simplified: just count as updated)
        updated++;
        console.log(`✅ ${project.project_name} [${project.project_source}]`);
      }
    } catch (error: any) {
      console.error(`❌ Error syncing ${project.project_name}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Sync complete:`);
  console.log(`   Synced: ${updated} projects`);
  console.log(`   Failed: ${failed} projects`);

  return { updated, failed };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function syncNotionProjects() {
  console.log('🔄 NOTION PROJECTS SYNC\n');
  console.log('=' .repeat(80));

  try {
    // 1. Ensure table exists
    await ensureProjectCacheTable();

    // 2. Fetch projects from Notion
    const notionProjects = await fetchAllNotionProjects();

    if (notionProjects.length === 0) {
      console.log('⚠️  No projects found in Notion');
      return;
    }

    // 3. Parse projects
    console.log('=' .repeat(80));
    console.log('\n🔍 Parsing Notion projects...\n');

    const parsedProjects = notionProjects.map(parseNotionProject);

    // Show sample
    console.log('Sample parsed project:\n');
    const sample = parsedProjects[0];
    console.log(`  Name: ${sample.project_name}`);
    console.log(`  Source: ${sample.project_source}`);
    console.log(`  Status: ${sample.status || 'N/A'}`);
    console.log(`  Tags: ${sample.tags.join(', ') || 'None'}`);
    console.log(`  Location: ${sample.location || 'N/A'}`);
    console.log(`  Required Expertise: ${sample.required_expertise.join(', ') || 'None'}`);
    console.log('');

    // 4. Sync to Supabase
    console.log('=' .repeat(80));
    const result = await syncProjectsToSupabase(parsedProjects);

    // 5. Summary stats
    console.log('\n' + '=' .repeat(80));
    console.log('\n📈 SUMMARY\n');

    // Count by project source
    const sourceStats = parsedProjects.reduce((acc: any, p) => {
      acc[p.project_source] = (acc[p.project_source] || 0) + 1;
      return acc;
    }, {});

    console.log('Projects by source:');
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} projects`);
    });

    // Count by status
    const statusStats = parsedProjects.reduce((acc: any, p) => {
      const status = p.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nProjects by status:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} projects`);
    });

    // Most common tags
    const allTags = parsedProjects.flatMap(p => p.tags);
    const tagFreq = allTags.reduce((acc: any, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    const sortedTags = Object.entries(tagFreq)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);

    console.log('\nTop 10 project tags:');
    sortedTags.forEach(([tag, count], index) => {
      console.log(`  ${index + 1}. ${tag}: ${count} projects`);
    });

    // ALMA interventions
    const almaProjects = parsedProjects.filter(p => p.alma_intervention_id);
    console.log(`\n⚖️  ALMA interventions: ${almaProjects.length} projects linked`);

    // Success
    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ NOTION PROJECTS SYNC COMPLETE!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Run alignment scoring test to verify improved matching');
    console.log('  2. Run batch matching for PICC project');
    console.log('  3. Build UI dashboard to visualize matches\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

syncNotionProjects()
  .then(() => {
    console.log('🎉 Sync complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
