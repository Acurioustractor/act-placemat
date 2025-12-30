-- SIMPLE FIX - Only create tables that don't exist
-- Copy and paste this into Supabase SQL Editor

-- Create missing tables with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS outreach_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  strategy JSONB DEFAULT '{}',
  recommended_approach TEXT DEFAULT 'professional',
  success_probability INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  interaction_type TEXT DEFAULT 'other',
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  intent JSONB DEFAULT '{}',
  response JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_type TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  due_date DATE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_health_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  health_score INTEGER DEFAULT 50,
  risks TEXT[],
  opportunities TEXT[],
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions (safe to run multiple times)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Insert initial compliance data (safe with ON CONFLICT DO NOTHING)
INSERT INTO compliance_tracking (compliance_type, status, due_date, details) VALUES
('bas', 'current', '2025-01-28', '{"next_due": "2025-01-28"}'),
('payg', 'current', NULL, '{"status": "current"}'),
('superannuation', 'current', NULL, '{"status": "current"}'),
('rd_tax_incentive', 'current', NULL, '{"eligible": true, "potential_benefit": 46000}')
ON CONFLICT DO NOTHING;
