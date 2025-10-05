-- Financial Agents Database Schema
-- Supports the agent operations described in your specification

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent Actions Audit Log
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(100),
    metadata JSONB,
    confidence DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_agent_actions_agent_name (agent_name),
    INDEX idx_agent_actions_created_at (created_at),
    INDEX idx_agent_actions_transaction_id (transaction_id)
);

-- Financial Exceptions for Human Review
CREATE TABLE IF NOT EXISTS financial_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(100) NOT NULL,
    exception_type VARCHAR(50) NOT NULL, -- 'matching_required', 'processing_error', 'policy_violation'
    agent_name VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    suggestions JSONB, -- JSON array of suggested actions/matches
    error_details JSONB,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'resolved', 'dismissed'
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_financial_exceptions_status (status),
    INDEX idx_financial_exceptions_agent (agent_name),
    INDEX idx_financial_exceptions_type (exception_type),
    INDEX idx_financial_exceptions_priority (priority)
);

-- Manual Review Tasks
CREATE TABLE IF NOT EXISTS manual_review_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'manual_review', 'approval_required', 'data_validation'
    title VARCHAR(255),
    description TEXT,
    payload JSONB,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    assigned_to VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_manual_review_tasks_status (status),
    INDEX idx_manual_review_tasks_agent (agent_name),
    INDEX idx_manual_review_tasks_due_date (due_date)
);

-- Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL,
    approval_type VARCHAR(20) NOT NULL, -- 'auto', 'propose', 'human_signoff'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    requested_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_approval_requests_status (status),
    INDEX idx_approval_requests_agent (agent_name),
    INDEX idx_approval_requests_expires_at (expires_at)
);

-- Bank Transfers (Thriday Allocations)
CREATE TABLE IF NOT EXISTS bank_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    transfer_type VARCHAR(50) NOT NULL, -- 'thriday_allocation', 'manual_transfer', 'bank_transfer'
    source_account VARCHAR(100) NOT NULL,
    target_account VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    allocation_percentage DECIMAL(5,2), -- For automatic allocations (e.g., 10% for GST)
    status VARCHAR(20) DEFAULT 'processed', -- 'processed', 'reversed', 'failed'
    processed_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_bank_transfers_transaction_id (transaction_id),
    INDEX idx_bank_transfers_type (transfer_type),
    INDEX idx_bank_transfers_source_account (source_account),
    INDEX idx_bank_transfers_created_at (created_at)
);

-- Enhanced Xero Transactions (extends your existing table)
-- This assumes you already have xero_transactions, we're adding agent-specific fields
DO $$
BEGIN
    -- Add agent-related columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'agent_processed') THEN
        ALTER TABLE xero_transactions ADD COLUMN agent_processed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'processing_agent') THEN
        ALTER TABLE xero_transactions ADD COLUMN processing_agent VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'confidence_score') THEN
        ALTER TABLE xero_transactions ADD COLUMN confidence_score DECIMAL(3,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'matched_item_id') THEN
        ALTER TABLE xero_transactions ADD COLUMN matched_item_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'matched_item_type') THEN
        ALTER TABLE xero_transactions ADD COLUMN matched_item_type VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'match_confidence') THEN
        ALTER TABLE xero_transactions ADD COLUMN match_confidence DECIMAL(3,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'transaction_type') THEN
        ALTER TABLE xero_transactions ADD COLUMN transaction_type VARCHAR(50) DEFAULT 'standard';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_transactions' AND column_name = 'transfer_processed') THEN
        ALTER TABLE xero_transactions ADD COLUMN transfer_processed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Categorization Rules
CREATE TABLE IF NOT EXISTS categorisation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    account_code VARCHAR(20),
    tax_code VARCHAR(50),
    tracking_categories JSONB,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8,
    priority INTEGER DEFAULT 0, -- Higher priority rules are applied first
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_categorisation_rules_pattern (pattern),
    INDEX idx_categorisation_rules_category (category),
    INDEX idx_categorisation_rules_active (is_active)
);

