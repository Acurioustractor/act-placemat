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

async function checkStorytellers() {
  console.log('🔍 Checking storytellers in Supabase...\n');

  // Get all storytellers
  const { data: storytellers, error: storytellerError } = await supabase
    .from('storytellers')
    .select('*')
    .limit(100);

  if (storytellerError) {
    console.error('❌ Error fetching storytellers:', storytellerError.message);
    return;
  }

  console.log(`📊 Found ${storytellers?.length || 0} storytellers in database`);

  if (storytellers && storytellers.length > 0) {
    console.log('\n📋 Storyteller sample:');
    storytellers.slice(0, 5).forEach((st, idx) => {
      console.log(`\n${idx + 1}. ${st.full_name}`);
      console.log(`   - ID: ${st.id}`);
      console.log(`   - Project ID: ${st.project_id || '(not set)'}`);
      console.log(`   - Consent: ${st.consent_given ? 'Yes' : 'No'}`);
      console.log(`   - Bio: ${st.bio ? st.bio.substring(0, 60) + '...' : '(none)'}`);
    });
  }

  // Get all projects - try different column names
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .limit(10);

  if (projectError) {
    console.error('\n❌ Error fetching projects:', projectError.message);
    return;
  }

  console.log(`\n\n📊 Found ${projects?.length || 0} projects in Supabase`);

  if (projects && projects.length > 0) {
    console.log('\n📋 Project sample (showing all columns):');
    projects.slice(0, 3).forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.name || '(unnamed)'}`);
      console.log(JSON.stringify(p, null, 2));
    });
  }

  // Check for orphaned storytellers (no matching project)
  if (storytellers && projects) {
    const projectIds = new Set(projects.map(p => p.id));
    const orphaned = storytellers.filter(st => st.project_id && !projectIds.has(st.project_id));

    if (orphaned.length > 0) {
      console.log(`\n\n⚠️  Found ${orphaned.length} storytellers with project_id that don't match any Supabase project`);
      console.log('These might be linked to Notion project IDs instead of Supabase project IDs');
    }
  }
}

checkStorytellers().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
