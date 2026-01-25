-- Entity Resolution Tables
-- Migration: 20260118120300_entities_tables
-- Source: act-personal-ai/supabase/migrations/20260108010000_create_entities_tables.sql
--
-- Sprint 2: One person, one view across all systems
-- Canonical entity registry for deduplication and cross-system linking

-- Canonical entities table - the "one source of truth" for a person
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  company TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups (most common)
CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(primary_email);

-- Index for name searches
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(first_name, last_name);

-- Index for company grouping
CREATE INDEX IF NOT EXISTS idx_entities_company ON entities(company);


-- Entity mappings table - links entities to source systems
CREATE TABLE IF NOT EXISTS entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL CHECK (source_system IN ('ghl', 'calendar', 'email', 'notion', 'xero', 'linkedin')),
  source_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate mappings
  UNIQUE(source_system, source_id)
);

-- Index for entity lookups
CREATE INDEX IF NOT EXISTS idx_entity_mappings_entity ON entity_mappings(entity_id);

-- Index for source system lookups
CREATE INDEX IF NOT EXISTS idx_entity_mappings_source ON entity_mappings(source_system, source_id);


-- Enable Row Level Security
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_mappings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$ BEGIN
  CREATE POLICY "Service role can do anything on entities"
    ON entities FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything on entity_mappings"
    ON entity_mappings FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Read access for authenticated users
DO $$ BEGIN
  CREATE POLICY "Authenticated read access on entities"
    ON entities FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on entity_mappings"
    ON entity_mappings FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Helper function to get entity by any identifier
CREATE OR REPLACE FUNCTION get_entity_by_identifier(identifier TEXT)
RETURNS UUID AS $$
DECLARE
  entity_uuid UUID;
BEGIN
  -- Try email first
  SELECT id INTO entity_uuid FROM entities WHERE primary_email = lower(identifier);
  IF entity_uuid IS NOT NULL THEN
    RETURN entity_uuid;
  END IF;

  -- Try source mappings
  SELECT entity_id INTO entity_uuid FROM entity_mappings WHERE source_id = identifier;
  RETURN entity_uuid;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE entities IS 'Canonical entity registry - one source of truth for people across all systems';
COMMENT ON TABLE entity_mappings IS 'Maps entities to their identifiers in source systems (GHL, Calendar, Email, etc.)';
COMMENT ON FUNCTION get_entity_by_identifier IS 'Lookup entity by email or source system ID';
