-- ACT Unified Ecosystem - Final Components
-- Migration: Health monitoring, consent management, triggers, and views

-- ========================================
-- ENHANCED EMPATHY LEDGER SYSTEM
-- ========================================

-- Extend existing stories table for ecosystem integration
ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
    value_contribution_score DECIMAL DEFAULT 0;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
    economic_impact_tracked BOOLEAN DEFAULT false;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
    profit_sharing_eligible BOOLEAN DEFAULT false;

-- Dynamic consent management - tracks evolving consent preferences
CREATE TABLE IF NOT EXISTS dynamic_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storyteller_id UUID NOT NULL,
    story_id UUID REFERENCES stories(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Consent details
    consent_type TEXT NOT NULL, -- 'story_sharing', 'data_analysis', 'profit_sharing', 'cultural_use'
    consent_granted BOOLEAN NOT NULL,
    consent_conditions JSONB DEFAULT '{}', -- Specific conditions for consent
    
    -- Cultural protocols
    cultural_consultation_required BOOLEAN DEFAULT false,
    cultural_consultation_completed BOOLEAN DEFAULT false,
    elder_approval_required BOOLEAN DEFAULT false,
    elder_approval_granted BOOLEAN DEFAULT false,
    
    -- Consent lifecycle
    consent_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    consent_last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consent_withdrawal_requested BOOLEAN DEFAULT false,
    
    -- Audit trail
    consent_change_history JSONB DEFAULT '[]',
    consent_verification_method TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Component health tracking - monitors individual system health
CREATE TABLE IF NOT EXISTS component_health_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Component identification
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL, -- 'service', 'api', 'database', 'integration'
    component_version TEXT,
    
    -- Health metrics
    health_score DECIMAL NOT NULL CHECK (health_score >= 0 AND health_score <= 1),
    operational_status TEXT NOT NULL, -- 'operational', 'degraded', 'error', 'offline'
    response_time_ms INTEGER,
    error_rate DECIMAL DEFAULT 0,
    
    -- Detailed metrics
    performance_metrics JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    resource_utilization JSONB DEFAULT '{}',
    
    -- Health assessment
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consecutive_failures INTEGER DEFAULT 0,
    auto_healing_attempted BOOLEAN DEFAULT false,
    auto_healing_successful BOOLEAN DEFAULT false,
    
    -- Dependencies
    depends_on JSONB DEFAULT '[]', -- Other components this depends on
    critical_for_ecosystem BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

-- Consent management indexes
CREATE INDEX IF NOT EXISTS idx_consent_storyteller_type 
    ON dynamic_consent_records(storyteller_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_community_story 
    ON dynamic_consent_records(community_id, story_id);

CREATE INDEX IF NOT EXISTS idx_component_health_name_date 
    ON component_health_tracking(component_name, last_health_check DESC);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS
ALTER TABLE dynamic_consent_records ENABLE ROW LEVEL SECURITY;

-- Consent access policies
CREATE POLICY community_consent_policy ON dynamic_consent_records
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'storyteller_id' = storyteller_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

-- ========================================
-- TRIGGERS FOR AUTOMATION
-- ========================================

-- Trigger for automatic value attribution when value events are created
CREATE OR REPLACE FUNCTION trigger_value_attribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue sync operation for value attribution
    INSERT INTO data_sync_queue (
        entity_type,
        entity_id,
        community_id,
        operation_type,
        sync_priority,
        sync_data,
        target_systems
    ) VALUES (
        'value_event',
        NEW.id,
        NEW.community_id,
        'create',
        1, -- High priority
        jsonb_build_object(
            'total_value', NEW.total_value_generated,
            'community_benefit', NEW.total_value_generated * 0.40
        ),
        '["profit_distribution", "governance_system"]'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER value_event_attribution_trigger
    AFTER INSERT ON value_generation_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_value_attribution();

-- Trigger for governance decision implementation
CREATE OR REPLACE FUNCTION trigger_governance_implementation()
RETURNS TRIGGER AS $$
BEGIN
    -- When decision is approved, queue implementation
    IF NEW.decision_outcome = 'approved' AND OLD.decision_outcome != 'approved' THEN
        INSERT INTO data_sync_queue (
            entity_type,
            entity_id,
            community_id,
            operation_type,
            sync_priority,
            sync_data,
            target_systems
        ) VALUES (
            'governance_decision',
            NEW.id,
            NEW.community_id,
            'implement',
            2, -- High priority
            jsonb_build_object(
                'decision_type', NEW.decision_type,
                'implementation_plan', NEW.implementation_plan
            ),
            '["profit_distribution", "community_management"]'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER governance_implementation_trigger
    AFTER UPDATE ON governance_decisions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_governance_implementation();

-- ========================================
-- VIEWS FOR EASY DATA ACCESS
-- ========================================

-- Community dashboard view - simplified data for frontend
CREATE OR REPLACE VIEW community_dashboard_view AS
SELECT 
    c.id as community_id,
    c.name as community_name,
    c.slug,
    c.description,
    
    -- Community metrics
    COUNT(DISTINCT s.id) as total_stories,
    COUNT(DISTINCT s.id) FILTER (WHERE s.consent_verified = true) as verified_stories,
    COUNT(DISTINCT vge.id) as value_generation_events,
    COALESCE(SUM(vge.total_value_generated), 0) as total_value_generated,
    COALESCE(SUM(vge.total_value_generated * 0.40), 0) as community_benefits_amount,
    
    -- Governance activity
    COUNT(DISTINCT gd.id) as governance_decisions,
    COUNT(DISTINCT gd.id) FILTER (WHERE gd.decision_status = 'decided') as completed_decisions,
    AVG(gd.participation_rate) as avg_participation_rate,
    
    -- Health and activity
    c.community_ownership_verified,
    c.benefit_sharing_percentage,
    c.onboarding_completed,
    c.updated_at as last_activity

FROM communities c
LEFT JOIN stories s ON s.community_id = c.id
LEFT JOIN value_generation_events vge ON vge.community_id = c.id
LEFT JOIN governance_decisions gd ON gd.community_id = c.id
GROUP BY c.id, c.name, c.slug, c.description, c.community_ownership_verified, 
         c.benefit_sharing_percentage, c.onboarding_completed, c.updated_at;

-- Ecosystem health view - system health overview
CREATE OR REPLACE VIEW ecosystem_health_view AS
SELECT 
    COUNT(DISTINCT eso.id) as total_sync_operations,
    COUNT(DISTINCT eso.id) FILTER (WHERE eso.sync_status = 'completed') as successful_syncs,
    AVG(eso.sync_duration_ms) as avg_sync_duration,
    
    -- Component health
    COUNT(DISTINCT cht.component_name) as monitored_components,
    COUNT(DISTINCT cht.component_name) FILTER (WHERE cht.operational_status = 'operational') as operational_components,
    AVG(cht.health_score) as avg_health_score,
    
    -- Recent activity
    COUNT(DISTINCT vge.id) FILTER (WHERE vge.created_at > NOW() - INTERVAL '24 hours') as value_events_24h,
    COUNT(DISTINCT gd.id) FILTER (WHERE gd.created_at > NOW() - INTERVAL '7 days') as governance_decisions_7d,
    COUNT(DISTINCT pp.id) FILTER (WHERE pp.created_at > NOW() - INTERVAL '30 days') as profit_payments_30d,
    
    -- System status
    CASE 
        WHEN COUNT(DISTINCT cht.component_name) FILTER (WHERE cht.operational_status = 'operational') = 
             COUNT(DISTINCT cht.component_name) THEN 'all_systems_operational'
        WHEN AVG(cht.health_score) > 0.8 THEN 'healthy'
        WHEN AVG(cht.health_score) > 0.6 THEN 'fair'
        ELSE 'needs_attention'
    END as overall_status

FROM ecosystem_sync_operations eso
CROSS JOIN component_health_tracking cht
LEFT JOIN value_generation_events vge ON true
LEFT JOIN governance_decisions gd ON true  
LEFT JOIN profit_payments pp ON true
WHERE cht.last_health_check > NOW() - INTERVAL '1 hour'; -- Only recent health data

-- Function to check ecosystem health
CREATE OR REPLACE FUNCTION check_ecosystem_health()
RETURNS TABLE(
    overall_health DECIMAL,
    operational_components INTEGER,
    total_components INTEGER,
    health_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(health_score) as overall_health,
        COUNT(*) FILTER (WHERE operational_status = 'operational')::INTEGER as operational_components,
        COUNT(*)::INTEGER as total_components,
        CASE 
            WHEN COUNT(*) FILTER (WHERE operational_status = 'operational') = COUNT(*) THEN 'excellent'
            WHEN AVG(health_score) > 0.8 THEN 'good'
            WHEN AVG(health_score) > 0.6 THEN 'fair'
            ELSE 'needs_attention'
        END as health_status
    FROM component_health_tracking
    WHERE last_health_check > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic_consent_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON component_health_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION check_ecosystem_health TO authenticated;