-- ACT Unified Ecosystem Database Schema - Core Value Tracking
-- Migration: Core value tracking and attribution system

-- ========================================
-- EXTEND EXISTING COMMUNITIES SCHEMA
-- ========================================

-- Add ecosystem-specific fields to existing communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    ecosystem_participation_level TEXT DEFAULT 'standard'; -- 'standard', 'enhanced', 'premium'

ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    value_generation_score DECIMAL DEFAULT 0.0;

ALTER TABLE communities ADD COLUMN IF NOT EXISTS 
    profit_distribution_preferences JSONB DEFAULT '{"method": "automated", "timing": "monthly"}';

-- ========================================
-- VALUE TRACKING AND ATTRIBUTION SYSTEM
-- ========================================

-- Value generation events - tracks all community value creation
CREATE TABLE IF NOT EXISTS value_generation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Event details
    event_type TEXT NOT NULL, -- 'story_contribution', 'cultural_knowledge', 'innovation_idea', etc.
    event_description TEXT,
    value_dimensions JSONB NOT NULL, -- Multi-dimensional value (monetary, social, cultural, etc.)
    
    -- Attribution data
    primary_contributors JSONB DEFAULT '[]', -- Individual contributors
    community_contributors JSONB DEFAULT '[]', -- Community-level contributors
    cultural_attribution JSONB DEFAULT '{}', -- Cultural protocol-aware attribution
    
    -- Value calculation
    total_value_generated DECIMAL NOT NULL DEFAULT 0,
    monetary_value DECIMAL DEFAULT 0,
    social_impact_value DECIMAL DEFAULT 0,
    cultural_preservation_value DECIMAL DEFAULT 0,
    
    -- Blockchain integration
    blockchain_hash TEXT UNIQUE,
    immutable_record JSONB,
    verification_proofs JSONB DEFAULT '{}',
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    attributed_at TIMESTAMP WITH TIME ZONE
);

-- Value attribution records - detailed attribution breakdown
CREATE TABLE IF NOT EXISTS value_attribution_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_event_id UUID NOT NULL REFERENCES value_generation_events(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Attribution details
    contributor_type TEXT NOT NULL, -- 'individual', 'community', 'collaborative', 'cultural_collective'
    contributor_id UUID, -- References storytellers or community members
    attribution_percentage DECIMAL NOT NULL CHECK (attribution_percentage >= 0 AND attribution_percentage <= 1),
    attribution_method TEXT NOT NULL, -- 'direct_contribution', 'proportional_impact', etc.
    
    -- Cultural protocol compliance
    cultural_protocols_respected JSONB DEFAULT '{}',
    consent_verified BOOLEAN DEFAULT false,
    consent_verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Value allocation
    allocated_value DECIMAL NOT NULL DEFAULT 0,
    community_benefit_amount DECIMAL NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR VALUE TRACKING
-- ========================================

-- Value tracking indexes
CREATE INDEX IF NOT EXISTS idx_value_events_community_date 
    ON value_generation_events(community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_value_events_blockchain_hash 
    ON value_generation_events(blockchain_hash);

CREATE INDEX IF NOT EXISTS idx_attribution_community_contributor 
    ON value_attribution_records(community_id, contributor_id);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on value tracking tables
ALTER TABLE value_generation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_attribution_records ENABLE ROW LEVEL SECURITY;

-- Value tracking access policies
CREATE POLICY community_value_events_policy ON value_generation_events
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_attribution_policy ON value_attribution_records
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

-- Function to calculate community benefit amount
CREATE OR REPLACE FUNCTION calculate_community_benefit(total_value DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    -- ACT's legal 40% guarantee
    RETURN total_value * 0.40;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON value_generation_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON value_attribution_records TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_community_benefit TO authenticated;