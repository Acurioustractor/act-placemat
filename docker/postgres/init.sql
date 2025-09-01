-- PostgreSQL Initialization Script for ACT Placemat Intelligence Hub
-- Australian-compliant database setup with proper security and compliance

-- Set timezone to Australian Eastern Time
SET timezone = 'Australia/Sydney';

-- Create extensions for advanced functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create Australian compliance schema
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS intelligence;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Grant permissions
GRANT USAGE ON SCHEMA compliance TO postgres;
GRANT USAGE ON SCHEMA intelligence TO postgres;
GRANT USAGE ON SCHEMA monitoring TO postgres;

-- Intelligence Hub Core Tables

-- Task Registry
CREATE TABLE IF NOT EXISTS intelligence.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 0 AND 10),
    payload JSONB NOT NULL,
    required_capabilities TEXT[] DEFAULT '{}',
    democratic_priority BOOLEAN DEFAULT FALSE,
    transparency_level VARCHAR(20) DEFAULT 'community' CHECK (transparency_level IN ('public', 'community', 'private')),
    
    -- Australian compliance fields
    requires_australian_processing BOOLEAN DEFAULT TRUE,
    data_classification VARCHAR(50) DEFAULT 'internal',
    data_residency VARCHAR(50) DEFAULT 'Australia',
    
    -- Audit fields
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_by INET,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'))
);

-- Task Workflow States
CREATE TABLE IF NOT EXISTS intelligence.workflow_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES intelligence.tasks(id) ON DELETE CASCADE,
    workflow_id VARCHAR(255) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    state_data JSONB NOT NULL DEFAULT '{}',
    agent_assignments TEXT[] DEFAULT '{}',
    
    -- Australian compliance
    processed_in_australia BOOLEAN DEFAULT TRUE,
    compliance_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(task_id, workflow_id, state_name)
);

-- Agent Registry
CREATE TABLE IF NOT EXISTS intelligence.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    max_concurrent_tasks INTEGER DEFAULT 1,
    
    -- Australian compliance
    australian_certified BOOLEAN DEFAULT TRUE,
    data_handling_approved BOOLEAN DEFAULT TRUE,
    
    -- Health and performance
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    total_tasks_completed INTEGER DEFAULT 0,
    average_completion_time INTERVAL,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_agent_status CHECK (status IN ('available', 'busy', 'maintenance', 'offline'))
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS intelligence.task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES intelligence.tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES intelligence.agents(id) ON DELETE CASCADE,
    workflow_state_id UUID REFERENCES intelligence.workflow_states(id) ON DELETE CASCADE,
    
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'assigned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    result JSONB,
    error_message TEXT,
    
    -- Performance metrics
    processing_time INTERVAL,
    
    -- Audit
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_assignment_status CHECK (assignment_status IN ('assigned', 'in_progress', 'completed', 'failed', 'cancelled')),
    UNIQUE(task_id, agent_id, workflow_state_id)
);

-- Compliance and Audit Tables

-- Audit Log
CREATE TABLE IF NOT EXISTS compliance.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Event details
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    
    -- Australian compliance
    data_classification VARCHAR(50) DEFAULT 'internal',
    privacy_impact VARCHAR(50) DEFAULT 'low',
    retention_period INTERVAL DEFAULT INTERVAL '7 years',
    
    -- Context
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data Residency Verification
CREATE TABLE IF NOT EXISTS compliance.data_residency_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Verification details
    residency_status VARCHAR(50) NOT NULL DEFAULT 'verified_australia',
    verification_method VARCHAR(100) NOT NULL,
    server_location VARCHAR(100) DEFAULT 'Australia',
    
    -- Compliance metadata
    privacy_act_compliant BOOLEAN DEFAULT TRUE,
    data_sovereignty_verified BOOLEAN DEFAULT TRUE,
    
    -- Audit
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by VARCHAR(255) DEFAULT 'system',
    
    CONSTRAINT valid_residency_status CHECK (residency_status IN ('verified_australia', 'pending_verification', 'non_compliant'))
);

-- Monitoring and Performance Tables

