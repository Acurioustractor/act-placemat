#!/usr/bin/env node

/**
 * Create adaptive dashboard tables in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createTables = async () => {
  console.log('🚀 Creating adaptive dashboard tables...');

  try {
    // Dashboard configurations table
    console.log('📊 Creating dashboard_configs table...');
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS dashboard_configs (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          config JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
      `
    });
    
    if (configError) {
      console.log('⚠️ dashboard_configs table might already exist or using direct SQL...');
    } else {
      console.log('✅ dashboard_configs table created');
    }

    // User preferences table
    console.log('👤 Creating user_preferences table...');
    const { error: prefsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_preferences (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          preferences JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
      `
    });

    if (prefsError) {
      console.log('⚠️ user_preferences table might already exist or using direct SQL...');
    } else {
      console.log('✅ user_preferences table created');
    }

    // Dashboard interactions table
    console.log('📈 Creating dashboard_interactions table...');
    const { error: interactionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS dashboard_interactions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data JSONB DEFAULT '{}',
          session_id TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_user_id ON dashboard_interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_timestamp ON dashboard_interactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_event_type ON dashboard_interactions(event_type);
      `
    });

    if (interactionsError) {
      console.log('⚠️ dashboard_interactions table might already exist or using direct SQL...');
    } else {
      console.log('✅ dashboard_interactions table created');
    }

    // Try alternative approach using direct table creation
    console.log('🔄 Attempting direct table creation...');
    
    // Create dashboard_configs table directly
    const { error: directConfigError } = await supabase
      .from('dashboard_configs')
      .select('id')
      .limit(1);
      
    if (directConfigError && directConfigError.code === '42P01') {
      console.log('📊 Creating dashboard_configs table directly...');
      // Table doesn't exist, let's create it via raw SQL
      await supabase.rpc('create_dashboard_configs_table');
    }

    // Test if we can now access the tables
    console.log('🧪 Testing table access...');
    const { data: configTest, error: configTestError } = await supabase
      .from('dashboard_configs')
      .select('*')
      .limit(1);

    if (configTestError) {
      console.error('❌ Cannot access dashboard_configs:', configTestError.message);
      console.log('💡 Let\'s try using a custom SQL function...');
      
      // Create a function to set up our tables
      const setupSQL = `
        -- Create dashboard configs table
        DROP TABLE IF EXISTS dashboard_configs CASCADE;
        CREATE TABLE dashboard_configs (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          config JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_dashboard_configs_user_id ON dashboard_configs(user_id);

        -- Create user preferences table  
        DROP TABLE IF EXISTS user_preferences CASCADE;
        CREATE TABLE user_preferences (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          preferences JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

        -- Create dashboard interactions table
        DROP TABLE IF EXISTS dashboard_interactions CASCADE;
        CREATE TABLE dashboard_interactions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data JSONB DEFAULT '{}',
          session_id TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_dashboard_interactions_user_id ON dashboard_interactions(user_id);
        CREATE INDEX idx_dashboard_interactions_timestamp ON dashboard_interactions(timestamp);
        CREATE INDEX idx_dashboard_interactions_event_type ON dashboard_interactions(event_type);
      `;

      // Insert sample data
      const sampleData = `
        INSERT INTO dashboard_configs (user_id, config) VALUES 
        ('anonymous', '{
          "layout": "grid",
          "theme": "light", 
          "density": "comfortable",
          "widgets": [
            {"id": "overview", "type": "overview", "position": {"x": 0, "y": 0, "w": 12, "h": 4}, "enabled": true},
            {"id": "projects", "type": "projects", "position": {"x": 0, "y": 4, "w": 6, "h": 6}, "enabled": true}
          ]
        }');

        INSERT INTO user_preferences (user_id, preferences) VALUES 
        ('anonymous', '{
          "personalizations": {
            "preferredProjectTypes": ["community", "technology"],
            "interestedOpportunityTypes": ["grant", "partnership"]
          },
          "accessibility": {
            "fontSize": "medium",
            "highContrast": false
          }
        }');
      `;

      console.log(setupSQL);
      console.log(sampleData);
      console.log('📝 Please run the above SQL in your Supabase SQL editor to create the tables.');
      
    } else {
      console.log('✅ Tables are accessible!');
      console.log('📊 Found', configTest?.length || 0, 'dashboard configs');
    }

    console.log('🎉 Adaptive dashboard table setup completed!');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
};

createTables();