-- R&D Tax Incentive Activities
CREATE TABLE IF NOT EXISTS rdti_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(20) NOT NULL, -- 'core', 'supporting'
    hypothesis TEXT,
    uncertainty TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    project_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_rdti_activities_type (activity_type),
    INDEX idx_rdti_activities_status (status),
    INDEX idx_rdti_activities_project (project_code)
);

-- R&D Evidence Links
CREATE TABLE IF NOT EXISTS rdti_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES rdti_activities(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL, -- 'commit', 'doc', 'meeting', 'invoice', 'timesheet'
    reference VARCHAR(255) NOT NULL,
    link VARCHAR(500),
    description TEXT,
    date_captured DATE NOT NULL,
    file_path VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_rdti_evidence_activity (activity_id),
    INDEX idx_rdti_evidence_type (evidence_type),
    INDEX idx_rdti_evidence_date (date_captured)
);

-- BAS Preparation Data
CREATE TABLE IF NOT EXISTS bas_preparations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_code VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    bas_quarter VARCHAR(10) NOT NULL, -- e.g., '2025Q1'
    gst_collected DECIMAL(12,2) DEFAULT 0,
    gst_paid DECIMAL(12,2) DEFAULT 0,
    net_gst DECIMAL(12,2) DEFAULT 0,
    payg_withholding DECIMAL(12,2) DEFAULT 0,
    variance_from_previous DECIMAL(5,2), -- Percentage variance
    risk_transactions JSONB, -- Array of transactions requiring review
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'ready', 'lodged'
    prepared_by_agent BOOLEAN DEFAULT TRUE,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    lodgement_due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(entity_code, bas_quarter),
    INDEX idx_bas_preparations_entity (entity_code),
    INDEX idx_bas_preparations_quarter (bas_quarter),
    INDEX idx_bas_preparations_status (status)
);

-- Cash Flow Forecasts
CREATE TABLE IF NOT EXISTS cashflow_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_code VARCHAR(20) NOT NULL,
    forecast_date DATE NOT NULL,
    period_weeks INTEGER NOT NULL DEFAULT 13,
    scenario VARCHAR(20) NOT NULL, -- 'best', 'base', 'worst'
    opening_balance DECIMAL(12,2),
    projected_income DECIMAL(12,2),
    projected_expenses DECIMAL(12,2),
    projected_taxes DECIMAL(12,2),
    projected_loan_payments DECIMAL(12,2),
    closing_balance DECIMAL(12,2),
    runway_weeks INTEGER, -- Weeks until cash runs out
    confidence_score DECIMAL(3,2),
    assumptions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_cashflow_forecasts_entity (entity_code),
    INDEX idx_cashflow_forecasts_date (forecast_date),
    INDEX idx_cashflow_forecasts_scenario (scenario)
);

-- Policy Compliance Violations
CREATE TABLE IF NOT EXISTS policy_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_type VARCHAR(50) NOT NULL, -- 'spend_limit', 'approval_required', 'data_privacy'
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- 'transaction', 'bill', 'invoice'
    rule_violated TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    amount DECIMAL(12,2),
    description TEXT,
    action_taken VARCHAR(100),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'resolved', 'waived'
    detected_by_agent VARCHAR(100),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_policy_violations_type (violation_type),
    INDEX idx_policy_violations_severity (severity),
    INDEX idx_policy_violations_status (status),
    INDEX idx_policy_violations_item (item_id)
);

-- Agent Performance Metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL,
    metric_date DATE NOT NULL,
    total_processed INTEGER DEFAULT 0,
    auto_processed INTEGER DEFAULT 0,
    exceptions_created INTEGER DEFAULT 0,
    approvals_requested INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2), -- Percentage
    confidence_avg DECIMAL(3,2),
    custom_metrics JSONB, -- Agent-specific metrics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(agent_name, metric_date),
    INDEX idx_agent_metrics_agent (agent_name),
    INDEX idx_agent_metrics_date (metric_date)
);

