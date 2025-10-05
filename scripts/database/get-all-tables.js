#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.tednluwflfhxyucgwigh:lWFMoHsH9G3MmUu@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

async function getAllTables() {
  try {
    console.log('🔍 Getting all tables from Supabase...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📋 Found ${result.rows.length} tables:`);
    
    if (result.rows.length === 0) {
      console.log('❌ No tables found in public schema');
      return;
    }
    
    // Check each table for data
    for (const row of result.rows) {
      const tableName = row.table_name;
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        const count = parseInt(countResult.rows[0].count);
        
        console.log(`\n📊 ${tableName}: ${count} records`);
        
        if (count > 0) {
          // Get column info
          const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1 
            ORDER BY ordinal_position
          `, [tableName]);
          
          console.log(`   Columns: ${columns.rows.map(c => `${c.column_name}(${c.data_type})`).join(', ')}`);
          
          // Get sample data if it looks like stories
          if (tableName.toLowerCase().includes('stor') || 
              tableName.toLowerCase().includes('empathy') || 
              tableName.toLowerCase().includes('ledger') ||
              count < 50) { // Or if small table, show sample
            
            const sample = await pool.query(`SELECT * FROM "${tableName}" LIMIT 2`);
            if (sample.rows.length > 0) {
              console.log('   Sample data:');
              sample.rows.forEach((row, i) => {
                console.log(`     Row ${i+1}: ${JSON.stringify(row, null, 2).substring(0, 200)}...`);
              });
            }
          }
        }
        
      } catch (tableError) {
        console.log(`❌ ${tableName}: Error accessing (${tableError.message})`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await pool.end();
  }
}

getAllTables();