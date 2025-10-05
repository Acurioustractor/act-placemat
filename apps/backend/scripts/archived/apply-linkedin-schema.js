/**
 * Apply LinkedIn Relationship Intelligence Schema to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyLinkedInSchema() {
  try {
    console.log('🔄 Applying LinkedIn Relationship Intelligence Schema to Supabase...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database/linkedin-relationship-intelligence-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded, parsing SQL statements...');
    
    // Split SQL into individual statements and filter out transaction commands
    const allStatements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.match(/^(BEGIN|COMMIT)$/i) &&
        !stmt.startsWith('--')
      );
    
    // Order statements: tables first, then indexes, then views, then functions
    const tableStatements = allStatements.filter(stmt => stmt.includes('CREATE TABLE'));
    const indexStatements = allStatements.filter(stmt => stmt.includes('CREATE INDEX'));
    const viewStatements = allStatements.filter(stmt => stmt.includes('CREATE OR REPLACE VIEW'));
    const functionStatements = allStatements.filter(stmt => stmt.includes('CREATE OR REPLACE FUNCTION'));
    const triggerStatements = allStatements.filter(stmt => stmt.includes('CREATE TRIGGER'));
    const otherStatements = allStatements.filter(stmt => 
      !stmt.includes('CREATE TABLE') && 
      !stmt.includes('CREATE INDEX') && 
      !stmt.includes('CREATE OR REPLACE VIEW') && 
      !stmt.includes('CREATE OR REPLACE FUNCTION') &&
      !stmt.includes('CREATE TRIGGER')
    );
    
    const statements = [
      ...tableStatements,
      ...functionStatements,
      ...viewStatements,
      ...indexStatements,
      ...triggerStatements,
      ...otherStatements
    ];
    
    console.log(`🔧 Executing ${statements.length} SQL statements in correct order...`);
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.split('\n')[0].substring(0, 50)}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        });
        
        if (error) {
          console.error(`❌ Failed at statement ${i + 1}:`, error);
          throw error;
        }
      }
    }
    
    console.log('✅ LinkedIn Relationship Intelligence Schema applied successfully!');
    console.log('📊 Created tables:');
    console.log('   - linkedin_contacts (normalized contact data)');
    console.log('   - linkedin_relationships (relationship mapping)');
    console.log('   - linkedin_project_connections (project links)');
    console.log('   - linkedin_interactions (interaction tracking)');
    console.log('   - linkedin_opportunities (opportunity matching)');
    console.log('📋 Created views:');
    console.log('   - vw_high_value_contacts');
    console.log('   - vw_networking_opportunities');
    console.log('   - vw_project_contact_recommendations');
    console.log('🔧 Created functions:');
    console.log('   - sync_linkedin_contacts_from_imports()');
    console.log('   - analyze_contact_strategic_value()');
    console.log('   - update_relationship_score()');
    
    // Test table creation
    const { data: tableTest, error: tableError } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .limit(1);
    
    if (tableError && !tableError.message.includes('has no rows')) {
      throw new Error(`Table test failed: ${tableError.message}`);
    }
    
    console.log('🧪 Table connectivity test passed!');
    console.log('\n🚀 Ready to sync LinkedIn data! Run the sync with:');
    console.log('   POST /api/linkedin-intelligence/sync-to-supabase');
    
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the schema application
applyLinkedInSchema();