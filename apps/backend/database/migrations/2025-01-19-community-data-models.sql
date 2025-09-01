-- Community Data Models Enhancement Migration
-- Comprehensive PostgreSQL schemas for user preferences, project outcomes, and event tracking

-- =============================================
-- USER PREFERENCES AND PERSONALIZATION
-- =============================================

-- User profiles with comprehensive preference tracking
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL, -- Reference to auth.users or external auth system
    email TEXT UNIQUE,
    
    -- Basic profile information
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location JSONB, -- {"city": "Melbourne", "state": "VIC", "country": "Australia", "timezone": "Australia/Melbourne"}
    
    -- Preference categories
    interests JSONB DEFAULT '[]', -- ["environmental_justice", "indigenous_rights", "community_development"]
    expertise_areas JSONB DEFAULT '[]', -- ["data_analysis", "community_engagement", "grant_writing"]
    collaboration_preferences JSONB DEFAULT '{}', -- {"communication": "slack", "meeting_style": "virtual", "availability": "weekends"}
    
    -- Content and dashboard preferences
    dashboard_layout JSONB DEFAULT '{}', -- Custom dashboard configuration
    content_preferences JSONB DEFAULT '{}', -- {"story_types": ["impact", "innovation"], "update_frequency": "weekly"}
    notification_preferences JSONB DEFAULT '{}', -- {"email": true, "push": false, "sms": false, "frequency": "daily"}
    privacy_settings JSONB DEFAULT '{}', -- {"profile_visibility": "community", "data_sharing": "opt_in"}
    
    -- Engagement tracking
    preferred_languages JSONB DEFAULT '["en"]',
    accessibility_needs JSONB DEFAULT '{}', -- {"screen_reader": false, "high_contrast": true, "large_text": false}
    cultural_protocols JSONB DEFAULT '{}', -- {"indigenous_acknowledgment": true, "cultural_sensitivity": "high"}
    
    -- Activity metadata
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    account_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'deleted'
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_account_status CHECK (account_status IN ('active', 'inactive', 'suspended', 'deleted'))
);

-- User interaction preferences with projects and communities
CREATE TABLE IF NOT EXISTS user_project_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Preference details
    preference_type TEXT NOT NULL, -- 'follow', 'collaborate', 'bookmark', 'hide'
    engagement_level TEXT DEFAULT 'observer', -- 'observer', 'participant', 'contributor', 'leader'
    notification_enabled BOOLEAN DEFAULT TRUE,
    collaboration_interest JSONB DEFAULT '{}', -- {"skills_offered": [], "time_commitment": "1-2 hours/week"}
    
    -- Preference metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate preferences
    UNIQUE(user_profile_id, project_id, preference_type)
);

-- Community engagement preferences
CREATE TABLE IF NOT EXISTS user_community_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Engagement preferences
    participation_style JSONB DEFAULT '{}', -- {"meeting_preference": "virtual", "contribution_type": "technical"}
    skill_sharing_preferences JSONB DEFAULT '{}', -- {"mentoring": true, "workshops": false, "one_on_one": true}
    availability JSONB DEFAULT '{}', -- {"days": ["monday", "wednesday"], "times": ["evening"], "timezone": "Australia/Melbourne"}
    
    -- Community contribution tracking
    contribution_areas JSONB DEFAULT '[]', -- ["content_creation", "event_planning", "technical_support"]
    leadership_interests JSONB DEFAULT '[]', -- ["project_management", "community_coordination"]
    
    -- Cultural and ethical preferences
    cultural_considerations JSONB DEFAULT '{}', -- Indigenous protocols, religious considerations
    ethical_guidelines JSONB DEFAULT '{}', -- Personal ethical boundaries and values
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROJECT OUTCOMES AND IMPACT TRACKING
-- =============================================

