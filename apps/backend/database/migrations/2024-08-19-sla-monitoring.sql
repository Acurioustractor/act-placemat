-- SLA Monitoring and Performance Tracking Schema
-- Creates tables for tracking SLA compliance, data freshness, and performance metrics

-- SLA compliance history table
CREATE TABLE IF NOT EXISTS sla_compliance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Overall compliance scores
  overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  data_freshness_score NUMERIC(5,2) NOT NULL CHECK (data_freshness_score >= 0 AND data_freshness_score <= 100),
  api_performance_score NUMERIC(5,2) NOT NULL CHECK (api_performance_score >= 0 AND api_performance_score <= 100),
  data_quality_score NUMERIC(5,2) NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  processing_performance_score NUMERIC(5,2) NOT NULL CHECK (processing_performance_score >= 0 AND processing_performance_score <= 100),
  
  -- Detailed compliance data
  compliance_details JSONB DEFAULT '{}',
  
  -- Compliance level
  compliance_level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN overall_score >= 95 THEN 'excellent'
      WHEN overall_score >= 85 THEN 'good'
      WHEN overall_score >= 75 THEN 'acceptable'
      WHEN overall_score >= 60 THEN 'poor'
      ELSE 'critical'
    END
  ) STORED,
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_sla_compliance_recorded_at (recorded_at),
  INDEX idx_sla_compliance_overall_score (overall_score),
  INDEX idx_sla_compliance_level (compliance_level)
);

-- SLA alerts table
CREATE TABLE IF NOT EXISTS sla_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT UNIQUE NOT NULL,
  
  -- Alert classification
  alert_type TEXT NOT NULL CHECK (alert_type IN ('sla_compliance', 'data_freshness', 'api_performance', 'processing_time', 'system_health')),
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  
  -- Alert details
  score NUMERIC(5,2),
  issues TEXT[] DEFAULT '{}',
  details JSONB DEFAULT '{}',
  
  -- Alert status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_sla_alerts_type (alert_type),
  INDEX idx_sla_alerts_severity (severity),
  INDEX idx_sla_alerts_acknowledged (acknowledged),
  INDEX idx_sla_alerts_created_at (created_at),
  INDEX idx_sla_alerts_category (category)
);

-- API performance metrics table
CREATE TABLE IF NOT EXISTS api_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  
  -- Performance metrics
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  status_code INTEGER NOT NULL CHECK (status_code >= 100 AND status_code < 600),
  success BOOLEAN NOT NULL,
  
  -- Error details
  error_type TEXT,
  error_message TEXT,
  
  -- Request metadata
  user_agent TEXT,
  ip_address INET,
  request_size INTEGER,
  response_size INTEGER,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Performance classification
  performance_tier TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN response_time_ms < 500 THEN 'excellent'
      WHEN response_time_ms < 1000 THEN 'good'
      WHEN response_time_ms < 2000 THEN 'acceptable'
      WHEN response_time_ms < 5000 THEN 'slow'
      ELSE 'critical'
    END
  ) STORED,
  
  -- Indexing
  INDEX idx_api_performance_endpoint (endpoint),
  INDEX idx_api_performance_requested_at (requested_at),
  INDEX idx_api_performance_success (success),
  INDEX idx_api_performance_response_time (response_time_ms),
  INDEX idx_api_performance_tier (performance_tier),
  INDEX idx_api_performance_status (status_code)
);

-- Data freshness tracking table
CREATE TABLE IF NOT EXISTS data_freshness_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Table information
  table_name TEXT NOT NULL,
  schema_name TEXT DEFAULT 'public',
  
  -- Freshness metrics
  last_update_time TIMESTAMP WITH TIME ZONE,
  staleness_hours NUMERIC(8,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_update_time)) / 3600
  ) STORED,
  record_count INTEGER DEFAULT 0,
  
  -- SLA compliance
  freshness_sla_hours NUMERIC(8,2) NOT NULL DEFAULT 24,
  sla_compliant BOOLEAN GENERATED ALWAYS AS (
    last_update_time IS NOT NULL AND 
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_update_time)) / 3600 <= freshness_sla_hours
  ) STORED,
  
  -- Check details
  check_method TEXT DEFAULT 'automated',
  check_details JSONB DEFAULT '{}',
  
  -- Timestamps
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_data_freshness_table (table_name),
  INDEX idx_data_freshness_checked_at (checked_at),
  INDEX idx_data_freshness_compliant (sla_compliant),
  INDEX idx_data_freshness_staleness (staleness_hours)
);

