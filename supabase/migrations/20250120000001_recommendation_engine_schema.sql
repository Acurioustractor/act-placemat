-- Migration: Add Recommendation Engine Schema
-- Created: 2025-01-20
-- Description: Database schema for AI-driven project recommendation system

-- User behavior tracking table
CREATE TABLE IF NOT EXISTS user_project_interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'apply', 'bookmark', 'dismiss')),
  interaction_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (interaction_weight BETWEEN 0.0 AND 2.0),
  session_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- Indexes for performance
  CONSTRAINT unique_user_project_interaction UNIQUE(user_id, project_id, interaction_type, DATE(timestamp))
);

-- Index for fast user interaction queries
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id_timestamp 
ON user_project_interactions(user_id, timestamp DESC);

-- Index for project popularity calculations
CREATE INDEX IF NOT EXISTS idx_user_interactions_project_id_type 
ON user_project_interactions(project_id, interaction_type, timestamp);

-- Project features for ML algorithms
CREATE TABLE IF NOT EXISTS project_features (
  project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  category_vector DECIMAL[] NOT NULL DEFAULT '{}', -- One-hot encoded categories
  location_vector DECIMAL[] NOT NULL DEFAULT '{}', -- Geographic features
  skill_requirements TEXT[] DEFAULT '{}', -- Skills needed
  collaboration_score DECIMAL(3,2) CHECK (collaboration_score BETWEEN 0.0 AND 1.0),
  impact_score DECIMAL(3,2) CHECK (impact_score BETWEEN 0.0 AND 1.0),
  complexity_score DECIMAL(3,2) CHECK (complexity_score BETWEEN 0.0 AND 1.0),
  time_commitment INTEGER CHECK (time_commitment > 0), -- Hours per week
  remote_friendly BOOLEAN DEFAULT FALSE,
  feature_vector DECIMAL[] DEFAULT '{}', -- Combined feature vector for ML
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ML feature queries
CREATE INDEX IF NOT EXISTS idx_project_features_vectors 
ON project_features USING GIN(category_vector, location_vector);

-- User preference profiles learned from behavior
CREATE TABLE IF NOT EXISTS user_preference_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_preferences DECIMAL[] NOT NULL DEFAULT '{}', -- Learned category weights
  location_preferences DECIMAL[] NOT NULL DEFAULT '{}', -- Geographic preferences
  skill_preferences TEXT[] DEFAULT '{}', -- Preferred skills
  impact_preference DECIMAL(3,2) DEFAULT 0.5 CHECK (impact_preference BETWEEN 0.0 AND 1.0),
  collaboration_preference DECIMAL(3,2) DEFAULT 0.5 CHECK (collaboration_preference BETWEEN 0.0 AND 1.0),
  time_availability INTEGER DEFAULT 10 CHECK (time_availability > 0), -- Available hours per week
  experience_level INTEGER DEFAULT 3 CHECK (experience_level BETWEEN 1 AND 5),
  diversity_boost DECIMAL(3,2) DEFAULT 1.0 CHECK (diversity_boost BETWEEN 0.0 AND 2.0),
  preference_vector DECIMAL[] DEFAULT '{}', -- Combined preference vector
  confidence_score DECIMAL(3,2) DEFAULT 0.1, -- How confident we are in these preferences
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation feedback for model improvement
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  recommendation_score DECIMAL(3,2) NOT NULL CHECK (recommendation_score BETWEEN 0.0 AND 1.0),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('explicit', 'implicit', 'negative')),
  recommendation_reason TEXT[] DEFAULT '{}', -- Why this was recommended
  algorithm_version VARCHAR(20) NOT NULL,
  ab_test_group VARCHAR(20),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate feedback for same recommendation
  CONSTRAINT unique_user_project_feedback UNIQUE(user_id, project_id, algorithm_version, DATE(timestamp))
);

-- Index for feedback analysis
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_algorithm_version 
ON recommendation_feedback(algorithm_version, timestamp DESC);

-- ML model performance tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
  id BIGSERIAL PRIMARY KEY,
  model_version VARCHAR(20) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('collaborative', 'content_based', 'hybrid')),
  training_date TIMESTAMPTZ NOT NULL,
  validation_accuracy DECIMAL(5,4) CHECK (validation_accuracy BETWEEN 0.0 AND 1.0),
  diversity_score DECIMAL(3,2) CHECK (diversity_score BETWEEN 0.0 AND 1.0),
  impact_alignment_score DECIMAL(3,2) CHECK (impact_alignment_score BETWEEN 0.0 AND 1.0),
  coverage_score DECIMAL(3,2) CHECK (coverage_score BETWEEN 0.0 AND 1.0),
  ab_test_group VARCHAR(10),
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one active model per type
  CONSTRAINT unique_active_model_per_type EXCLUDE (model_type WITH =) WHERE (is_active = true)
);

-- Cached recommendations for performance
CREATE TABLE IF NOT EXISTS cached_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  recommendation_score DECIMAL(5,4) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  algorithm_used VARCHAR(50) NOT NULL,
  reasons TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Index for fast recommendation retrieval
  CONSTRAINT unique_user_project_cache UNIQUE(user_id, project_id, algorithm_used)
);

