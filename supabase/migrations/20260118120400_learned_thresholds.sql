-- Learned Thresholds Table
-- Migration: 20260118120400_learned_thresholds
-- Source: act-personal-ai/supabase/migrations/20260108020000_create_learned_thresholds_table.sql
--
-- Sprint 3.1: Threshold Learner
-- Stores learned thresholds that replace hardcoded values like "14 days = stale"
-- Uses Bayesian updating to refine values as more evidence is collected

CREATE TABLE IF NOT EXISTS learned_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Threshold identification
  threshold_type TEXT NOT NULL,        -- e.g., 'stale_days', 'high_value', 'urgent_days'
  segment TEXT NOT NULL DEFAULT 'default', -- e.g., 'funder', 'partner', 'community', 'default'

  -- Learned values
  value FLOAT NOT NULL,                -- The learned threshold value
  confidence FLOAT NOT NULL DEFAULT 0.5, -- Confidence in the value (0-1)
  sample_size INTEGER NOT NULL DEFAULT 0, -- Number of outcomes used to learn this

  -- Bayesian prior
  prior_value FLOAT NOT NULL,          -- Initial/default value before learning
  prior_strength FLOAT NOT NULL DEFAULT 1.0, -- How strongly to weight the prior (pseudo-count)

  -- Learning metadata
  last_learned_at TIMESTAMPTZ,         -- When threshold was last updated
  learning_data JSONB DEFAULT '{}',    -- Detailed learning history/evidence

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on type + segment
  UNIQUE(threshold_type, segment)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_learned_thresholds_type ON learned_thresholds(threshold_type);
CREATE INDEX IF NOT EXISTS idx_learned_thresholds_segment ON learned_thresholds(segment);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_learned_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_learned_thresholds_updated_at ON learned_thresholds;
CREATE TRIGGER trigger_learned_thresholds_updated_at
  BEFORE UPDATE ON learned_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_learned_thresholds_updated_at();

-- Insert default thresholds (priors)
-- These will be refined as outcome data is collected

INSERT INTO learned_thresholds (threshold_type, segment, value, prior_value, prior_strength, confidence, sample_size)
VALUES
  -- Stale relationship thresholds (days since last contact)
  ('stale_days', 'default', 14, 14, 2.0, 0.5, 0),
  ('stale_days', 'funder', 7, 7, 2.0, 0.5, 0),
  ('stale_days', 'partner', 10, 10, 2.0, 0.5, 0),
  ('stale_days', 'community', 30, 30, 2.0, 0.5, 0),

  -- Attention threshold (days)
  ('attention_days', 'default', 7, 7, 2.0, 0.5, 0),
  ('attention_days', 'funder', 5, 5, 2.0, 0.5, 0),
  ('attention_days', 'partner', 7, 7, 2.0, 0.5, 0),
  ('attention_days', 'community', 14, 14, 2.0, 0.5, 0),

  -- Normal follow-up window (days)
  ('normal_days', 'default', 3, 3, 2.0, 0.5, 0),
  ('normal_days', 'funder', 2, 2, 2.0, 0.5, 0),
  ('normal_days', 'partner', 3, 3, 2.0, 0.5, 0),
  ('normal_days', 'community', 7, 7, 2.0, 0.5, 0),

  -- High value opportunity threshold (dollars)
  ('high_value', 'default', 5000, 5000, 2.0, 0.5, 0),
  ('high_value', 'project', 10000, 10000, 2.0, 0.5, 0),
  ('high_value', 'consulting', 3000, 3000, 2.0, 0.5, 0)
ON CONFLICT (threshold_type, segment) DO NOTHING;

-- Row Level Security
ALTER TABLE learned_thresholds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access on learned_thresholds"
    ON learned_thresholds FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on learned_thresholds"
    ON learned_thresholds FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Comment on table
COMMENT ON TABLE learned_thresholds IS 'Stores learned thresholds using Bayesian updating. Replaces hardcoded values with data-driven values.';
COMMENT ON COLUMN learned_thresholds.threshold_type IS 'Type of threshold: stale_days, attention_days, normal_days, high_value, etc.';
COMMENT ON COLUMN learned_thresholds.segment IS 'Contact/entity segment: funder, partner, community, default, etc.';
COMMENT ON COLUMN learned_thresholds.prior_value IS 'Initial value before any learning (Bayesian prior)';
COMMENT ON COLUMN learned_thresholds.prior_strength IS 'Pseudo-count for how strongly to weight the prior';
