-- Real-time Sync Enhancement Migration
-- Adds fields to support bidirectional Notion/Supabase sync

-- Add notion_id column to all tables for cross-referencing
ALTER TABLE stories ADD COLUMN IF NOT EXISTS notion_id TEXT UNIQUE;
ALTER TABLE storytellers ADD COLUMN IF NOT EXISTS notion_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notion_id TEXT UNIQUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notion_id TEXT UNIQUE;

-- Add sync metadata columns
ALTER TABLE stories ADD COLUMN IF NOT EXISTS synced_from_notion BOOLEAN DEFAULT FALSE;
ALTER TABLE storytellers ADD COLUMN IF NOT EXISTS synced_from_notion BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS synced_from_notion BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS synced_from_notion BOOLEAN DEFAULT FALSE;

-- Add archival support
ALTER TABLE stories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE storytellers ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE storytellers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create sync event log table
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'supabase_change', 'notion_change', 'sync_completed', etc.
  source_system TEXT NOT NULL, -- 'supabase' or 'notion'
  target_system TEXT NOT NULL, -- 'notion' or 'supabase'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  notion_id TEXT,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for sync performance
CREATE INDEX IF NOT EXISTS idx_stories_notion_id ON stories(notion_id);
CREATE INDEX IF NOT EXISTS idx_storytellers_notion_id ON storytellers(notion_id);
CREATE INDEX IF NOT EXISTS idx_organizations_notion_id ON organizations(notion_id);
CREATE INDEX IF NOT EXISTS idx_projects_notion_id ON projects(notion_id);

CREATE INDEX IF NOT EXISTS idx_sync_events_status ON sync_events(status);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_table_record ON sync_events(table_name, record_id);

-- Create sync conflict resolution table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  notion_id TEXT,
  conflict_type TEXT NOT NULL, -- 'field_mismatch', 'concurrent_update', 'missing_record'
  supabase_data JSONB,
  notion_data JSONB,
  resolution_strategy TEXT, -- 'supabase_wins', 'notion_wins', 'merge', 'manual'
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for conflict resolution
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON sync_conflicts(created_at) WHERE resolved_at IS NULL;

-- Create real-time sync configuration table
CREATE TABLE IF NOT EXISTS sync_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'bidirectional', 'supabase_to_notion', 'notion_to_supabase'
  field_mappings JSONB NOT NULL DEFAULT '{}',
  conflict_resolution_strategy TEXT DEFAULT 'timestamp_wins', -- 'timestamp_wins', 'supabase_wins', 'notion_wins'
  webhook_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sync configurations
INSERT INTO sync_configuration (table_name, field_mappings) VALUES
('stories', '{
  "title": "title",
  "content": "content", 
  "summary": "summary",
  "author": "storyteller_id",
  "themes": "themes",
  "status": "status",
  "privacy_level": "privacy_level"
}'),
('storytellers', '{
  "name": "full_name",
  "bio": "bio",
  "email": "email",
  "expertise": "expertise_areas",
  "location": "location_id",
  "organization": "organization_id"
}'),
('organizations', '{
  "name": "name",
  "description": "description",
  "type": "type",
  "website": "website",
  "location": "location"
}'),
('projects', '{
  "name": "name",
  "description": "description",
  "status": "status",
  "organization": "organization_id",
  "budget": "budget",
  "timeline": "timeline"
}')
ON CONFLICT (table_name) DO NOTHING;

-- Create function to update sync timestamp
CREATE OR REPLACE FUNCTION update_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sync_configuration 
  SET last_sync_at = NOW() 
  WHERE table_name = TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to track sync updates
CREATE OR REPLACE TRIGGER stories_sync_trigger
  AFTER UPDATE ON stories
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_sync_timestamp();

CREATE OR REPLACE TRIGGER storytellers_sync_trigger
  AFTER UPDATE ON storytellers
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_sync_timestamp();

CREATE OR REPLACE TRIGGER organizations_sync_trigger
  AFTER UPDATE ON organizations
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_sync_timestamp();

CREATE OR REPLACE TRIGGER projects_sync_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_sync_timestamp();

-- Add RLS policies for sync tables
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_configuration ENABLE ROW LEVEL SECURITY;

-- Allow service role to access sync tables
CREATE POLICY sync_events_service_role ON sync_events FOR ALL TO service_role;
CREATE POLICY sync_conflicts_service_role ON sync_conflicts FOR ALL TO service_role;
CREATE POLICY sync_configuration_service_role ON sync_configuration FOR ALL TO service_role;

-- Create view for sync status dashboard
CREATE OR REPLACE VIEW sync_status_dashboard AS
SELECT 
  sc.table_name,
  sc.sync_enabled,
  sc.sync_direction,
  sc.conflict_resolution_strategy,
  sc.last_sync_at,
  COUNT(se.id) FILTER (WHERE se.status = 'completed' AND se.created_at > NOW() - INTERVAL '24 hours') as successful_syncs_24h,
  COUNT(se.id) FILTER (WHERE se.status = 'failed' AND se.created_at > NOW() - INTERVAL '24 hours') as failed_syncs_24h,
  COUNT(conf.id) FILTER (WHERE conf.resolved_at IS NULL) as unresolved_conflicts
FROM sync_configuration sc
LEFT JOIN sync_events se ON sc.table_name = se.table_name
LEFT JOIN sync_conflicts conf ON sc.table_name = conf.table_name
GROUP BY sc.table_name, sc.sync_enabled, sc.sync_direction, sc.conflict_resolution_strategy, sc.last_sync_at;

COMMENT ON VIEW sync_status_dashboard IS 'Dashboard view for monitoring real-time sync status across all tables';