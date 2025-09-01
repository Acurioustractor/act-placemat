-- LinkedIn Relationship Intelligence Schema
-- Transforms raw LinkedIn CSV data into actionable relationship intelligence
-- Built on top of existing linkedin_imports table

BEGIN;

-- ========================================
-- CORE CONTACTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.linkedin_contacts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  linkedin_url TEXT UNIQUE,
  email_address TEXT,
  
  -- Professional Info  
  current_position TEXT,
  current_company TEXT,
  industry TEXT,
  location TEXT,
  
  -- Connection Info
  connected_on DATE,
  connection_source TEXT, -- 'ben', 'nic', 'both'
  
  -- AI Analysis
  relationship_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  strategic_value TEXT, -- 'high', 'medium', 'low'
  alignment_tags TEXT[], -- ['government', 'funding', 'indigenous', 'youth', 'housing']
  
  -- Metadata
  raw_import_ids BIGINT[], -- References to linkedin_imports
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_analyzed_at TIMESTAMPTZ
);

-- ========================================
-- RELATIONSHIP MAPPING
-- ========================================
CREATE TABLE IF NOT EXISTS public.linkedin_relationships (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  
  -- Relationship Type
  relationship_type TEXT NOT NULL, -- 'direct', 'mutual_contact', 'company_colleague', 'industry_peer'
  connection_strength DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  
  -- Context
  context_notes TEXT,
  interaction_history JSONB DEFAULT '[]'::jsonb,
  
  -- AI Insights
  recommended_approach TEXT,
  engagement_opportunities TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- PROJECT CONNECTIONS
-- ========================================
CREATE TABLE IF NOT EXISTS public.linkedin_project_connections (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  
  -- Project Info (links to Notion)
  notion_project_id TEXT, -- Reference to Notion database
  project_name TEXT NOT NULL,
  connection_type TEXT, -- 'stakeholder', 'funder', 'partner', 'advocate', 'implementer'
  
  -- Connection Details
  relevance_score DECIMAL(3,2) DEFAULT 0.00,
  potential_role TEXT,
  recommended_action TEXT,
  
  -- Status
  contact_status TEXT DEFAULT 'identified', -- 'identified', 'approached', 'engaged', 'collaborating'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- INTERACTION TRACKING
-- ========================================
CREATE TABLE IF NOT EXISTS public.linkedin_interactions (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL, -- 'email', 'meeting', 'linkedin_message', 'project_collab', 'event'
  interaction_date TIMESTAMPTZ NOT NULL,
  direction TEXT, -- 'inbound', 'outbound', 'mutual'
  
  -- Content
  subject TEXT,
  summary TEXT,
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  
  -- AI Analysis
  key_topics TEXT[],
  action_items TEXT[],
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Context
  project_context TEXT,
  relationship_impact DECIMAL(3,2), -- Impact on relationship score
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- OPPORTUNITY MATCHING
-- ========================================
CREATE TABLE IF NOT EXISTS public.linkedin_opportunities (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  
  -- Opportunity Details
  opportunity_type TEXT NOT NULL, -- 'funding', 'partnership', 'collaboration', 'advisory', 'speaking'
  opportunity_title TEXT NOT NULL,
  estimated_value TEXT, -- '$50K-100K', 'Strategic Partnership', etc.
  
  -- Match Analysis
  match_score DECIMAL(3,2) DEFAULT 0.00,
  match_reasoning TEXT,
  
  -- Action Plan
  approach_strategy TEXT,
  ideal_introduction TEXT,
  timeline TEXT,
  
  -- Status
  status TEXT DEFAULT 'identified', -- 'identified', 'approached', 'in_progress', 'successful', 'declined'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- INTELLIGENT VIEWS
-- ========================================

-- High-Value Contacts View
CREATE OR REPLACE VIEW public.vw_high_value_contacts AS
SELECT 
  c.*,
  COUNT(p.id) as project_connections,
  COUNT(o.id) as opportunities,
  COUNT(i.id) as total_interactions,
  MAX(i.interaction_date) as last_interaction
FROM linkedin_contacts c
LEFT JOIN linkedin_project_connections p ON c.id = p.contact_id
LEFT JOIN linkedin_opportunities o ON c.id = o.contact_id  
LEFT JOIN linkedin_interactions i ON c.id = i.contact_id
WHERE c.strategic_value = 'high' OR c.relationship_score > 0.70
GROUP BY c.id
ORDER BY c.relationship_score DESC, c.updated_at DESC;

-- Networking Opportunities View
CREATE OR REPLACE VIEW public.vw_networking_opportunities AS
SELECT 
  c.id,
  c.full_name,
  c.current_position,
  c.current_company,
  c.alignment_tags,
  c.relationship_score,
  COUNT(o.id) as opportunity_count,
  STRING_AGG(DISTINCT o.opportunity_type, ', ') as opportunity_types,
  MAX(i.interaction_date) as last_contact,
  CASE 
    WHEN MAX(i.interaction_date) IS NULL THEN 'No previous contact'
    WHEN MAX(i.interaction_date) < NOW() - INTERVAL '6 months' THEN 'Reconnection needed'
    WHEN MAX(i.interaction_date) < NOW() - INTERVAL '1 month' THEN 'Follow-up due'
    ELSE 'Recently active'
  END as contact_status
FROM linkedin_contacts c
LEFT JOIN linkedin_opportunities o ON c.id = o.contact_id
LEFT JOIN linkedin_interactions i ON c.id = i.contact_id
WHERE c.strategic_value IN ('high', 'medium')
GROUP BY c.id, c.full_name, c.current_position, c.current_company, c.alignment_tags, c.relationship_score
ORDER BY c.relationship_score DESC;

-- Project Contact Recommendations View  
CREATE OR REPLACE VIEW public.vw_project_contact_recommendations AS
SELECT 
  p.project_name,
  p.notion_project_id,
  c.full_name,
  c.current_position,
  c.current_company,
  c.email_address,
  c.linkedin_url,
  p.connection_type,
  p.relevance_score,
  p.recommended_action,
  p.contact_status
FROM linkedin_project_connections p
JOIN linkedin_contacts c ON p.contact_id = c.id
WHERE p.contact_status IN ('identified', 'approached')
ORDER BY p.project_name, p.relevance_score DESC;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_strategic_value ON linkedin_contacts(strategic_value);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_relationship_score ON linkedin_contacts(relationship_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_alignment_tags ON linkedin_contacts USING GIN(alignment_tags);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_company ON linkedin_contacts(current_company);
CREATE INDEX IF NOT EXISTS idx_linkedin_interactions_contact_date ON linkedin_interactions(contact_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_opportunities_status ON linkedin_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_project_connections_project ON linkedin_project_connections(notion_project_id);

-- ========================================
-- TRIGGER FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_contacts_updated_at 
  BEFORE UPDATE ON linkedin_contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_relationships_updated_at 
  BEFORE UPDATE ON linkedin_relationships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_project_connections_updated_at 
  BEFORE UPDATE ON linkedin_project_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_opportunities_updated_at 
  BEFORE UPDATE ON linkedin_opportunities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DATA SYNC FUNCTIONS
-- ========================================

-- Function to sync raw LinkedIn import data to normalized contacts table
CREATE OR REPLACE FUNCTION sync_linkedin_contacts_from_imports()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  contact_id BIGINT;
  inserted_count INTEGER := 0;
BEGIN
  -- Process connections data from linkedin_imports
  FOR rec IN 
    SELECT DISTINCT
      payload->>'First Name' as first_name,
      payload->>'Last Name' as last_name,
      payload->>'URL' as linkedin_url,
      payload->>'Email Address' as email_address,
      payload->>'Position' as current_position,
      payload->>'Company' as current_company,
      CASE 
        WHEN payload->>'Connected On' ~ '^\d{2} \w{3} \d{4}$' THEN (payload->>'Connected On')::DATE
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
    -- Insert or update contact
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
$$;

-- Function to analyze and score contacts using AI keywords
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
    -- Reset values
    score := 0.00;
    tags := ARRAY[]::TEXT[];
    strategic_level := 'low';
    
    -- Analyze position keywords
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
    
    -- Analyze company keywords
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
    
    -- Determine strategic value
    IF score >= 0.70 THEN strategic_level := 'high';
    ELSIF score >= 0.40 THEN strategic_level := 'medium';
    END IF;
    
    -- Update contact
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
$$;

-- Function to update relationship score incrementally
CREATE OR REPLACE FUNCTION update_relationship_score(contact_id BIGINT, score_delta DECIMAL(3,2))
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE linkedin_contacts 
  SET 
    relationship_score = LEAST(GREATEST(relationship_score + score_delta, 0.00), 1.00),
    updated_at = now()
  WHERE id = contact_id;
END;
$$;

COMMIT;