-- Processing performance metrics table
CREATE TABLE IF NOT EXISTS processing_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation details
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  
  -- Performance metrics
  processing_time_ms INTEGER NOT NULL CHECK (processing_time_ms >= 0),
  records_processed INTEGER DEFAULT 1 CHECK (records_processed >= 0),
  throughput_records_per_second NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN processing_time_ms > 0 THEN (records_processed * 1000.0) / processing_time_ms
      ELSE 0
    END
  ) STORED,
  
  -- Success metrics
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Resource usage
  memory_usage_mb NUMERIC(8,2),
  cpu_usage_percent NUMERIC(5,2),
  
  -- SLA compliance
  sla_target_ms INTEGER,
  sla_compliant BOOLEAN GENERATED ALWAYS AS (
    sla_target_ms IS NULL OR processing_time_ms <= sla_target_ms
  ) STORED,
  
  -- Operation metadata
  operation_details JSONB DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Performance tier
  performance_tier TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN sla_target_ms IS NULL THEN 'unknown'
      WHEN processing_time_ms <= sla_target_ms * 0.5 THEN 'excellent'
      WHEN processing_time_ms <= sla_target_ms * 0.8 THEN 'good'
      WHEN processing_time_ms <= sla_target_ms THEN 'acceptable'
      WHEN processing_time_ms <= sla_target_ms * 1.5 THEN 'slow'
      ELSE 'critical'
    END
  ) STORED,
  
  -- Indexing
  INDEX idx_processing_performance_operation (operation_type, operation_name),
  INDEX idx_processing_performance_completed_at (completed_at),
  INDEX idx_processing_performance_success (success),
  INDEX idx_processing_performance_compliant (sla_compliant),
  INDEX idx_processing_performance_tier (performance_tier)
);

-- SLA targets configuration table
CREATE TABLE IF NOT EXISTS sla_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target classification
  target_category TEXT NOT NULL CHECK (target_category IN ('data_freshness', 'api_performance', 'data_quality', 'processing_performance')),
  target_name TEXT NOT NULL,
  
  -- Target values
  target_value NUMERIC(10,2) NOT NULL,
  target_unit TEXT NOT NULL,
  
  -- Threshold levels
  warning_threshold NUMERIC(5,2) DEFAULT 80, -- 80% of target
  critical_threshold NUMERIC(5,2) DEFAULT 50, -- 50% of target
  
  -- Target metadata
  description TEXT,
  measurement_method TEXT,
  business_impact TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (target_category, target_name),
  
  -- Indexing
  INDEX idx_sla_targets_category (target_category),
  INDEX idx_sla_targets_active (active)
);

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- System component
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('database', 'api', 'service', 'external')),
  
  -- Health metrics
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time_ms INTEGER,
  availability_percent NUMERIC(5,2),
  
  -- Error information
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- Resource metrics
  cpu_usage_percent NUMERIC(5,2),
  memory_usage_percent NUMERIC(5,2),
  disk_usage_percent NUMERIC(5,2),
  
  -- Health check details
  health_check_details JSONB DEFAULT '{}',
  
  -- Timestamps
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_system_health_component (component_name),
  INDEX idx_system_health_type (component_type),
  INDEX idx_system_health_status (status),
  INDEX idx_system_health_checked_at (checked_at)
);

-- Insert default SLA targets
INSERT INTO sla_targets (target_category, target_name, target_value, target_unit, description) VALUES
-- Data freshness targets
('data_freshness', 'stories', 24, 'hours', 'Stories data should be updated within 24 hours'),
('data_freshness', 'storytellers', 48, 'hours', 'Storyteller data should be updated within 48 hours'),
('data_freshness', 'normalized_data', 6, 'hours', 'Normalized data should be updated within 6 hours'),
('data_freshness', 'ml_embeddings', 12, 'hours', 'ML embeddings should be updated within 12 hours'),

-- API performance targets
('api_performance', 'response_time_p95', 2000, 'milliseconds', '95th percentile response time should be under 2 seconds'),
('api_performance', 'response_time_p99', 5000, 'milliseconds', '99th percentile response time should be under 5 seconds'),
('api_performance', 'availability', 99.9, 'percent', 'API availability should be 99.9% or higher'),
('api_performance', 'error_rate', 1.0, 'percent', 'API error rate should be 1% or lower'),

-- Data quality targets
('data_quality', 'completeness', 95, 'percent', 'Data completeness should be 95% or higher'),
('data_quality', 'accuracy', 90, 'percent', 'Data accuracy should be 90% or higher'),
('data_quality', 'consistency', 95, 'percent', 'Data consistency should be 95% or higher'),
('data_quality', 'validity', 98, 'percent', 'Data validity should be 98% or higher'),

-- Processing performance targets
('processing_performance', 'normalization_time', 30000, 'milliseconds', 'Data normalization should complete within 30 seconds'),
('processing_performance', 'embedding_generation', 60000, 'milliseconds', 'Embedding generation should complete within 1 minute'),
('processing_performance', 'quality_check_time', 10000, 'milliseconds', 'Quality checks should complete within 10 seconds')

