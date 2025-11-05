-- LinkedIn Contacts and Intelligence Tables
-- Stores 15,020+ LinkedIn connections with relationship intelligence
-- FIXED VERSION: Removed inline index syntax errors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Drop existing tables if needed (for clean migration)
DROP TABLE IF EXISTS linkedin_interactions CASCADE;
DROP TABLE IF EXISTS linkedin_opportunities CASCADE;
DROP TABLE IF EXISTS linkedin_project_connections CASCADE;
DROP TABLE IF EXISTS linkedin_relationships CASCADE;
DROP TABLE IF EXISTS linkedin_contacts CASCADE;

-- ============================================
-- Core LinkedIn Contacts Table
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  linkedin_url TEXT UNIQUE,
  email_address TEXT,

  -- Professional Info
  current_company TEXT,
  current_position TEXT,
  location TEXT,
  connected_date DATE,
  data_source TEXT, -- 'ben' or 'nic'

  -- Relationship Intelligence
  relationship_score DECIMAL(3,2) DEFAULT 0.50 CHECK (relationship_score >= 0 AND relationship_score <= 1),
  strategic_value TEXT DEFAULT 'unknown' CHECK (strategic_value IN ('high', 'medium', 'low', 'unknown')),
  influence_level TEXT,
  network_reach INTEGER,

  -- Engagement Tracking
  engagement_frequency TEXT CHECK (engagement_frequency IN ('high', 'medium', 'low', 'none')),
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,

  -- Tags and Categories
  alignment_tags TEXT[] DEFAULT '{}',
  skills_extracted TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',

  -- Cross-references
  notion_person_id TEXT,
  gmail_contact_id TEXT,

  -- Metadata
  raw_data JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately (not inline)
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_email ON linkedin_contacts(email_address);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_company ON linkedin_contacts(current_company);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_score ON linkedin_contacts(relationship_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_strategic ON linkedin_contacts(strategic_value);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_source ON linkedin_contacts(data_source);

-- ============================================
-- LinkedIn Messages/Interactions
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,

  -- Message Details
  conversation_id TEXT,
  interaction_type TEXT DEFAULT 'message', -- 'message', 'invitation', 'endorsement'
  direction TEXT CHECK (direction IN ('inbound', 'outbound', 'mutual')),

  -- Content
  subject TEXT,
  content TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  -- Metadata
  interaction_date TIMESTAMPTZ,
  folder TEXT,
  is_draft BOOLEAN DEFAULT FALSE,
  attachments TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact ON linkedin_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON linkedin_interactions(interaction_date DESC);

-- ============================================
-- Relationship Mapping
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,

  -- Relationship Type
  relationship_type TEXT NOT NULL,
  connection_strength DECIMAL(3,2) DEFAULT 0.00,

  -- Context
  context_notes TEXT,
  shared_connections INTEGER,
  common_interests TEXT[],

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Project Connections
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_project_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,

  -- Project Info
  notion_project_id TEXT,
  project_name TEXT NOT NULL,
  connection_type TEXT,

  -- Connection Details
  relevance_score DECIMAL(3,2) DEFAULT 0.00,
  potential_role TEXT,
  recommended_action TEXT,
  contact_status TEXT DEFAULT 'identified',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate connections
  UNIQUE(contact_id, notion_project_id)
);

-- ============================================
-- Opportunities Identified
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,

  -- Opportunity Details
  opportunity_type TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  estimated_value TEXT,

  -- Match Analysis
  match_score DECIMAL(3,2) DEFAULT 0.00,
  match_reasoning TEXT,

  -- Status
  status TEXT DEFAULT 'identified',
  priority TEXT DEFAULT 'medium',
  next_action TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Functions for Intelligence
-- ============================================