-- Index for cache cleanup and retrieval
CREATE INDEX IF NOT EXISTS idx_cached_recommendations_user_score 
ON cached_recommendations(user_id, recommendation_score DESC, expires_at);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_cached_recommendations_expires_at 
ON cached_recommendations(expires_at) WHERE expires_at < NOW();

-- Recommendation analytics for A/B testing
CREATE TABLE IF NOT EXISTS recommendation_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  algorithm_version VARCHAR(20) NOT NULL,
  ab_test_group VARCHAR(20),
  total_recommendations INTEGER NOT NULL,
  clicked_recommendations INTEGER DEFAULT 0,
  applied_recommendations INTEGER DEFAULT 0,
  diversity_score DECIMAL(3,2),
  user_satisfaction_rating DECIMAL(3,2),
  session_duration_seconds INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_ab_test 
ON recommendation_analytics(ab_test_group, algorithm_version, timestamp);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_project_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own interactions" ON user_project_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_project_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_preference_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON recommendation_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON recommendation_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cached recommendations" ON cached_recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- Service role policies for ML operations
CREATE POLICY "Service role full access" ON project_features
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role performance access" ON ml_model_performance
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for recommendation system

-- Function to calculate project popularity score
CREATE OR REPLACE FUNCTION calculate_project_popularity(project_id_param INTEGER, days_param INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
  popularity_score DECIMAL;
BEGIN
  SELECT 
    COALESCE(
      SUM(
        CASE interaction_type
          WHEN 'view' THEN 1.0
          WHEN 'like' THEN 2.0
          WHEN 'bookmark' THEN 3.0
          WHEN 'share' THEN 4.0
          WHEN 'apply' THEN 5.0
          ELSE 0.0
        END * interaction_weight
      ) / GREATEST(1, EXTRACT(DAYS FROM (NOW() - MIN(timestamp)))),
      0.0
    ) INTO popularity_score
  FROM user_project_interactions
  WHERE project_id = project_id_param
    AND timestamp >= NOW() - INTERVAL '1 day' * days_param;
    
  RETURN LEAST(1.0, popularity_score / 100.0); -- Normalize to 0-1 scale
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user preferences based on interactions
CREATE OR REPLACE FUNCTION update_user_preferences(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pref_record RECORD;
BEGIN
  -- Calculate updated preferences based on recent interactions
  INSERT INTO user_preference_profiles (user_id, category_preferences, location_preferences, last_updated)
  SELECT 
    user_id_param,
    ARRAY(
      SELECT AVG(pf.category_vector[i])
      FROM user_project_interactions upi
      JOIN project_features pf ON upi.project_id = pf.project_id
      WHERE upi.user_id = user_id_param
        AND upi.timestamp >= NOW() - INTERVAL '30 days'
        AND upi.interaction_type IN ('like', 'bookmark', 'apply')
      GROUP BY i
      ORDER BY i
    ),
    ARRAY(
      SELECT AVG(pf.location_vector[i])
      FROM user_project_interactions upi
      JOIN project_features pf ON upi.project_id = pf.project_id
      WHERE upi.user_id = user_id_param
        AND upi.timestamp >= NOW() - INTERVAL '30 days'
        AND upi.interaction_type IN ('like', 'bookmark', 'apply')
      GROUP BY i
      ORDER BY i
    ),
    NOW()
  ON CONFLICT (user_id)
  DO UPDATE SET
    category_preferences = EXCLUDED.category_preferences,
    location_preferences = EXCLUDED.location_preferences,
    last_updated = EXCLUDED.last_updated;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired cached recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cached_recommendations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic updates

-- Update project features when project is modified
CREATE OR REPLACE FUNCTION update_project_features_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_features (project_id, last_updated)
  VALUES (NEW.id, NOW())
  ON CONFLICT (project_id)
  DO UPDATE SET last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if projects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    DROP TRIGGER IF EXISTS trigger_update_project_features ON projects;
    CREATE TRIGGER trigger_update_project_features
      AFTER INSERT OR UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_project_features_trigger();
  END IF;
END $$;

-- Scheduled cleanup job (run daily)
-- This would be set up as a cron job in production
COMMENT ON FUNCTION cleanup_expired_recommendations() IS 
'Run daily to clean up expired cached recommendations: SELECT cron.schedule(''cleanup-recommendations'', ''0 2 * * *'', ''SELECT cleanup_expired_recommendations();'');';

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_composite 
ON user_project_interactions(user_id, interaction_type, timestamp DESC, interaction_weight);

CREATE INDEX IF NOT EXISTS idx_project_features_similarity 
ON project_features USING GIN(feature_vector) WHERE feature_vector IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE user_project_interactions IS 'Tracks all user interactions with projects for recommendation learning';
COMMENT ON TABLE project_features IS 'Preprocessed feature vectors for projects used in ML algorithms';
COMMENT ON TABLE user_preference_profiles IS 'Learned user preferences from interaction history';
COMMENT ON TABLE recommendation_feedback IS 'User feedback on recommendations for model improvement';
COMMENT ON TABLE ml_model_performance IS 'Performance metrics for different recommendation models';
COMMENT ON TABLE cached_recommendations IS 'Cached recommendation results for performance optimization';
COMMENT ON TABLE recommendation_analytics IS 'Analytics data for A/B testing and system optimization';