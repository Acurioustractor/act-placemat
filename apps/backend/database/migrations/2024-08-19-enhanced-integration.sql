-- Enhanced Integration Database Schema
-- Supporting OAuth authentication, real-time sync, and data architecture expansion

-- OAuth tokens storage for secure credential management
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(20) DEFAULT 'bearer',
    expires_at TIMESTAMPTZ,
    scope TEXT,
    
    -- Notion-specific fields
    workspace_name VARCHAR(255),
    workspace_id VARCHAR(255),
    bot_id VARCHAR(255),
    owner JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index on provider for fast lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- Sync status tracking table
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'notion_to_supabase', 'supabase_to_notion'
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    records_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    metadata JSONB
);

-- Create index for sync status queries
CREATE INDEX IF NOT EXISTS idx_sync_status_type_started ON sync_status(sync_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);

-- Enhanced Notion data storage with sync tracking
CREATE TABLE IF NOT EXISTS notion_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notion_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    type VARCHAR(50) DEFAULT 'partners',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notion_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notion_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    type VARCHAR(50) DEFAULT 'projects',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notion_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notion_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    type VARCHAR(50) DEFAULT 'opportunities',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notion_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notion_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    type VARCHAR(50) DEFAULT 'organizations',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event tracking for analytics and monitoring
CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    source_system VARCHAR(50) NOT NULL, -- 'notion', 'supabase', 'system'
    target_system VARCHAR(50),
    event_data JSONB NOT NULL,
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'processed', 'failed'
);

-- Create indexes for event tracking
CREATE INDEX IF NOT EXISTS idx_integration_events_type_created ON integration_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_events_source ON integration_events(source_system);
CREATE INDEX IF NOT EXISTS idx_integration_events_status ON integration_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_integration_events_user ON integration_events(user_id) WHERE user_id IS NOT NULL;

-- Data consistency validation table
CREATE TABLE IF NOT EXISTS data_consistency_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(100) NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    target_table VARCHAR(100),
    record_id VARCHAR(255) NOT NULL,
    consistency_status VARCHAR(20) NOT NULL, -- 'consistent', 'inconsistent', 'missing'
    differences JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- Create indexes for consistency checks
CREATE INDEX IF NOT EXISTS idx_data_consistency_type_status ON data_consistency_checks(check_type, consistency_status);
CREATE INDEX IF NOT EXISTS idx_data_consistency_checked_at ON data_consistency_checks(checked_at DESC);

-- User preferences and settings for the enhanced integration
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_type VARCHAR(100) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, preference_type, preference_key)
);

-- Create indexes for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_type ON user_preferences(user_id, preference_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

-- Project outcomes tracking for analytics
CREATE TABLE IF NOT EXISTS project_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    outcome_type VARCHAR(100) NOT NULL, -- 'milestone', 'metric', 'impact', 'feedback'
    outcome_category VARCHAR(100),
    outcome_value JSONB NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    measurement_method VARCHAR(100),
    confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    verified_by UUID,
    verification_method VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for project outcomes
CREATE INDEX IF NOT EXISTS idx_project_outcomes_project_id ON project_outcomes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_type_measured ON project_outcomes(outcome_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_category ON project_outcomes(outcome_category);

-- Create indexes for notion tables for fast sync operations
CREATE INDEX IF NOT EXISTS idx_notion_partners_notion_id ON notion_partners(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_partners_last_synced ON notion_partners(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_projects_notion_id ON notion_projects(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_projects_last_synced ON notion_projects(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_opportunities_notion_id ON notion_opportunities(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_opportunities_last_synced ON notion_opportunities(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_organizations_notion_id ON notion_organizations(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_organizations_last_synced ON notion_organizations(last_synced DESC);

-- GIN indexes for JSONB data columns for efficient queries
CREATE INDEX IF NOT EXISTS idx_notion_partners_data_gin ON notion_partners USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_notion_projects_data_gin ON notion_projects USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_notion_opportunities_data_gin ON notion_opportunities USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_notion_organizations_data_gin ON notion_organizations USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_integration_events_data_gin ON integration_events USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_user_preferences_value_gin ON user_preferences USING GIN (preference_value);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_value_gin ON project_outcomes USING GIN (outcome_value);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_oauth_tokens_updated_at 
    BEFORE UPDATE ON oauth_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_partners_updated_at 
    BEFORE UPDATE ON notion_partners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_projects_updated_at 
    BEFORE UPDATE ON notion_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_opportunities_updated_at 
    BEFORE UPDATE ON notion_opportunities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_organizations_updated_at 
    BEFORE UPDATE ON notion_organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_outcomes_updated_at 
    BEFORE UPDATE ON project_outcomes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for data protection
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- Create policies (these would be customized based on actual auth requirements)
CREATE POLICY "OAuth tokens are only accessible by system" ON oauth_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can access their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Integration events are accessible by authenticated users" ON integration_events
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Views for easier data access and analytics
CREATE OR REPLACE VIEW sync_status_summary AS
SELECT 
    sync_type,
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
    AVG(duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms,
    MAX(started_at) as last_sync_at
FROM sync_status
GROUP BY sync_type;

CREATE OR REPLACE VIEW data_freshness_report AS
SELECT 
    'notion_partners' as table_name,
    COUNT(*) as total_records,
    MAX(last_synced) as most_recent_sync,
    MIN(last_synced) as oldest_sync,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_synced)))/60 as minutes_since_last_sync
FROM notion_partners
UNION ALL
SELECT 
    'notion_projects' as table_name,
    COUNT(*) as total_records,
    MAX(last_synced) as most_recent_sync,
    MIN(last_synced) as oldest_sync,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_synced)))/60 as minutes_since_last_sync
FROM notion_projects
UNION ALL
SELECT 
    'notion_opportunities' as table_name,
    COUNT(*) as total_records,
    MAX(last_synced) as most_recent_sync,
    MIN(last_synced) as oldest_sync,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_synced)))/60 as minutes_since_last_sync
FROM notion_opportunities
UNION ALL
SELECT 
    'notion_organizations' as table_name,
    COUNT(*) as total_records,
    MAX(last_synced) as most_recent_sync,
    MIN(last_synced) as oldest_sync,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_synced)))/60 as minutes_since_last_sync
FROM notion_organizations;

-- Grant necessary permissions (adjust based on your security model)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Insert initial sync status record
INSERT INTO sync_status (sync_type, status, completed_at, duration_ms, records_processed)
VALUES ('initialization', 'completed', NOW(), 0, 0)
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE oauth_tokens IS 'Secure storage for OAuth tokens from integrated services';
COMMENT ON TABLE sync_status IS 'Tracking table for all synchronization operations';
COMMENT ON TABLE integration_events IS 'Event tracking for analytics and monitoring';
COMMENT ON TABLE data_consistency_checks IS 'Data validation and consistency monitoring';
COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';
COMMENT ON TABLE project_outcomes IS 'Tracking project results and impact metrics';
COMMENT ON VIEW sync_status_summary IS 'Summary statistics for synchronization operations';
COMMENT ON VIEW data_freshness_report IS 'Data freshness monitoring across all synchronized tables';