ON CONFLICT (target_category, target_name) DO NOTHING;

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_sla_alerts_updated_at ON sla_alerts;
CREATE TRIGGER update_sla_alerts_updated_at
  BEFORE UPDATE ON sla_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sla_targets_updated_at ON sla_targets;
CREATE TRIGGER update_sla_targets_updated_at
  BEFORE UPDATE ON sla_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE sla_compliance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_freshness_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access to SLA data
CREATE POLICY "Public read access to SLA compliance" ON sla_compliance_history
  FOR SELECT USING (true);

CREATE POLICY "Public read access to SLA alerts" ON sla_alerts
  FOR SELECT USING (true);

CREATE POLICY "Public read access to API performance" ON api_performance_metrics
  FOR SELECT USING (true);

CREATE POLICY "Public read access to data freshness" ON data_freshness_tracking
  FOR SELECT USING (true);

CREATE POLICY "Public read access to processing performance" ON processing_performance_metrics
  FOR SELECT USING (true);

CREATE POLICY "Public read access to SLA targets" ON sla_targets
  FOR SELECT USING (true);

CREATE POLICY "Public read access to system health" ON system_health_metrics
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access to SLA compliance" ON sla_compliance_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to SLA alerts" ON sla_alerts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to API performance" ON api_performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data freshness" ON data_freshness_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to processing performance" ON processing_performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to SLA targets" ON sla_targets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to system health" ON system_health_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Useful views for monitoring dashboards
CREATE OR REPLACE VIEW sla_compliance_summary AS
SELECT 
  DATE(recorded_at) as compliance_date,
  AVG(overall_score) as avg_overall_score,
  AVG(data_freshness_score) as avg_data_freshness_score,
  AVG(api_performance_score) as avg_api_performance_score,
  AVG(data_quality_score) as avg_data_quality_score,
  AVG(processing_performance_score) as avg_processing_performance_score,
  COUNT(*) as measurement_count,
  MIN(overall_score) as min_overall_score,
  MAX(overall_score) as max_overall_score
FROM sla_compliance_history 
WHERE recorded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(recorded_at)
ORDER BY compliance_date DESC;

CREATE OR REPLACE VIEW active_alerts_summary AS
SELECT 
  alert_type,
  severity,
  COUNT(*) as alert_count,
  COUNT(*) FILTER (WHERE NOT acknowledged) as unacknowledged_count,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as newest_alert
FROM sla_alerts 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY alert_type, severity
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    WHEN 'info' THEN 3 
  END,
  alert_count DESC;

CREATE OR REPLACE VIEW api_performance_summary AS
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
  COUNT(*) FILTER (WHERE success) as successful_requests,
  COUNT(*) FILTER (WHERE NOT success) as failed_requests,
  (COUNT(*) FILTER (WHERE success)::numeric / COUNT(*) * 100) as success_rate
FROM api_performance_metrics 
WHERE requested_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY total_requests DESC;

CREATE OR REPLACE VIEW data_freshness_summary AS
SELECT 
  table_name,
  last_update_time,
  staleness_hours,
  freshness_sla_hours,
  sla_compliant,
  record_count,
  checked_at,
  CASE 
    WHEN staleness_hours <= freshness_sla_hours * 0.5 THEN 'excellent'
    WHEN staleness_hours <= freshness_sla_hours * 0.8 THEN 'good'
    WHEN staleness_hours <= freshness_sla_hours THEN 'acceptable'
    WHEN staleness_hours <= freshness_sla_hours * 1.5 THEN 'stale'
    ELSE 'critical'
  END as freshness_status
FROM data_freshness_tracking 
WHERE checked_at >= CURRENT_TIMESTAMP - INTERVAL '6 hours'
ORDER BY staleness_hours DESC;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant access to views
GRANT SELECT ON sla_compliance_summary TO anon, authenticated, service_role;
GRANT SELECT ON active_alerts_summary TO anon, authenticated, service_role;
GRANT SELECT ON api_performance_summary TO anon, authenticated, service_role;
GRANT SELECT ON data_freshness_summary TO anon, authenticated, service_role;

COMMENT ON TABLE sla_compliance_history IS 'Historical SLA compliance tracking and scoring';
COMMENT ON TABLE sla_alerts IS 'SLA violations and system alerts with acknowledgment tracking';
COMMENT ON TABLE api_performance_metrics IS 'API request performance metrics and response time tracking';
COMMENT ON TABLE data_freshness_tracking IS 'Data staleness monitoring and freshness SLA compliance';
COMMENT ON TABLE processing_performance_metrics IS 'Processing operation performance and throughput metrics';
COMMENT ON TABLE sla_targets IS 'Configurable SLA targets and thresholds';
COMMENT ON TABLE system_health_metrics IS 'Overall system health and component status monitoring';