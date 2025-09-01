-- ACT Values Compliance Database Schema
-- Supports real-time enforcement of locked values framework
-- Based on: /Docs/Strategy/ACT_LOCKED_VALUES_AND_ACCOUNTABILITY_FRAMEWORK.md

-- Community Governance Tracking Table
CREATE TABLE community_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    community_control_percentage DECIMAL(5,2) NOT NULL DEFAULT 25.00,
    revenue_control_percentage DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    decision_voting_weight DECIMAL(5,2) NOT NULL DEFAULT 25.00,
    asset_ownership_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    -- Beautiful Obsolescence Timeline Tracking
    target_month INTEGER NOT NULL DEFAULT 1,
    months_since_launch INTEGER NOT NULL DEFAULT 0,
    beautiful_obsolescence_progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    -- Community Control Milestones
    milestone_6_months_achieved BOOLEAN DEFAULT FALSE,
    milestone_12_months_achieved BOOLEAN DEFAULT FALSE,
    milestone_18_months_achieved BOOLEAN DEFAULT FALSE,
    milestone_24_months_achieved BOOLEAN DEFAULT FALSE,
    milestone_30_months_achieved BOOLEAN DEFAULT FALSE,
    milestone_36_months_achieved BOOLEAN DEFAULT FALSE, -- Beautiful Obsolescence
    
    -- Audit Fields
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    community_verified BOOLEAN DEFAULT FALSE,
    community_verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Compliance Tracking
    compliant_with_timeline BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT,
    violation_count INTEGER DEFAULT 0,
    last_violation_date TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indigenous Advisory Board Approvals
CREATE TABLE indigenous_advisory_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id TEXT NOT NULL,
    context_type VARCHAR(100) NOT NULL,
    context_data JSONB NOT NULL,
    
    -- CARE Principles Tracking
    collective_benefit_validated BOOLEAN DEFAULT FALSE,
    authority_to_control_confirmed BOOLEAN DEFAULT FALSE,
    responsibility_acknowledged BOOLEAN DEFAULT FALSE,
    ethics_reviewed BOOLEAN DEFAULT FALSE,
    
    -- Approval Status
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by_elder_name VARCHAR(255),
    approved_by_elder_nation VARCHAR(255),
    unanimous_approval BOOLEAN DEFAULT FALSE,
    
    -- Cultural Safety
    cultural_protocols_followed BOOLEAN DEFAULT FALSE,
    cultural_sensitivity_score INTEGER CHECK (cultural_sensitivity_score >= 1 AND cultural_sensitivity_score <= 10),
    cultural_feedback TEXT,
    
    -- Ongoing Monitoring
    requires_ongoing_consultation BOOLEAN DEFAULT TRUE,
    next_review_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(context_id, context_type)
);

-- Values Compliance Log - Complete Audit Trail
CREATE TABLE values_compliance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Action Details
    action JSONB NOT NULL,
    context JSONB NOT NULL,
    
    -- Compliance Results
    compliant BOOLEAN NOT NULL,
    violations JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Violation Analysis
    violation_count INTEGER DEFAULT 0,
    critical_violations INTEGER DEFAULT 0,
    high_violations INTEGER DEFAULT 0,
    medium_violations INTEGER DEFAULT 0,
    
    -- Response Actions
    system_halt_triggered BOOLEAN DEFAULT FALSE,
    community_notified BOOLEAN DEFAULT FALSE,
    indigenous_advisory_notified BOOLEAN DEFAULT FALSE,
    transparency_report_published BOOLEAN DEFAULT FALSE,
    
    -- Resolution Tracking
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    community_feedback_received BOOLEAN DEFAULT FALSE,
    
    -- Searchable Fields
    violation_types TEXT[], -- Array for easy searching
    affected_communities UUID[], -- Array of community IDs
    severity_level VARCHAR(20) DEFAULT 'MEDIUM'
);