-- Comprehensive project outcomes tracking
CREATE TABLE IF NOT EXISTS project_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Outcome identification
    outcome_type TEXT NOT NULL, -- 'social_impact', 'environmental_benefit', 'economic_development', 'cultural_preservation'
    outcome_category TEXT NOT NULL, -- 'quantitative', 'qualitative', 'narrative', 'mixed'
    title TEXT NOT NULL,
    description TEXT,
    
    -- Measurement data
    baseline_data JSONB DEFAULT '{}', -- Initial state measurements
    target_metrics JSONB DEFAULT '{}', -- Target goals and KPIs
    current_metrics JSONB DEFAULT '{}', -- Current progress measurements
    final_metrics JSONB DEFAULT '{}', -- Final outcome measurements
    
    -- Impact assessment
    direct_beneficiaries JSONB DEFAULT '{}', -- {"count": 500, "demographics": {...}, "communities": [...]}
    indirect_beneficiaries JSONB DEFAULT '{}', -- Wider community impact
    geographic_impact JSONB DEFAULT '{}', -- Geographic scope and location data
    temporal_impact JSONB DEFAULT '{}', -- {"short_term": {...}, "medium_term": {...}, "long_term": {...}}
    
    -- Validation and verification
    measurement_methodology TEXT,
    data_sources JSONB DEFAULT '[]', -- Sources of outcome data
    verification_status TEXT DEFAULT 'unverified', -- 'unverified', 'in_review', 'verified', 'disputed'
    verified_by UUID, -- Reference to verifying user/organization
    verification_notes TEXT,
    verification_date TIMESTAMPTZ,
    
    -- Attribution and collaboration
    contributing_organizations JSONB DEFAULT '[]', -- Organizations that contributed to outcome
    community_attribution JSONB DEFAULT '{}', -- Community-level attribution
    individual_attribution JSONB DEFAULT '[]', -- Individual contributor attribution
    
    -- Reporting and communication
    report_url TEXT, -- Link to detailed outcome report
    media_assets JSONB DEFAULT '[]', -- Photos, videos, documents related to outcome
    public_visibility BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    
    -- Timeline tracking
    outcome_period_start DATE,
    outcome_period_end DATE,
    measurement_frequency TEXT DEFAULT 'milestone', -- 'continuous', 'weekly', 'monthly', 'milestone', 'final'
    
    -- Status tracking
    status TEXT DEFAULT 'in_progress', -- 'planned', 'in_progress', 'achieved', 'exceeded', 'partially_achieved', 'not_achieved'
    confidence_level TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reported_by UUID, -- User who reported this outcome
    
    -- Constraints
    CONSTRAINT valid_outcome_category CHECK (outcome_category IN ('quantitative', 'qualitative', 'narrative', 'mixed')),
    CONSTRAINT valid_verification_status CHECK (verification_status IN ('unverified', 'in_review', 'verified', 'disputed')),
    CONSTRAINT valid_status CHECK (status IN ('planned', 'in_progress', 'achieved', 'exceeded', 'partially_achieved', 'not_achieved')),
    CONSTRAINT valid_confidence CHECK (confidence_level IN ('high', 'medium', 'low'))
);

-- Project outcome updates and timeline tracking
CREATE TABLE IF NOT EXISTS project_outcome_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_outcome_id UUID NOT NULL REFERENCES project_outcomes(id) ON DELETE CASCADE,
    
    -- Update details
    update_type TEXT NOT NULL, -- 'measurement', 'milestone', 'correction', 'verification', 'final'
    title TEXT NOT NULL,
    description TEXT,
    
    -- Data updates
    metric_updates JSONB DEFAULT '{}', -- New or updated metric values
    evidence_data JSONB DEFAULT '{}', -- Supporting evidence for the update
    attachments JSONB DEFAULT '[]', -- Files, images, documents
    
    -- Context and attribution
    reported_by UUID NOT NULL, -- User reporting the update
    data_collection_method TEXT,
    validation_notes TEXT,
    
    -- Timeline
    report_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_update_type CHECK (update_type IN ('measurement', 'milestone', 'correction', 'verification', 'final'))
);

