#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, 'privacy-schema.sql');
  let sql = readFileSync(sqlPath, 'utf8');
  sql = sql.replace(/\bBEGIN;?/gi, '').replace(/\bCOMMIT;?/gi, '');
  const { error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Privacy schema apply failed:', error.message);
    process.exit(1);
  }
  console.log('Privacy schema applied');
}

main().catch(err => { console.error(err); process.exit(1); });





