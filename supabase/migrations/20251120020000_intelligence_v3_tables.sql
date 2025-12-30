-- ACT Platform v3 Intelligence Tables
-- Support for Business Agent v3 and CRM System v3

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- Contact Intelligence Tables
-- ============================================

-- Contact Intelligence Scores
CREATE TABLE IF NOT EXISTS contact_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  intelligence JSONB NOT NULL DEFAULT '{}'::jsonb,
  collaboration_score INTEGER DEFAULT 50 CHECK (collaboration_score >= 0 AND collaboration_score <= 100),
  response_rate INTEGER DEFAULT 70 CHECK (response_rate >= 0 AND response_rate <= 100),
  influence_score INTEGER DEFAULT 50 CHECK (influence_score >= 0 AND influence_score <= 100),
  last_interaction TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  project_matches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Enrichments (AI Analysis)
CREATE TABLE IF NOT EXISTS contact_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  enrichment JSONB NOT NULL DEFAULT '{}'::jsonb,
  mode TEXT NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai', 'basic')),
  email_suggestions TEXT[] DEFAULT '{}',
  collaboration_potential INTEGER DEFAULT 50 CHECK (collaboration_potential >= 0 AND collaboration_potential <= 100),
  reasoning TEXT,
  project_alignment TEXT[] DEFAULT '{}',
  outreach_strategy JSONB DEFAULT '{}'::jsonb,
  risk_factors TEXT[] DEFAULT '{}',
  value_proposition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Contact Matches
CREATE TABLE IF NOT EXISTS project_contact_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reasoning TEXT,
  suggested_role TEXT DEFAULT 'Supporter',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  estimated_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, contact_id)
);

-- Outreach Strategies
CREATE TABLE IF NOT EXISTS outreach_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_approach TEXT DEFAULT 'professional',
  best_topics TEXT[] DEFAULT '{}',
  timing TEXT DEFAULT 'within-week',
  mutual_connections JSONB DEFAULT '[]'::jsonb,
  value_proposition TEXT,
  email_template TEXT,
  follow_up_sequence TEXT[] DEFAULT '{}',
  success_probability INTEGER DEFAULT 70 CHECK (success_probability >= 0 AND success_probability <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Interactions (Track engagement history)
CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('email', 'meeting', 'call', 'linkedin', 'other')),
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Business Intelligence Tables
-- ============================================

-- Business Agent Queries (Track all queries for learning)
CREATE TABLE IF NOT EXISTS business_agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  intent JSONB DEFAULT '{}'::jsonb,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  sources TEXT[] DEFAULT '{}',
  actions TEXT[] DEFAULT '{}',
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'partially_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Tracking
CREATE TABLE IF NOT EXISTS compliance_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_type TEXT NOT NULL CHECK (compliance_type IN ('bas', 'payg', 'superannuation', 'rd_tax_incentive', 'indigenous_programs')),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('current', 'due_soon', 'overdue', 'unknown')),
  due_date DATE,
  details JSONB DEFAULT '{}'::jsonb,
  next_actions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant Opportunities
CREATE TABLE IF NOT EXISTS grant_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  amount_min INTEGER DEFAULT 0,
  amount_max INTEGER DEFAULT 0,
  deadline DATE,
  source TEXT NOT NULL, -- 'grants.gov.au', 'indigenous_programs', etc.
  relevance_score INTEGER DEFAULT 50 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  application_status TEXT DEFAULT 'not_applied' CHECK (application_status IN ('not_applied', 'in_progress', 'submitted', 'approved', 'rejected')),
  url TEXT,
  requirements TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Health Analysis
CREATE TABLE IF NOT EXISTS project_health_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  risks TEXT[] DEFAULT '{}',
  opportunities TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Alerts (Proactive monitoring)