-- Project collaboration and contribution tracking
CREATE TABLE IF NOT EXISTS project_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contributor_id UUID, -- User or organization ID
    contributor_type TEXT NOT NULL, -- 'individual', 'organization', 'community', 'anonymous'
    
    -- Contribution details
    contribution_type TEXT NOT NULL, -- 'time', 'expertise', 'funding', 'resources', 'advocacy', 'story'
    contribution_description TEXT,
    contribution_value JSONB DEFAULT '{}', -- {"hours": 40, "monetary_value": 1000, "skill_level": "expert"}
    
    -- Skills and expertise contributed
    skills_contributed JSONB DEFAULT '[]',
    expertise_areas JSONB DEFAULT '[]',
    
    -- Impact and outcomes linked to contribution
    linked_outcomes JSONB DEFAULT '[]', -- Array of outcome IDs this contribution impacted
    impact_description TEXT,
    
    -- Recognition and attribution
    public_recognition BOOLEAN DEFAULT FALSE,
    attribution_preferences JSONB DEFAULT '{}', -- How contributor wants to be recognized
    
    -- Timeline
    contribution_start_date DATE,
    contribution_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_contributor_type CHECK (contributor_type IN ('individual', 'organization', 'community', 'anonymous')),
    CONSTRAINT valid_contribution_type CHECK (contribution_type IN ('time', 'expertise', 'funding', 'resources', 'advocacy', 'story'))
);

-- =============================================
-- EVENT TRACKING AND ANALYTICS
-- =============================================

-- Comprehensive event tracking for analytics and insights
CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type TEXT NOT NULL, -- 'user_action', 'system_event', 'milestone', 'external_integration'
    event_category TEXT NOT NULL, -- 'engagement', 'content', 'collaboration', 'impact', 'technical'
    event_name TEXT NOT NULL, -- 'story_view', 'project_bookmark', 'outcome_report', 'user_signup'
    
    -- Event context
    user_id UUID, -- User who triggered the event (nullable for system events)
    session_id TEXT, -- User session identifier
    user_agent TEXT, -- Browser/device information
    ip_address INET, -- User IP for analytics
    
    -- Related entities
    project_id UUID REFERENCES projects(id),
    story_id UUID REFERENCES stories(id),
    outcome_id UUID REFERENCES project_outcomes(id),
    community_id UUID, -- Reference to community if applicable
    
    -- Event data
    event_properties JSONB DEFAULT '{}', -- Flexible event-specific data
    event_metadata JSONB DEFAULT '{}', -- Technical metadata
    
    -- Analytics dimensions
    geographic_data JSONB DEFAULT '{}', -- Location information where available
    device_data JSONB DEFAULT '{}', -- Device and browser information
    referrer_data JSONB DEFAULT '{}', -- How user arrived at the event
    
    -- Business intelligence
    conversion_funnel_stage TEXT, -- For tracking user journey
    engagement_score DECIMAL DEFAULT 0, -- Calculated engagement value
    business_value JSONB DEFAULT '{}', -- Business intelligence metrics
    
    -- Timeline and session tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ DEFAULT NOW(), -- When event actually occurred
    session_start_time TIMESTAMPTZ,
    time_on_page INTEGER, -- Seconds spent on page
    
    -- Privacy and consent
    data_retention_policy TEXT DEFAULT 'standard', -- 'minimal', 'standard', 'extended'
    anonymized BOOLEAN DEFAULT FALSE,
    consent_level TEXT DEFAULT 'basic', -- 'basic', 'analytics', 'personalization', 'marketing'
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN ('user_action', 'system_event', 'milestone', 'external_integration')),
    CONSTRAINT valid_event_category CHECK (event_category IN ('engagement', 'content', 'collaboration', 'impact', 'technical')),
    CONSTRAINT valid_consent_level CHECK (consent_level IN ('basic', 'analytics', 'personalization', 'marketing'))
);

