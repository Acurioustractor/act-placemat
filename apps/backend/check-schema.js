import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .limit(1)
    .single();

  if (data) {
    console.log('linkedin_contacts columns:');
    console.log(Object.keys(data));
  }
}

checkSchema();
