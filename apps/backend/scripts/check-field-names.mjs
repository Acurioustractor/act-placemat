#!/usr/bin/env node
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Check Projects database field names
const projectPage = await notion.pages.retrieve({ page_id: '18febcf9-81cf-80fe-a738-fe374e01cd08' });
console.log('=== BG Fit Project Field Names ===');
Object.keys(projectPage.properties).forEach(field => {
  const type = projectPage.properties[field].type;
  console.log(`- ${field} (${type})`);
});

// Check People database structure
console.log('\n=== People Database Field Names ===');
const peopleDB = await notion.databases.retrieve({ database_id: '47bdc1c4-df99-4ddc-81c4-a0214c919d69' });
Object.keys(peopleDB.properties).forEach(field => {
  const type = peopleDB.properties[field].type;
  console.log(`- ${field} (${type})`);
});

// Check Organizations database structure
console.log('\n=== Organizations Database Field Names ===');
const orgsDB = await notion.databases.retrieve({ database_id: '948f3946-7d1c-42f2-bd7e-1317a755e67b' });
Object.keys(orgsDB.properties).forEach(field => {
  const type = orgsDB.properties[field].type;
  console.log(`- ${field} (${type})`);
});
