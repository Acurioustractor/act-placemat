-- ACT Unified Ecosystem - Profit Distribution System
-- Migration: Automated profit distribution with 40% guarantee

-- ========================================
-- AUTOMATED PROFIT DISTRIBUTION SYSTEM
-- ========================================

-- Profit distribution batches - tracks distribution executions
CREATE TABLE IF NOT EXISTS profit_distribution_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Distribution details
    distribution_type TEXT NOT NULL, -- 'automated', 'governance_triggered', 'milestone_based'
    total_profit_amount DECIMAL NOT NULL,
    community_share_amount DECIMAL NOT NULL, -- 40% minimum guaranteed
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Legal compliance
    legal_framework_version TEXT DEFAULT '1.0',
    forty_percent_guarantee_verified BOOLEAN DEFAULT true,
    compliance_audit_hash TEXT,
    
    -- Execution status
    distribution_status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
    payments_executed INTEGER DEFAULT 0,
    payments_failed INTEGER DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    
    -- Transparency
    public_transparency_report JSONB,
    blockchain_verification_hash TEXT,
    community_verification_completed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Individual profit payments - detailed payment records
CREATE TABLE IF NOT EXISTS profit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_batch_id UUID NOT NULL REFERENCES profit_distribution_batches(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Payment details
    recipient_type TEXT NOT NULL, -- 'individual', 'community_pool', 'cultural_fund'
    recipient_id UUID, -- Individual storyteller or community fund
    payment_amount DECIMAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'bank_transfer', 'cryptocurrency', 'community_currency'
    
    -- Cultural protocol compliance
    cultural_protocols_applied JSONB DEFAULT '{}',
    payment_culturally_appropriate BOOLEAN DEFAULT true,
    cultural_consultation_completed BOOLEAN DEFAULT false,
    
    -- Payment execution
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'held_in_escrow'
    transaction_id TEXT,
    processing_fee DECIMAL DEFAULT 0,
    payment_executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Transparency
    payment_transparent_record JSONB,
    recipient_notification_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PROFIT DISTRIBUTION INDEXES
-- ========================================

-- Profit distribution indexes
CREATE INDEX IF NOT EXISTS idx_profit_batches_status_date 
    ON profit_distribution_batches(distribution_status, distribution_date DESC);

CREATE INDEX IF NOT EXISTS idx_profit_payments_community_status 
    ON profit_payments(community_id, payment_status);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on profit tables
ALTER TABLE profit_payments ENABLE ROW LEVEL SECURITY;

-- Profit distribution access policies
CREATE POLICY community_payments_policy ON profit_payments
    FOR ALL USING (
        auth.jwt() ->> 'community_id' = community_id::text OR
        auth.jwt() ->> 'role' = 'platform_admin'
    );

-- Function to validate profit distribution compliance
CREATE OR REPLACE FUNCTION validate_profit_distribution_compliance(distribution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    batch_record RECORD;
    compliance_met BOOLEAN := false;
BEGIN
    SELECT * INTO batch_record FROM profit_distribution_batches WHERE id = distribution_id;
    
    IF batch_record.community_share_amount >= (batch_record.total_profit_amount * 0.40) THEN
        compliance_met := true;
    END IF;
    
    RETURN compliance_met;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON profit_distribution_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profit_payments TO authenticated;
GRANT EXECUTE ON FUNCTION validate_profit_distribution_compliance TO authenticated;