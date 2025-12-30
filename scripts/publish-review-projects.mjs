import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Supabase URL and service role key must be provided via environment variables.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TARGET_YEAR = 2025;

async function run() {
  const { data: projects, error } = await supabase
    .from('review_projects')
    .select('id, slug, title, is_published')
    .eq('year', TARGET_YEAR);

  if (error) {
    throw error;
  }

  const unpublished = (projects || []).filter((project) => !project?.is_published);

  console.log(`Found ${projects?.length ?? 0} review projects for ${TARGET_YEAR}. ${unpublished.length} unpublished.`);

  for (const project of unpublished) {
    const { error: updateError } = await supabase
      .from('review_projects')
      .update({
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('id', project.id);

    if (updateError) {
      console.error(`Failed to publish ${project.slug}:`, updateError.message);
    } else {
      console.log(`Published: ${project.title} (${project.slug})`);
    }
  }
}

run()
  .then(() => {
    console.log('Done publishing review projects.');
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
  });
