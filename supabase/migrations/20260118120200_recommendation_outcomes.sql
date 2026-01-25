-- Recommendation Outcomes Table
-- Migration: 20260118120200_recommendation_outcomes
-- Source: act-personal-ai/supabase/migrations/20260108000000_create_recommendation_outcomes.sql
--
-- Tracks AI recommendation outcomes for learning and improvement
-- Part of the adaptive learning system that refines recommendations over time

CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  recommended_action TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  acted_upon BOOLEAN,
  outcome TEXT,
  outcome_value FLOAT,
  outcome_date TIMESTAMPTZ,
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_outcomes_type ON recommendation_outcomes(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_outcomes_entity ON recommendation_outcomes(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_rec_outcomes_date ON recommendation_outcomes(recommended_at);
CREATE INDEX IF NOT EXISTS idx_rec_outcomes_outcome ON recommendation_outcomes(outcome) WHERE outcome IS NOT NULL;

ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role has full access on recommendation_outcomes"
    ON recommendation_outcomes FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on recommendation_outcomes"
    ON recommendation_outcomes FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE recommendation_outcomes IS 'Tracks AI recommendation outcomes for adaptive learning';
COMMENT ON COLUMN recommendation_outcomes.recommendation_type IS 'Type of recommendation: follow_up, outreach, priority_change, etc.';
COMMENT ON COLUMN recommendation_outcomes.outcome IS 'Result of the recommendation: success, failure, ignored, etc.';
COMMENT ON COLUMN recommendation_outcomes.outcome_value IS 'Numeric value of the outcome (e.g., revenue, engagement score)';
