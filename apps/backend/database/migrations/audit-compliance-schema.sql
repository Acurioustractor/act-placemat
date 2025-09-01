-- Audit and Compliance Database Schema
-- Creates tables for comprehensive audit logging and compliance monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit Logs Table
-- Stores all system audit events for compliance and security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- User and session information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    -- Event data
    details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Compliance flags
    compliance_flags JSONB DEFAULT '{}',
    
    -- Risk assessment
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance Events Table
-- Stores specific compliance-related events and their processing status
CREATE TABLE IF NOT EXISTS compliance_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Related audit log
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    -- User context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    event_data JSONB NOT NULL DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    
    -- Compliance details
    regulation_type VARCHAR(50) NOT NULL, -- 'gdpr', 'ccpa', 'australian_privacy', 'cultural_safety'
    compliance_article VARCHAR(100), -- e.g., 'GDPR Article 17', 'CCPA Section 1798.105'
    
    -- Processing metadata
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    completion_deadline TIMESTAMPTZ,
    
    -- Results
    success BOOLEAN,
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance Reports Table
-- Stores generated compliance reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
    
    -- Report period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Report data
    report_data JSONB NOT NULL,
    
    -- Metadata
    generated_by VARCHAR(100) DEFAULT 'system',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status
    status VARCHAR(50) DEFAULT 'generated' CHECK (
        status IN ('generating', 'generated', 'sent', 'archived', 'failed')
    ),
    
    -- Distribution
    sent_to JSONB DEFAULT '[]',
    sent_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Reviews Table
-- Stores quarterly and annual security reviews
CREATE TABLE IF NOT EXISTS security_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_type VARCHAR(50) NOT NULL, -- 'quarterly', 'annual', 'ad_hoc'
    
    -- Review period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Review data
    review_data JSONB NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (
        status IN ('planned', 'in_progress', 'completed', 'approved', 'archived')
    ),
    
    -- Reviewer information
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

-- Privacy Requests Table
-- Tracks GDPR/CCPA privacy requests and their processing
CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL CHECK (
        request_type IN ('export', 'deletion', 'rectification', 'restriction', 'objection', 'portability')
    ),
    
    -- Request details
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    request_data JSONB NOT NULL DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    
    -- Legal basis
    legal_basis VARCHAR(100) NOT NULL, -- 'gdpr_article_17', 'ccpa_section_1798_105', etc.
    regulation_type VARCHAR(50) NOT NULL,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'received' CHECK (
        status IN ('received', 'verified', 'processing', 'completed', 'rejected', 'cancelled')
    ),
    
    -- Verification
    verification_method VARCHAR(100),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Processing
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    completion_deadline TIMESTAMPTZ NOT NULL,
    
    -- Results
    result_data JSONB DEFAULT '{}',
    export_file_path TEXT,
    deletion_confirmation TEXT,
    
    -- Related audit log
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cultural Safety Reviews Table
-- Tracks cultural safety assessments and community consultations
CREATE TABLE IF NOT EXISTS cultural_safety_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Content being reviewed
    content_type VARCHAR(100) NOT NULL, -- 'story', 'project', 'comment', 'media'
    content_id UUID NOT NULL,
    content_summary TEXT,
    
    -- Review details
    review_type VARCHAR(50) NOT NULL, -- 'automated', 'community', 'elder', 'expert'
    cultural_protocols TEXT[] DEFAULT '{}',
    community_groups TEXT[] DEFAULT '{}',
    
    -- Safety assessment
    safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
    safety_level VARCHAR(20) CHECK (safety_level IN ('safe', 'caution', 'restricted', 'prohibited')),
    
    -- Community consent
    community_consent BOOLEAN DEFAULT FALSE,
    consent_type VARCHAR(50), -- 'explicit', 'informed', 'ongoing', 'withdrawn'
    consent_evidence JSONB DEFAULT '{}',
    
    -- Indigenous data sovereignty
    indigenous_data BOOLEAN DEFAULT FALSE,
    data_sovereignty_flags JSONB DEFAULT '{}',
    traditional_owner_consultation BOOLEAN DEFAULT FALSE,
    
    -- Review results
    approved BOOLEAN,
    conditions JSONB DEFAULT '{}',
    restrictions JSONB DEFAULT '{}',
    
    -- Reviewer information
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_role VARCHAR(100), -- 'community_member', 'elder', 'cultural_expert', 'system'
    review_notes TEXT,
    
    -- Related audit log
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Some cultural assessments may have expiry dates
);

-- Encryption Events Table
-- Tracks encryption/decryption operations for security monitoring
CREATE TABLE IF NOT EXISTS encryption_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('encrypt', 'decrypt', 'key_rotation', 'key_generation')),
    
    -- Encryption details
    algorithm VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    key_id VARCHAR(100),
    data_type VARCHAR(100), -- 'user_data', 'payment_info', 'cultural_content', etc.
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR(100),
    field_names TEXT[],
    record_count INTEGER DEFAULT 1,
    
    -- Performance metrics
    operation_duration_ms INTEGER,
    data_size_bytes INTEGER,
    
    -- Success/failure
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Security context
    ip_address INET,
    user_agent TEXT,
    
    -- Related audit log
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);