-- System Events
CREATE TABLE IF NOT EXISTS monitoring.system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    
    -- Context
    component VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    -- Metrics
    response_time_ms INTEGER,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS monitoring.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(50),
    
    -- Dimensions
    component VARCHAR(100),
    agent_id UUID REFERENCES intelligence.agents(id),
    task_id UUID REFERENCES intelligence.tasks(id),
    
    -- Metadata
    tags JSONB DEFAULT '{}',
    
    -- Timestamp
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON intelligence.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON intelligence.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON intelligence.tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_at ON intelligence.tasks(submitted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_data_residency ON intelligence.tasks(data_residency);

-- Workflow state indexes
CREATE INDEX IF NOT EXISTS idx_workflow_states_task_id ON intelligence.workflow_states(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_workflow_id ON intelligence.workflow_states(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_updated_at ON intelligence.workflow_states(updated_at);

-- Agent indexes
CREATE INDEX IF NOT EXISTS idx_agents_status ON intelligence.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON intelligence.agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON intelligence.agents USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON intelligence.agents(last_heartbeat);

-- Assignment indexes
CREATE INDEX IF NOT EXISTS idx_assignments_task_id ON intelligence.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_agent_id ON intelligence.task_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON intelligence.task_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON intelligence.task_assignments(assigned_at);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON compliance.audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON compliance.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON compliance.audit_log(created_at);

-- Monitoring indexes
CREATE INDEX IF NOT EXISTS idx_system_events_type ON monitoring.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON monitoring.system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON monitoring.system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON monitoring.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON monitoring.performance_metrics(recorded_at);

-- Functions and Triggers

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON intelligence.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_states_updated_at BEFORE UPDATE ON intelligence.workflow_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON intelligence.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO compliance.audit_log (
        event_type,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON intelligence.tasks FOR EACH ROW EXECUTE FUNCTION audit_changes();
CREATE TRIGGER audit_agents AFTER INSERT OR UPDATE OR DELETE ON intelligence.agents FOR EACH ROW EXECUTE FUNCTION audit_changes();
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON intelligence.task_assignments FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- Data residency verification function
CREATE OR REPLACE FUNCTION verify_data_residency()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO compliance.data_residency_log (
        entity_type,
        entity_id,
        verification_method,
        residency_status
    ) VALUES (
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        NEW.id,
        'trigger_based_verification',
        CASE 
            WHEN NEW.data_residency = 'Australia' THEN 'verified_australia'
            ELSE 'pending_verification'
        END
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply data residency triggers
CREATE TRIGGER verify_task_residency AFTER INSERT ON intelligence.tasks FOR EACH ROW EXECUTE FUNCTION verify_data_residency();

-- Create initial agents (basic setup)
INSERT INTO intelligence.agents (name, type, capabilities, config, australian_certified) VALUES
('financial-intelligence', 'financial-analyst', ARRAY['financial-analysis', 'market-research', 'risk-assessment', 'investment-analysis', 'abn-lookup', 'asic-queries'], '{"model": "claude-3.5-sonnet", "max_tokens": 4000, "temperature": 0.1}', TRUE),
('research-analyst', 'research-agent', ARRAY['web-scraping', 'data-analysis', 'report-generation', 'fact-checking', 'source-verification', 'trend-analysis'], '{"model": "claude-3.5-sonnet", "max_tokens": 4000, "temperature": 0.2}', TRUE),
('compliance-officer', 'compliance-agent', ARRAY['privacy-audit', 'regulatory-check', 'data-classification', 'compliance-reporting', 'australian-law-check', 'gdpr-assessment'], '{"model": "claude-3.5-sonnet", "max_tokens": 3000, "temperature": 0.05}', TRUE),
('community-coordinator', 'coordination-agent', ARRAY['stakeholder-engagement', 'democratic-processes', 'consensus-building', 'communication-facilitation', 'community-feedback', 'transparency-reporting'], '{"model": "claude-3.5-sonnet", "max_tokens": 3000, "temperature": 0.3}', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Log initialization
INSERT INTO monitoring.system_events (event_type, severity, message, component, metadata) VALUES
('database_initialization', 'info', 'ACT Placemat Intelligence Hub database initialized successfully', 'postgresql', '{"version": "16", "timezone": "Australia/Sydney", "compliance": "australian-privacy-act"}');

-- Final compliance verification
INSERT INTO compliance.data_residency_log (entity_type, entity_id, verification_method, residency_status, server_location) VALUES
('database', uuid_generate_v4(), 'initialization_verification', 'verified_australia', 'Australia');

COMMIT;