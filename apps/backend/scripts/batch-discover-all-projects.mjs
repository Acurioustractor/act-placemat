#!/usr/bin/env node
/**
 * Batch Gmail Discovery for All Projects
 * Runs gmail-discover-strategic.mjs for all Notion projects
 */

import { execSync } from 'child_process';
import { createNotionClient } from '../core/src/services/notionService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

const PROJECTS_DATABASE_ID = '177ebcf9-81cf-80dd-9514-f1ec32f3314c';

async function batchDiscoverAllProjects() {
  console.log('🚀 BATCH GMAIL DISCOVERY FOR ALL PROJECTS');
  console.log('='.repeat(80));
  console.log('');

  // Initialize Notion client
  const notion = createNotionClient();

  console.log('📋 Fetching projects from Notion...');

  // Fetch all projects
  const response = await notion.databases.query({
    database_id: PROJECTS_DATABASE_ID,
    sorts: [{ property: 'Name', direction: 'ascending' }]
  });

  const projects = response.results.map(page => ({
    id: page.id,
    name: page.properties.Name?.title?.[0]?.plain_text || 'Unnamed Project'
  }));

  console.log(`✅ Found ${projects.length} projects\n`);
  console.log('Starting Gmail discovery...\n');

  let totalDiscovered = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const progress = `[${i + 1}/${projects.length}]`;

    console.log(`${progress} ${project.name}`);

    try {
      // Run gmail-discover-strategic.mjs for this project
      const command = `node "${join(__dirname, 'gmail-discover-strategic.mjs')}" "${project.name}" "${project.id}" 365`;

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 60000 // 1 minute timeout per project
      });

      // Parse output for discovered count
      const match = output.match(/discovered (\d+) people/i);
      const discovered = match ? parseInt(match[1]) : 0;

      totalDiscovered += discovered;
      successCount++;

      console.log(`  ✅ ${discovered} people discovered\n`);

    } catch (error) {
      errorCount++;
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 BATCH DISCOVERY COMPLETE!');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${successCount} projects`);
  console.log(`❌ Errors: ${errorCount} projects`);
  console.log(`👥 Total People Discovered: ${totalDiscovered}`);
  console.log('');
  console.log('📊 Next Steps:');
  console.log('  1. View your contacts in the frontend dashboard');
  console.log('  2. Review Tier 1 promotion candidates');
  console.log('  3. Promote high-value contacts to Notion');
  console.log('');
}

batchDiscoverAllProjects().catch(console.error);
