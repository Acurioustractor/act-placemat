#!/usr/bin/env node

import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in environment.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false });

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, 'bookkeeping-schema.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  console.log('🚀 Applying Bookkeeping schema via pg...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Bookkeeping schema applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed applying schema:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});


