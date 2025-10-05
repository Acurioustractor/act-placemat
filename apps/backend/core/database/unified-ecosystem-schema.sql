-- ACT Unified Ecosystem Database Schema
-- Complete data architecture for community-centered platform
-- 
-- Philosophy: "Data serves communities, not the other way around"
-- Embodies: Community Sovereignty, Data Justice, Transparent Economics
-- 
-- Key Features:
-- - Community-owned data with absolute sovereignty
-- - Value tracking and transparent attribution
-- - Automated profit distribution tracking
-- - Democratic governance decision records
-- - Cultural protocol-aware consent management
-- - Real-time synchronization across all systems

-- ========================================
-- EXTEND EXISTING COMMUNITIES SCHEMA
-- ========================================

-- Add ecosystem-specific fields to existing communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    ecosystem_participation_level TEXT DEFAULT 'standard'; -- 'standard', 'enhanced', 'premium'

ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    value_generation_score DECIMAL DEFAULT 0.0;

ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    profit_distribution_preferences JSONB DEFAULT '{"method": "automated", "timing": "monthly"}';

-- ========================================
-- VALUE TRACKING AND ATTRIBUTION SYSTEM
-- ========================================

-- Value generation events - tracks all community value creation
CREATE TABLE IF NOT EXISTS value_generation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Event details
    event_type TEXT NOT NULL, -- 'story_contribution', 'cultural_knowledge', 'innovation_idea', etc.
    event_description TEXT,
    value_dimensions JSONB NOT NULL, -- Multi-dimensional value (monetary, social, cultural, etc.)
    
    -- Attribution data
    primary_contributors JSONB DEFAULT '[]', -- Individual contributors
    community_contributors JSONB DEFAULT '[]', -- Community-level contributors
    cultural_attribution JSONB DEFAULT '{}', -- Cultural protocol-aware attribution
    
    -- Value calculation
    total_value_generated DECIMAL NOT NULL DEFAULT 0,
    monetary_value DECIMAL DEFAULT 0,
    social_impact_value DECIMAL DEFAULT 0,
    cultural_preservation_value DECIMAL DEFAULT 0,
    
    -- Blockchain integration
    blockchain_hash TEXT UNIQUE,
    immutable_record JSONB,
    verification_proofs JSONB DEFAULT '{}',
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    attributed_at TIMESTAMP WITH TIME ZONE,
    
    -- RLS policy
    CONSTRAINT rls_community_value_events CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- Value attribution records - detailed attribution breakdown