-- Calculate relationship score based on multiple factors
CREATE OR REPLACE FUNCTION calculate_relationship_score(contact_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0.5;
  contact_record RECORD;
  interaction_count INTEGER;
BEGIN
  SELECT * INTO contact_record FROM linkedin_contacts WHERE id = contact_id;
  SELECT COUNT(*) INTO interaction_count FROM linkedin_interactions WHERE linkedin_interactions.contact_id = contact_id;

  -- Base scoring
  IF contact_record.email_address IS NOT NULL THEN score := score + 0.1; END IF;
  IF contact_record.current_company IS NOT NULL THEN score := score + 0.05; END IF;
  IF contact_record.current_position IS NOT NULL THEN score := score + 0.05; END IF;

  -- Interaction scoring
  IF interaction_count > 10 THEN score := score + 0.3;
  ELSIF interaction_count > 5 THEN score := score + 0.2;
  ELSIF interaction_count > 0 THEN score := score + 0.1;
  END IF;

  -- Strategic value bonus
  IF contact_record.strategic_value = 'high' THEN score := score + 0.2;
  ELSIF contact_record.strategic_value = 'medium' THEN score := score + 0.1;
  END IF;

  RETURN LEAST(score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views for Intelligence
-- ============================================

-- High-value contacts view
CREATE OR REPLACE VIEW vw_strategic_contacts AS
SELECT
  c.id,
  c.full_name,
  c.current_position,
  c.current_company,
  c.email_address,
  c.relationship_score,
  c.strategic_value,
  c.alignment_tags,
  COUNT(DISTINCT i.id) as interaction_count,
  MAX(i.interaction_date) as last_interaction,
  COUNT(DISTINCT p.id) as project_connections,
  COUNT(DISTINCT o.id) as opportunities
FROM linkedin_contacts c
LEFT JOIN linkedin_interactions i ON c.id = i.contact_id
LEFT JOIN linkedin_project_connections p ON c.id = p.contact_id
LEFT JOIN linkedin_opportunities o ON c.id = o.contact_id
WHERE c.strategic_value IN ('high', 'medium')
   OR c.relationship_score > 0.7
GROUP BY c.id
ORDER BY c.relationship_score DESC, c.strategic_value;

-- Network statistics view
CREATE OR REPLACE VIEW vw_network_statistics AS
SELECT
  COUNT(*) as total_contacts,
  COUNT(DISTINCT CASE WHEN email_address IS NOT NULL THEN id END) as contacts_with_email,
  COUNT(DISTINCT CASE WHEN data_source = 'ben' THEN id END) as ben_connections,
  COUNT(DISTINCT CASE WHEN data_source = 'nic' THEN id END) as nic_connections,
  COUNT(DISTINCT CASE WHEN strategic_value = 'high' THEN id END) as high_value_contacts,
  COUNT(DISTINCT CASE WHEN relationship_score > 0.7 THEN id END) as strong_relationships,
  AVG(relationship_score) as avg_relationship_score
FROM linkedin_contacts;

-- ============================================
-- Triggers for Updated Timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_contacts_updated_at
  BEFORE UPDATE ON linkedin_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_linkedin_relationships_updated_at
  BEFORE UPDATE ON linkedin_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_linkedin_project_connections_updated_at
  BEFORE UPDATE ON linkedin_project_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_linkedin_opportunities_updated_at
  BEFORE UPDATE ON linkedin_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE linkedin_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_project_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
-- For now, allowing authenticated users to read all data
CREATE POLICY "Allow authenticated read access" ON linkedin_contacts
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access" ON linkedin_interactions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access" ON linkedin_relationships
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access" ON linkedin_project_connections
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access" ON linkedin_opportunities
  FOR SELECT USING (true);

-- Grant permissions to service role for imports
GRANT ALL ON linkedin_contacts TO service_role;
GRANT ALL ON linkedin_interactions TO service_role;
GRANT ALL ON linkedin_relationships TO service_role;
GRANT ALL ON linkedin_project_connections TO service_role;
GRANT ALL ON linkedin_opportunities TO service_role;

-- ============================================
-- Initial Statistics Query
-- ============================================
-- Run this after import to see results:
-- SELECT * FROM vw_network_statistics;
-- SELECT * FROM vw_strategic_contacts LIMIT 20;
