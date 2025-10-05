-- AI Agents Schema Migration
-- Creates tables for event logging, audit trails, agent learning, and system policies

-- Event logs table
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    data JSONB,
    status VARCHAR(50) DEFAULT 'received',
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_event_logs_type (type),
    INDEX idx_event_logs_source (source),
    INDEX idx_event_logs_entity (entity),
    INDEX idx_event_logs_status (status),
    INDEX idx_event_logs_timestamp (timestamp)
);

-- Audit logs table for agent actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID,
    entity VARCHAR(100),
    
    INDEX idx_audit_logs_agent (agent),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_timestamp (timestamp),
    INDEX idx_audit_logs_entity (entity)
);

-- Agent executions tracking
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'running',
    result JSONB,
    error TEXT,
    metrics JSONB,
    
    INDEX idx_agent_executions_agent (agent_name),
    INDEX idx_agent_executions_status (status),
    INDEX idx_agent_executions_started (started_at)
);

-- Agent learning data
CREATE TABLE IF NOT EXISTS agent_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor VARCHAR(255) NOT NULL,
    agent VARCHAR(100) NOT NULL,
    pattern JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(vendor, agent),
    INDEX idx_learning_vendor (vendor),
    INDEX idx_learning_agent (agent)
);

-- System policies storage
CREATE TABLE IF NOT EXISTS system_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type VARCHAR(100) NOT NULL,
    policy_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    INDEX idx_policies_type (policy_type),
    INDEX idx_policies_created (created_at DESC)
);

-- Notification logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error TEXT,
    data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_timestamp (timestamp)
);

-- R&D activities
CREATE TABLE IF NOT EXISTS rd_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('core', 'supporting')) NOT NULL,
    hypothesis TEXT NOT NULL,
    uncertainty TEXT NOT NULL,
    experiments TEXT[],
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    entity VARCHAR(100) DEFAULT 'ACT_PTY_LTD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_rd_activities_type (type),
    INDEX idx_rd_activities_status (status),
    INDEX idx_rd_activities_dates (start_date, end_date)
);

-- R&D evidence
CREATE TABLE IF NOT EXISTS rd_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    link TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (activity_id) REFERENCES rd_activities(activity_id) ON DELETE CASCADE,
    INDEX idx_rd_evidence_activity (activity_id),
    INDEX idx_rd_evidence_type (type),
    INDEX idx_rd_evidence_date (date)
);

-- R&D costs
CREATE TABLE IF NOT EXISTS rd_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2),
    account_code VARCHAR(50),
    entity VARCHAR(100) DEFAULT 'ACT_PTY_LTD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (activity_id) REFERENCES rd_activities(activity_id) ON DELETE CASCADE,
    INDEX idx_rd_costs_activity (activity_id),
    INDEX idx_rd_costs_date (date),
    INDEX idx_rd_costs_category (category)
);

-- BAS reconciliation tracking
CREATE TABLE IF NOT EXISTS bas_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(20) NOT NULL,
    entity VARCHAR(100) NOT NULL DEFAULT 'ACT_PTY_LTD',
    gst_collected DECIMAL(10, 2),
    gst_paid DECIMAL(10, 2),
    net_gst DECIMAL(10, 2),
    payg_withheld DECIMAL(10, 2),
    total_payable DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'draft',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lodged_at TIMESTAMP WITH TIME ZONE,
    lodged_by UUID,
    
    UNIQUE(period, entity),
    INDEX idx_bas_period (period),
    INDEX idx_bas_entity (entity),
    INDEX idx_bas_status (status)
);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    data JSONB NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    requested_by VARCHAR(100),
    actioned_at TIMESTAMP WITH TIME ZONE,
    actioned_by UUID,
    action VARCHAR(50),
    notes TEXT,
    
    INDEX idx_approvals_type (type),
    INDEX idx_approvals_status (status),
    INDEX idx_approvals_requested (requested_at)
);

