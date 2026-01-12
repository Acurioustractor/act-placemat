import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addNotionIdColumn() {
  console.log('🔧 Adding notion_project_id column to projects table...\n');

  // Check if column already exists
  const { data: existingProjects, error: checkError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (existingProjects && existingProjects[0] && 'notion_project_id' in existingProjects[0]) {
    console.log('✅ Column notion_project_id already exists!');
    return;
  }

  console.log('⚠️  Column notion_project_id does not exist.');
  console.log('📝 You need to add this column in Supabase dashboard:\n');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to Table Editor → projects table');
  console.log('   4. Click "+" to add a new column:');
  console.log('      - Name: notion_project_id');
  console.log('      - Type: text');
  console.log('      - Default value: (leave empty)');
  console.log('      - Allow nullable: Yes\n');
  console.log('Or run this SQL in the SQL Editor:');
  console.log('');
  console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS notion_project_id text;');
  console.log('');
}

addNotionIdColumn().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