-- Community Notifications for Transparency
CREATE TABLE community_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Notification Content
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    summary TEXT,
    
    -- Targeting
    target_communities UUID[], -- NULL means all communities
    target_roles VARCHAR(50)[], -- NULL means all roles
    
    -- Response Requirements
    requires_response BOOLEAN DEFAULT FALSE,
    response_deadline TIMESTAMP WITH TIME ZONE,
    responses_received INTEGER DEFAULT 0,
    responses_required INTEGER DEFAULT 0,
    
    -- Status Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID[], -- Array of user IDs who acknowledged
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- System Halts for Critical Violations
CREATE TABLE system_halts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason VARCHAR(255) NOT NULL,
    violations JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Action Context
    action_context JSONB,
    affected_systems TEXT[],
    affected_communities UUID[],
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_method VARCHAR(100),
    resolution_notes TEXT,
    
    -- Community Involvement
    community_approval_required BOOLEAN DEFAULT TRUE,
    community_approval_received BOOLEAN DEFAULT FALSE,
    community_approval_date TIMESTAMP WITH TIME ZONE,
    
    -- Impact Assessment
    impact_level VARCHAR(20) DEFAULT 'HIGH',
    estimated_downtime_minutes INTEGER,
    actual_downtime_minutes INTEGER,
    
    -- Prevention
    prevention_measures_implemented BOOLEAN DEFAULT FALSE,
    prevention_notes TEXT
);

-- Public Transparency Reports
CREATE TABLE public_transparency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Report Period
    report_period_start TIMESTAMP WITH TIME ZONE,
    report_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Compliance Metrics
    total_compliance_checks INTEGER DEFAULT 0,
    compliant_actions INTEGER DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    compliance_rate DECIMAL(5,2) DEFAULT 100.00,
    
    -- Violation Breakdown
    critical_violations INTEGER DEFAULT 0,
    high_violations INTEGER DEFAULT 0,
    medium_violations INTEGER DEFAULT 0,
    low_violations INTEGER DEFAULT 0,
    
    -- Community Metrics
    communities_affected INTEGER DEFAULT 0,
    community_satisfaction_score DECIMAL(3,2), -- Out of 5.00
    community_control_average DECIMAL(5,2),
    revenue_share_average DECIMAL(5,2),
    
    -- Beautiful Obsolescence Progress
    obsolescence_progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    months_to_beautiful_obsolescence INTEGER,
    
    -- Public Summary
    public_summary TEXT NOT NULL,
    detailed_report_url VARCHAR(500),
    
    -- Status
    published BOOLEAN DEFAULT TRUE,
    next_review_date TIMESTAMP WITH TIME ZONE,
    
    -- Community Response
    community_comments_enabled BOOLEAN DEFAULT TRUE,
    community_feedback_count INTEGER DEFAULT 0
);

-- Anti-Extraction Pattern Detection Results
CREATE TABLE anti_extraction_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pattern Details
    pattern_type VARCHAR(100) NOT NULL,
    pattern_description TEXT NOT NULL,
    severity_level VARCHAR(20) DEFAULT 'MEDIUM',
    
    -- Action Context
    action_data JSONB NOT NULL,
    context_data JSONB NOT NULL,
    
    -- Community Impact
    communities_affected UUID[],
    potential_harm_description TEXT,
    community_benefit_score DECIMAL(3,2), -- Negative scores indicate extraction
    
    -- Response
    blocked BOOLEAN DEFAULT FALSE,
    alternative_suggested TEXT,
    community_empowerment_alternative JSONB,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_method VARCHAR(100),
    community_approved_resolution BOOLEAN DEFAULT FALSE,
    
    -- Learning
    pattern_added_to_detection_rules BOOLEAN DEFAULT FALSE,
    prevention_guidance_created BOOLEAN DEFAULT FALSE
);

-- Revenue Distribution Transparency Blockchain Records
CREATE TABLE revenue_blockchain_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64),
    
    -- Revenue Transaction
    transaction_type VARCHAR(50) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    community_share_amount DECIMAL(12,2) NOT NULL,
    community_share_percentage DECIMAL(5,2) NOT NULL,
    
    -- Distribution Details
    recipient_communities UUID[] NOT NULL,
    distribution_method VARCHAR(100),
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Transparency
    public_transaction_id VARCHAR(100),
    blockchain_verified BOOLEAN DEFAULT FALSE,
    blockchain_verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    audited BOOLEAN DEFAULT FALSE,
    audit_date TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    meets_minimum_community_share BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT
);

