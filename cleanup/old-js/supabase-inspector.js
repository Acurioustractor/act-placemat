// Safe read-only Supabase inspector
const { createClient } = require('@supabase/supabase-js');

class SupabaseInspector {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.error('❌ Supabase credentials missing');
            return;
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        console.log('✅ Supabase Inspector connected (READ-ONLY)');
    }

    // List all available tables (read-only)
    async getTables() {
        try {
            const { data, error } = await this.supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');

            if (error) {
                // If we can't access schema, try common table names
                console.log('📋 Trying common table names...');
                const commonTables = ['stories', 'projects', 'storytellers', 'story_project_links'];
                const existingTables = [];
                
                for (const table of commonTables) {
                    try {
                        const { data, error } = await this.supabase
                            .from(table)
                            .select('*')
                            .limit(1);
                        
                        if (!error) {
                            existingTables.push(table);
                        }
                    } catch (e) {
                        // Table doesn't exist, skip
                    }
                }
                
                return existingTables;
            }
            
            return data?.map(row => row.table_name) || [];
        } catch (error) {
            console.error('Error getting tables:', error);
            return [];
        }
    }

    // Get table structure (read-only)
    async getTableStructure(tableName) {
        try {
            // Get first few rows to understand structure
            const { data, error } = await this.supabase
                .from(tableName)
                .select('*')
                .limit(3);

            if (error) throw error;

            const structure = {
                name: tableName,
                columns: data.length > 0 ? Object.keys(data[0]) : [],
                sampleData: data,
                rowCount: await this.getRowCount(tableName)
            };

            return structure;
        } catch (error) {
            console.error(`Error inspecting table ${tableName}:`, error);
            return null;
        }
    }

    // Get row count safely
    async getRowCount(tableName) {
        try {
            const { count, error } = await this.supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            return error ? 'unknown' : count;
        } catch (error) {
            return 'unknown';
        }
    }

    // Get sample stories (read-only)
    async getStoriesSample(limit = 5) {
        try {
            const { data, error } = await this.supabase
                .from('stories')
                .select('*')
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting stories sample:', error);
            return [];
        }
    }

    // Check if our required tables exist
    async checkRequiredTables() {
        const requiredTables = ['stories', 'projects', 'story_project_links'];
        const results = {};
        
        for (const table of requiredTables) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                
                results[table] = {
                    exists: !error,
                    error: error?.message || null
                };
            } catch (e) {
                results[table] = {
                    exists: false,
                    error: e.message
                };
            }
        }
        
        return results;
    }

    // Generate safe SQL to create missing tables
    async generateMissingTableSQL() {
        const tableStatus = await this.checkRequiredTables();
        const sql = [];
        
        if (!tableStatus.projects?.exists) {
            sql.push(`
-- Projects mirror table (links to Notion)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  last_synced TIMESTAMP DEFAULT NOW()
);`);
        }
        
        if (!tableStatus.story_project_links?.exists) {
            sql.push(`
-- Story-Project relationships
CREATE TABLE story_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 5,
  tag_reason TEXT,
  tagged_by TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, project_id)
);`);
        }
        
        return sql;
    }
}

module.exports = SupabaseInspector;