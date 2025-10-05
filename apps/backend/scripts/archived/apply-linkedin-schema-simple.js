/**
 * Simple LinkedIn Schema Application - Create core tables only
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyLinkedInSchema() {
  try {
    console.log('🔄 Creating LinkedIn relationship intelligence tables...');
    
    // 1. Create linkedin_contacts table
    console.log('📊 Creating linkedin_contacts table...');
    const { error: contactsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.linkedin_contacts (
          id BIGSERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
          linkedin_url TEXT UNIQUE,
          email_address TEXT,
          current_position TEXT,
          current_company TEXT,
          industry TEXT,
          location TEXT,
          connected_on DATE,
          connection_source TEXT,
          relationship_score DECIMAL(3,2) DEFAULT 0.00,
          strategic_value TEXT,
          alignment_tags TEXT[],
          raw_import_ids BIGINT[],
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          last_analyzed_at TIMESTAMPTZ
        )
      `
    });
    
    if (contactsError) throw contactsError;
    
    // 2. Create linkedin_project_connections table
    console.log('🔗 Creating linkedin_project_connections table...');
    const { error: projectsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.linkedin_project_connections (
          id BIGSERIAL PRIMARY KEY,
          contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
          notion_project_id TEXT,
          project_name TEXT NOT NULL,
          connection_type TEXT,
          relevance_score DECIMAL(3,2) DEFAULT 0.00,
          potential_role TEXT,
          recommended_action TEXT,
          contact_status TEXT DEFAULT 'identified',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `
    });
    
    if (projectsError) throw projectsError;
    
    // 3. Create linkedin_interactions table
    console.log('📝 Creating linkedin_interactions table...');
    const { error: interactionsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.linkedin_interactions (
          id BIGSERIAL PRIMARY KEY,
          contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
          interaction_type TEXT NOT NULL,
          interaction_date TIMESTAMPTZ NOT NULL,
          direction TEXT,
          subject TEXT,
          summary TEXT,
          sentiment TEXT,
          key_topics TEXT[],
          action_items TEXT[],
          follow_up_needed BOOLEAN DEFAULT false,
          follow_up_date DATE,
          project_context TEXT,
          relationship_impact DECIMAL(3,2),
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `
    });
    
    if (interactionsError) throw interactionsError;
    
    // 4. Create core functions
    console.log('⚙️ Creating sync function...');
    const { error: syncFunctionError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION sync_linkedin_contacts_from_imports()
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
          rec RECORD;
          contact_id BIGINT;
          inserted_count INTEGER := 0;
        BEGIN
          FOR rec IN 
            SELECT DISTINCT
              payload->>'First Name' as first_name,
              payload->>'Last Name' as last_name,
              payload->>'URL' as linkedin_url,
              payload->>'Email Address' as email_address,
              payload->>'Position' as current_position,
              payload->>'Company' as current_company,
              CASE 
                WHEN payload->>'Connected On' ~ '^\\d{2} \\w{3} \\d{4}$' THEN (payload->>'Connected On')::DATE
                ELSE NULL
              END as connected_on,
              owner as connection_source,
              ARRAY_AGG(id) as import_ids
            FROM linkedin_imports 
            WHERE type = 'connections'
              AND payload->>'First Name' IS NOT NULL 
              AND payload->>'Last Name' IS NOT NULL
            GROUP BY 
              payload->>'First Name',
              payload->>'Last Name', 
              payload->>'URL',
              payload->>'Email Address',
              payload->>'Position',
              payload->>'Company',
              payload->>'Connected On',
              owner
          LOOP
            INSERT INTO linkedin_contacts (
              first_name, last_name, linkedin_url, email_address,
              current_position, current_company, connected_on, 
              connection_source, raw_import_ids
            ) VALUES (
              rec.first_name, rec.last_name, rec.linkedin_url, rec.email_address,
              rec.current_position, rec.current_company, rec.connected_on,
              rec.connection_source, rec.import_ids
            )
            ON CONFLICT (linkedin_url) DO UPDATE SET
              email_address = COALESCE(EXCLUDED.email_address, linkedin_contacts.email_address),
              current_position = COALESCE(EXCLUDED.current_position, linkedin_contacts.current_position),
              current_company = COALESCE(EXCLUDED.current_company, linkedin_contacts.current_company),
              connection_source = CASE 
                WHEN linkedin_contacts.connection_source != EXCLUDED.connection_source 
                THEN 'both' 
                ELSE linkedin_contacts.connection_source 
              END,
              raw_import_ids = linkedin_contacts.raw_import_ids || EXCLUDED.raw_import_ids,
              updated_at = now();
              
            inserted_count := inserted_count + 1;
          END LOOP;
          
          RETURN inserted_count;
        END;
        $$
      `
    });
    
    if (syncFunctionError) throw syncFunctionError;
    
    // 5. Create analysis function
    console.log('🤖 Creating AI analysis function...');
    const { error: analysisFunctionError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION analyze_contact_strategic_value()
        RETURNS INTEGER  
        LANGUAGE plpgsql
        AS $$
        DECLARE
          rec RECORD;
          updated_count INTEGER := 0;
          score DECIMAL(3,2);
          tags TEXT[];
          strategic_level TEXT;
        BEGIN
          FOR rec IN SELECT id, current_position, current_company FROM linkedin_contacts WHERE last_analyzed_at IS NULL OR last_analyzed_at < now() - INTERVAL '1 week'
          LOOP
            score := 0.00;
            tags := ARRAY[]::TEXT[];
            strategic_level := 'low';
            
            IF rec.current_position ~* '(ceo|chief executive|director|founder|president|secretary)' THEN
              score := score + 0.30;
              tags := array_append(tags, 'leadership');
            END IF;
            
            IF rec.current_position ~* '(government|ministry|department|council|authority)' THEN
              score := score + 0.25;
              tags := array_append(tags, 'government');
            END IF;
            
            IF rec.current_position ~* '(foundation|charity|nonprofit|ngo)' THEN
              score := score + 0.20;  
              tags := array_append(tags, 'social_impact');
            END IF;
            
            IF rec.current_company ~* '(government|ministry|department|council|authority)' THEN
              score := score + 0.20;
              tags := array_append(tags, 'government');
            END IF;
            
            IF rec.current_company ~* '(foundation|charity|nonprofit|ngo|social)' THEN
              score := score + 0.15;
              tags := array_append(tags, 'social_impact');
            END IF;
            
            IF rec.current_company ~* '(indigenous|aboriginal)' THEN
              score := score + 0.25;
              tags := array_append(tags, 'indigenous');
            END IF;
            
            IF rec.current_company ~* '(youth|housing|health|education|settlement)' THEN
              score := score + 0.15;
              tags := array_append(tags, 'community_services');
            END IF;
            
            IF rec.current_company ~* '(funding|grant|finance|investment|development)' THEN
              score := score + 0.20;
              tags := array_append(tags, 'funding');
            END IF;
            
            IF score >= 0.70 THEN strategic_level := 'high';
            ELSIF score >= 0.40 THEN strategic_level := 'medium';
            END IF;
            
            UPDATE linkedin_contacts SET
              relationship_score = LEAST(score, 1.00),
              strategic_value = strategic_level,
              alignment_tags = tags,
              last_analyzed_at = now()
            WHERE id = rec.id;
            
            updated_count := updated_count + 1;
          END LOOP;
          
          RETURN updated_count;
        END;
        $$
      `
    });
    
    if (analysisFunctionError) throw analysisFunctionError;
    
    // 6. Test table creation
    console.log('🧪 Testing table connectivity...');
    const { data: tableTest, error: tableError } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .limit(1);
    
    if (tableError && !tableError.message.includes('has no rows')) {
      throw new Error(`Table test failed: ${tableError.message}`);
    }
    
    console.log('✅ LinkedIn Relationship Intelligence core schema applied successfully!');
    console.log('📊 Created tables:');
    console.log('   - linkedin_contacts (normalized contact data)');
    console.log('   - linkedin_project_connections (project links)');
    console.log('   - linkedin_interactions (interaction tracking)');
    console.log('🔧 Created functions:');
    console.log('   - sync_linkedin_contacts_from_imports()');
    console.log('   - analyze_contact_strategic_value()');
    console.log('\n🚀 Ready to sync LinkedIn data! Run:');
    console.log('   POST /api/linkedin-intelligence/sync-to-supabase');
    
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the schema application
applyLinkedInSchema();