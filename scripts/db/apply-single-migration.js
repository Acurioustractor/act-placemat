#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const migration = '20250929220000_fix_rls_for_service_role.sql';
const sql = fs.readFileSync(`supabase/migrations/${migration}`, 'utf8');

console.log(`🔄 Applying ${migration}...`);

// Execute via pg
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.SUPABASE_DATABASE_URL || 
    `postgresql://postgres.tednluwflfhxyucgwigh:${process.env.SUPABASE_DATABASE_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
});

await client.connect();
await client.query(sql);
await client.end();

console.log('✅ Migration applied!');
