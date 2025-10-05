-- ACT Unified Ecosystem - Initial Data Setup
-- Migration: Initial component health tracking and sample data

-- ========================================
-- INITIAL ECOSYSTEM COMPONENT DATA
-- ========================================

-- Insert ecosystem component tracking records
INSERT INTO component_health_tracking (component_name, component_type, operational_status, health_score, critical_for_ecosystem)
VALUES 
    ('community_insights_engine', 'service', 'operational', 0.95, true),
    ('empathy_ledger_platform', 'service', 'operational', 0.92, true),
    ('value_tracking_system', 'service', 'operational', 0.98, true),
    ('profit_distribution_system', 'service', 'operational', 0.94, true),
    ('community_governance_system', 'service', 'operational', 0.96, true),
    ('cloud_scaling_manager', 'service', 'operational', 0.89, false),
    ('unified_sync_service', 'service', 'operational', 0.93, true),
    ('notion_integration', 'integration', 'operational', 0.87, false),
    ('frontend_dashboard', 'api', 'operational', 0.91, false)
ON CONFLICT (component_name) DO NOTHING;

-- Insert initial sync operation record
INSERT INTO ecosystem_sync_operations (
    sync_type,
    sync_trigger,
    sync_scope,
    sync_status,
    steps_total,
    steps_completed,
    sync_duration_ms,
    systems_synchronized,
    sync_summary
) VALUES (
    'unified',
    'initialization',
    '{"components": ["all_systems"], "scope": "initial_setup"}',
    'completed',
    8,
    8,
    2500,
    6,
    '{"status": "ecosystem_initialized", "components_active": 6, "health_score": 0.92}'
);

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Only insert if we have communities already
DO $$
BEGIN
    -- Check if we have any communities, if so create sample value events
    IF EXISTS (SELECT 1 FROM communities LIMIT 1) THEN
        -- Create a sample value generation event
        INSERT INTO value_generation_events (
            community_id,
            event_type,
            event_description,
            value_dimensions,
            total_value_generated,
            monetary_value,
            social_impact_value,
            cultural_preservation_value
        ) 
        SELECT 
            c.id,
            'community_platform_launch',
            'Community successfully launched on ACT platform with full ecosystem integration',
            '{"monetary": 1000, "social_impact": 500, "cultural_preservation": 300, "innovation": 200}',
            2000.00,
            1000.00,
            500.00,
            300.00
        FROM communities c 
        LIMIT 1;
    END IF;
END $$;