-- Notification Queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(100) NOT NULL, -- '#finance', 'email', 'slack_dm'
    recipient VARCHAR(100),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    action_buttons JSONB,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_notification_queue_status (status),
    INDEX idx_notification_queue_channel (channel),
    INDEX idx_notification_queue_priority (priority),
    INDEX idx_notification_queue_created_at (created_at)
);

-- Insert default categorization rules based on your policy
INSERT INTO categorisation_rules (pattern, category, account_code, tax_code, confidence) VALUES
    ('telstra', 'Telephone & Internet', '449', 'GST on Expenses', 0.95),
    ('amazon web services', 'Computer Expenses', '453', 'GST on Expenses', 0.95),
    ('aws', 'Computer Expenses', '453', 'GST on Expenses', 0.90),
    ('google', 'Computer Expenses', '453', 'GST on Expenses', 0.90),
    ('uber', 'Motor Vehicle Expenses', '410', 'GST on Expenses', 0.85),
    ('woolworths', 'General Expenses', '463', 'GST on Expenses', 0.80),
    ('bunnings', 'Repairs and Maintenance', '425', 'GST on Expenses', 0.85),
    ('coffee', 'Meals & Entertainment', '420', 'GST on Expenses', 0.75),
    ('xero', 'Software', '453', 'GST on Expenses', 0.90)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xero_transactions_agent_processed ON xero_transactions(agent_processed);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_processing_agent ON xero_transactions(processing_agent);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_transaction_type ON xero_transactions(transaction_type);

-- Create triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_financial_exceptions_updated_at ON financial_exceptions;
CREATE TRIGGER update_financial_exceptions_updated_at
    BEFORE UPDATE ON financial_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manual_review_tasks_updated_at ON manual_review_tasks;
CREATE TRIGGER update_manual_review_tasks_updated_at
    BEFORE UPDATE ON manual_review_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rdti_activities_updated_at ON rdti_activities;
CREATE TRIGGER update_rdti_activities_updated_at
    BEFORE UPDATE ON rdti_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bas_preparations_updated_at ON bas_preparations;
CREATE TRIGGER update_bas_preparations_updated_at
    BEFORE UPDATE ON bas_preparations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for agent dashboard metrics
CREATE OR REPLACE VIEW agent_dashboard_metrics AS
SELECT
    agent_name,
    DATE(created_at) as date,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN action LIKE '%auto_%' THEN 1 END) as auto_actions,
    COUNT(CASE WHEN action LIKE '%exception%' THEN 1 END) as exceptions_created,
    AVG(CASE WHEN processing_time_ms IS NOT NULL THEN processing_time_ms END) as avg_processing_time,
    AVG(CASE WHEN confidence IS NOT NULL THEN confidence END) as avg_confidence
FROM agent_actions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_name, DATE(created_at)
ORDER BY date DESC, agent_name;

-- Create a view for pending approvals summary
CREATE OR REPLACE VIEW pending_approvals_summary AS
SELECT
    agent_name,
    approval_type,
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_request,
    MAX(created_at) as newest_request
FROM approval_requests
WHERE status = 'pending'
  AND expires_at > NOW()
GROUP BY agent_name, approval_type
ORDER BY oldest_request;

COMMENT ON TABLE agent_actions IS 'Immutable audit log of all agent actions for compliance and monitoring';
COMMENT ON TABLE financial_exceptions IS 'Human review queue for transactions that agents cannot process automatically';
COMMENT ON TABLE bank_transfers IS 'Thriday allocation transfers and other bank transfers processed by agents';
COMMENT ON TABLE rdti_activities IS 'R&D Tax Incentive activities for evidence tracking and registration';
COMMENT ON TABLE bas_preparations IS 'BAS preparation data generated by agents for quarterly lodgements';