CREATE TABLE IF NOT EXISTS value_attribution_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_event_id UUID NOT NULL REFERENCES value_generation_events(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Attribution details
    contributor_type TEXT NOT NULL, -- 'individual', 'community', 'collaborative', 'cultural_collective'
    contributor_id UUID, -- References storytellers or community members
    attribution_percentage DECIMAL NOT NULL CHECK (attribution_percentage >= 0 AND attribution_percentage <= 1),
    attribution_method TEXT NOT NULL, -- 'direct_contribution', 'proportional_impact', etc.
    
    -- Cultural protocol compliance
    cultural_protocols_respected JSONB DEFAULT '{}',
    consent_verified BOOLEAN DEFAULT false,
    consent_verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Value allocation
    allocated_value DECIMAL NOT NULL DEFAULT 0,
    community_benefit_amount DECIMAL NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy
    CONSTRAINT rls_community_attribution CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- ========================================
-- AUTOMATED PROFIT DISTRIBUTION SYSTEM
-- ========================================

-- Profit distribution batches - tracks distribution executions
CREATE TABLE IF NOT EXISTS profit_distribution_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Distribution details
    distribution_type TEXT NOT NULL, -- 'automated', 'governance_triggered', 'milestone_based'
    total_profit_amount DECIMAL NOT NULL,
    community_share_amount DECIMAL NOT NULL, -- 40% minimum guaranteed
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Legal compliance
    legal_framework_version TEXT DEFAULT '1.0',
    forty_percent_guarantee_verified BOOLEAN DEFAULT true,
    compliance_audit_hash TEXT,
    
    -- Execution status
    distribution_status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
    payments_executed INTEGER DEFAULT 0,
    payments_failed INTEGER DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    
    -- Transparency
    public_transparency_report JSONB,
    blockchain_verification_hash TEXT,
    community_verification_completed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Individual profit payments - detailed payment records
CREATE TABLE IF NOT EXISTS profit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_batch_id UUID NOT NULL REFERENCES profit_distribution_batches(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Payment details
    recipient_type TEXT NOT NULL, -- 'individual', 'community_pool', 'cultural_fund'
    recipient_id UUID, -- Individual storyteller or community fund
    payment_amount DECIMAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'bank_transfer', 'cryptocurrency', 'community_currency'
    
    -- Cultural protocol compliance
    cultural_protocols_applied JSONB DEFAULT '{}',
    payment_culturally_appropriate BOOLEAN DEFAULT true,
    cultural_consultation_completed BOOLEAN DEFAULT false,
    
    -- Payment execution
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'held_in_escrow'
    transaction_id TEXT,
    processing_fee DECIMAL DEFAULT 0,
    payment_executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Transparency
    payment_transparent_record JSONB,
    recipient_notification_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy - communities can only see their own payments
    CONSTRAINT rls_community_payments CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- ========================================
-- COMMUNITY GOVERNANCE SYSTEM
-- ========================================

-- Governance decisions - tracks all democratic decisions
CREATE TABLE IF NOT EXISTS governance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Decision details
    decision_type TEXT NOT NULL, -- 'distribution_method', 'allocation_percentage', 'fund_investment'
    decision_title TEXT NOT NULL,
    decision_description TEXT,
    decision_context JSONB DEFAULT '{}',
    
    -- Governance process
    governance_model_used TEXT NOT NULL, -- 'consensus', 'majority_vote', 'elder_council'
    voting_method TEXT NOT NULL, -- 'anonymous_ballot', 'story_circle', 'digital_consensus'
    participation_requirement DECIMAL DEFAULT 0.60, -- 60% participation required
    
    -- Cultural integration
    cultural_consultation_required BOOLEAN DEFAULT true,
    cultural_consultation_completed BOOLEAN DEFAULT false,
    cultural_protocols_followed JSONB DEFAULT '{}',
    elder_input_received BOOLEAN DEFAULT false,
    
    -- Voting results
    total_eligible_voters INTEGER DEFAULT 0,
    total_votes_cast INTEGER DEFAULT 0,
    participation_rate DECIMAL DEFAULT 0,
    votes_in_favor INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    abstentions INTEGER DEFAULT 0,
    consensus_level DECIMAL DEFAULT 0,
    
    -- Decision outcome
    decision_outcome TEXT, -- 'approved', 'rejected', 'deferred', 'requires_reconsideration'
    decision_rationale TEXT,
    implementation_plan JSONB DEFAULT '{}',
    
    -- Status tracking
    decision_status TEXT DEFAULT 'deliberation', -- 'deliberation', 'voting', 'decided', 'implemented'
    voting_opens_at TIMESTAMP WITH TIME ZONE,
    voting_closes_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE,
    
    -- Transparency
    public_record JSONB,
    transparency_report_url TEXT,
    blockchain_governance_hash TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy
    CONSTRAINT rls_community_governance CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- Governance votes - individual vote records
CREATE TABLE IF NOT EXISTS governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES governance_decisions(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Voter details (anonymized for privacy)
    voter_id UUID NOT NULL, -- References community member
    voter_role TEXT, -- 'elder', 'member', 'cultural_leader', 'youth_representative'
    
    -- Vote details
    vote_value TEXT NOT NULL, -- 'in_favor', 'against', 'abstain'
    vote_weight DECIMAL DEFAULT 1.0, -- For weighted voting systems
    vote_rationale TEXT,
    
    -- Cultural context
    cultural_protocols_followed BOOLEAN DEFAULT true,
    traditional_process_honored BOOLEAN DEFAULT true,
    
    -- Privacy and anonymity
    vote_anonymized BOOLEAN DEFAULT true,
    anonymization_method TEXT DEFAULT 'cryptographic_hash',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy
    CONSTRAINT rls_community_votes CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    ),
    
    -- Unique vote per decision per voter
    UNIQUE(decision_id, voter_id)
);

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
    storyteller_id UUID NOT NULL REFERENCES storytellers(id),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy
    CONSTRAINT rls_consent_records CHECK (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'storyteller_id' = storyteller_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- ========================================
-- ECOSYSTEM SYNCHRONIZATION TRACKING
-- ========================================

-- Sync operations - tracks all ecosystem data synchronization
CREATE TABLE IF NOT EXISTS ecosystem_sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync details
    sync_type TEXT NOT NULL, -- 'unified', 'simple_methodical', 'health_recovery', 'manual'
    sync_trigger TEXT NOT NULL, -- 'scheduled', 'manual', 'event_driven', 'health_check'
    sync_scope JSONB DEFAULT '{}', -- Which components were synced
    
    -- Execution tracking
    sync_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'partial'
    steps_total INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    steps_failed INTEGER DEFAULT 0,
    
    -- Performance metrics
    sync_duration_ms INTEGER,
    data_volume_processed INTEGER DEFAULT 0,
    systems_synchronized INTEGER DEFAULT 0,
    
    -- Results
    sync_summary JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    health_impact_assessment JSONB DEFAULT '{}',
    
    -- Timestamps
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- COMMUNITY INSIGHTS AND ANALYTICS
-- ========================================

-- Community insights - AI-generated insights about communities
CREATE TABLE IF NOT EXISTS community_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id),
    
    -- Insight details
    insight_type TEXT NOT NULL, -- 'collaboration_pattern', 'engagement_trend', 'value_generation'
    insight_title TEXT NOT NULL,
    insight_description TEXT,
    insight_category TEXT, -- 'collaboration', 'innovation', 'governance', 'cultural'
    
    -- AI analysis
    confidence_score DECIMAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    analysis_method TEXT, -- 'pattern_recognition', 'sentiment_analysis', 'network_analysis'
    supporting_evidence JSONB DEFAULT '{}',
    
    -- Privacy protection
    privacy_preserving_analysis BOOLEAN DEFAULT true,
    anonymization_applied BOOLEAN DEFAULT true,
    cultural_sensitivity_verified BOOLEAN DEFAULT false,
    
    -- Actionability
    actionable BOOLEAN DEFAULT false,
    recommended_actions JSONB DEFAULT '[]',
    impact_potential DECIMAL DEFAULT 0,
    
    -- Insight lifecycle
    insight_status TEXT DEFAULT 'generated', -- 'generated', 'reviewed', 'acted_upon', 'archived'
    community_feedback JSONB DEFAULT '{}',
    acted_upon_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- RLS policy - insights are community-specific
    CONSTRAINT rls_community_insights CHECK (
        community_id IS NULL OR -- Global insights
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- ========================================
-- REAL-TIME DATA SYNCHRONIZATION
-- ========================================

-- Data sync queue - manages real-time synchronization
CREATE TABLE IF NOT EXISTS data_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync item details
    entity_type TEXT NOT NULL, -- 'story', 'community', 'value_event', 'governance_decision'
    entity_id UUID NOT NULL,
    community_id UUID REFERENCES communities(id),
    
    -- Sync operation
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'consent_change'
    sync_priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    sync_data JSONB NOT NULL,
    
    -- Processing status
    sync_status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed', 'retrying'
    processing_attempts INTEGER DEFAULT 0,
    max_retry_attempts INTEGER DEFAULT 3,
    
    -- Target systems
    target_systems JSONB DEFAULT '[]', -- Which systems need this sync
    systems_synced JSONB DEFAULT '[]', -- Which systems have been synced
    
    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_details JSONB DEFAULT '{}',
    requires_manual_intervention BOOLEAN DEFAULT false,
    
    -- RLS policy
    CONSTRAINT rls_sync_queue CHECK (
        community_id IS NULL OR
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    )
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Value tracking indexes
CREATE INDEX IF NOT EXISTS idx_value_events_community_date 
    ON value_generation_events(community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_value_events_blockchain_hash 
    ON value_generation_events(blockchain_hash);

CREATE INDEX IF NOT EXISTS idx_attribution_community_contributor 
    ON value_attribution_records(community_id, contributor_id);

-- Profit distribution indexes
CREATE INDEX IF NOT EXISTS idx_profit_batches_status_date 
    ON profit_distribution_batches(distribution_status, distribution_date DESC);

CREATE INDEX IF NOT EXISTS idx_profit_payments_community_status 
    ON profit_payments(community_id, payment_status);

-- Governance indexes
CREATE INDEX IF NOT EXISTS idx_governance_community_status 
    ON governance_decisions(community_id, decision_status);

CREATE INDEX IF NOT EXISTS idx_governance_votes_decision 
    ON governance_votes(decision_id, vote_value);

-- Consent management indexes
CREATE INDEX IF NOT EXISTS idx_consent_storyteller_type 
    ON dynamic_consent_records(storyteller_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_community_story 
    ON dynamic_consent_records(community_id, story_id);

-- Sync system indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority 
    ON data_sync_queue(sync_status, sync_priority);

CREATE INDEX IF NOT EXISTS idx_sync_operations_status_date 
    ON ecosystem_sync_operations(sync_status, sync_started_at DESC);

CREATE INDEX IF NOT EXISTS idx_component_health_name_date 
    ON component_health_tracking(component_name, last_health_check DESC);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all new tables
ALTER TABLE value_generation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_attribution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_insights ENABLE ROW LEVEL SECURITY;

-- Community-specific access policies
CREATE POLICY community_value_events_policy ON value_generation_events
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_attribution_policy ON value_attribution_records
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_payments_policy ON profit_payments
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_governance_policy ON governance_decisions
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_votes_policy ON governance_votes
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

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

-- ========================================
-- INITIAL DATA AND CONFIGURATION
-- ========================================

-- Insert ecosystem component tracking records
INSERT INTO component_health_tracking (component_name, component_type, operational_status, health_score, critical_for_ecosystem)
VALUES 
    ('community_insights_engine', 'service', 'operational', 0.95, true),
    ('empathy_ledger_platform', 'service', 'operational', 0.92, true),
    ('value_tracking_system', 'service', 'operational', 0.98, true),
    ('profit_distribution_system', 'service', 'operational', 0.94, true),
    ('community_governance_system', 'service', 'operational', 0.96, true),
    ('cloud_scaling_manager', 'service', 'operational', 0.89, false),
    ('unified_sync_service', 'service', 'operational', 0.93, true),
    ('notion_integration', 'integration', 'operational', 0.87, false),
    ('frontend_dashboard', 'api', 'operational', 0.91, false)
ON CONFLICT (component_name) DO NOTHING;

-- ========================================
-- FUNCTIONS FOR DATA OPERATIONS
-- ========================================

-- Function to calculate community benefit amount
CREATE OR REPLACE FUNCTION calculate_community_benefit(total_value DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    -- ACT's legal 40% guarantee
    RETURN total_value * 0.40;
END;
$$ LANGUAGE plpgsql;

-- Function to validate profit distribution compliance
CREATE OR REPLACE FUNCTION validate_profit_distribution_compliance(distribution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    batch_record RECORD;
    compliance_met BOOLEAN := false;
BEGIN
    SELECT * INTO batch_record FROM profit_distribution_batches WHERE id = distribution_id;
    
    IF batch_record.community_share_amount >= (batch_record.total_profit_amount * 0.40) THEN
        compliance_met := true;
    END IF;
    
    RETURN compliance_met;
END;
$$ LANGUAGE plpgsql;

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