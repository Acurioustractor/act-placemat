-- ACT Unified Ecosystem - Governance and Sync Systems
-- Migration: Democratic governance and real-time synchronization

-- ========================================
-- COMMUNITY GOVERNANCE SYSTEM
-- ========================================

-- Governance decisions - tracks all democratic decisions
CREATE TABLE IF NOT EXISTS governance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Decision details
    decision_type TEXT NOT NULL, -- 'distribution_method', 'allocation_percentage', 'fund_investment'
    decision_title TEXT NOT NULL,
    decision_description TEXT,
    decision_context JSONB DEFAULT '{}',
    
    -- Governance process
    governance_model_used TEXT NOT NULL, -- 'consensus', 'majority_vote', 'elder_council'
    voting_method TEXT NOT NULL, -- 'anonymous_ballot', 'story_circle', 'digital_consensus'
    participation_requirement DECIMAL DEFAULT 0.60, -- 60% participation required
    
    -- Cultural integration
    cultural_consultation_required BOOLEAN DEFAULT true,
    cultural_consultation_completed BOOLEAN DEFAULT false,
    cultural_protocols_followed JSONB DEFAULT '{}',
    elder_input_received BOOLEAN DEFAULT false,
    
    -- Voting results
    total_eligible_voters INTEGER DEFAULT 0,
    total_votes_cast INTEGER DEFAULT 0,
    participation_rate DECIMAL DEFAULT 0,
    votes_in_favor INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    abstentions INTEGER DEFAULT 0,
    consensus_level DECIMAL DEFAULT 0,
    
    -- Decision outcome
    decision_outcome TEXT, -- 'approved', 'rejected', 'deferred', 'requires_reconsideration'
    decision_rationale TEXT,
    implementation_plan JSONB DEFAULT '{}',
    
    -- Status tracking
    decision_status TEXT DEFAULT 'deliberation', -- 'deliberation', 'voting', 'decided', 'implemented'
    voting_opens_at TIMESTAMP WITH TIME ZONE,
    voting_closes_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE,
    
    -- Transparency
    public_record JSONB,
    transparency_report_url TEXT,
    blockchain_governance_hash TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Governance votes - individual vote records
CREATE TABLE IF NOT EXISTS governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES governance_decisions(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Voter details (anonymized for privacy)
    voter_id UUID NOT NULL, -- References community member
    voter_role TEXT, -- 'elder', 'member', 'cultural_leader', 'youth_representative'
    
    -- Vote details
    vote_value TEXT NOT NULL, -- 'in_favor', 'against', 'abstain'
    vote_weight DECIMAL DEFAULT 1.0, -- For weighted voting systems
    vote_rationale TEXT,
    
    -- Cultural context
    cultural_protocols_followed BOOLEAN DEFAULT true,
    traditional_process_honored BOOLEAN DEFAULT true,
    
    -- Privacy and anonymity
    vote_anonymized BOOLEAN DEFAULT true,
    anonymization_method TEXT DEFAULT 'cryptographic_hash',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique vote per decision per voter
    UNIQUE(decision_id, voter_id)
);

-- ========================================
-- REAL-TIME DATA SYNCHRONIZATION
-- ========================================

-- Sync operations - tracks all ecosystem data synchronization
CREATE TABLE IF NOT EXISTS ecosystem_sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync details
    sync_type TEXT NOT NULL, -- 'unified', 'simple_methodical', 'health_recovery', 'manual'
    sync_trigger TEXT NOT NULL, -- 'scheduled', 'manual', 'event_driven', 'health_check'
    sync_scope JSONB DEFAULT '{}', -- Which components were synced
    
    -- Execution tracking
    sync_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'partial'
    steps_total INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    steps_failed INTEGER DEFAULT 0,
    
    -- Performance metrics
    sync_duration_ms INTEGER,
    data_volume_processed INTEGER DEFAULT 0,
    systems_synchronized INTEGER DEFAULT 0,
    
    -- Results
    sync_summary JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    health_impact_assessment JSONB DEFAULT '{}',
    
    -- Timestamps
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data sync queue - manages real-time synchronization
CREATE TABLE IF NOT EXISTS data_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync item details
    entity_type TEXT NOT NULL, -- 'story', 'community', 'value_event', 'governance_decision'
    entity_id UUID NOT NULL,
    community_id UUID REFERENCES communities(id),
    
    -- Sync operation
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'consent_change'
    sync_priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    sync_data JSONB NOT NULL,
    
    -- Processing status
    sync_status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed', 'retrying'
    processing_attempts INTEGER DEFAULT 0,
    max_retry_attempts INTEGER DEFAULT 3,
    
    -- Target systems
    target_systems JSONB DEFAULT '[]', -- Which systems need this sync
    systems_synced JSONB DEFAULT '[]', -- Which systems have been synced
    
    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_details JSONB DEFAULT '{}',
    requires_manual_intervention BOOLEAN DEFAULT false
);

-- ========================================
-- INDEXES
-- ========================================

-- Governance indexes
CREATE INDEX IF NOT EXISTS idx_governance_community_status 
    ON governance_decisions(community_id, decision_status);

CREATE INDEX IF NOT EXISTS idx_governance_votes_decision 
    ON governance_votes(decision_id, vote_value);

-- Sync system indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority 
    ON data_sync_queue(sync_status, sync_priority);

CREATE INDEX IF NOT EXISTS idx_sync_operations_status_date 
    ON ecosystem_sync_operations(sync_status, sync_started_at DESC);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS
ALTER TABLE governance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_queue ENABLE ROW LEVEL SECURITY;

-- Governance access policies
CREATE POLICY community_governance_policy ON governance_decisions
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY community_votes_policy ON governance_votes
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecosystem_sync_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_sync_queue TO authenticated;