-- Contact Intelligence System Migration
-- Extends existing person_identity_map for comprehensive contact management

BEGIN;

-- Extend person_identity_map for contact intelligence
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS contact_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS youth_justice_relevance_score INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS engagement_priority TEXT DEFAULT 'low';
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS engagement_strategy TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS last_research_update TIMESTAMPTZ;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS ai_research_confidence NUMERIC(3,2) DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS organization_type TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS location_region TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS indigenous_affiliation BOOLEAN DEFAULT FALSE;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS media_reach TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS government_influence INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS funding_capacity TEXT;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS collaboration_potential INTEGER DEFAULT 0;
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE person_identity_map ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_person_identity_youth_justice_score ON person_identity_map(youth_justice_relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_person_identity_engagement_priority ON person_identity_map(engagement_priority);
CREATE INDEX IF NOT EXISTS idx_person_identity_sector ON person_identity_map(sector);
CREATE INDEX IF NOT EXISTS idx_person_identity_indigenous ON person_identity_map(indigenous_affiliation);
CREATE INDEX IF NOT EXISTS idx_person_identity_tags ON person_identity_map USING GIN(tags);

-- Contact Interactions Tracking
CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('email', 'call', 'meeting', 'event', 'social_media', 'letter', 'other')),
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response', 'pending')),
  sentiment_score NUMERIC(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  response_time_hours INTEGER,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  attendees TEXT[],
  attachments TEXT[],
  external_urls TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_interactions_person ON contact_interactions(person_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_type ON contact_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_outcome ON contact_interactions(outcome);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_follow_up ON contact_interactions(follow_up_required, follow_up_date);

-- Contact Research Log (AI enrichment history)
CREATE TABLE IF NOT EXISTS contact_research_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  research_type TEXT NOT NULL CHECK (research_type IN ('linkedin', 'web_search', 'news', 'academic', 'social_media', 'government', 'organization')),
  research_query TEXT,
  research_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_urls TEXT[],
  research_date TIMESTAMPTZ DEFAULT NOW(),
  ai_provider TEXT,
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  cost_estimate_cents INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contact_research_person ON contact_research_log(person_id, research_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_research_type ON contact_research_log(research_type);
CREATE INDEX IF NOT EXISTS idx_contact_research_success ON contact_research_log(success, research_date DESC);

-- Campaign Management
CREATE TABLE IF NOT EXISTS contact_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('media', 'government', 'indigenous', 'academic', 'corporate', 'foundation', 'community', 'advocacy')),
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
  target_audience JSONB DEFAULT '{}'::jsonb,
  success_metrics JSONB DEFAULT '{}'::jsonb,
  budget_allocated INTEGER DEFAULT 0,
  budget_spent INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  expected_outcomes TEXT,
  actual_outcomes TEXT,
  roi_score NUMERIC(5,2),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_campaigns_type ON contact_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_contact_campaigns_status ON contact_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_contact_campaigns_dates ON contact_campaigns(start_date, end_date);

-- Contact Campaign Assignments
CREATE TABLE IF NOT EXISTS contact_campaign_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES contact_campaigns(id) ON DELETE CASCADE,
  assignment_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'contacted', 'responded', 'meeting_scheduled', 'completed', 'declined', 'no_response')),
  priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  custom_approach TEXT,
  expected_outcome TEXT,
  actual_outcome TEXT,
  contact_attempts INTEGER DEFAULT 0,
  last_contact_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ,
  meeting_date TIMESTAMPTZ,
  success_score INTEGER CHECK (success_score >= 0 AND success_score <= 100),
  notes TEXT,
  assigned_to TEXT,
  UNIQUE(person_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_assignments_person ON contact_campaign_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign ON contact_campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_status ON contact_campaign_assignments(status);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_priority ON contact_campaign_assignments(priority_score DESC);

-- Contact Networks and Relationships
CREATE TABLE IF NOT EXISTS contact_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_a_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('colleague', 'supervisor', 'subordinate', 'partner', 'competitor', 'mentor', 'mentee', 'friend', 'family', 'other')),
  relationship_strength INTEGER DEFAULT 50 CHECK (relationship_strength >= 0 AND relationship_strength <= 100),
  mutual_connection BOOLEAN DEFAULT FALSE,
  introduction_path TEXT,
  discovered_via TEXT,
  discovered_date TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(person_a_id, person_b_id, relationship_type),
  CHECK (person_a_id != person_b_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_relationships_person_a ON contact_relationships(person_a_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_person_b ON contact_relationships(person_b_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_type ON contact_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_mutual ON contact_relationships(mutual_connection);

-- Contact Intelligence Scores (AI-generated metrics)
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
CREATE INDEX IF NOT EXISTS idx_intelligence_scores_influence ON contact_intelligence_scores(influence_score DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_scores_engagement ON contact_intelligence_scores(engagement_readiness DESC);

-- Contact Tasks and Follow-ups
CREATE TABLE IF NOT EXISTS contact_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES contact_campaigns(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('follow_up_email', 'schedule_call', 'send_material', 'research_contact', 'prepare_meeting', 'send_invitation', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  assigned_to TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  dependencies TEXT[],
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_tasks_person ON contact_tasks(person_id);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_status ON contact_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_priority ON contact_tasks(priority, due_date);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_assigned ON contact_tasks(assigned_to, status);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
DO $$
BEGIN
  -- Contact interactions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_interactions_updated_at') THEN
    CREATE TRIGGER update_contact_interactions_updated_at
      BEFORE UPDATE ON contact_interactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Campaigns
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_campaigns_updated_at') THEN
    CREATE TRIGGER update_contact_campaigns_updated_at
      BEFORE UPDATE ON contact_campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Tasks
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_tasks_updated_at') THEN
    CREATE TRIGGER update_contact_tasks_updated_at
      BEFORE UPDATE ON contact_tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Row Level Security (RLS) setup
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_research_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_campaign_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_intelligence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tasks ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on user roles)
CREATE POLICY IF NOT EXISTS "Users can view all contact data" ON contact_interactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can insert contact data" ON contact_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can update contact data" ON contact_interactions FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Users can view all research data" ON contact_research_log FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can insert research data" ON contact_research_log FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view all campaigns" ON contact_campaigns FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage campaigns" ON contact_campaigns FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Users can view all campaign assignments" ON contact_campaign_assignments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage campaign assignments" ON contact_campaign_assignments FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Users can view all relationships" ON contact_relationships FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage relationships" ON contact_relationships FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Users can view all scores" ON contact_intelligence_scores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can update scores" ON contact_intelligence_scores FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Users can view all tasks" ON contact_tasks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage tasks" ON contact_tasks FOR ALL USING (true);

-- Views for common queries
CREATE OR REPLACE VIEW contact_dashboard_summary AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.youth_justice_relevance_score,
  p.engagement_priority,
  p.sector,
  p.indigenous_affiliation,
  s.composite_score,
  s.engagement_readiness,
  (SELECT COUNT(*) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as interaction_count,
  (SELECT MAX(ci.interaction_date) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as last_interaction,
  (SELECT COUNT(*) FROM contact_tasks ct WHERE ct.person_id = p.person_id AND ct.status = 'pending') as pending_tasks,
  p.created_at,
  p.updated_at
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
WHERE p.email IS NOT NULL
ORDER BY
  CASE p.engagement_priority
    WHEN 'critical' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    ELSE 1
  END DESC,
  s.composite_score DESC NULLS LAST,
  p.youth_justice_relevance_score DESC;

-- Function to calculate composite intelligence score
CREATE OR REPLACE FUNCTION calculate_composite_score(
  influence_score INTEGER,
  accessibility_score INTEGER,
  alignment_score INTEGER,
  timing_score INTEGER,
  strategic_value_score INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- Weighted average: Influence (30%), Alignment (25%), Accessibility (20%), Timing (15%), Strategic Value (10%)
  RETURN ROUND(
    (influence_score * 0.30 +
     alignment_score * 0.25 +
     accessibility_score * 0.20 +
     timing_score * 0.15 +
     strategic_value_score * 0.10)
  )::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to update intelligence scores
CREATE OR REPLACE FUNCTION update_contact_intelligence_score(person_uuid UUID)
RETURNS contact_intelligence_scores AS $$
DECLARE
  result contact_intelligence_scores;
  person_data person_identity_map;
  interaction_data RECORD;
  research_confidence NUMERIC(3,2) DEFAULT 0.5;
BEGIN
  -- Get person data
  SELECT * INTO person_data FROM person_identity_map WHERE person_id = person_uuid;

  -- Get interaction statistics
  SELECT
    COUNT(*) as total_interactions,
    AVG(CASE WHEN outcome = 'positive' THEN 1 WHEN outcome = 'neutral' THEN 0.5 ELSE 0 END) as success_rate,
    AVG(sentiment_score) as avg_sentiment,
    MAX(interaction_date) as last_interaction
  INTO interaction_data
  FROM contact_interactions
  WHERE person_id = person_uuid;

  -- Get research confidence
  SELECT AVG(confidence_score) INTO research_confidence
  FROM contact_research_log
  WHERE person_id = person_uuid AND success = true;

  -- Calculate scores based on available data
  INSERT INTO contact_intelligence_scores (
    person_id,
    influence_score,
    accessibility_score,
    alignment_score,
    timing_score,
    strategic_value_score,
    composite_score,
    engagement_readiness,
    response_likelihood,
    confidence_level
  ) VALUES (
    person_uuid,
    -- Influence: based on sector, government influence, media reach
    LEAST(100,
      GREATEST(0,
        CASE
          WHEN person_data.sector IN ('government', 'media') THEN 80
          WHEN person_data.sector IN ('academic', 'foundation') THEN 70
          WHEN person_data.indigenous_affiliation = true THEN 75
          ELSE 50
        END + COALESCE(person_data.government_influence, 0) / 5
      )
    ),

    -- Accessibility: based on interaction history and response patterns
    CASE
      WHEN interaction_data.total_interactions > 0 THEN
        LEAST(100, 60 + (interaction_data.success_rate * 40)::INTEGER)
      ELSE 50
    END,

    -- Alignment: youth justice relevance score
    LEAST(100, GREATEST(0, COALESCE(person_data.youth_justice_relevance_score, 30))),

    -- Timing: based on recent activity and interaction recency
    CASE
      WHEN interaction_data.last_interaction > NOW() - INTERVAL '30 days' THEN 80
      WHEN interaction_data.last_interaction > NOW() - INTERVAL '90 days' THEN 60
      WHEN interaction_data.last_interaction IS NOT NULL THEN 40
      ELSE 50
    END,

    -- Strategic value: collaboration potential + funding capacity
    LEAST(100,
      GREATEST(0,
        COALESCE(person_data.collaboration_potential, 30) +
        CASE person_data.funding_capacity
          WHEN 'high' THEN 30
          WHEN 'medium' THEN 20
          WHEN 'low' THEN 10
          ELSE 15
        END
      )
    ),

    0, -- Composite score (calculated below)

    -- Engagement readiness
    CASE person_data.engagement_priority
      WHEN 'critical' THEN 90
      WHEN 'high' THEN 80
      WHEN 'medium' THEN 60
      ELSE 40
    END,

    -- Response likelihood based on past interactions
    CASE
      WHEN interaction_data.total_interactions > 0 THEN
        LEAST(100, GREATEST(0, (interaction_data.success_rate * 100)))::INTEGER
      ELSE 50
    END,

    COALESCE(research_confidence, 0.5)
  )
  ON CONFLICT (person_id) DO UPDATE SET
    influence_score = EXCLUDED.influence_score,
    accessibility_score = EXCLUDED.accessibility_score,
    alignment_score = EXCLUDED.alignment_score,
    timing_score = EXCLUDED.timing_score,
    strategic_value_score = EXCLUDED.strategic_value_score,
    engagement_readiness = EXCLUDED.engagement_readiness,
    response_likelihood = EXCLUDED.response_likelihood,
    confidence_level = EXCLUDED.confidence_level,
    last_calculated = NOW();

  -- Update composite score
  UPDATE contact_intelligence_scores
  SET composite_score = calculate_composite_score(
    influence_score, accessibility_score, alignment_score, timing_score, strategic_value_score
  )
  WHERE person_id = person_uuid;

  -- Return updated scores
  SELECT * INTO result FROM contact_intelligence_scores WHERE person_id = person_uuid;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT;
