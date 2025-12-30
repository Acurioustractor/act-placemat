-- ACT Platform v3 Intelligence Tables - FIXED VERSION
-- This version fixes all SQL errors and creates tables in the correct order

-- Enable necessary extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- DROP EXISTING TABLES (Clean slate)
-- ============================================
DROP TABLE IF EXISTS business_alerts CASCADE;
DROP TABLE IF EXISTS project_health_analysis CASCADE;
DROP TABLE IF EXISTS grant_opportunities CASCADE;
DROP TABLE IF EXISTS compliance_tracking CASCADE;
DROP TABLE IF EXISTS business_agent_queries CASCADE;
DROP TABLE IF EXISTS contact_interactions CASCADE;
DROP TABLE IF EXISTS outreach_strategies CASCADE;
DROP TABLE IF EXISTS project_contact_matches CASCADE;
DROP TABLE IF EXISTS contact_enrichments CASCADE;
DROP TABLE IF EXISTS contact_intelligence CASCADE;

-- ============================================
-- CREATE TABLES IN CORRECT ORDER
-- ============================================

-- 1. Contact Intelligence Scores
CREATE TABLE contact_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  intelligence JSONB DEFAULT '{}'::jsonb,
  collaboration_score INTEGER DEFAULT 50,
  response_rate INTEGER DEFAULT 70,
  influence_score INTEGER DEFAULT 50,
  last_interaction TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  project_matches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Enrichments
CREATE TABLE contact_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  enrichment JSONB DEFAULT '{}'::jsonb,
  mode TEXT DEFAULT 'ai',
  email_suggestions TEXT[] DEFAULT ARRAY[]::TEXT[],
  collaboration_potential INTEGER DEFAULT 50,
  reasoning TEXT,
  project_alignment TEXT[] DEFAULT ARRAY[]::TEXT[],
  outreach_strategy JSONB DEFAULT '{}'::jsonb,
  risk_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
  value_proposition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project Contact Matches
CREATE TABLE project_contact_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 50,
  reasoning TEXT,
  suggested_role TEXT DEFAULT 'Supporter',
  priority TEXT DEFAULT 'medium',
  estimated_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Outreach Strategies
CREATE TABLE outreach_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  strategy JSONB DEFAULT '{}'::jsonb,
  recommended_approach TEXT DEFAULT 'professional',
  best_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  timing TEXT DEFAULT 'within-week',
  mutual_connections JSONB DEFAULT '[]'::jsonb,
  value_proposition TEXT,
  email_template TEXT,
  follow_up_sequence TEXT[] DEFAULT ARRAY[]::TEXT[],
  success_probability INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Contact Interactions
CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  interaction_type TEXT NOT NULL DEFAULT 'other',
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  sentiment TEXT DEFAULT 'neutral',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Business Agent Queries
CREATE TABLE business_agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  intent JSONB DEFAULT '{}'::jsonb,
  response JSONB DEFAULT '{}'::jsonb,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Compliance Tracking
CREATE TABLE compliance_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_type TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  due_date DATE,
  details JSONB DEFAULT '{}'::jsonb,
  next_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Grant Opportunities
CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  amount_min INTEGER DEFAULT 0,
  amount_max INTEGER DEFAULT 0,
  deadline DATE,
  source TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 50,
  application_status TEXT DEFAULT 'not_applied',
  url TEXT,
  requirements TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Project Health Analysis
CREATE TABLE project_health_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  health_score INTEGER NOT NULL DEFAULT 50,
  risks TEXT[] DEFAULT ARRAY[]::TEXT[],
  opportunities TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Business Alerts
CREATE TABLE business_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_required TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Contact Intelligence Indexes
CREATE INDEX idx_contact_intelligence_contact_id ON contact_intelligence(contact_id);
CREATE INDEX idx_contact_intelligence_updated_at ON contact_intelligence(updated_at DESC);
CREATE INDEX idx_contact_intelligence_collaboration_score ON contact_intelligence(collaboration_score DESC);

-- Contact Enrichments Indexes
CREATE INDEX idx_contact_enrichments_contact_id ON contact_enrichments(contact_id);
CREATE INDEX idx_contact_enrichments_created_at ON contact_enrichments(created_at DESC);
CREATE INDEX idx_contact_enrichments_collaboration_potential ON contact_enrichments(collaboration_potential DESC);

-- Project Contact Matches Indexes
CREATE INDEX idx_project_contact_matches_project_id ON project_contact_matches(project_id);
CREATE INDEX idx_project_contact_matches_contact_id ON project_contact_matches(contact_id);
CREATE INDEX idx_project_contact_matches_match_score ON project_contact_matches(match_score DESC);

-- Outreach Strategies Indexes
CREATE INDEX idx_outreach_strategies_contact_id ON outreach_strategies(contact_id);
CREATE INDEX idx_outreach_strategies_success_probability ON outreach_strategies(success_probability DESC);