-- User behavior patterns and insights
CREATE TABLE IF NOT EXISTS user_behavior_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Behavior analysis
    engagement_patterns JSONB DEFAULT '{}', -- Daily/weekly/monthly engagement patterns
    content_preferences JSONB DEFAULT '{}', -- Preferred content types and topics
    collaboration_patterns JSONB DEFAULT '{}', -- How user collaborates with others
    platform_usage_patterns JSONB DEFAULT '{}', -- Feature usage and navigation patterns
    
    -- Predictive insights
    predicted_interests JSONB DEFAULT '[]', -- AI-predicted interests based on behavior
    recommended_projects JSONB DEFAULT '[]', -- Project recommendations
    collaboration_matches JSONB DEFAULT '[]', -- Potential collaboration partners
    
    -- Engagement metrics
    total_session_time INTEGER DEFAULT 0, -- Total time spent on platform
    average_session_duration INTEGER DEFAULT 0,
    page_views_total INTEGER DEFAULT 0,
    content_interactions_total INTEGER DEFAULT 0,
    collaboration_initiated INTEGER DEFAULT 0,
    
    -- Calculated scores
    engagement_score DECIMAL DEFAULT 0, -- Overall platform engagement
    community_contribution_score DECIMAL DEFAULT 0,
    content_quality_score DECIMAL DEFAULT 0,
    collaboration_effectiveness_score DECIMAL DEFAULT 0,
    
    -- Analysis metadata
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_version TEXT DEFAULT '1.0', -- Version of algorithm used
    
    -- Privacy controls
    insights_consent BOOLEAN DEFAULT FALSE,
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for user per period
    UNIQUE(user_id, analysis_period_start, analysis_period_end)
);

-- Community health metrics and analytics
CREATE TABLE IF NOT EXISTS community_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID, -- NULL for platform-wide metrics
    
    -- Engagement metrics
    active_users_daily INTEGER DEFAULT 0,
    active_users_weekly INTEGER DEFAULT 0,
    active_users_monthly INTEGER DEFAULT 0,
    new_user_registrations INTEGER DEFAULT 0,
    user_retention_rate DECIMAL DEFAULT 0,
    
    -- Content metrics
    stories_published INTEGER DEFAULT 0,
    project_updates_posted INTEGER DEFAULT 0,
    outcomes_reported INTEGER DEFAULT 0,
    community_interactions INTEGER DEFAULT 0,
    
    -- Collaboration metrics
    new_collaborations INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    cross_community_collaborations INTEGER DEFAULT 0,
    
    -- Impact metrics
    total_beneficiaries INTEGER DEFAULT 0,
    verified_outcomes INTEGER DEFAULT 0,
    community_value_generated DECIMAL DEFAULT 0,
    cultural_knowledge_preserved INTEGER DEFAULT 0,
    
    -- Health indicators
    diversity_index DECIMAL DEFAULT 0, -- Measure of community diversity
    inclusion_score DECIMAL DEFAULT 0, -- Calculated inclusion metrics
    sustainability_index DECIMAL DEFAULT 0, -- Long-term sustainability indicators
    innovation_rate DECIMAL DEFAULT 0, -- Rate of new ideas and innovations
    
    -- Quality metrics
    content_quality_average DECIMAL DEFAULT 0,
    user_satisfaction_score DECIMAL DEFAULT 0,
    platform_reliability_score DECIMAL DEFAULT 0,
    
    -- Time period
    metric_date DATE NOT NULL,
    metric_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    
    -- Calculation metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_method TEXT,
    data_completeness_score DECIMAL DEFAULT 1.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_metric_period CHECK (metric_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
    UNIQUE(community_id, metric_date, metric_period)
);

-- =============================================
-- ADVANCED ANALYTICS AND REPORTING
-- =============================================

-- Data quality and completeness tracking
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    
    -- Quality metrics
    total_records INTEGER NOT NULL DEFAULT 0,
    complete_records INTEGER NOT NULL DEFAULT 0,
    incomplete_records INTEGER NOT NULL DEFAULT 0,
    duplicate_records INTEGER NOT NULL DEFAULT 0,
    invalid_records INTEGER NOT NULL DEFAULT 0,
    
    -- Completeness by critical fields
    field_completeness JSONB DEFAULT '{}', -- {"email": 0.95, "location": 0.78}
    data_freshness_score DECIMAL DEFAULT 0, -- How recent the data is
    accuracy_score DECIMAL DEFAULT 0, -- Estimated accuracy
    consistency_score DECIMAL DEFAULT 0, -- Internal consistency
    
    -- Quality thresholds
    quality_score DECIMAL DEFAULT 0, -- Overall quality score (0-1)
    quality_threshold_met BOOLEAN DEFAULT FALSE,
    quality_issues JSONB DEFAULT '[]', -- Array of identified issues
    
    -- Analysis metadata
    analysis_date DATE NOT NULL,
    analysis_run_id UUID DEFAULT gen_random_uuid(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(table_name, analysis_date)
);

