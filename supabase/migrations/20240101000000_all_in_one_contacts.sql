-- ALL-IN-ONE CONTACT SYSTEM MIGRATION
-- Combines all required migrations in correct order
-- Apply this single file instead of multiple migrations

BEGIN;

-- ============================================
-- PART 1: Create person_identity_map
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Canonical person identity map
CREATE TABLE IF NOT EXISTS person_identity_map (
  person_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT,
  email TEXT UNIQUE,
  linkedin_contact_id UUID,
  gmail_id TEXT,
  notion_id TEXT,
  notion_person_id TEXT,
  external_ids JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_identity_email ON person_identity_map(email);
CREATE INDEX IF NOT EXISTS idx_person_identity_linkedin ON person_identity_map(linkedin_contact_id);

-- ============================================
-- PART 2: LinkedIn Contacts Tables
-- ============================================

DROP TABLE IF EXISTS linkedin_interactions CASCADE;
DROP TABLE IF EXISTS linkedin_opportunities CASCADE;
DROP TABLE IF EXISTS linkedin_project_connections CASCADE;
DROP TABLE IF EXISTS linkedin_relationships CASCADE;
DROP TABLE IF EXISTS linkedin_contacts CASCADE;

CREATE TABLE linkedin_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  linkedin_url TEXT UNIQUE,
  email_address TEXT,
  current_company TEXT,
  current_position TEXT,
  location TEXT,
  connected_date DATE,
  data_source TEXT,
  relationship_score DECIMAL(3,2) DEFAULT 0.50 CHECK (relationship_score >= 0 AND relationship_score <= 1),
  strategic_value TEXT DEFAULT 'unknown' CHECK (strategic_value IN ('high', 'medium', 'low', 'unknown')),
  influence_level TEXT,
  network_reach INTEGER,
  engagement_frequency TEXT CHECK (engagement_frequency IN ('high', 'medium', 'low', 'none')),
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  alignment_tags TEXT[] DEFAULT '{}',
  skills_extracted TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  notion_person_id TEXT,
  gmail_contact_id TEXT,
  raw_data JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_email ON linkedin_contacts(email_address);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_company ON linkedin_contacts(current_company);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_score ON linkedin_contacts(relationship_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_person ON linkedin_contacts(person_id);

-- Link linkedin_contacts to person_identity_map
ALTER TABLE linkedin_contacts
  ADD CONSTRAINT fk_linkedin_contacts_person
  FOREIGN KEY (person_id) REFERENCES person_identity_map(person_id);

CREATE TABLE linkedin_project_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  notion_project_id TEXT,
  project_name TEXT NOT NULL,
  connection_type TEXT,
  relevance_score DECIMAL(3,2) DEFAULT 0.00,
  potential_role TEXT,
  recommended_action TEXT,
  contact_status TEXT DEFAULT 'identified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, notion_project_id)
);

-- ============================================
-- PART 3: Contact Intelligence Extensions
-- ============================================

-- Extend person_identity_map
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS contact_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS youth_justice_relevance_score INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS engagement_priority TEXT DEFAULT 'low';
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS indigenous_affiliation BOOLEAN DEFAULT FALSE;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS government_influence INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS funding_capacity TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS collaboration_potential INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS current_company TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS alignment_tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_person_identity_engagement_priority ON person_identity_map(engagement_priority);

-- Contact Intelligence Scores
CREATE TABLE IF NOT EXISTS contact_intelligence_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  influence_score INTEGER DEFAULT 0 CHECK (influence_score >= 0 AND influence_score <= 100),
  accessibility_score INTEGER DEFAULT 0 CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
  alignment_score INTEGER DEFAULT 0 CHECK (alignment_score >= 0 AND alignment_score <= 100),
  timing_score INTEGER DEFAULT 0 CHECK (timing_score >= 0 AND timing_score <= 100),
  strategic_value_score INTEGER DEFAULT 0 CHECK (strategic_value_score >= 0 AND strategic_value_score <= 100),
  composite_score INTEGER DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  engagement_readiness INTEGER DEFAULT 0 CHECK (engagement_readiness >= 0 AND engagement_readiness <= 100),
  response_likelihood INTEGER DEFAULT 0 CHECK (response_likelihood >= 0 AND response_likelihood <= 100),
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  calculation_method TEXT DEFAULT 'ai_analysis',
  confidence_level NUMERIC(3,2) DEFAULT 0.5,
  UNIQUE(person_id)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_scores_composite ON contact_intelligence_scores(composite_score DESC);

-- Contact Interactions
CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('email', 'call', 'meeting', 'event', 'social_media', 'letter', 'other')),
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response', 'pending')),
  sentiment_score NUMERIC(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_interactions_person ON contact_interactions(person_id, interaction_date DESC);

-- ============================================
-- PART 4: Engagement Tier Assignment
-- ============================================

-- Ensure engagement_priority has constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'person_identity_map_engagement_priority_check'
  ) THEN
    ALTER TABLE person_identity_map
    ADD CONSTRAINT person_identity_map_engagement_priority_check
    CHECK (engagement_priority IN ('critical', 'high', 'medium', 'low'));
  END IF;