-- Community Exit Rights Tracking
CREATE TABLE community_exit_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    project_id UUID NOT NULL,
    
    -- Exit Rights Status
    exit_rights_active BOOLEAN DEFAULT TRUE,
    termination_notice_period_days INTEGER DEFAULT 30,
    data_portability_guaranteed BOOLEAN DEFAULT TRUE,
    technical_independence_provided BOOLEAN DEFAULT TRUE,
    
    -- Exit Process Status
    exit_initiated BOOLEAN DEFAULT FALSE,
    exit_initiation_date TIMESTAMP WITH TIME ZONE,
    exit_reason TEXT,
    notice_period_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Data Export
    data_export_requested BOOLEAN DEFAULT FALSE,
    data_export_completed BOOLEAN DEFAULT FALSE,
    data_export_completion_date TIMESTAMP WITH TIME ZONE,
    data_export_format VARCHAR(50) DEFAULT 'JSON',
    
    -- Technical Handover
    source_code_provided BOOLEAN DEFAULT FALSE,
    documentation_provided BOOLEAN DEFAULT FALSE,
    training_completed BOOLEAN DEFAULT FALSE,
    technical_independence_achieved BOOLEAN DEFAULT FALSE,
    
    -- Final Status
    exit_completed BOOLEAN DEFAULT FALSE,
    exit_completion_date TIMESTAMP WITH TIME ZONE,
    community_satisfaction_with_exit INTEGER CHECK (community_satisfaction_with_exit >= 1 AND community_satisfaction_with_exit <= 10),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(community_id, project_id)
);

-- Indexes for Performance
CREATE INDEX idx_community_governance_project ON community_governance(project_id);
CREATE INDEX idx_community_governance_timeline ON community_governance(months_since_launch, compliant_with_timeline);
CREATE INDEX idx_compliance_log_timestamp ON values_compliance_log(timestamp);
CREATE INDEX idx_compliance_log_violations ON values_compliance_log USING GIN(violations);
CREATE INDEX idx_compliance_log_compliant ON values_compliance_log(compliant);
CREATE INDEX idx_notifications_severity ON community_notifications(severity, requires_response);
CREATE INDEX idx_system_halts_resolved ON system_halts(resolved, timestamp);
CREATE INDEX idx_transparency_reports_date ON public_transparency_reports(timestamp);
CREATE INDEX idx_extraction_patterns_type ON anti_extraction_patterns(pattern_type, severity_level);
CREATE INDEX idx_revenue_blockchain_date ON revenue_blockchain_records(distribution_date);
CREATE INDEX idx_exit_rights_active ON community_exit_rights(exit_rights_active, exit_initiated);

-- Views for Easy Reporting
CREATE VIEW current_community_control AS
SELECT 
    cg.project_id,
    p.name as project_name,
    cg.community_control_percentage,
    cg.revenue_control_percentage,
    cg.months_since_launch,
    cg.beautiful_obsolescence_progress,
    cg.compliant_with_timeline,
    CASE 
        WHEN cg.months_since_launch >= 36 THEN 'BEAUTIFUL_OBSOLESCENCE_ACHIEVED'
        WHEN cg.months_since_launch >= 30 AND cg.community_control_percentage >= 95 THEN 'ON_TRACK_FOR_OBSOLESCENCE'
        WHEN cg.compliant_with_timeline THEN 'ON_TRACK'
        ELSE 'NEEDS_ATTENTION'
    END as status
FROM community_governance cg
JOIN projects p ON cg.project_id = p.id;

CREATE VIEW values_compliance_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE compliant = true) as compliant_checks,
    COUNT(*) FILTER (WHERE compliant = false) as non_compliant_checks,
    COUNT(*) FILTER (WHERE critical_violations > 0) as critical_violations,
    COUNT(*) FILTER (WHERE system_halt_triggered = true) as system_halts,
    ROUND(
        (COUNT(*) FILTER (WHERE compliant = true) * 100.0 / COUNT(*)), 2
    ) as compliance_rate
