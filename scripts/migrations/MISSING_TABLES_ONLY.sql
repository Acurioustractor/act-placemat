-- MISSING TABLES ONLY - Simple SQL to complete the migration
-- Copy and paste ONLY this into Supabase SQL Editor

-- Create the 5 missing tables with minimal syntax

-- 1. Outreach Strategies
CREATE TABLE outreach_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  strategy JSONB DEFAULT '{}',
  recommended_approach TEXT DEFAULT 'professional',
  best_topics TEXT[],
  timing TEXT DEFAULT 'within-week',
  mutual_connections JSONB DEFAULT '[]',
  value_proposition TEXT,
  email_template TEXT,
  follow_up_sequence TEXT[],
  success_probability INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Interactions
CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  interaction_type TEXT DEFAULT 'other',
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  sentiment TEXT DEFAULT 'neutral',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Business Agent Queries
CREATE TABLE business_agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  intent JSONB DEFAULT '{}',
  response JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.50,
  sources TEXT[],
  actions TEXT[],
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Compliance Tracking
CREATE TABLE compliance_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_type TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  due_date DATE,
  details JSONB DEFAULT '{}',
  next_actions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Project Health Analysis
CREATE TABLE project_health_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  health_score INTEGER DEFAULT 50,
  risks TEXT[],
  opportunities TEXT[],
  recommendations TEXT[],
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON outreach_strategies TO service_role;
GRANT ALL ON contact_interactions TO service_role;
GRANT ALL ON business_agent_queries TO service_role;
GRANT ALL ON compliance_tracking TO service_role;
GRANT ALL ON project_health_analysis TO service_role;

GRANT SELECT ON outreach_strategies TO anon;
GRANT SELECT ON contact_interactions TO anon;
GRANT SELECT ON business_agent_queries TO anon;
GRANT SELECT ON compliance_tracking TO anon;
GRANT SELECT ON project_health_analysis TO anon;

-- Insert initial compliance data
INSERT INTO compliance_tracking (compliance_type, status, due_date, details) VALUES
('bas', 'current', '2025-01-28', '{"next_due": "2025-01-28"}'),
('payg', 'current', NULL, '{"status": "current"}'),
('superannuation', 'current', NULL, '{"status": "current"}'),
('rd_tax_incentive', 'current', NULL, '{"eligible": true, "potential_benefit": 46000}');
