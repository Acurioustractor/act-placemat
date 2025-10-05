-- Community Bookkeeping Schema
-- Enhanced bookkeeping features for indigenous and community-centered business development

-- Community-specific subscription management
CREATE TABLE IF NOT EXISTS community_bookkeeping_subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  categories JSONB DEFAULT '[]'::jsonb,
  frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  topics JSONB DEFAULT '["cashflow", "grants", "compliance", "community-impact"]'::jsonb,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  last_email_sent TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community business structure tracking
CREATE TABLE IF NOT EXISTS community_business_structures (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  structure_type VARCHAR(100) NOT NULL,
  registration_number VARCHAR(100),
  registration_date DATE,
  regulatory_body VARCHAR(100),
  compliance_requirements JSONB DEFAULT '[]'::jsonb,
  annual_obligations JSONB DEFAULT '[]'::jsonb,
  tax_benefits JSONB DEFAULT '[]'::jsonb,
  governance_model JSONB DEFAULT '{}'::jsonb,
  community_control_percentage DECIMAL(5,2),
  cultural_protocols JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant tracking and management
CREATE TABLE IF NOT EXISTS community_grants (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  grant_name VARCHAR(200) NOT NULL,
  funding_body VARCHAR(200) NOT NULL,
  grant_id VARCHAR(100),
  application_date DATE,
  start_date DATE,
  end_date DATE,
  total_amount DECIMAL(15,2),
  received_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('applied', 'approved', 'rejected', 'active', 'completed', 'suspended')),
  category VARCHAR(100),
  purpose TEXT,
  reporting_requirements JSONB DEFAULT '[]'::jsonb,
  compliance_status VARCHAR(50) DEFAULT 'current' CHECK (compliance_status IN ('current', 'overdue', 'submitted', 'approved')),
  next_report_due DATE,
  impact_metrics JSONB DEFAULT '{}'::jsonb,
  community_benefit JSONB DEFAULT '{}'::jsonb,
  cultural_outcomes JSONB DEFAULT '{}'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  contact_person VARCHAR(200),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant milestones and reporting
CREATE TABLE IF NOT EXISTS community_grant_milestones (
  id SERIAL PRIMARY KEY,
  grant_id INTEGER REFERENCES community_grants(id) ON DELETE CASCADE,
  milestone_name VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  completion_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  deliverables JSONB DEFAULT '[]'::jsonb,
  evidence_required JSONB DEFAULT '[]'::jsonb,
  budget_allocated DECIMAL(15,2),
  budget_spent DECIMAL(15,2) DEFAULT 0,
  impact_achieved JSONB DEFAULT '{}'::jsonb,
  community_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cultural and community impact tracking
CREATE TABLE IF NOT EXISTS community_impact_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  people_reached INTEGER DEFAULT 0,
  programs_delivered INTEGER DEFAULT 0,
  cultural_events INTEGER DEFAULT 0,
  land_restored DECIMAL(10,2) DEFAULT 0, -- hectares
  elders_engaged INTEGER DEFAULT 0,
  youth_engaged INTEGER DEFAULT 0,
  languages_supported INTEGER DEFAULT 0,
  traditional_practices_maintained INTEGER DEFAULT 0,
  economic_benefit DECIMAL(15,2) DEFAULT 0,
  employment_created INTEGER DEFAULT 0,
  skills_developed INTEGER DEFAULT 0,
  community_assets_built DECIMAL(15,2) DEFAULT 0,
  partnerships_formed INTEGER DEFAULT 0,
  knowledge_shared_hours DECIMAL(8,2) DEFAULT 0,
  cultural_preservation_activities INTEGER DEFAULT 0,
  environmental_improvement_score DECIMAL(3,1) DEFAULT 0, -- 0-10 scale
  community_satisfaction_score DECIMAL(3,1) DEFAULT 0, -- 0-10 scale
  self_determination_index DECIMAL(3,1) DEFAULT 0, -- 0-10 scale
  additional_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced transaction table to add community context
-- Add columns to existing bookkeeping_transactions table
DO $$ 
BEGIN
  -- Add community_context column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookkeeping_transactions' 
    AND column_name = 'community_context'
  ) THEN
    ALTER TABLE bookkeeping_transactions 
    ADD COLUMN community_context TEXT;
  END IF;

  -- Add cultural_significance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookkeeping_transactions' 
    AND column_name = 'cultural_significance'
  ) THEN
    ALTER TABLE bookkeeping_transactions 
    ADD COLUMN cultural_significance VARCHAR(20) CHECK (cultural_significance IN ('low', 'medium', 'high', 'critical'));
  END IF;

  -- Add grant_related column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookkeeping_transactions' 
    AND column_name = 'grant_related'
  ) THEN
    ALTER TABLE bookkeeping_transactions 
    ADD COLUMN grant_related INTEGER REFERENCES community_grants(id);
  END IF;

  -- Add community_benefit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookkeeping_transactions' 
    AND column_name = 'community_benefit'
  ) THEN
    ALTER TABLE bookkeeping_transactions 
    ADD COLUMN community_benefit JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Community financial planning and projections