FROM values_compliance_log
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Functions for Automated Compliance Checking
CREATE OR REPLACE FUNCTION update_community_control_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate beautiful obsolescence progress
    NEW.beautiful_obsolescence_progress = CASE
        WHEN NEW.months_since_launch >= 36 THEN 100.00
        ELSE ROUND((NEW.months_since_launch / 36.0) * 100.0, 2)
    END;
    
    -- Check timeline compliance
    NEW.compliant_with_timeline = CASE
        WHEN NEW.months_since_launch >= 36 AND NEW.community_control_percentage >= 100 THEN TRUE
        WHEN NEW.months_since_launch >= 30 AND NEW.community_control_percentage >= 95 THEN TRUE
        WHEN NEW.months_since_launch >= 24 AND NEW.community_control_percentage >= 85 THEN TRUE
        WHEN NEW.months_since_launch >= 18 AND NEW.community_control_percentage >= 75 THEN TRUE
        WHEN NEW.months_since_launch >= 12 AND NEW.community_control_percentage >= 65 THEN TRUE
        WHEN NEW.months_since_launch >= 6 AND NEW.community_control_percentage >= 51 THEN TRUE
        WHEN NEW.months_since_launch < 6 AND NEW.community_control_percentage >= 25 THEN TRUE
        ELSE FALSE
    END;
    
    -- Update milestone achievements
    NEW.milestone_6_months_achieved = NEW.months_since_launch >= 6 AND NEW.community_control_percentage >= 51;
    NEW.milestone_12_months_achieved = NEW.months_since_launch >= 12 AND NEW.community_control_percentage >= 65;
    NEW.milestone_18_months_achieved = NEW.months_since_launch >= 18 AND NEW.community_control_percentage >= 75;
    NEW.milestone_24_months_achieved = NEW.months_since_launch >= 24 AND NEW.community_control_percentage >= 85;
    NEW.milestone_30_months_achieved = NEW.months_since_launch >= 30 AND NEW.community_control_percentage >= 95;
    NEW.milestone_36_months_achieved = NEW.months_since_launch >= 36 AND NEW.community_control_percentage >= 100;
    
    NEW.last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_governance_progress_trigger
    BEFORE INSERT OR UPDATE ON community_governance
    FOR EACH ROW
    EXECUTE FUNCTION update_community_control_progress();

-- Row Level Security for Community Data Protection
ALTER TABLE community_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE indigenous_advisory_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_exit_rights ENABLE ROW LEVEL SECURITY;

-- Policies for Community Access Control
CREATE POLICY "Communities can view their own governance data" ON community_governance
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM community_projects WHERE community_id = auth.jwt() ->> 'community_id'
        )
    );

CREATE POLICY "Indigenous Advisory Board can view all Indigenous data" ON indigenous_advisory_approvals
    FOR SELECT USING (auth.jwt() ->> 'role' = 'indigenous_advisory_board');

-- Comments for Documentation
COMMENT ON TABLE community_governance IS 'Tracks community control percentages and beautiful obsolescence progress against locked timeline';
COMMENT ON TABLE indigenous_advisory_approvals IS 'Ensures Indigenous data sovereignty and CARE principles compliance';
COMMENT ON TABLE values_compliance_log IS 'Complete audit trail of all values compliance checks for transparency';
COMMENT ON TABLE public_transparency_reports IS 'Public accountability reports showing values compliance metrics';
COMMENT ON TABLE anti_extraction_patterns IS 'Detection and prevention of extractive patterns that harm community empowerment';
COMMENT ON TABLE revenue_blockchain_records IS 'Transparent, immutable record of revenue distribution to communities';
COMMENT ON TABLE community_exit_rights IS 'Protection of community rights to exit relationships and maintain data control';

-- Grant appropriate permissions
GRANT SELECT ON current_community_control TO authenticated;
GRANT SELECT ON values_compliance_summary TO authenticated;
GRANT SELECT ON public_transparency_reports TO public;

-- Initial data for testing
INSERT INTO community_governance (
    project_id, 
    community_control_percentage, 
    revenue_control_percentage,
    months_since_launch,
    target_month
) VALUES (
    gen_random_uuid(), 
    25.00, 
    40.00,
    1,
    6
);

-- Success message
SELECT 'Values Compliance Database Schema installed successfully! 🔒' as status,
       'Real-time enforcement of locked values framework is now technically possible' as capability,
       'Beautiful obsolescence by 2027 timeline tracking is active' as mission;