-- Automated insights and recommendations
CREATE TABLE IF NOT EXISTS automated_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Insight classification
    insight_type TEXT NOT NULL, -- 'trend', 'anomaly', 'opportunity', 'recommendation', 'warning'
    insight_category TEXT NOT NULL, -- 'engagement', 'content', 'collaboration', 'impact', 'technical'
    priority_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Insight content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detailed_analysis JSONB DEFAULT '{}',
    
    -- Supporting data
    data_sources JSONB DEFAULT '[]', -- Tables/sources used for insight
    evidence_data JSONB DEFAULT '{}', -- Supporting metrics and evidence
    confidence_score DECIMAL DEFAULT 0, -- AI confidence in insight (0-1)
    
    -- Recommendations
    recommended_actions JSONB DEFAULT '[]', -- Suggested actions
    expected_impact JSONB DEFAULT '{}', -- Predicted impact of recommendations
    implementation_complexity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Targeting
    target_audience JSONB DEFAULT '[]', -- Who should see this insight
    relevant_projects JSONB DEFAULT '[]', -- Relevant project IDs
    relevant_communities JSONB DEFAULT '[]', -- Relevant community IDs
    
    -- Lifecycle management
    status TEXT DEFAULT 'active', -- 'active', 'implemented', 'dismissed', 'expired'
    expires_at TIMESTAMPTZ,
    implemented_at TIMESTAMPTZ,
    implementation_notes TEXT,
    
    -- AI and algorithm tracking
    generated_by TEXT NOT NULL, -- Algorithm or model that generated insight
    model_version TEXT,
    generation_timestamp TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_insight_type CHECK (insight_type IN ('trend', 'anomaly', 'opportunity', 'recommendation', 'warning')),
    CONSTRAINT valid_priority CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_implementation_complexity CHECK (implementation_complexity IN ('low', 'medium', 'high')),
    CONSTRAINT valid_insight_status CHECK (status IN ('active', 'implemented', 'dismissed', 'expired'))
);

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(account_status, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIN(location);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user ON user_project_preferences(user_profile_id, preference_type);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_project ON user_project_preferences(project_id, engagement_level);

-- Project outcomes indexes
CREATE INDEX IF NOT EXISTS idx_project_outcomes_project ON project_outcomes(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_type ON project_outcomes(outcome_type, verification_status);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_timeline ON project_outcomes(outcome_period_start, outcome_period_end);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_verification ON project_outcomes(verification_status, verification_date);

-- Event tracking indexes
CREATE INDEX IF NOT EXISTS idx_community_events_user_time ON community_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_type_category ON community_events(event_type, event_category);
CREATE INDEX IF NOT EXISTS idx_community_events_project ON community_events(project_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_session ON community_events(session_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_community_events_properties ON community_events USING GIN(event_properties);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_insights_user ON user_behavior_insights(user_id, analysis_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_community_health_metrics_date ON community_health_metrics(community_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_date ON data_quality_metrics(table_name, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_automated_insights_priority ON automated_insights(priority_level, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automated_insights_category ON automated_insights(insight_category, insight_type);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_project_preferences_updated_at BEFORE UPDATE ON user_project_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_community_engagement_updated_at BEFORE UPDATE ON user_community_engagement FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_outcomes_updated_at BEFORE UPDATE ON project_outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_behavior_insights_updated_at BEFORE UPDATE ON user_behavior_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automated_insights_updated_at BEFORE UPDATE ON automated_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    session_time INTEGER,
    page_views INTEGER,
    interactions INTEGER,
    collaborations INTEGER
)
RETURNS DECIMAL AS $$
BEGIN
    -- Weighted engagement score calculation
    RETURN (
        (session_time * 0.3) + 
        (page_views * 0.2) + 
        (interactions * 0.3) + 
        (collaborations * 0.2)
    ) / 100.0; -- Normalize to 0-1 scale
END;
$$ LANGUAGE plpgsql;

-- Function to update user last active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET last_active_at = NOW() 
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last active on event creation
CREATE TRIGGER update_last_active_on_event
    AFTER INSERT ON community_events
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION update_user_last_active();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_community_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_outcome_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_insights ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can only access their own profile
CREATE POLICY user_profiles_own_data ON user_profiles
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Service role can access all data
CREATE POLICY user_profiles_service_role ON user_profiles
    FOR ALL TO service_role USING (true);

-- Project outcomes: Public read, authenticated write with attribution
CREATE POLICY project_outcomes_public_read ON project_outcomes
    FOR SELECT USING (public_visibility = true);

CREATE POLICY project_outcomes_auth_write ON project_outcomes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Community events: Users can only see their own events, service role sees all
CREATE POLICY community_events_own_data ON community_events
    FOR ALL USING (
        auth.uid()::text = user_id::text OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Analytics tables: Restricted to authenticated users with proper roles
CREATE POLICY community_health_metrics_authenticated ON community_health_metrics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY automated_insights_authenticated ON automated_insights
    FOR SELECT TO authenticated USING (true);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- User dashboard summary view
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    up.id as user_profile_id,
    up.user_id,
    up.display_name,
    up.location,
    up.interests,
    COUNT(DISTINCT upp.project_id) as followed_projects,
    COUNT(DISTINCT pc.project_id) as contributed_projects,
    COALESCE(ubi.engagement_score, 0) as engagement_score,
    up.last_active_at,
    up.onboarding_completed
FROM user_profiles up
LEFT JOIN user_project_preferences upp ON up.id = upp.user_profile_id AND upp.preference_type = 'follow'
LEFT JOIN project_contributions pc ON up.user_id::text = pc.contributor_id::text
LEFT JOIN user_behavior_insights ubi ON up.user_id = ubi.user_id 
    AND ubi.analysis_period_end = (
        SELECT MAX(analysis_period_end) 
        FROM user_behavior_insights 
        WHERE user_id = up.user_id
    )
GROUP BY up.id, up.user_id, up.display_name, up.location, up.interests, 
         ubi.engagement_score, up.last_active_at, up.onboarding_completed;

-- Project impact summary view  
CREATE OR REPLACE VIEW project_impact_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    COUNT(DISTINCT po.id) as total_outcomes,
    COUNT(DISTINCT po.id) FILTER (WHERE po.verification_status = 'verified') as verified_outcomes,
    COUNT(DISTINCT pc.id) as total_contributions,
    COUNT(DISTINCT pc.contributor_id) as unique_contributors,
    COALESCE(SUM((po.current_metrics->>'beneficiaries')::integer), 0) as total_beneficiaries,
    MAX(po.updated_at) as last_outcome_update
FROM projects p
LEFT JOIN project_outcomes po ON p.id = po.project_id
LEFT JOIN project_contributions pc ON p.id = pc.project_id
GROUP BY p.id, p.name, p.status;

-- Community engagement overview
CREATE OR REPLACE VIEW community_engagement_overview AS
SELECT 
    DATE_TRUNC('week', ce.created_at) as week,
    ce.event_category,
    COUNT(*) as event_count,
    COUNT(DISTINCT ce.user_id) as unique_users,
    AVG(ce.engagement_score) as avg_engagement_score,
    COUNT(*) FILTER (WHERE ce.event_type = 'user_action') as user_actions,
    COUNT(*) FILTER (WHERE ce.event_type = 'milestone') as milestones_reached
FROM community_events ce
WHERE ce.created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', ce.created_at), ce.event_category
ORDER BY week DESC, event_count DESC;

COMMENT ON TABLE user_profiles IS 'Comprehensive user profiles with preferences and personalization data';
COMMENT ON TABLE project_outcomes IS 'Detailed tracking of project outcomes and impact metrics';
COMMENT ON TABLE community_events IS 'Event tracking for analytics and user behavior insights';
COMMENT ON TABLE user_behavior_insights IS 'AI-generated insights about user behavior patterns';
COMMENT ON TABLE community_health_metrics IS 'Community health and engagement metrics over time';
COMMENT ON TABLE automated_insights IS 'AI-generated insights and recommendations for the platform';