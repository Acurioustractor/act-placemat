-- ACT Decision Intelligence Database Schema
-- Tables and functions for real-time business decision support

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS decision_outcomes CASCADE;
DROP TABLE IF EXISTS decisions CASCADE;

-- Create decisions table
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    financial_impact NUMERIC,
    confidence_score NUMERIC DEFAULT 0.75 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_recommendation TEXT,
    decision_made TEXT,
    outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
    lessons_learned TEXT,
    related_decisions TEXT[] DEFAULT '{}',
    skill_pods_consulted TEXT[] DEFAULT '{}',
    data_sources TEXT[] DEFAULT '{}'
);

-- Create decision outcomes table for learning
CREATE TABLE decision_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    outcome_rating INTEGER NOT NULL CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
    actual_impact NUMERIC,
    success_metrics JSONB DEFAULT '{}',
    lessons_learned TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_priority ON decisions(priority);
CREATE INDEX idx_decisions_category ON decisions(category);
CREATE INDEX idx_decisions_created_at ON decisions(created_at);
CREATE INDEX idx_decisions_due_date ON decisions(due_date);
CREATE INDEX idx_decision_outcomes_decision_id ON decision_outcomes(decision_id);
CREATE INDEX idx_decision_outcomes_recorded_at ON decision_outcomes(recorded_at);

-- Create updated_at trigger for decisions table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_decisions_updated_at 
    BEFORE UPDATE ON decisions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create decisions table (for API use)
CREATE OR REPLACE FUNCTION create_decisions_table()
RETURNS VOID AS $$
BEGIN
    -- This function ensures the table exists
    -- Table creation is handled above, this is just for API compatibility
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to create decision outcomes table (for API use)
CREATE OR REPLACE FUNCTION create_decision_outcomes_table()
RETURNS VOID AS $$
BEGIN
    -- This function ensures the table exists
    -- Table creation is handled above, this is just for API compatibility
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Insert sample decisions for testing
INSERT INTO decisions (
    title, 
    description, 
    category, 
    priority, 
    ai_recommendation, 
    skill_pods_consulted,
    data_sources
) VALUES 
(
    'Hire 2 Additional AI Developers',
    'Should we expand our development team with 2 more AI specialists to accelerate platform development, considering our current cash flow and upcoming grant opportunities?',
    'hiring',
    'high',
    'Based on current project velocity and funding projections, hiring 2 AI developers would accelerate delivery by 40% and position ACT for upcoming grant opportunities. Recommended timeline: Start recruitment within 2 weeks.',
    ARRAY['systems-seeder', 'finance-copilot', 'opportunity-scout'],
    ARRAY['financial-projections', 'project-timeline', 'team-capacity']
),
(
    'Implement Advanced Analytics Dashboard',
    'Should we prioritize building an advanced analytics dashboard for community impact measurement before the next funding round?',
    'product-development',
    'medium',
    'Advanced analytics dashboard would significantly strengthen funding applications and demonstrate measurable community impact. Cost-benefit analysis shows 300% ROI within 6 months through improved grant success rates.',
    ARRAY['impact-analyst', 'systems-seeder', 'opportunity-scout'],
    ARRAY['community-metrics', 'funding-requirements', 'competitor-analysis']
),
(
    'Expand R&D Tax Credit Application Scope',
    'Should we expand our R&D tax credit application to include all AI/ML development activities, not just core platform features?',
    'financial',
    'high',
    'Expanding R&D scope to include all AI/ML activities could increase tax credits from $85k to $150k annually. Documentation overhead is manageable with current systems. Strongly recommended.',
    ARRAY['compliance-sentry', 'finance-copilot'],
    ARRAY['r-and-d-activities', 'tax-regulations', 'financial-projections']
),
(
    'Partner with University Research Program',
    'Should ACT establish a formal research partnership with local universities for AI ethics and community impact research?',
    'partnerships',
    'medium',
    'University partnership would provide access to research talent, potential PhD students for projects, and additional credibility for grant applications. Minimal cost with high strategic value.',
    ARRAY['opportunity-scout', 'knowledge-librarian', 'impact-analyst'],
    ARRAY['university-programs', 'research-opportunities', 'partnership-models']
);

-- Create view for decision analytics
CREATE OR REPLACE VIEW decision_analytics AS
SELECT 
    d.category,
    d.priority,
    d.status,
    COUNT(*) as decision_count,
    AVG(d.confidence_score) as avg_confidence,
    AVG(o.outcome_rating) as avg_outcome_rating,
    COUNT(o.id) as completed_with_outcomes
FROM decisions d
LEFT JOIN decision_outcomes o ON d.id = o.decision_id
GROUP BY d.category, d.priority, d.status;

-- Create function to get business state summary
CREATE OR REPLACE FUNCTION get_business_state_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_decisions', (SELECT COUNT(*) FROM decisions),
        'pending_decisions', (SELECT COUNT(*) FROM decisions WHERE status = 'pending'),
        'in_progress_decisions', (SELECT COUNT(*) FROM decisions WHERE status = 'in_progress'),
        'completed_decisions', (SELECT COUNT(*) FROM decisions WHERE status = 'completed'),
        'avg_confidence', (SELECT ROUND(AVG(confidence_score)::numeric, 2) FROM decisions WHERE status = 'pending'),
        'high_priority_pending', (SELECT COUNT(*) FROM decisions WHERE status = 'pending' AND priority = 'high'),
        'categories', (
            SELECT jsonb_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM decisions
                WHERE status IN ('pending', 'in_progress')
                GROUP BY category
            ) cat_counts
        ),
        'last_updated', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get decision recommendations
CREATE OR REPLACE FUNCTION get_decision_recommendations(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
    decision_id UUID,
    title TEXT,
    priority TEXT,
    confidence_score NUMERIC,
    ai_recommendation TEXT,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.priority,
        d.confidence_score,
        d.ai_recommendation,
        EXTRACT(DAYS FROM NOW() - d.created_at)::INTEGER as days_pending
    FROM decisions d
    WHERE d.status = 'pending'
    AND d.ai_recommendation IS NOT NULL
    ORDER BY 
        CASE d.priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        d.created_at
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON decisions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON decision_outcomes TO postgres;
GRANT SELECT ON decision_analytics TO postgres;
GRANT EXECUTE ON FUNCTION get_business_state_summary() TO postgres;
GRANT EXECUTE ON FUNCTION get_decision_recommendations(INTEGER) TO postgres;

-- Create Row Level Security policies if needed
-- ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE decisions IS 'Real-time business decisions with AI analysis and tracking';
COMMENT ON TABLE decision_outcomes IS 'Decision outcomes for continuous learning and improvement';
COMMENT ON VIEW decision_analytics IS 'Analytics view for decision intelligence reporting';
COMMENT ON FUNCTION get_business_state_summary() IS 'Returns current business decision state summary';
COMMENT ON FUNCTION get_decision_recommendations(INTEGER) IS 'Returns prioritized decision recommendations';