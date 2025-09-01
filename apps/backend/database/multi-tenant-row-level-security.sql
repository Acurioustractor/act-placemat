-- ACT Multi-Tenant Row-Level Security Architecture
-- Complete data isolation between communities while maintaining performance
-- 
-- Philosophy: "Every community owns their data, completely"
-- Embodies: Data Sovereignty, Community Privacy, Scalable Security
-- 
-- Revolutionary Features:
-- - Community-owned data with absolute isolation
-- - Performance-optimised row-level security policies
-- - Cultural protocol-aware access controls
-- - Dynamic community membership management
-- - Hierarchical community structures support
-- - Cross-community collaboration with consent

-- Enable Row Level Security
ALTER DATABASE act_placemat SET row_security = on;

-- ========================================
-- CORE MULTI-TENANT SCHEMA
-- ========================================

-- Communities table - the foundation of multi-tenancy
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Cultural protocols and governance
    cultural_protocols JSONB DEFAULT '[]',
    governance_model TEXT DEFAULT 'democratic', -- 'democratic', 'consensus', 'elder_council', 'custom'
    decision_making_threshold DECIMAL DEFAULT 0.6, -- 60% for democratic decisions
    
    -- Multi-tenant configuration
    tenant_isolation_level TEXT DEFAULT 'strict', -- 'strict', 'collaborative', 'public'
    cross_community_sharing_allowed BOOLEAN DEFAULT false,
    parent_community_id UUID REFERENCES communities(id),
    
    -- Community ownership and sovereignty
    community_ownership_verified BOOLEAN DEFAULT false,
    data_sovereignty_agreement_signed BOOLEAN DEFAULT false,
    benefit_sharing_percentage DECIMAL DEFAULT 0.40, -- 40% guaranteed minimum
    
    -- Platform configuration
    onboarding_completed BOOLEAN DEFAULT false,
    platform_customisation JSONB DEFAULT '{}',
    
    -- Timestamps and metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- User who created the community
    
    -- Constraints
    CONSTRAINT valid_benefit_percentage CHECK (benefit_sharing_percentage >= 0.40),
    CONSTRAINT valid_threshold CHECK (decision_making_threshold > 0 AND decision_making_threshold <= 1)
);

-- Community membership with role-based access
CREATE TABLE IF NOT EXISTS community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Membership details
    role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member', 'storyteller', 'listener'
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending', 'suspended'
    
    -- Cultural and consent protocols
    cultural_protocols_acknowledged BOOLEAN DEFAULT false,
    consent_preferences JSONB DEFAULT '{}',
    story_sharing_permissions JSONB DEFAULT '{}',
    
    -- Membership governance
    invited_by UUID REFERENCES community_memberships(id),
    approved_by UUID REFERENCES community_memberships(id),
    approval_required BOOLEAN DEFAULT true,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(community_id, user_id),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'moderator', 'member', 'storyteller', 'listener', 'elder', 'cultural_keeper'))
);

-- ========================================
-- COMMUNITY-ISOLATED DATA TABLES
-- ========================================

-- Stories with community isolation
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    storyteller_id UUID NOT NULL,
    
    -- Story content and metadata
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    story_type TEXT DEFAULT 'personal', -- 'personal', 'community', 'cultural', 'advocacy'
    
    -- Ownership and rights
    ownership_certificate_id UUID, -- Links to digital ownership certificate
    consent_state TEXT DEFAULT 'granted', -- 'granted', 'revoked', 'conditional'
    consent_details JSONB DEFAULT '{}',
    
    -- Privacy and cultural protocols
    privacy_level TEXT DEFAULT 'community', -- 'private', 'community', 'public', 'cultural_protocol'
    cultural_protocols_required JSONB DEFAULT '[]',
    trauma_informed_handling BOOLEAN DEFAULT false,
    
    -- AI and analysis consent
    ai_analysis_consent BOOLEAN DEFAULT false,
    advocacy_potential_analysis_consent BOOLEAN DEFAULT false,
    community_theme_analysis_consent BOOLEAN DEFAULT false,
    
    -- Benefit sharing
    benefit_sharing_enabled BOOLEAN DEFAULT true,
    benefit_sharing_percentage DECIMAL DEFAULT 1.0, -- Storyteller's share of community benefits
    
    -- Story metadata
    tags JSONB DEFAULT '[]',
    location_context JSONB DEFAULT '{}',
    time_context JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Multi-tenant constraint
    CONSTRAINT stories_community_isolation CHECK (community_id IS NOT NULL)
);