-- Agent metrics aggregation
CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour < 24),
    count INTEGER DEFAULT 0,
    sum DECIMAL(15, 4) DEFAULT 0,
    min DECIMAL(15, 4),
    max DECIMAL(15, 4),
    
    UNIQUE(agent_name, metric_name, date, hour),
    INDEX idx_metrics_agent_date (agent_name, date),
    INDEX idx_metrics_name_date (metric_name, date)
);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_agent_learning_updated_at
    BEFORE UPDATE ON agent_learning_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rd_activities_updated_at
    BEFORE UPDATE ON rd_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create function for agent metrics aggregation
CREATE OR REPLACE FUNCTION record_agent_metric(
    p_agent_name VARCHAR,
    p_metric_name VARCHAR,
    p_value DECIMAL
)
RETURNS VOID AS $$
DECLARE
    v_date DATE;
    v_hour INTEGER;
BEGIN
    v_date := CURRENT_DATE;
    v_hour := EXTRACT(HOUR FROM CURRENT_TIME);
    
    INSERT INTO agent_metrics (agent_name, metric_name, date, hour, count, sum, min, max)
    VALUES (p_agent_name, p_metric_name, v_date, v_hour, 1, p_value, p_value, p_value)
    ON CONFLICT (agent_name, metric_name, date, hour)
    DO UPDATE SET
        count = agent_metrics.count + 1,
        sum = agent_metrics.sum + p_value,
        min = LEAST(agent_metrics.min, p_value),
        max = GREATEST(agent_metrics.max, p_value);
END;
$$ LANGUAGE plpgsql;

-- Create view for agent health monitoring
CREATE OR REPLACE VIEW agent_health_status AS
SELECT
    ae.agent_name,
    COUNT(CASE WHEN ae.status = 'completed' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN ae.status = 'failed' THEN 1 END) as failed_runs,
    COUNT(*) as total_runs,
    AVG(ae.duration_ms) as avg_duration_ms,
    MAX(ae.started_at) as last_run,
    CASE 
        WHEN COUNT(CASE WHEN ae.status = 'failed' AND ae.started_at > NOW() - INTERVAL '1 hour' THEN 1 END) > 5 THEN 'unhealthy'
        WHEN MAX(ae.started_at) < NOW() - INTERVAL '24 hours' THEN 'stale'
        ELSE 'healthy'
    END as health_status
FROM agent_executions ae
WHERE ae.started_at > NOW() - INTERVAL '7 days'
GROUP BY ae.agent_name;

-- Create view for BAS period summary
CREATE OR REPLACE VIEW bas_period_summary AS
WITH invoice_summary AS (
    SELECT 
        DATE_TRUNC('quarter', date) as period_start,
        SUM(total_amount) as total_sales,
        SUM(tax_amount) as gst_collected
    FROM invoices
    WHERE status IN ('AUTHORISED', 'PAID')
    GROUP BY DATE_TRUNC('quarter', date)
),
bill_summary AS (
    SELECT 
        DATE_TRUNC('quarter', date) as period_start,
        SUM(total_amount) as total_purchases,
        SUM(tax_amount) as gst_paid
    FROM bills
    WHERE status = 'AUTHORISED'
    GROUP BY DATE_TRUNC('quarter', date)
),
payroll_summary AS (
    SELECT 
        DATE_TRUNC('quarter', pay_date) as period_start,
        SUM(tax_withheld) as total_payg
    FROM payroll
    GROUP BY DATE_TRUNC('quarter', pay_date)
)
SELECT 
    TO_CHAR(COALESCE(i.period_start, b.period_start, p.period_start), 'YYYY"Q"Q') as period,
    COALESCE(i.gst_collected, 0) as gst_collected,
    COALESCE(b.gst_paid, 0) as gst_paid,
    COALESCE(i.gst_collected, 0) - COALESCE(b.gst_paid, 0) as net_gst,
    COALESCE(p.total_payg, 0) as payg_withheld,
    (COALESCE(i.gst_collected, 0) - COALESCE(b.gst_paid, 0)) + COALESCE(p.total_payg, 0) as total_payable
FROM invoice_summary i
FULL OUTER JOIN bill_summary b ON i.period_start = b.period_start
FULL OUTER JOIN payroll_summary p ON COALESCE(i.period_start, b.period_start) = p.period_start
ORDER BY period DESC;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;