CREATE TABLE IF NOT EXISTS business_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('financial', 'project', 'opportunity', 'compliance')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_required TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Contact Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_contact_intelligence_contact_id ON contact_intelligence(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_intelligence_updated_at ON contact_intelligence(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_intelligence_collaboration_score ON contact_intelligence(collaboration_score DESC);

-- Contact Enrichments Indexes
CREATE INDEX IF NOT EXISTS idx_contact_enrichments_contact_id ON contact_enrichments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_enrichments_created_at ON contact_enrichments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enrichments_collaboration_potential ON contact_enrichments(collaboration_potential DESC);

-- Project Contact Matches Indexes
CREATE INDEX IF NOT EXISTS idx_project_contact_matches_project_id ON project_contact_matches(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contact_matches_contact_id ON project_contact_matches(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_contact_matches_match_score ON project_contact_matches(match_score DESC);

-- Outreach Strategies Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_strategies_contact_id ON outreach_strategies(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_strategies_success_probability ON outreach_strategies(success_probability DESC);

-- Contact Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_interaction_date ON contact_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_interaction_type ON contact_interactions(interaction_type);

-- Business Agent Queries Indexes
CREATE INDEX IF NOT EXISTS idx_business_agent_queries_created_at ON business_agent_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_agent_queries_confidence ON business_agent_queries(confidence DESC);

-- Compliance Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_compliance_type ON compliance_tracking(compliance_type);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_status ON compliance_tracking(status);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_due_date ON compliance_tracking(due_date);

-- Grant Opportunities Indexes
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_deadline ON grant_opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_relevance_score ON grant_opportunities(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_application_status ON grant_opportunities(application_status);

-- Project Health Analysis Indexes
CREATE INDEX IF NOT EXISTS idx_project_health_analysis_project_id ON project_health_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_project_health_analysis_health_score ON project_health_analysis(health_score);
CREATE INDEX IF NOT EXISTS idx_project_health_analysis_analysis_date ON project_health_analysis(analysis_date DESC);

-- Business Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_business_alerts_alert_type ON business_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_business_alerts_priority ON business_alerts(priority DESC);
CREATE INDEX IF NOT EXISTS idx_business_alerts_status ON business_alerts(status);
CREATE INDEX IF NOT EXISTS idx_business_alerts_due_date ON business_alerts(due_date);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE contact_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_agent_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access all contact intelligence" ON contact_intelligence FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all contact enrichments" ON contact_enrichments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all project contact matches" ON project_contact_matches FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all outreach strategies" ON outreach_strategies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all contact interactions" ON contact_interactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all business agent queries" ON business_agent_queries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all compliance tracking" ON compliance_tracking FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all grant opportunities" ON grant_opportunities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all project health analysis" ON project_health_analysis FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all business alerts" ON business_alerts FOR ALL USING (auth.role() = 'service_role');

-- Create policies for authenticated users (read-only)
CREATE POLICY "Authenticated users can read contact intelligence" ON contact_intelligence FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read contact enrichments" ON contact_enrichments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read project contact matches" ON project_contact_matches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read outreach strategies" ON outreach_strategies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read contact interactions" ON contact_interactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read business agent queries" ON business_agent_queries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read compliance tracking" ON compliance_tracking FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read grant opportunities" ON grant_opportunities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read project health analysis" ON project_health_analysis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read business alerts" ON business_alerts FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- Initial Data Population
-- ============================================

-- Insert initial compliance tracking records
INSERT INTO compliance_tracking (compliance_type, status, due_date, details) VALUES
('bas', 'current', '2025-01-28', '{"next_due": "2025-01-28", "status": "current"}'),
('payg', 'current', NULL, '{"status": "current"}'),
('superannuation', 'current', NULL, '{"status": "current"}'),
('rd_tax_incentive', 'current', NULL, '{"eligible": true, "potential_benefit": 46000}'),
('indigenous_programs', 'current', NULL, '{"programs": []}')
ON CONFLICT DO NOTHING;

-- Insert sample grant opportunities (these would be populated by the grant discovery system)
INSERT INTO grant_opportunities (name, description, amount_min, amount_max, deadline, source, relevance_score, url) VALUES
('Indigenous Business Direct', 'Direct funding for Indigenous businesses', 50000, 250000, '2025-02-15', 'indigenous_programs', 85, 'https://www.indigenous.gov.au/funding'),
('R&D Tax Incentive', 'Tax incentive for research and development activities', 0, 1000000, '2025-06-30', 'ato.gov.au', 90, 'https://www.ato.gov.au/business/research-and-development-tax-incentive/'),
('Entrepreneurs Programme', 'Support for high-growth potential businesses', 0, 1000000, NULL, 'industry.gov.au', 75, 'https://www.industry.gov.au/funding-and-incentives/entrepreneurs-programme')
ON CONFLICT DO NOTHING;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_contact_intelligence_updated_at BEFORE UPDATE ON contact_intelligence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_contact_matches_updated_at BEFORE UPDATE ON project_contact_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outreach_strategies_updated_at BEFORE UPDATE ON outreach_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_tracking_updated_at BEFORE UPDATE ON compliance_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grant_opportunities_updated_at BEFORE UPDATE ON grant_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_alerts_updated_at BEFORE UPDATE ON business_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
