#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const sql = fs.readFileSync('supabase/migrations/MANUAL_FIX_RLS.sql', 'utf8');

const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  const result = await response.text();
  console.log('Response:', result);

  if (response.ok) {
    console.log('✅ RLS policies updated!');
  } else {
    console.log('❌ Error:', result);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
  console.log(sql);
}