-- Contact Interactions Indexes
CREATE INDEX idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_interaction_date ON contact_interactions(interaction_date DESC);
CREATE INDEX idx_contact_interactions_interaction_type ON contact_interactions(interaction_type);

-- Business Agent Queries Indexes
CREATE INDEX idx_business_agent_queries_created_at ON business_agent_queries(created_at DESC);
CREATE INDEX idx_business_agent_queries_confidence ON business_agent_queries(confidence DESC);

-- Compliance Tracking Indexes
CREATE INDEX idx_compliance_tracking_compliance_type ON compliance_tracking(compliance_type);
CREATE INDEX idx_compliance_tracking_status ON compliance_tracking(status);
CREATE INDEX idx_compliance_tracking_due_date ON compliance_tracking(due_date);

-- Grant Opportunities Indexes
CREATE INDEX idx_grant_opportunities_deadline ON grant_opportunities(deadline);
CREATE INDEX idx_grant_opportunities_relevance_score ON grant_opportunities(relevance_score DESC);
CREATE INDEX idx_grant_opportunities_application_status ON grant_opportunities(application_status);

-- Project Health Analysis Indexes
CREATE INDEX idx_project_health_analysis_project_id ON project_health_analysis(project_id);
CREATE INDEX idx_project_health_analysis_health_score ON project_health_analysis(health_score);
CREATE INDEX idx_project_health_analysis_analysis_date ON project_health_analysis(analysis_date DESC);

-- Business Alerts Indexes
CREATE INDEX idx_business_alerts_alert_type ON business_alerts(alert_type);
CREATE INDEX idx_business_alerts_priority ON business_alerts(priority DESC);
CREATE INDEX idx_business_alerts_status ON business_alerts(status);
CREATE INDEX idx_business_alerts_due_date ON business_alerts(due_date);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant all permissions to service role
GRANT ALL ON contact_intelligence TO service_role;
GRANT ALL ON contact_enrichments TO service_role;
GRANT ALL ON project_contact_matches TO service_role;
GRANT ALL ON outreach_strategies TO service_role;
GRANT ALL ON contact_interactions TO service_role;
GRANT ALL ON business_agent_queries TO service_role;
GRANT ALL ON compliance_tracking TO service_role;
GRANT ALL ON grant_opportunities TO service_role;
GRANT ALL ON project_health_analysis TO service_role;
GRANT ALL ON business_alerts TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON contact_intelligence TO anon;
GRANT SELECT ON contact_enrichments TO anon;
GRANT SELECT ON project_contact_matches TO anon;
GRANT SELECT ON outreach_strategies TO anon;
GRANT SELECT ON contact_interactions TO anon;
GRANT SELECT ON business_agent_queries TO anon;
GRANT SELECT ON compliance_tracking TO anon;
GRANT SELECT ON grant_opportunities TO anon;
GRANT SELECT ON project_health_analysis TO anon;
GRANT SELECT ON business_alerts TO anon;

-- ============================================
-- INSERT INITIAL DATA
-- ============================================

-- Initial compliance tracking records
INSERT INTO compliance_tracking (compliance_type, status, due_date, details) VALUES
('bas', 'current', '2025-01-28', '{"next_due": "2025-01-28", "status": "current"}'),
('payg', 'current', NULL, '{"status": "current"}'),
('superannuation', 'current', NULL, '{"status": "current"}'),
('rd_tax_incentive', 'current', NULL, '{"eligible": true, "potential_benefit": 46000}'),
('indigenous_programs', 'current', NULL, '{"programs": []}');

-- Sample grant opportunities
INSERT INTO grant_opportunities (name, description, amount_min, amount_max, deadline, source, relevance_score, url) VALUES
('Indigenous Business Direct', 'Direct funding for Indigenous businesses', 50000, 250000, '2025-02-15', 'indigenous_programs', 85, 'https://www.indigenous.gov.au/funding'),
('R&D Tax Incentive', 'Tax incentive for research and development activities', 0, 1000000, '2025-06-30', 'ato.gov.au', 90, 'https://www.ato.gov.au/business/research-and-development-tax-incentive/'),
('Entrepreneurs Programme', 'Support for high-growth potential businesses', 0, 1000000, NULL, 'industry.gov.au', 75, 'https://www.industry.gov.au/funding-and-incentives/entrepreneurs-programme');

-- Sample business alerts
INSERT INTO business_alerts (alert_type, priority, title, description, action_required, due_date, metadata) VALUES
('compliance', 8, 'BAS Due Soon', 'Business Activity Statement is due on January 28, 2025', 'Review and submit BAS', '2025-01-28T00:00:00Z', '{"compliance_type": "bas", "amount_estimate": 4200}'),
('opportunity', 7, 'R&D Tax Incentive Available', 'Potential $46,000 benefit from R&D Tax Incentive program', 'Review eligibility and prepare application', '2025-06-30T00:00:00Z', '{"potential_benefit": 46000, "program": "rd_tax_incentive"}');