CREATE TABLE IF NOT EXISTS community_financial_projections (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  projection_name VARCHAR(200) NOT NULL,
  time_horizon INTEGER NOT NULL, -- months
  created_date DATE DEFAULT CURRENT_DATE,
  base_assumptions JSONB DEFAULT '{}'::jsonb,
  
  -- Revenue projections
  grant_income_projected DECIMAL(15,2) DEFAULT 0,
  enterprise_income_projected DECIMAL(15,2) DEFAULT 0,
  partnership_income_projected DECIMAL(15,2) DEFAULT 0,
  investment_income_projected DECIMAL(15,2) DEFAULT 0,
  
  -- Expense projections
  cultural_expenses_projected DECIMAL(15,2) DEFAULT 0,
  operational_expenses_projected DECIMAL(15,2) DEFAULT 0,
  land_care_expenses_projected DECIMAL(15,2) DEFAULT 0,
  capacity_building_expenses_projected DECIMAL(15,2) DEFAULT 0,
  
  -- Impact projections
  people_to_reach INTEGER DEFAULT 0,
  programs_to_deliver INTEGER DEFAULT 0,
  cultural_events_planned INTEGER DEFAULT 0,
  land_to_restore DECIMAL(10,2) DEFAULT 0,
  
  -- Risk assessment
  funding_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (funding_risk_level IN ('low', 'medium', 'high', 'critical')),
  capacity_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (capacity_risk_level IN ('low', 'medium', 'high', 'critical')),
  external_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (external_risk_level IN ('low', 'medium', 'high', 'critical')),
  
  scenario_analysis JSONB DEFAULT '{}'::jsonb,
  mitigation_strategies JSONB DEFAULT '[]'::jsonb,
  success_indicators JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_grants_tenant_status ON community_grants(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_community_grants_category ON community_grants(category);
CREATE INDEX IF NOT EXISTS idx_community_grants_dates ON community_grants(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_community_impact_tenant_period ON community_impact_metrics(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_bookkeeping_transactions_grant ON bookkeeping_transactions(grant_related) WHERE grant_related IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookkeeping_transactions_cultural ON bookkeeping_transactions(cultural_significance) WHERE cultural_significance IS NOT NULL;

-- Row Level Security policies
ALTER TABLE community_bookkeeping_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_business_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_grant_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_financial_projections ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be enhanced based on specific auth requirements)
CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" ON community_bookkeeping_subscriptions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Enable all access for service role" ON community_business_structures
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Enable all access for service role" ON community_grants
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Enable all access for service role" ON community_grant_milestones
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Enable all access for service role" ON community_impact_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Enable all access for service role" ON community_financial_projections
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for community insights
CREATE OR REPLACE FUNCTION calculate_community_impact_score(
  p_tenant_id VARCHAR(100),
  p_period_months INTEGER DEFAULT 12
) RETURNS DECIMAL(3,1) AS $$
DECLARE
  impact_score DECIMAL(3,1) := 0;
  metrics_record RECORD;
BEGIN
  SELECT 
    AVG(community_satisfaction_score) as avg_satisfaction,
    AVG(self_determination_index) as avg_determination,
    AVG(environmental_improvement_score) as avg_environment,
    SUM(people_reached) as total_people,
    SUM(cultural_events) as total_events
  INTO metrics_record
  FROM community_impact_metrics 
  WHERE tenant_id = p_tenant_id 
    AND period_start >= CURRENT_DATE - INTERVAL '1 month' * p_period_months;

  -- Calculate weighted impact score
  impact_score := COALESCE(
    (metrics_record.avg_satisfaction * 0.3 + 
     metrics_record.avg_determination * 0.3 + 
     metrics_record.avg_environment * 0.2 + 
     LEAST(metrics_record.total_people / 100.0, 1.0) * 10 * 0.1 +
     LEAST(metrics_record.total_events / 10.0, 1.0) * 10 * 0.1), 
    0
  );

  RETURN GREATEST(0, LEAST(10, impact_score));
END;
$$ LANGUAGE plpgsql;

-- Function to get grant compliance status
CREATE OR REPLACE FUNCTION get_grant_compliance_summary(
  p_tenant_id VARCHAR(100)
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_grants', COUNT(*),
    'active_grants', SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END),
    'overdue_reports', SUM(CASE WHEN compliance_status = 'overdue' THEN 1 ELSE 0 END),
    'upcoming_deadlines', SUM(CASE WHEN next_report_due <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END),
    'total_funding', SUM(total_amount),
    'received_funding', SUM(received_amount)
  ) INTO result
  FROM community_grants
  WHERE tenant_id = p_tenant_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE community_bookkeeping_subscriptions IS 'Manages email subscriptions for community-focused financial updates';
COMMENT ON TABLE community_business_structures IS 'Tracks business entity structures suitable for indigenous and community organizations';
COMMENT ON TABLE community_grants IS 'Comprehensive grant tracking with community impact focus';
COMMENT ON TABLE community_grant_milestones IS 'Detailed milestone tracking for grant compliance and delivery';
COMMENT ON TABLE community_impact_metrics IS 'Quantitative and qualitative metrics for community and cultural impact';
COMMENT ON TABLE community_financial_projections IS 'Financial planning tools designed for community-centered business models';

COMMENT ON FUNCTION calculate_community_impact_score IS 'Calculates a composite community impact score (0-10) based on various metrics';
COMMENT ON FUNCTION get_grant_compliance_summary IS 'Provides overview of grant compliance status and funding summary';