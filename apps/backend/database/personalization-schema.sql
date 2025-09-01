/**
 * Personalization Database Schema - Tables for storing user preferences, behaviors, and A/B test data
 */

-- User Personalization Profiles
CREATE TABLE IF NOT EXISTS user_personalization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    preferences JSONB DEFAULT '{}',
    insights JSONB DEFAULT '{}',
    segments TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Behavior Tracking
CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'click', 'hover', 'scroll', 'focus', 'view', 'interaction', 'dwell'
    element VARCHAR(255) NOT NULL,
    element_id VARCHAR(255),
    element_type VARCHAR(100),
    context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test User Assignments
CREATE TABLE IF NOT EXISTS user_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    enrolled BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, test_name)
);

-- A/B Test Conversions
CREATE TABLE IF NOT EXISTS ab_test_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    value DECIMAL(10,4) DEFAULT 1.0,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Widget Preferences (for dashboard customization)
CREATE TABLE IF NOT EXISTS user_widget_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    widget_id VARCHAR(255) NOT NULL,
    widget_type VARCHAR(255) NOT NULL,
    position JSONB NOT NULL, -- { x, y, w, h }
    settings JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, widget_id)
);

-- Personalization Analytics Summary (for reporting)
CREATE TABLE IF NOT EXISTS personalization_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    average_session_duration DECIMAL(10,2) DEFAULT 0,
    top_elements JSONB DEFAULT '[]',
    engagement_score DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_timestamp ON user_behaviors(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_type ON user_behaviors(type);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_session ON user_behaviors(session_id);

CREATE INDEX IF NOT EXISTS idx_user_ab_tests_user_id ON user_ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ab_tests_test_name ON user_ab_tests(test_name);

CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_user_id ON ab_test_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_test_name ON ab_test_conversions(test_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_timestamp ON ab_test_conversions(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_widget_preferences_user_id ON user_widget_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_analytics_user_id ON personalization_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_analytics_date ON personalization_analytics(date);

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_personalization_profiles_updated_at 
    BEFORE UPDATE ON user_personalization_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_widget_preferences_updated_at 
    BEFORE UPDATE ON user_widget_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE user_personalization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_widget_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to access only their own data
CREATE POLICY IF NOT EXISTS "Users can access their own personalization profile"
    ON user_personalization_profiles FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

CREATE POLICY IF NOT EXISTS "Users can access their own behaviors"
    ON user_behaviors FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

CREATE POLICY IF NOT EXISTS "Users can access their own A/B test data"
    ON user_ab_tests FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

CREATE POLICY IF NOT EXISTS "Users can access their own conversion data"
    ON ab_test_conversions FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

CREATE POLICY IF NOT EXISTS "Users can access their own widget preferences"
    ON user_widget_preferences FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

CREATE POLICY IF NOT EXISTS "Users can access their own analytics"
    ON personalization_analytics FOR ALL
    USING (user_id = current_setting('request.jwt.claims.sub', true));

-- Functions for analytics and insights

-- Function to calculate daily engagement metrics
CREATE OR REPLACE FUNCTION calculate_daily_engagement(target_user_id VARCHAR, target_date DATE)
RETURNS TABLE(
    total_interactions INTEGER,
    session_count INTEGER,
    avg_session_duration DECIMAL,
    engagement_score DECIMAL
) AS $$
DECLARE
    interactions INTEGER;
    sessions INTEGER;
    avg_duration DECIMAL;
    score DECIMAL;
BEGIN
    -- Count total interactions for the day
    SELECT COUNT(*) INTO interactions
    FROM user_behaviors
    WHERE user_id = target_user_id
    AND timestamp::DATE = target_date;

    -- Count unique sessions
    SELECT COUNT(DISTINCT session_id) INTO sessions
    FROM user_behaviors
    WHERE user_id = target_user_id
    AND timestamp::DATE = target_date;

    -- Calculate average session duration (in minutes)
    WITH session_durations AS (
        SELECT 
            session_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 AS duration
        FROM user_behaviors
        WHERE user_id = target_user_id
        AND timestamp::DATE = target_date
        GROUP BY session_id
    )
    SELECT AVG(duration) INTO avg_duration FROM session_durations;

    -- Calculate engagement score (0-1 scale)
    score := LEAST(1.0, (interactions::DECIMAL / 100) * 0.7 + (sessions::DECIMAL / 10) * 0.3);

    RETURN QUERY SELECT interactions, sessions, COALESCE(avg_duration, 0), score;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's preferred widgets based on interaction data
CREATE OR REPLACE FUNCTION get_preferred_widgets(target_user_id VARCHAR, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    widget_type VARCHAR,
    interaction_count INTEGER,
    preference_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (context->>'widgetType')::VARCHAR as widget_type,
        COUNT(*)::INTEGER as interaction_count,
        (COUNT(*) / (SELECT COUNT(*) FROM user_behaviors WHERE user_id = target_user_id 
                    AND timestamp >= NOW() - INTERVAL '1 day' * days_back)::DECIMAL) as preference_score
    FROM user_behaviors
    WHERE user_id = target_user_id
    AND timestamp >= NOW() - INTERVAL '1 day' * days_back
    AND context ? 'widgetType'
    AND context->>'widgetType' IS NOT NULL
    GROUP BY context->>'widgetType'
    ORDER BY interaction_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_personalization_profiles IS 'Stores user personalization profiles including preferences and behavioral insights';
COMMENT ON TABLE user_behaviors IS 'Tracks all user interactions and behaviors for personalization learning';
COMMENT ON TABLE user_ab_tests IS 'Stores A/B test assignments for users';
COMMENT ON TABLE ab_test_conversions IS 'Tracks conversions and metrics for A/B tests';
COMMENT ON TABLE user_widget_preferences IS 'Stores user-specific widget configurations and preferences';
COMMENT ON TABLE personalization_analytics IS 'Daily aggregated analytics for personalization insights';

COMMENT ON FUNCTION calculate_daily_engagement IS 'Calculates engagement metrics for a specific user and date';
COMMENT ON FUNCTION get_preferred_widgets IS 'Returns user's preferred widgets based on interaction history';