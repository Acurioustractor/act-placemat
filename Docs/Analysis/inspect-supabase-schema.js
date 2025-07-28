/**
 * Supabase Schema Inspector for Empathy Ledger Database
 * Inspects the actual tables and schema in your Supabase instance
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function inspectDatabase() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env file');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔍 Inspecting Empathy Ledger Supabase Database');
    console.log('='.repeat(50));
    console.log(`📍 URL: ${supabaseUrl}`);
    console.log(`🔑 Using: ${supabaseKey.includes('service_role') ? 'Service Role Key' : 'Anon Key'}`);
    console.log();

    try {
        // Get all tables using information_schema
        console.log('📋 DISCOVERING TABLES...');
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_schema_tables', {});
        
        if (tablesError) {
            // Fallback: try to query some known tables
            console.log('⚠️ Schema RPC failed, trying direct table discovery...');
            await discoverTablesDirectly(supabase);
        } else {
            console.log(`✅ Found ${tables.length} tables`);
            for (const table of tables) {
                await inspectTable(supabase, table.table_name);
            }
        }

    } catch (error) {
        console.error('❌ Error inspecting database:', error.message);
        console.log('\n🔄 Trying alternative approach...');
        await discoverTablesDirectly(supabase);
    }
}

async function discoverTablesDirectly(supabase) {
    const commonTables = [
        'stories',
        'projects', 
        'story_project_links',
        'organizations',
        'people',
        'artifacts',
        'contributors',
        'themes',
        'quotes',
        'media_assets',
        'consent_records',
        'story_analytics'
    ];

    console.log('🔍 Checking for common Empathy Ledger tables...');
    
    for (const tableName of commonTables) {
        try {
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });
            
            if (!error) {
                console.log(`✅ Table found: ${tableName} (${count || 0} records)`);
                await inspectTableStructure(supabase, tableName);
            }
        } catch (error) {
            // Table doesn't exist, skip silently
        }
    }
}

async function inspectTable(supabase, tableName) {
    try {
        console.log(`\n📊 TABLE: ${tableName}`);
        console.log('-'.repeat(30));
        
        // Get row count
        const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        if (!countError) {
            console.log(`📈 Records: ${count || 0}`);
        }

        // Get sample data to understand structure
        const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (!sampleError && sampleData && sampleData.length > 0) {
            const columns = Object.keys(sampleData[0]);
            console.log(`🏛️ Columns (${columns.length}):`, columns.join(', '));
            
            // Show sample data structure
            console.log('📝 Sample Record Structure:');
            const sample = sampleData[0];
            Object.entries(sample).forEach(([key, value]) => {
                const type = Array.isArray(value) ? 'array' : typeof value;
                const preview = typeof value === 'string' && value.length > 50 
                    ? value.substring(0, 50) + '...' 
                    : value;
                console.log(`   ${key}: ${type} = ${JSON.stringify(preview)}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Error inspecting table ${tableName}:`, error.message);
    }
}

async function inspectTableStructure(supabase, tableName) {
    try {
        // Get basic info
        const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        // Get sample to understand structure
        const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (sample && sample.length > 0) {
            const columns = Object.keys(sample[0]);
            console.log(`   └─ ${count || 0} records, ${columns.length} columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
        }
        
    } catch (error) {
        console.log(`   └─ Error: ${error.message}`);
    }
}

// Additional function to check specific Empathy Ledger patterns
async function checkEmpathyLedgerPatterns(supabase) {
    console.log('\n🎯 CHECKING EMPATHY LEDGER SPECIFIC PATTERNS...');
    console.log('-'.repeat(50));
    
    try {
        // Check if stories table has expected AI analysis fields
        const { data: storiesStructure } = await supabase
            .from('stories')
            .select('*')
            .limit(1);
            
        if (storiesStructure && storiesStructure.length > 0) {
            const story = storiesStructure[0];
            console.log('📖 Stories table analysis:');
            console.log(`   Has AI analysis: ${story.ai_analysis ? '✅' : '❌'}`);
            console.log(`   Has themes: ${story.themes ? '✅' : '❌'}`);
            console.log(`   Has consent info: ${story.consent_public !== undefined ? '✅' : '❌'}`);
            console.log(`   Has visibility levels: ${story.visibility_level ? '✅' : '❌'}`);
        }
        
        // Check story-project relationships
        const { count: linkCount } = await supabase
            .from('story_project_links')
            .select('*', { count: 'exact', head: true });
            
        console.log(`🔗 Story-Project links: ${linkCount || 0} relationships`);
        
    } catch (error) {
        console.log(`❌ Pattern check error: ${error.message}`);
    }
}

// Run the inspection
inspectDatabase()
    .then(() => {
        console.log('\n✅ Database inspection complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Inspection failed:', error);
        process.exit(1);
    });