-- Projects with community ownership
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Project details
    title TEXT NOT NULL,
    description TEXT,
    project_type TEXT DEFAULT 'community_led', -- 'community_led', 'collaborative', 'advocacy', 'cultural'
    status TEXT DEFAULT 'planning', -- 'planning', 'active', 'completed', 'paused', 'cancelled'
    
    -- Community ownership and governance
    owned_by_community BOOLEAN DEFAULT true,
    governance_model TEXT DEFAULT 'community_consensus',
    decision_makers JSONB DEFAULT '[]', -- Array of user IDs with decision-making authority
    
    -- Cross-community collaboration (with consent)
    collaboration_type TEXT DEFAULT 'single_community', -- 'single_community', 'multi_community', 'cross_platform'
    collaborating_communities JSONB DEFAULT '[]',
    collaboration_agreements JSONB DEFAULT '{}',
    
    -- Impact and benefit tracking
    impact_metrics JSONB DEFAULT '{}',
    benefit_distribution JSONB DEFAULT '{}',
    success_indicators JSONB DEFAULT '[]',
    
    -- Timestamps and ownership
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Multi-tenant constraint
    CONSTRAINT projects_community_isolation CHECK (community_id IS NOT NULL)
);

-- Opportunities with community access control
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Opportunity details
    title TEXT NOT NULL,
    description TEXT,
    opportunity_type TEXT DEFAULT 'funding', -- 'funding', 'partnership', 'resource', 'skill_sharing'
    
    -- Community relevance and access
    relevance_score DECIMAL DEFAULT 0.5,
    community_fit_analysis JSONB DEFAULT '{}',
    cultural_appropriateness_verified BOOLEAN DEFAULT false,
    
    -- Multi-community opportunities (with explicit consent)
    available_to_multiple_communities BOOLEAN DEFAULT false,
    eligible_communities JSONB DEFAULT '[]',
    cross_community_collaboration_required BOOLEAN DEFAULT false,
    
    -- Opportunity lifecycle
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed', 'awarded'
    deadline TIMESTAMP WITH TIME ZONE,
    
    -- Value and benefit potential
    estimated_value JSONB DEFAULT '{}', -- Multiple currencies supported
    community_benefit_potential DECIMAL DEFAULT 0.0,
    empowerment_potential DECIMAL DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Multi-tenant constraint
    CONSTRAINT opportunities_community_isolation CHECK (community_id IS NOT NULL)
);

-- Insights and analytics with community data sovereignty
CREATE TABLE IF NOT EXISTS community_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Insight details
    insight_type TEXT NOT NULL, -- 'community_wisdom', 'collaboration_opportunity', 'advocacy_potential'
    title TEXT NOT NULL,
    description TEXT,
    
    -- AI analysis details (with consent)
    ai_generated BOOLEAN DEFAULT false,
    ai_model_used TEXT,
    privacy_protection_applied TEXT, -- 'differential_privacy', 'homomorphic_encryption', etc.
    consent_verified BOOLEAN DEFAULT false,
    
    -- Community ownership and control
    community_owned BOOLEAN DEFAULT true,
    sharing_permissions JSONB DEFAULT '{}',
    benefit_sharing_applicable BOOLEAN DEFAULT true,
    
    -- Insight metadata and validation
    confidence_score DECIMAL DEFAULT 0.0,
    community_validation_score DECIMAL DEFAULT 0.0,
    cultural_appropriateness_score DECIMAL DEFAULT 1.0,
    
    -- Impact and actionability
    actionable_insights JSONB DEFAULT '[]',
    implementation_suggestions JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',
    
    -- Cross-community relevance (with permission)
    cross_community_applicable BOOLEAN DEFAULT false,
    applicable_communities JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Multi-tenant constraint  
    CONSTRAINT insights_community_isolation CHECK (community_id IS NOT NULL)
);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all community-isolated tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_insights ENABLE ROW LEVEL SECURITY;

-- ========================================
-- COMMUNITY ACCESS POLICIES
-- ========================================

-- Communities: Users can only see communities they're members of (plus public ones)
CREATE POLICY community_member_access ON communities
    FOR ALL
    USING (
        id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        OR tenant_isolation_level = 'public'
    );