CREATE INDEX IF NOT EXISTS idx_compliance_events_status ON compliance_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_compliance_events_regulation ON compliance_events(regulation_type);
CREATE INDEX IF NOT EXISTS idx_compliance_events_deadline ON compliance_events(completion_deadline);
CREATE INDEX IF NOT EXISTS idx_compliance_events_user_id ON compliance_events(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period ON compliance_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_deadline ON privacy_requests(completion_deadline);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);

CREATE INDEX IF NOT EXISTS idx_cultural_safety_content ON cultural_safety_reviews(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_cultural_safety_score ON cultural_safety_reviews(safety_score);
CREATE INDEX IF NOT EXISTS idx_cultural_safety_level ON cultural_safety_reviews(safety_level);
CREATE INDEX IF NOT EXISTS idx_cultural_safety_consent ON cultural_safety_reviews(community_consent);

CREATE INDEX IF NOT EXISTS idx_encryption_events_operation ON encryption_events(operation);
CREATE INDEX IF NOT EXISTS idx_encryption_events_success ON encryption_events(success);
CREATE INDEX IF NOT EXISTS idx_encryption_events_user_id ON encryption_events(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_events_created_at ON encryption_events(created_at DESC);

-- Create GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_flags_gin ON audit_logs USING GIN (compliance_flags);

CREATE INDEX IF NOT EXISTS idx_compliance_events_event_data_gin ON compliance_events USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_compliance_events_result_data_gin ON compliance_events USING GIN (result_data);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_audit_logs_updated_at 
    BEFORE UPDATE ON audit_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_events_updated_at 
    BEFORE UPDATE ON compliance_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_reports_updated_at 
    BEFORE UPDATE ON compliance_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_reviews_updated_at 
    BEFORE UPDATE ON security_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_requests_updated_at 
    BEFORE UPDATE ON privacy_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_safety_reviews_updated_at 
    BEFORE UPDATE ON cultural_safety_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_safety_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_events ENABLE ROW LEVEL SECURITY;

-- Audit logs policies
-- Service role can access all audit logs
CREATE POLICY "audit_logs_service_role" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own audit logs
CREATE POLICY "audit_logs_user_own" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Admin users can see all audit logs
CREATE POLICY "audit_logs_admin" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'compliance_officer')
        )
    );

-- Privacy requests policies
-- Service role can manage all privacy requests
CREATE POLICY "privacy_requests_service_role" ON privacy_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Users can see and create their own privacy requests
CREATE POLICY "privacy_requests_user_own" ON privacy_requests
    FOR ALL USING (auth.uid() = user_id);

-- Compliance officers can manage all privacy requests
CREATE POLICY "privacy_requests_compliance" ON privacy_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'compliance_officer'
        )
    );

-- Similar policies for other tables (abbreviated for brevity)
CREATE POLICY "compliance_events_service_role" ON compliance_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "compliance_reports_admin" ON compliance_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'compliance_officer')
        )
    );

CREATE POLICY "cultural_safety_reviews_service_role" ON cultural_safety_reviews
    FOR ALL USING (auth.role() = 'service_role');

-- Comments documenting the audit trail requirements
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system operations, required for GDPR Article 30 (Records of processing activities) and Australian Privacy Principle 1.2';
COMMENT ON TABLE compliance_events IS 'Tracks specific compliance events like privacy requests, required for GDPR Articles 15-22 and CCPA Sections 1798.100-1798.150';
COMMENT ON TABLE privacy_requests IS 'Manages individual privacy rights requests with full audit trail, supports GDPR Articles 15-22 and CCPA consumer rights';
COMMENT ON TABLE cultural_safety_reviews IS 'Ensures Indigenous data sovereignty compliance and cultural safety protocols are followed';
COMMENT ON TABLE encryption_events IS 'Tracks encryption operations for technical safeguards compliance under GDPR Article 32 and Australian Privacy Principle 11';

-- Create views for common reporting queries
CREATE VIEW audit_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    event_type,
    category,
    risk_level,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs 
GROUP BY DATE_TRUNC('day', timestamp), event_type, category, risk_level
ORDER BY date DESC;

CREATE VIEW privacy_request_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    request_type,
    regulation_type,
    status,
    COUNT(*) as request_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(processed_at, NOW()) - created_at))/86400) as avg_processing_days
FROM privacy_requests 
GROUP BY DATE_TRUNC('month', created_at), request_type, regulation_type, status
ORDER BY month DESC;

CREATE VIEW compliance_metrics AS
SELECT 
    'audit_trail_completeness' as metric_name,
    (COUNT(CASE WHEN timestamp IS NOT NULL AND event_type IS NOT NULL AND category IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)) as value,
    '%' as unit
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'privacy_request_compliance_rate' as metric_name,
    (COUNT(CASE WHEN status = 'completed' AND processed_at <= completion_deadline THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value,
    '%' as unit
FROM privacy_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'encryption_success_rate' as metric_name,
    (COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*)) as value,
    '%' as unit
FROM encryption_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Grant appropriate permissions
GRANT SELECT ON audit_summary TO authenticated;
GRANT SELECT ON privacy_request_summary TO authenticated;
GRANT SELECT ON compliance_metrics TO authenticated;

-- Ensure service role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;