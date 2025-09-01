-- Intelligence Hub Integration Schema
-- Tracks tasks submitted to the LangGraph Intelligence Hub for monitoring and analytics

-- Table to track intelligence hub tasks
CREATE TABLE IF NOT EXISTS intelligence_hub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) NOT NULL UNIQUE, -- UUID from Intelligence Hub
    job_id VARCHAR(255), -- Job ID from Intelligence Hub queue
    type VARCHAR(100) NOT NULL, -- Task type (financial-analysis, research-query, etc.)
    payload JSONB NOT NULL, -- Task payload data
    priority INTEGER DEFAULT 5 CHECK (priority >= 0 AND priority <= 10),
    transparency_level VARCHAR(20) DEFAULT 'community' CHECK (transparency_level IN ('public', 'community', 'private')),
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, processing, completed, failed
    result JSONB, -- Task result when completed
    error_message TEXT, -- Error message if failed
    submitted_by VARCHAR(255), -- User ID or 'anonymous'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    australian_processing BOOLEAN DEFAULT true,
    data_residency VARCHAR(50) DEFAULT 'Australia',
    compliance_level VARCHAR(100) DEFAULT 'Australian-Privacy-Act'
);

-- Table to track community votes on tasks
CREATE TABLE IF NOT EXISTS intelligence_hub_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) NOT NULL REFERENCES intelligence_hub_tasks(task_id) ON DELETE CASCADE,
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('up', 'down')),
    voter_id VARCHAR(255), -- User ID if authenticated
    voter_ip INET, -- IP address for anonymous votes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate votes from same user/IP per task
    UNIQUE(task_id, voter_id) WHERE voter_id IS NOT NULL,
    UNIQUE(task_id, voter_ip) WHERE voter_id IS NULL
);

-- Table to track intelligence hub system metrics
CREATE TABLE IF NOT EXISTS intelligence_hub_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for time-series queries
    INDEX idx_intelligence_hub_metrics_time (recorded_at),
    INDEX idx_intelligence_hub_metrics_name (metric_name)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_intelligence_hub_tasks_updated_at ON intelligence_hub_tasks;
CREATE TRIGGER update_intelligence_hub_tasks_updated_at
    BEFORE UPDATE ON intelligence_hub_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_tasks_type ON intelligence_hub_tasks(type);
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_tasks_status ON intelligence_hub_tasks(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_tasks_submitted_by ON intelligence_hub_tasks(submitted_by);
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_tasks_created_at ON intelligence_hub_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_tasks_priority ON intelligence_hub_tasks(priority);

CREATE INDEX IF NOT EXISTS idx_intelligence_hub_votes_task_id ON intelligence_hub_votes(task_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_hub_votes_created_at ON intelligence_hub_votes(created_at);

-- View for task analytics
CREATE OR REPLACE VIEW intelligence_hub_task_analytics AS
SELECT 
    type,
    status,
    COUNT(*) as task_count,
    AVG(priority) as avg_priority,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time_seconds,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    DATE_TRUNC('day', created_at) as day
FROM intelligence_hub_tasks 
GROUP BY type, status, DATE_TRUNC('day', created_at)
ORDER BY day DESC, type, status;

-- View for vote analytics
CREATE OR REPLACE VIEW intelligence_hub_vote_analytics AS
SELECT 
    t.type,
    t.task_id,
    COUNT(v.id) as total_votes,
    COUNT(CASE WHEN v.vote = 'up' THEN 1 END) as up_votes,
    COUNT(CASE WHEN v.vote = 'down' THEN 1 END) as down_votes,
    (COUNT(CASE WHEN v.vote = 'up' THEN 1 END)::FLOAT / NULLIF(COUNT(v.id), 0)) as approval_ratio
FROM intelligence_hub_tasks t
LEFT JOIN intelligence_hub_votes v ON t.task_id = v.task_id
GROUP BY t.type, t.task_id
ORDER BY total_votes DESC, approval_ratio DESC;

-- Function to record system metrics
CREATE OR REPLACE FUNCTION record_intelligence_hub_metric(
    p_metric_name VARCHAR(100),
    p_metric_value NUMERIC DEFAULT NULL,
    p_metric_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO intelligence_hub_metrics (metric_name, metric_value, metric_data)
    VALUES (p_metric_name, p_metric_value, p_metric_data)
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON intelligence_hub_tasks TO authenticated;
GRANT SELECT, INSERT ON intelligence_hub_votes TO authenticated;
GRANT SELECT ON intelligence_hub_metrics TO authenticated;
GRANT SELECT ON intelligence_hub_task_analytics TO authenticated;
GRANT SELECT ON intelligence_hub_vote_analytics TO authenticated;

-- Row Level Security policies
ALTER TABLE intelligence_hub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_hub_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_hub_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own tasks and public/community transparency tasks
CREATE POLICY "Users can view appropriate tasks" ON intelligence_hub_tasks
    FOR SELECT USING (
        submitted_by = auth.uid()::text 
        OR transparency_level IN ('public', 'community')
        OR auth.role() = 'service_role'
    );

-- Policy: Users can insert tasks
CREATE POLICY "Users can submit tasks" ON intelligence_hub_tasks
    FOR INSERT WITH CHECK (
        submitted_by = auth.uid()::text 
        OR submitted_by = 'anonymous'
        OR auth.role() = 'service_role'
    );

-- Policy: Only service role can update tasks (for status updates from Intelligence Hub)
CREATE POLICY "Service role can update tasks" ON intelligence_hub_tasks
    FOR UPDATE USING (auth.role() = 'service_role');

-- Policy: Users can vote on public and community tasks
CREATE POLICY "Users can vote on public tasks" ON intelligence_hub_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM intelligence_hub_tasks t 
            WHERE t.task_id = intelligence_hub_votes.task_id 
            AND t.transparency_level IN ('public', 'community')
        )
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Users can submit votes" ON intelligence_hub_votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM intelligence_hub_tasks t 
            WHERE t.task_id = intelligence_hub_votes.task_id 
            AND t.transparency_level IN ('public', 'community')
        )
        OR auth.role() = 'service_role'
    );

