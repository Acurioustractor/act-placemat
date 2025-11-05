#!/usr/bin/env node

/**
 * Interactive Project Type Classification Tool
 *
 * Helps classify all projects by their primary type:
 * - Infrastructure Building
 * - Justice Innovation
 * - Storytelling Platform
 * - Community Enterprise
 * - Mixed
 *
 * Run: node classify-projects-interactive.mjs
 */

import { Client } from '@notionhq/client';
import * as readline from 'readline';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PROJECTS_DB_ID = '177ebcf981cf80dd9514f1ec32f3314c';

const PROJECT_TYPES = {
  '1': { value: 'infrastructure-building', label: 'Infrastructure Building' },
  '2': { value: 'justice-innovation', label: 'Justice Innovation' },
  '3': { value: 'storytelling-platform', label: 'Storytelling Platform' },
  '4': { value: 'community-enterprise', label: 'Community Enterprise' },
  '5': { value: 'Mixed', label: 'Mixed' },
  's': { value: 'skip', label: 'Skip for now' },
  'q': { value: 'quit', label: 'Quit' }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getProjects() {
  console.log('📊 Fetching all projects from Notion...\n');

  const response = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    sorts: [{ property: 'Name', direction: 'ascending' }]
  });

  return response.results.map(page => ({
    id: page.id,
    name: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
    status: page.properties.Status?.status?.name || 'Unknown',
    description: page.properties.Description?.rich_text?.[0]?.plain_text || '',
    currentType: page.properties['Project Type']?.select?.name || null,
    themes: page.properties.Theme?.multi_select?.map(t => t.name) || [],
    tags: page.properties.Tags?.multi_select?.map(t => t.name) || []
  }));
}

async function updateProjectType(projectId, projectType) {
  if (projectType === 'skip' || projectType === 'quit') return;

  await notion.pages.update({
    page_id: projectId,
    properties: {
      'Project Type': {
        select: { name: projectType }
      }
    }
  });
}

function suggestType(project) {
  const desc = (project.description || '').toLowerCase();
  const themes = project.themes.join(' ').toLowerCase();
  const tags = project.tags.join(' ').toLowerCase();
  const all = `${desc} ${themes} ${tags}`;

  // Keywords for each type
  if (all.includes('built') || all.includes('precinct') || all.includes('infrastructure') || all.includes('construction')) {
    return 'infrastructure-building';
  }
  if (all.includes('justice') || all.includes('incarceration') || all.includes('prison') || all.includes('youth justice')) {
    return 'justice-innovation';
  }
  if (all.includes('story') || all.includes('narrative') || all.includes('voices') || all.includes('media')) {
    return 'storytelling-platform';
  }
  if (all.includes('enterprise') || all.includes('business') || all.includes('revenue') || all.includes('market')) {
    return 'community-enterprise';
  }

  return 'Mixed'; // Default suggestion
}

async function classifyProjects() {
  const projects = await getProjects();

  console.log(`Found ${projects.length} projects\n`);
  console.log('─'.repeat(80));
  console.log('\nProject Type Options:');
  console.log('1) Infrastructure Building - Physical spaces/assets built with community');
  console.log('2) Justice Innovation - Disrupting justice pipeline, reducing recidivism');
  console.log('3) Storytelling Platform - Amplifying community voices, cultural narratives');
  console.log('4) Community Enterprise - Market-based solutions owned by community');
  console.log('5) Mixed - Hybrid projects (most ACT work is this)');
  console.log('s) Skip this project');
  console.log('q) Quit');
  console.log('\n' + '─'.repeat(80) + '\n');

  let classified = 0;
  let skipped = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    // Skip if already has type
    if (project.currentType) {
      console.log(`✓ [${i + 1}/${projects.length}] ${project.name}`);
      console.log(`  Already classified as: ${project.currentType}\n`);
      continue;
    }

    console.log(`\n📋 [${i + 1}/${projects.length}] ${project.name}`);
    console.log(`   Status: ${project.status}`);
    if (project.themes.length > 0) {
      console.log(`   Themes: ${project.themes.join(', ')}`);
    }
    if (project.description) {
      const preview = project.description.substring(0, 150);
      console.log(`   Description: ${preview}${project.description.length > 150 ? '...' : ''}`);
    }

    const suggestion = suggestType(project);
    const suggestedLabel = Object.values(PROJECT_TYPES).find(t => t.value === suggestion)?.label || 'Mixed';
    console.log(`\n   💡 Suggested: ${suggestedLabel}`);

    const answer = await question('\n   Choose type (1-5, s=skip, q=quit): ');

    if (answer.toLowerCase() === 'q') {
      console.log('\n👋 Exiting...');
      break;
    }

    if (answer.toLowerCase() === 's') {
      console.log('   ⏭️  Skipped');
      skipped++;
      continue;
    }

    const selected = PROJECT_TYPES[answer];
    if (!selected) {
      console.log('   ❌ Invalid choice, skipping...');
      skipped++;
      continue;
    }

    const typeValue = selected.value;

    try {
      await updateProjectType(project.id, typeValue);
      console.log(`   ✅ Classified as: ${selected.label}`);
      classified++;
    } catch (error) {
      console.log(`   ❌ Error updating: ${error.message}`);
      skipped++;
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Classified: ${classified}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📋 Already had type: ${projects.filter(p => p.currentType).length}`);
  console.log(`   📊 Total: ${projects.length}\n`);

  rl.close();
}

// Run
console.log('\n🏗️  ACT Project Type Classification Tool\n');
classifyProjects().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