-- Community memberships: Users can only see memberships for their communities
CREATE POLICY membership_community_access ON community_memberships
    FOR ALL
    USING (
        community_id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Stories: Complete community isolation with consent-based sharing
CREATE POLICY stories_community_isolation ON stories
    FOR ALL
    USING (
        -- User is active member of story's community
        community_id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        -- AND story sharing consent is granted
        AND (
            consent_state = 'granted'
            OR storyteller_id = auth.uid() -- Storytellers always see their own stories
        )
        -- AND privacy level allows access
        AND (
            privacy_level IN ('community', 'public')
            OR storyteller_id = auth.uid()
            OR (
                privacy_level = 'cultural_protocol' 
                AND auth.uid() IN (
                    SELECT user_id 
                    FROM community_memberships 
                    WHERE community_id = stories.community_id 
                    AND role IN ('elder', 'cultural_keeper')
                    AND cultural_protocols_acknowledged = true
                )
            )
        )
    );

-- Projects: Community ownership with cross-community collaboration support
CREATE POLICY projects_community_access ON projects
    FOR ALL
    USING (
        -- User is member of project's primary community
        community_id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        -- OR user is member of collaborating community (if multi-community project)
        OR (
            collaboration_type = 'multi_community'
            AND EXISTS (
                SELECT 1 
                FROM community_memberships cm
                WHERE cm.user_id = auth.uid()
                AND cm.status = 'active'
                AND cm.community_id::text = ANY(
                    SELECT jsonb_array_elements_text(collaborating_communities)
                )
            )
        )
    );

-- Opportunities: Community-specific with optional multi-community visibility
CREATE POLICY opportunities_community_access ON opportunities
    FOR ALL
    USING (
        -- User is member of opportunity's primary community
        community_id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        -- OR opportunity is available to user's communities
        OR (
            available_to_multiple_communities = true
            AND EXISTS (
                SELECT 1 
                FROM community_memberships cm
                WHERE cm.user_id = auth.uid()
                AND cm.community_id::text = ANY(
                    SELECT jsonb_array_elements_text(eligible_communities)
                )
                AND cm.status = 'active'
            )
        )
    );

-- Community insights: Strict community data sovereignty
CREATE POLICY insights_community_sovereignty ON community_insights
    FOR ALL
    USING (
        -- User is active member of insight's community
        community_id IN (
            SELECT community_id 
            FROM community_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        -- AND insight sharing is permitted
        AND (
            community_owned = true
            OR (
                cross_community_applicable = true
                AND auth.uid() IN (
                    SELECT user_id 
                    FROM community_memberships 
                    WHERE community_id::text = ANY(
                        SELECT jsonb_array_elements_text(applicable_communities)
                    )
                    AND status = 'active'
                )
            )
        )
    );

-- ========================================
-- PERFORMANCE OPTIMISATION INDEXES
-- ========================================

-- Multi-tenant optimised indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_parent ON communities(parent_community_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_community_user ON community_memberships(community_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_user_active ON community_memberships(user_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_community_active ON community_memberships(community_id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_community ON stories(community_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_storyteller ON stories(storyteller_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_consent_privacy ON stories(community_id, consent_state, privacy_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_community ON projects(community_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects(community_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_collaboration ON projects USING GIN(collaborating_communities);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_community ON opportunities(community_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_multi ON opportunities USING GIN(eligible_communities) WHERE available_to_multiple_communities = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline) WHERE status = 'open';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_community ON community_insights(community_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_type ON community_insights(community_id, insight_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_cross_community ON community_insights USING GIN(applicable_communities) WHERE cross_community_applicable = true;

-- ========================================
-- CULTURAL PROTOCOL FUNCTIONS
-- ========================================

-- Function to check if user has cultural protocol access
CREATE OR REPLACE FUNCTION check_cultural_protocol_access(
    user_id UUID,
    community_id UUID,
    required_protocols JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM community_memberships cm
        JOIN communities c ON c.id = cm.community_id
        WHERE cm.user_id = check_cultural_protocol_access.user_id
        AND cm.community_id = check_cultural_protocol_access.community_id
        AND cm.status = 'active'
        AND cm.cultural_protocols_acknowledged = true
        AND (
            cm.role IN ('elder', 'cultural_keeper', 'admin')
            OR c.cultural_protocols @> required_protocols
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate cross-community collaboration consent
CREATE OR REPLACE FUNCTION validate_cross_community_consent(
    primary_community_id UUID,
    collaborating_community_ids JSONB,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    community_uuid UUID;
BEGIN
    -- Check if user has admin rights in primary community
    IF NOT EXISTS (
        SELECT 1 FROM community_memberships 
        WHERE community_id = primary_community_id 
        AND user_id = validate_cross_community_consent.user_id 
        AND role IN ('admin', 'moderator')
        AND status = 'active'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check consent from all collaborating communities
    FOR community_uuid IN SELECT jsonb_array_elements_text(collaborating_community_ids)::UUID
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_uuid 
            AND cross_community_sharing_allowed = true
        ) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS FOR DATA INTEGRITY
-- ========================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON community_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON communities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_insights TO authenticated;

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION check_cultural_protocol_access TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cross_community_consent TO authenticated;

-- ========================================
-- COMMUNITY DATA SOVEREIGNTY VIEWS
-- ========================================

-- View for community data ownership summary
CREATE OR REPLACE VIEW community_data_sovereignty AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.data_sovereignty_agreement_signed,
    c.benefit_sharing_percentage,
    COUNT(DISTINCT s.id) as stories_count,
    COUNT(DISTINCT p.id) as projects_count,
    COUNT(DISTINCT o.id) as opportunities_count,
    COUNT(DISTINCT ci.id) as insights_count,
    COUNT(DISTINCT cm.id) as members_count
FROM communities c
LEFT JOIN stories s ON s.community_id = c.id
LEFT JOIN projects p ON p.community_id = c.id  
LEFT JOIN opportunities o ON o.community_id = c.id
LEFT JOIN community_insights ci ON ci.community_id = c.id
LEFT JOIN community_memberships cm ON cm.community_id = c.id AND cm.status = 'active'
GROUP BY c.id, c.name, c.slug, c.data_sovereignty_agreement_signed, c.benefit_sharing_percentage;

-- Enable RLS on the view
ALTER VIEW community_data_sovereignty SET (security_invoker = true);

COMMENT ON SCHEMA public IS 'ACT Multi-Tenant Community Platform with Row-Level Security - Community data sovereignty and complete isolation while enabling consensual collaboration';