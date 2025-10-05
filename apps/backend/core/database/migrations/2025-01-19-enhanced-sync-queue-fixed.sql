-- Enhanced Sync Queue Database Functions (Fixed)
-- Adds advanced queue functionality working with existing sync_events structure

-- Add missing columns to sync_events if not exists
ALTER TABLE sync_events 
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;

-- Create dead letter queue table
CREATE TABLE IF NOT EXISTS sync_events_dead_letter (
    id UUID PRIMARY KEY,
    original_event_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation_data JSONB NOT NULL,
    sync_target TEXT NOT NULL,
    priority INTEGER NOT NULL,
    retry_count INTEGER NOT NULL,
    final_error TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dead_lettered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_events_priority_status ON sync_events(priority, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_scheduled ON sync_events(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dead_letter_created_at ON sync_events_dead_letter(created_at);
CREATE INDEX IF NOT EXISTS idx_dead_letter_table_name ON sync_events_dead_letter(table_name);

-- Create queue statistics view
DROP VIEW IF EXISTS sync_event_queue_statistics;
CREATE VIEW sync_event_queue_statistics AS
SELECT 
    sync_status,
    priority,
    table_name,
    COUNT(*) as event_count,
    AVG(retry_count) as avg_retry_count,
    MIN(created_at) as oldest_event,
    MAX(created_at) as newest_event,
    COUNT(CASE WHEN scheduled_for > NOW() THEN 1 END) as scheduled_count
FROM sync_events 
GROUP BY sync_status, priority, table_name

UNION ALL

SELECT 
    'dead_letter' as sync_status,
    priority,
    table_name,
    COUNT(*) as event_count,
    AVG(retry_count) as avg_retry_count,
    MIN(created_at) as oldest_event,
    MAX(created_at) as newest_event,
    0 as scheduled_count
FROM sync_events_dead_letter 
GROUP BY priority, table_name;

-- Function to get priority events for processing (using integer priority)
CREATE OR REPLACE FUNCTION get_priority_sync_events_by_level(
    priority_level INTEGER,
    batch_size INTEGER DEFAULT 10,
    max_retry_count INTEGER DEFAULT 3
)
RETURNS TABLE(
    id UUID,
    event_type TEXT,
    table_name TEXT,
    record_id UUID,
    operation_data JSONB,
    sync_target TEXT,
    priority INTEGER,
    retry_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id,
        se.event_type,
        se.table_name,
        se.record_id,
        se.operation_data,
        se.sync_target,
        se.priority,
        se.retry_count,
        se.created_at
    FROM sync_events se
    WHERE se.sync_status = 'pending' 
        AND se.priority >= priority_level  -- Higher number = higher priority
        AND se.retry_count < max_retry_count
        AND (se.scheduled_for IS NULL OR se.scheduled_for <= NOW())
    ORDER BY 
        se.priority DESC,
        se.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to get priority events with text priority mapping
CREATE OR REPLACE FUNCTION get_priority_sync_events(
    priority_level TEXT,
    batch_size INTEGER DEFAULT 10,
    max_retry_count INTEGER DEFAULT 3
)
RETURNS TABLE(
    id UUID,
    event_type TEXT,
    table_name TEXT,
    record_id UUID,
    operation_data JSONB,
    sync_target TEXT,
    priority INTEGER,
    retry_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
DECLARE
    priority_int INTEGER;
BEGIN
    -- Map text priority to integer
    priority_int := CASE priority_level
        WHEN 'critical' THEN 10
        WHEN 'high' THEN 7
        WHEN 'normal' THEN 5
        WHEN 'low' THEN 2
        ELSE 5
    END;
    
    RETURN QUERY
    SELECT * FROM get_priority_sync_events_by_level(priority_int, batch_size, max_retry_count);
END;
$$;

-- Function to schedule event retry with exponential backoff
CREATE OR REPLACE FUNCTION schedule_sync_event_retry(
    event_id UUID,
    error_msg TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sync_events 
    SET 
        sync_status = 'pending',
        retry_count = retry_count + 1,
        last_error = error_msg,
        scheduled_for = scheduled_time,
        error_message = error_msg,
        processed_at = NULL
    WHERE id = event_id;
    
    RETURN FOUND;
END;
$$;

-- Function to move event to dead letter queue
CREATE OR REPLACE FUNCTION move_to_dead_letter_queue(
    event_id UUID,
    final_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    event_record RECORD;
BEGIN
    -- Get the event data
    SELECT * INTO event_record 
    FROM sync_events 
    WHERE id = event_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert into dead letter queue
    INSERT INTO sync_events_dead_letter (
        id,
        original_event_id,
        event_type,
        table_name,
        record_id,
        operation_data,
        sync_target,
        priority,
        retry_count,
        final_error,
        created_at,
        dead_lettered_at
    ) VALUES (
        gen_random_uuid(),
        event_record.id,
        event_record.event_type,
        event_record.table_name,
        event_record.record_id,
        event_record.operation_data,
        event_record.sync_target,
        event_record.priority,
        event_record.retry_count,
        final_error,
        event_record.created_at,
        NOW()
    );
    
    -- Remove from main queue
    DELETE FROM sync_events WHERE id = event_id;
    
    RETURN TRUE;
END;
$$;

-- Function to get comprehensive queue statistics
CREATE OR REPLACE FUNCTION get_queue_statistics()
RETURNS TABLE(
    metric_name TEXT,
    metric_value BIGINT,
    details JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Total events by status
    RETURN QUERY
    SELECT 
        'events_by_status' as metric_name,
        COUNT(*)::BIGINT as metric_value,
        jsonb_build_object(
            'status', sync_status,
            'count', COUNT(*),
            'percentage', ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0)), 2)
        ) as details
    FROM sync_events 
    GROUP BY sync_status;
    
    -- Events by priority
    RETURN QUERY
    SELECT 
        'events_by_priority' as metric_name,
        COUNT(*)::BIGINT as metric_value,
        jsonb_build_object(
            'priority', priority,
            'priority_name', CASE priority
                WHEN 10 THEN 'critical'
                WHEN 7 THEN 'high' 
                WHEN 5 THEN 'normal'
                WHEN 2 THEN 'low'
                ELSE 'unknown'
            END,
            'count', COUNT(*),
            'avg_retry_count', ROUND(AVG(retry_count), 2)
        ) as details
    FROM sync_events 
    GROUP BY priority;
    
    -- Events by table
    RETURN QUERY
    SELECT 
        'events_by_table' as metric_name,
        COUNT(*)::BIGINT as metric_value,
        jsonb_build_object(
            'table_name', table_name,
            'count', COUNT(*),
            'failed_count', COUNT(CASE WHEN sync_status = 'failed' THEN 1 END)
        ) as details
    FROM sync_events 
    GROUP BY table_name;
    
    -- Dead letter queue stats
    RETURN QUERY
    SELECT 
        'dead_letter_stats' as metric_name,
        COUNT(*)::BIGINT as metric_value,
        jsonb_build_object(
            'total_dead_lettered', COUNT(*),
            'by_table', COALESCE(jsonb_object_agg(table_name, table_count), '{}'::jsonb)
        ) as details
    FROM (
        SELECT table_name, COUNT(*) as table_count
        FROM sync_events_dead_letter 
        GROUP BY table_name
    ) dlq_stats;
    
    -- Processing performance
    RETURN QUERY
    SELECT 
        'processing_performance' as metric_name,
        COUNT(*)::BIGINT as metric_value,
        jsonb_build_object(
            'avg_processing_time_seconds', 
            ROUND(AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at))), 2),
            'events_with_timing', COUNT(*)
        ) as details
    FROM sync_events 
    WHERE processing_started_at IS NOT NULL 
        AND processing_completed_at IS NOT NULL;
END;
$$;

-- Enhanced update_sync_event_status function
CREATE OR REPLACE FUNCTION update_sync_event_status(
    event_id UUID,
    new_status TEXT,
    error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sync_events 
    SET 
        sync_status = new_status,
        error_message = CASE 
            WHEN new_status = 'failed' THEN COALESCE(error_msg, error_message)
            WHEN new_status = 'completed' THEN NULL
            ELSE error_message
        END,
        last_error = CASE 
            WHEN new_status = 'failed' THEN COALESCE(error_msg, last_error)
            ELSE last_error
        END,
        processing_started_at = CASE 
            WHEN new_status = 'processing' THEN COALESCE(processing_started_at, NOW())
            ELSE processing_started_at
        END,
        processing_completed_at = CASE 
            WHEN new_status IN ('completed', 'failed') THEN NOW()
            ELSE NULL
        END,
        processed_at = CASE 
            WHEN new_status IN ('completed', 'failed') THEN NOW()
            ELSE processed_at
        END
    WHERE id = event_id;
    
    RETURN FOUND;
END;
$$;

-- Function to reset failed events for retry (updated for integer priority)
CREATE OR REPLACE FUNCTION reset_failed_sync_events(
    priority_filter TEXT DEFAULT NULL,
    max_age_hours INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    reset_count INTEGER;
    priority_int INTEGER;
BEGIN
    -- Map text priority to integer if provided
    priority_int := CASE priority_filter
        WHEN 'critical' THEN 10
        WHEN 'high' THEN 7
        WHEN 'normal' THEN 5
        WHEN 'low' THEN 2
        ELSE NULL
    END;
    
    UPDATE sync_events 
    SET 
        sync_status = 'pending',
        retry_count = 0,
        last_error = NULL,
        scheduled_for = NULL,
        error_message = NULL,
        processing_started_at = NULL,
        processing_completed_at = NULL,
        processed_at = NULL
    WHERE sync_status = 'failed' 
        AND processed_at > NOW() - (max_age_hours || ' hours')::INTERVAL
        AND (priority_int IS NULL OR priority = priority_int);
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$;

-- Function to cleanup old dead letter queue entries
CREATE OR REPLACE FUNCTION cleanup_dead_letter_queue(
    retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_events_dead_letter 
    WHERE dead_lettered_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function to cleanup old completed sync events
CREATE OR REPLACE FUNCTION cleanup_old_sync_events(
    retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_events 
    WHERE sync_status = 'completed' 
        AND processed_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;