-- Policy: Metrics are readable by authenticated users
CREATE POLICY "Authenticated users can view metrics" ON intelligence_hub_metrics
    FOR SELECT USING (auth.role() IS NOT NULL);

-- Comments for documentation
COMMENT ON TABLE intelligence_hub_tasks IS 'Tracks tasks submitted to the LangGraph Intelligence Hub for orchestration and multi-agent processing';
COMMENT ON TABLE intelligence_hub_votes IS 'Community votes for democratic prioritization of Intelligence Hub tasks';
COMMENT ON TABLE intelligence_hub_metrics IS 'System performance and health metrics from Intelligence Hub integration';

COMMENT ON COLUMN intelligence_hub_tasks.task_id IS 'Unique task identifier from Intelligence Hub (UUID)';
COMMENT ON COLUMN intelligence_hub_tasks.job_id IS 'Queue job identifier from Intelligence Hub task queue';
COMMENT ON COLUMN intelligence_hub_tasks.type IS 'Task type: financial-analysis, research-query, compliance-check, etc.';
COMMENT ON COLUMN intelligence_hub_tasks.payload IS 'Task input data and parameters as JSON';
COMMENT ON COLUMN intelligence_hub_tasks.transparency_level IS 'Data access level: public (open), community (members), private (restricted)';
COMMENT ON COLUMN intelligence_hub_tasks.australian_processing IS 'Confirms task was processed within Australian jurisdiction';

COMMENT ON VIEW intelligence_hub_task_analytics IS 'Aggregated analytics for Intelligence Hub task performance and trends';
COMMENT ON VIEW intelligence_hub_vote_analytics IS 'Community voting patterns and approval ratios for tasks';

-- Sample data for testing (only in development)
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        INSERT INTO intelligence_hub_tasks (task_id, type, payload, priority, transparency_level, submitted_by, status) VALUES
        ('test-task-001', 'research-query', '{"query": "Australian renewable energy policy", "scope": "national"}', 7, 'public', 'test-user', 'completed'),
        ('test-task-002', 'financial-analysis', '{"analysisType": "budget-forecast", "data": {"budget": 50000}}', 8, 'community', 'test-user', 'processing'),
        ('test-task-003', 'compliance-check', '{"documentType": "privacy-policy", "regulations": ["Australian-Privacy-Act"]}', 9, 'community', 'test-user', 'submitted')
        ON CONFLICT (task_id) DO NOTHING;
        
        INSERT INTO intelligence_hub_votes (task_id, vote, voter_id) VALUES
        ('test-task-001', 'up', 'test-user-1'),
        ('test-task-001', 'up', 'test-user-2'),
        ('test-task-002', 'up', 'test-user-1'),
        ('test-task-003', 'down', 'test-user-2')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;