END $$;

-- Tier Assignment Function
CREATE OR REPLACE FUNCTION assign_engagement_tier(person_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  tier TEXT := 'low';
  person_record person_identity_map;
  scores_record contact_intelligence_scores;
  recent_interactions INTEGER;
  project_connections INTEGER;
BEGIN
  SELECT * INTO person_record FROM person_identity_map WHERE person_id = person_uuid;
  SELECT * INTO scores_record FROM contact_intelligence_scores WHERE person_id = person_uuid;

  SELECT COUNT(*) INTO recent_interactions
  FROM contact_interactions
  WHERE person_id = person_uuid
    AND interaction_date > NOW() - INTERVAL '6 months';

  SELECT COUNT(*) INTO project_connections
  FROM linkedin_project_connections lpc
  JOIN linkedin_contacts lc ON lpc.contact_id = lc.id
  WHERE lc.person_id = person_uuid;

  -- Tier 1: Critical
  IF (
    (scores_record.composite_score >= 80) OR
    (scores_record.influence_score >= 90) OR
    (scores_record.strategic_value_score >= 85) OR
    (recent_interactions >= 10)
  ) THEN
    tier := 'critical';

  -- Tier 2: High
  ELSIF (
    (scores_record.composite_score >= 70) OR
    (recent_interactions >= 5) OR
    (project_connections >= 3)
  ) THEN
    tier := 'high';

  -- Tier 3: Medium
  ELSIF (
    (scores_record.composite_score >= 40) OR
    (recent_interactions >= 1) OR
    (project_connections >= 1)
  ) THEN
    tier := 'medium';

  ELSE
    tier := 'low';
  END IF;

  UPDATE person_identity_map
  SET engagement_priority = tier, updated_at = NOW()
  WHERE person_id = person_uuid;

  RETURN tier;
END;
$$ LANGUAGE plpgsql;

-- Should Promote to Notion Function
CREATE OR REPLACE FUNCTION should_promote_to_notion(person_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  person_record person_identity_map;
  scores_record contact_intelligence_scores;
BEGIN
  SELECT * INTO person_record FROM person_identity_map WHERE person_id = person_uuid;
  SELECT * INTO scores_record FROM contact_intelligence_scores WHERE person_id = person_uuid;

  IF person_record.notion_person_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF person_record.engagement_priority != 'critical' THEN
    RETURN FALSE;
  END IF;

  RETURN (
    scores_record.composite_score >= 80 OR
    scores_record.strategic_value_score >= 85
  );
END;
$$ LANGUAGE plpgsql;

-- Notion Promotion Candidates View
CREATE OR REPLACE VIEW vw_notion_promotion_candidates AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.current_position,
  p.current_company,
  p.sector,
  p.engagement_priority,
  s.composite_score,
  s.influence_score,
  s.strategic_value_score,
  (SELECT COUNT(*) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as total_interactions,
  p.created_at
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
WHERE p.engagement_priority = 'critical'
  AND p.notion_person_id IS NULL
  AND p.email IS NOT NULL
ORDER BY s.composite_score DESC NULLS LAST;

-- Newsletter Segments View
CREATE OR REPLACE VIEW vw_newsletter_segments AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.engagement_priority,
  p.alignment_tags,
  p.sector,
  s.composite_score,
  CASE p.engagement_priority
    WHEN 'critical' THEN 'executive_summary'
    WHEN 'high' THEN 'tailored_content'
    WHEN 'medium' THEN 'general_newsletter'
    WHEN 'low' THEN 'annual_summary'
  END as newsletter_type
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
WHERE p.email IS NOT NULL;

-- Tier Stats View
CREATE OR REPLACE VIEW vw_engagement_tier_stats AS
SELECT
  engagement_priority as tier,
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN notion_person_id IS NOT NULL THEN 1 END) as synced_to_notion,
  COUNT(CASE WHEN sector = 'government' THEN 1 END) as government_contacts
FROM person_identity_map
WHERE email IS NOT NULL
GROUP BY engagement_priority;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE person_identity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_intelligence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON person_identity_map;
DROP POLICY IF EXISTS "Allow authenticated read" ON linkedin_contacts;
DROP POLICY IF EXISTS "Users can view all scores" ON contact_intelligence_scores;
DROP POLICY IF EXISTS "Users can view all contact data" ON contact_interactions;

CREATE POLICY "Allow authenticated read" ON person_identity_map FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON linkedin_contacts FOR SELECT USING (true);
CREATE POLICY "Users can view all scores" ON contact_intelligence_scores FOR SELECT USING (true);
CREATE POLICY "Users can view all contact data" ON contact_interactions FOR SELECT USING (true);

GRANT ALL ON person_identity_map TO service_role;
GRANT ALL ON linkedin_contacts TO service_role;
GRANT ALL ON linkedin_project_connections TO service_role;
GRANT ALL ON contact_intelligence_scores TO service_role;
GRANT ALL ON contact_interactions TO service_role;

COMMIT;

-- Verify installation
SELECT 'Migration complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('person_identity_map', 'linkedin_contacts', 'contact_intelligence_scores', 'contact_interactions')
ORDER BY table_name;
