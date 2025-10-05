-- Real-time Sync Triggers Migration
-- PostgreSQL triggers and functions for capturing data changes and triggering sync operations

-- =============================================
-- SYNC EVENT QUEUE TABLE
-- =============================================

-- Table to queue sync events for processing
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'insert', 'update', 'delete'
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation_data JSONB NOT NULL, -- The actual record data
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    sync_target TEXT NOT NULL, -- 'neo4j', 'supabase', 'both'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Priority and batching
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    batch_id UUID,
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN ('insert', 'update', 'delete')),
    CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    CONSTRAINT valid_sync_target CHECK (sync_target IN ('neo4j', 'supabase', 'both'))
);

-- Indexes for sync event processing
CREATE INDEX IF NOT EXISTS idx_sync_events_status ON sync_events(sync_status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_table ON sync_events(table_name, event_type);
CREATE INDEX IF NOT EXISTS idx_sync_events_retry ON sync_events(retry_count, max_retries) WHERE sync_status = 'failed';
CREATE INDEX IF NOT EXISTS idx_sync_events_batch ON sync_events(batch_id) WHERE batch_id IS NOT NULL;

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Function to queue sync events for user profile changes
CREATE OR REPLACE FUNCTION queue_user_profile_sync()
RETURNS TRIGGER AS $$
DECLARE
    operation_type TEXT;
    sync_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation_type = 'delete';
        sync_data = to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type = 'update';
        sync_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type = 'insert';
        sync_data = to_jsonb(NEW);
    END IF;

    -- Queue the sync event
    INSERT INTO sync_events (
        event_type,
        table_name,
        record_id,
        operation_data,
        sync_target,
        priority
    ) VALUES (
        operation_type,
        'user_profiles',
        COALESCE(NEW.user_id, OLD.user_id),
        sync_data,
        'neo4j',
        3 -- High priority for user changes
    );

    -- Log the event
    RAISE NOTICE 'Queued % sync event for user_profiles record %', operation_type, COALESCE(NEW.user_id, OLD.user_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to queue sync events for project changes
CREATE OR REPLACE FUNCTION queue_project_sync()
RETURNS TRIGGER AS $$
DECLARE
    operation_type TEXT;
    sync_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation_type = 'delete';
        sync_data = to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type = 'update';
        sync_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type = 'insert';
        sync_data = to_jsonb(NEW);
    END IF;

    -- Queue the sync event
    INSERT INTO sync_events (
        event_type,
        table_name,
        record_id,
        operation_data,
        sync_target,
        priority
    ) VALUES (
        operation_type,
        'projects',
        COALESCE(NEW.id, OLD.id),
        sync_data,
        'neo4j',
        4 -- Medium-high priority for projects
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to queue sync events for project outcome changes
CREATE OR REPLACE FUNCTION queue_project_outcome_sync()
RETURNS TRIGGER AS $$
DECLARE
    operation_type TEXT;
    sync_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation_type = 'delete';
        sync_data = to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type = 'update';
        sync_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type = 'insert';
        sync_data = to_jsonb(NEW);
    END IF;

    -- Queue the sync event
    INSERT INTO sync_events (
        event_type,
        table_name,
        record_id,
        operation_data,
        sync_target,
        priority
    ) VALUES (
        operation_type,
        'project_outcomes',
        COALESCE(NEW.id, OLD.id),
        sync_data,
        'neo4j',
        5 -- Medium priority for outcomes
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to queue sync events for community events
CREATE OR REPLACE FUNCTION queue_community_event_sync()
RETURNS TRIGGER AS $$
DECLARE
    operation_type TEXT;
    sync_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation_type = 'delete';
        sync_data = to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type = 'update';
        sync_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type = 'insert';
        sync_data = to_jsonb(NEW);
    END IF;

    -- Only sync certain types of community events
    IF (NEW.event_category IN ('collaboration', 'impact') OR OLD.event_category IN ('collaboration', 'impact')) THEN
        -- Queue the sync event
        INSERT INTO sync_events (
            event_type,
            table_name,
            record_id,
            operation_data,
            sync_target,
            priority
        ) VALUES (
            operation_type,
            'community_events',
            COALESCE(NEW.id, OLD.id),
            sync_data,
            'neo4j',
            6 -- Lower priority for events
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update sync event status
CREATE OR REPLACE FUNCTION update_sync_event_status(
    event_id UUID,
    new_status TEXT,
    error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sync_events
    SET 
        sync_status = new_status,
        processed_at = CASE WHEN new_status IN ('completed', 'failed', 'skipped') THEN NOW() ELSE processed_at END,
        error_message = CASE WHEN new_status = 'failed' THEN error_msg ELSE error_message END,
        retry_count = CASE WHEN new_status = 'failed' THEN retry_count + 1 ELSE retry_count END
    WHERE id = event_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending sync events
CREATE OR REPLACE FUNCTION get_pending_sync_events(
    batch_size INTEGER DEFAULT 10,
    target_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    table_name TEXT,
    record_id UUID,
    operation_data JSONB,
    sync_target TEXT,
    priority INTEGER,
    created_at TIMESTAMPTZ,
    retry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.event_type,
        e.table_name,
        e.record_id,
        e.operation_data,
        e.sync_target,
        e.priority,
        e.created_at,
        e.retry_count
    FROM sync_events e
    WHERE 
        e.sync_status = 'pending'
        AND e.retry_count < e.max_retries
        AND (target_filter IS NULL OR e.sync_target = target_filter OR e.sync_target = 'both')
    ORDER BY 
        e.priority ASC,
        e.created_at ASC
    LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old sync events
CREATE OR REPLACE FUNCTION cleanup_old_sync_events(
    retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_events
    WHERE 
        sync_status IN ('completed', 'skipped')
        AND processed_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up old failed events that exceeded max retries
    DELETE FROM sync_events
    WHERE 
        sync_status = 'failed'
        AND retry_count >= max_retries
        AND created_at < NOW() - (retention_days || ' days')::INTERVAL;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset failed sync events for retry
CREATE OR REPLACE FUNCTION reset_failed_sync_events(
    table_filter TEXT DEFAULT NULL,
    max_age_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    UPDATE sync_events
    SET 
        sync_status = 'pending',
        retry_count = 0,
        error_message = NULL,
        processed_at = NULL
    WHERE 
        sync_status = 'failed'
        AND retry_count < max_retries
        AND created_at > NOW() - (max_age_hours || ' hours')::INTERVAL
        AND (table_filter IS NULL OR table_name = table_filter);

    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- User profiles triggers
CREATE TRIGGER trigger_user_profile_sync_insert
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_user_profile_sync();

CREATE TRIGGER trigger_user_profile_sync_update
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION queue_user_profile_sync();

CREATE TRIGGER trigger_user_profile_sync_delete
    AFTER DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_user_profile_sync();

-- Projects triggers (only if projects table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        CREATE TRIGGER trigger_project_sync_insert
            AFTER INSERT ON projects
            FOR EACH ROW
            EXECUTE FUNCTION queue_project_sync();

        CREATE TRIGGER trigger_project_sync_update
            AFTER UPDATE ON projects
            FOR EACH ROW
            WHEN (OLD.* IS DISTINCT FROM NEW.*)
            EXECUTE FUNCTION queue_project_sync();

        CREATE TRIGGER trigger_project_sync_delete
            AFTER DELETE ON projects
            FOR EACH ROW
            EXECUTE FUNCTION queue_project_sync();
    END IF;
END $$;

-- Project outcomes triggers
CREATE TRIGGER trigger_project_outcome_sync_insert
    AFTER INSERT ON project_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION queue_project_outcome_sync();

CREATE TRIGGER trigger_project_outcome_sync_update
    AFTER UPDATE ON project_outcomes
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION queue_project_outcome_sync();

CREATE TRIGGER trigger_project_outcome_sync_delete
    AFTER DELETE ON project_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION queue_project_outcome_sync();

-- Community events triggers
CREATE TRIGGER trigger_community_event_sync_insert
    AFTER INSERT ON community_events
    FOR EACH ROW
    EXECUTE FUNCTION queue_community_event_sync();

CREATE TRIGGER trigger_community_event_sync_update
    AFTER UPDATE ON community_events
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION queue_community_event_sync();

CREATE TRIGGER trigger_community_event_sync_delete
    AFTER DELETE ON community_events
    FOR EACH ROW
    EXECUTE FUNCTION queue_community_event_sync();

-- =============================================
-- SYNC EVENT STATISTICS VIEW
-- =============================================

CREATE OR REPLACE VIEW sync_event_statistics AS
SELECT 
    table_name,
    sync_target,
    sync_status,
    COUNT(*) as event_count,
    MIN(created_at) as oldest_event,
    MAX(created_at) as newest_event,
    AVG(
        CASE 
            WHEN processed_at IS NOT NULL AND created_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (processed_at - created_at))
            ELSE NULL 
        END
    ) as avg_processing_time_seconds
FROM sync_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY table_name, sync_target, sync_status
ORDER BY table_name, sync_target, sync_status;

-- =============================================
-- WEBHOOK NOTIFICATION FUNCTION
-- =============================================

-- Function to notify webhook about sync events (if webhook URL is configured)
CREATE OR REPLACE FUNCTION notify_webhook_sync_event()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
BEGIN
    -- Check if webhook URL is configured (this would be set via environment or config)
    -- For now, just log the event - webhook integration would be handled by the application
    
    payload = jsonb_build_object(
        'event_id', NEW.id,
        'event_type', NEW.event_type,
        'table_name', NEW.table_name,
        'record_id', NEW.record_id,
        'sync_target', NEW.sync_target,
        'priority', NEW.priority,
        'created_at', NEW.created_at
    );

    -- Log webhook notification (application will pick this up)
    RAISE NOTICE 'WEBHOOK_SYNC_EVENT: %', payload::text;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify webhook when sync events are created
CREATE TRIGGER trigger_webhook_sync_notification
    AFTER INSERT ON sync_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_webhook_sync_event();

-- =============================================
-- PERMISSIONS AND SECURITY
-- =============================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_events TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_sync_event_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_event_status(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_sync_events(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_sync_events(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_sync_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION reset_failed_sync_events(TEXT, INTEGER) TO service_role;

-- Grant view access
GRANT SELECT ON sync_event_statistics TO authenticated;
GRANT SELECT ON sync_event_statistics TO service_role;

-- Enable Row Level Security on sync_events
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can access all sync events
CREATE POLICY sync_events_service_role ON sync_events
    FOR ALL TO service_role USING (true);

-- Policy: Authenticated users can view sync events (but not modify)
CREATE POLICY sync_events_authenticated_read ON sync_events
    FOR SELECT TO authenticated USING (true);

-- =============================================
-- INITIAL DATA AND MAINTENANCE
-- =============================================

-- Create a maintenance job entry (this would typically be handled by a job scheduler)
INSERT INTO sync_events (
    event_type,
    table_name,
    record_id,
    operation_data,
    sync_target,
    priority,
    sync_status
) VALUES (
    'insert',
    'system',
    gen_random_uuid(),
    '{"type": "maintenance", "message": "Real-time sync triggers initialized"}',
    'both',
    10,
    'completed'
) ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_processing ON sync_events(sync_status, priority) WHERE sync_status = 'processing';

COMMENT ON TABLE sync_events IS 'Queue for real-time synchronization events between Supabase and Neo4j';
COMMENT ON FUNCTION queue_user_profile_sync() IS 'Trigger function to queue user profile changes for sync';
COMMENT ON FUNCTION get_pending_sync_events(INTEGER, TEXT) IS 'Get pending sync events for processing';
COMMENT ON VIEW sync_event_statistics IS 'Statistics view for monitoring sync event processing';